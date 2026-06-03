import React from "react";
import { MapContainer, TileLayer, Marker, Popup, Polygon, Polyline, CircleMarker, Tooltip as LTooltip } from "react-leaflet";
import L from "leaflet";

// Fix default icon shadows issue when bundling
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const SG_CENTER = [1.3521, 103.8198];

const hubMarkerHtml = (color, isDefault, isHighlighted = false) => {
  const ring = isDefault
    ? `box-shadow: 0 0 0 4px ${color}33, 0 2px 8px rgba(0,0,0,.3);`
    : `box-shadow: 0 0 0 2px ${color}33, 0 1px 4px rgba(0,0,0,.25);`;
  const size = isDefault ? 24 : 20;
  const highlightClass = isHighlighted ? "highlight-hub" : "";
  
  return `<div class="${highlightClass}" style="
      background:${color};
      border:3px solid #fff;
      width:${size}px;height:${size}px;
      border-radius:5px;
      transform:rotate(45deg);
      ${isHighlighted ? '' : ring}
    "></div>`;
};

const buildHubIcon = (color = "#0d7c78", isDefault = false, isHighlighted = false) =>
  L.divIcon({
    className: "",
    html: hubMarkerHtml(color, isDefault, isHighlighted),
    iconSize: [isDefault ? 24 : 20, isDefault ? 24 : 20],
    iconAnchor: [isDefault ? 12 : 10, isDefault ? 12 : 10],
  });

const orderIcon = (status = "pending") =>
  L.divIcon({ className: "", html: `<div class="order-marker ${status}"></div>`, iconSize: [12, 12] });
const driverIcon = (initial = "D") =>
  L.divIcon({ className: "", html: `<div class="driver-marker">${initial}</div>`, iconSize: [22, 22] });

// Traffic speed bands color
function speedColor(band) {
  const colors = ["#b91c1c", "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16", "#22c55e", "#16a34a"];
  return colors[Math.min(Math.max(band - 1, 0), 7)];
}

export default function MapView({
  height = 560,
  orders = [],
  drivers = [],
  zones = [],
  routes = [],            // [{ geometry: [[lat,lng],...], color, driver_id }]
  incidents = [],
  speedBands = [],
  hubs = [],              // [{id, name, lat, lng, is_default}]
  showHub = false,
  fitTo = null,
  highlight = {},         // { hubId, zoneId }
  tracking = null,        // { driver_id, location: {lat, lng} }
}) {
  const center = SG_CENTER;

  // Helper to split geometry for tracking
  const getRouteSegments = (routeRecord) => {
    const geometry = routeRecord.geometry || [];
    if (!tracking || tracking.driver_id !== routeRecord.driver_id || !tracking.location || geometry.length < 2) {
      return [{ positions: geometry, color: routeRecord.color || "#0d7c78", opacity: 0.85, weight: 4 }];
    }

    const currentLoc = [tracking.location.lat, tracking.location.lng];

    // Find closest index to current tracking location
    let closestIdx = 0;
    let minDist = Infinity;
    for (let i = 0; i < geometry.length; i++) {
      const p = geometry[i];
      const d = Math.sqrt(Math.pow(p[0] - currentLoc[0], 2) + Math.pow(p[1] - currentLoc[1], 2));
      if (d < minDist) {
        minDist = d;
        closestIdx = i;
      }
    }

    const traveled = geometry.slice(0, closestIdx + 1);
    const remaining = geometry.slice(closestIdx);

    return [
      { positions: traveled, color: "#94a3b8", opacity: 0.4, weight: 3, key: 'traveled' },
      { positions: remaining, color: routeRecord.color || "#0d7c78", opacity: 0.9, weight: 5, key: 'remaining' }
    ];
  };

  return (
    <div className="map-wrap" style={{ height }}>
      <MapContainer center={center} zoom={12} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
        <TileLayer
          attribution='&copy; OpenStreetMap &copy; CARTO'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        {speedBands.map((s, i) => (
          <Polyline
            key={`sb-${i}`}
            positions={[[s.StartLat, s.StartLon], [s.EndLat, s.EndLon]]}
            pathOptions={{ color: speedColor(s.SpeedBand || 4), weight: 3, opacity: 0.5 }}
          />
        ))}

        {zones.map((z) => {
          const isHighlighted = (highlight.zoneIds || []).includes(z.id) || highlight.zoneId === z.id;
          return (
            <Polygon 
              key={z.id} 
              positions={z.polygon} 
              pathOptions={{ 
                color: z.color || "#0d7c78", 
                weight: isHighlighted ? 4 : 2, 
                fillOpacity: isHighlighted ? 0.25 : 0.12,
                className: isHighlighted ? "highlight-zone" : ""
              }}
            >
              <LTooltip sticky>{z.name} {isHighlighted && " (Your Zone)"}</LTooltip>
            </Polygon>
          );
        })}

        {routes.map((r, i) => (
          <React.Fragment key={`rt-wrap-${i}`}>
            {getRouteSegments(r).map((seg) => (
              <Polyline 
                key={`rt-${i}-seg-${seg.key || 'full'}`} 
                positions={seg.positions}
                pathOptions={{ color: seg.color, weight: seg.weight, opacity: seg.opacity }} 
              />
            ))}
          </React.Fragment>
        ))}

        {hubs.map((h) => {
          const isHighlighted = highlight.hubId === h.id;
          return (
            <Marker key={h.id} position={[h.lat, h.lng]} icon={buildHubIcon(h.color || "#0d7c78", !!h.is_default, isHighlighted)}>
              <Popup>
                <div style={{ fontSize: 12 }}>
                  <div style={{ fontWeight: 600 }}>
                    <span style={{ display: "inline-block", width: 9, height: 9, background: h.color || "#0d7c78", borderRadius: 2, marginRight: 6, verticalAlign: "middle" }}></span>
                    {h.name} {h.is_default && <span style={{ color: "#d2233c" }}>· default</span>}
                    {isHighlighted && <span style={{ color: "var(--teal)", marginLeft: 6 }}>· YOUR HUB</span>}
                  </div>
                  {h.address && <div style={{ color: "#475569" }}>{h.address}</div>}
                  <div style={{ color: "#64748b" }}>{h.lat.toFixed(4)}, {h.lng.toFixed(4)}</div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {showHub && hubs.length === 0 && (
          <Marker position={[1.3521, 103.8198]} icon={buildHubIcon("#d2233c", true)}>
            <Popup>Central Hub</Popup>
          </Marker>
        )}

        {orders.map((o) => (
          <Marker key={o.id} position={[o.lat, o.lng]} icon={orderIcon(o.status)}>
            <Popup>
              <div style={{ fontSize: 12 }}>
                <div style={{ fontWeight: 600 }}>{o.code}</div>
                <div>{o.address}</div>
                <div style={{ color: "#64748b" }}>Postal {o.postal_code} · {o.weight_kg} kg</div>
                <div>Status: <b>{o.status}</b></div>
                {o.sequence && <div>Sequence: #{o.sequence}</div>}
              </div>
            </Popup>
          </Marker>
        ))}

        {drivers.filter(d => d.location).map((d) => (
          <Marker key={d.id} position={[d.location.lat, d.location.lng]} icon={driverIcon((d.name || "?")[0])}>
            <Popup>
              <div style={{ fontSize: 12 }}>
                <div style={{ fontWeight: 600 }}>{d.name}</div>
                <div>Status: {d.status}</div>
                <div>Last update: {d.location.updated_at}</div>
              </div>
            </Popup>
          </Marker>
        ))}

        {incidents.map((e, i) => (
          <CircleMarker key={`inc-${i}`} center={[e.Latitude, e.Longitude]} radius={5}
            pathOptions={{ color: "#d2233c", fillColor: "#d2233c", fillOpacity: 0.7 }}>
            <Popup><div style={{ fontSize: 11, maxWidth: 260 }}><b>{e.Type}</b><br/>{e.Message}</div></Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
