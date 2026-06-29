import React from "react";
import { MapContainer, TileLayer, Marker, Popup, Polygon, Polyline, Tooltip as LTooltip } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { useTheme } from "next-themes";
import L from "leaflet";
// Base markercluster styles for spiderfy/expand animations only. The default
// colored cluster bubbles (MarkerCluster.Default.css) are intentionally NOT
// imported — buildClusterIcon + .lc-cluster supply token-driven styling.
import "leaflet.markercluster/dist/MarkerCluster.css";
import { Gauge, Shapes, Warehouse, Package, Truck, Route as RouteIcon, AlertTriangle, MapPinOff } from "lucide-react";
import { mapTheme } from "@/lib/design/mapTheme";
import { buildMarkerIcon, buildClusterIcon, buildArrowIcon } from "@/lib/design/markerStyles";
import MapControls from "@/components/MapControls";
import MapLegend from "@/components/MapLegend";
import { EmptyState } from "@/components/composite/EmptyState";

// Fix default icon shadows issue when bundling
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const SG_CENTER = [1.3521, 103.8198];

// Traffic speed bands color
function speedColor(band) {
  const colors = ["#b91c1c", "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16", "#22c55e", "#16a34a"];
  return colors[Math.min(Math.max(band - 1, 0), 7)];
}

// Compute the clockwise screen bearing (0 = up/north) from point a→b so a
// triangle glyph can be rotated to point along the direction of travel. The
// longitude delta is scaled by cos(latitude) to approximate the Web-Mercator
// horizontal stretch; exact projection is unnecessary for a directional cue.
function segmentAngle(a, b) {
  const dLat = b[0] - a[0];
  const dLng = (b[1] - a[1]) * Math.cos((((a[0] + b[0]) / 2) * Math.PI) / 180);
  return (Math.atan2(dLng, dLat) * 180) / Math.PI;
}

// Sample evenly-spaced directional arrows along a route geometry (Req 12.5).
// Returns at most ~10 arrows positioned at segment midpoints with the bearing
// of that segment, keeping the overlay lightweight regardless of route length.
function getRouteArrows(geometry = []) {
  if (!Array.isArray(geometry) || geometry.length < 2) return [];
  const maxArrows = 10;
  const segCount = geometry.length - 1;
  const step = Math.max(1, Math.round(segCount / maxArrows));
  const arrows = [];
  for (let i = step; i < segCount; i += step) {
    const a = geometry[i];
    const b = geometry[i + 1] || geometry[i];
    if (!a || !b) continue;
    arrows.push({
      position: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2],
      angle: segmentAngle(a, b),
    });
  }
  return arrows;
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
  layers = undefined,     // optional controlled visibility { traffic, zones, hubs, orders }
  emptyMessage = "No map data to display.",
}) {
  const center = SG_CENTER;
  const { resolvedTheme } = useTheme();
  const tiles = mapTheme(resolvedTheme);

  // Layer visibility — MapView owns the state and passes it to MapControls.
  // Defaults to all-visible; an optional `layers` prop seeds/controls it so
  // callers that omit the prop keep the existing always-visible behavior.
  const DEFAULT_LAYERS = React.useMemo(
    () => ({ traffic: true, zones: true, hubs: true, orders: true }),
    []
  );
  const [layerState, setLayerState] = React.useState(() => ({
    ...DEFAULT_LAYERS,
    ...(layers || {}),
  }));
  React.useEffect(() => {
    setLayerState({ ...DEFAULT_LAYERS, ...(layers || {}) });
  }, [layers, DEFAULT_LAYERS]);
  const toggleLayer = React.useCallback((key) => {
    setLayerState((s) => ({ ...s, [key]: !s[key] }));
  }, []);

  const driversWithLocation = drivers.filter((d) => d.location);

  // Which toggleable categories actually exist in the current data.
  const present = {
    traffic: speedBands.length > 0,
    zones: zones.length > 0,
    hubs: hubs.length > 0 || showHub,
    orders: orders.length > 0,
  };

  // Whether there is anything at all to show on the map (Req 10.5).
  const hasContent =
    orders.length > 0 ||
    driversWithLocation.length > 0 ||
    zones.length > 0 ||
    routes.length > 0 ||
    hubs.length > 0 ||
    showHub ||
    incidents.length > 0 ||
    speedBands.length > 0;

  // Collect the currently-visible lat/lng points so MapControls' fit-to-content
  // can frame exactly what is on the map. Honors the layer visibility state.
  const getFitPoints = React.useCallback(() => {
    const pts = [];
    const push = (lat, lng) => {
      if (Number.isFinite(lat) && Number.isFinite(lng)) pts.push([lat, lng]);
    };
    if (layerState.orders) orders.forEach((o) => push(o.lat, o.lng));
    if (layerState.hubs) hubs.forEach((h) => push(h.lat, h.lng));
    if (layerState.zones) {
      zones.forEach((z) => (z.polygon || []).forEach((p) => push(p[0], p[1])));
    }
    if (layerState.traffic) {
      speedBands.forEach((s) => {
        push(s.StartLat, s.StartLon);
        push(s.EndLat, s.EndLon);
      });
    }
    driversWithLocation.forEach((d) => push(d.location.lat, d.location.lng));
    incidents.forEach((e) => push(e.Latitude, e.Longitude));
    routes.forEach((r) => (r.geometry || []).forEach((p) => push(p[0], p[1])));
    return pts;
  }, [orders, hubs, zones, speedBands, driversWithLocation, incidents, routes, layerState]);

  // Build the legend categories from what is currently shown (presence +
  // visibility). Swatches and icons resolve through Design_Tokens.
  const legendCategories = [];
  if (present.orders && layerState.orders)
    legendCategories.push({ id: "orders", label: "Orders", swatch: "hsl(var(--chart-3))", icon: Package });
  if (present.hubs && layerState.hubs)
    legendCategories.push({ id: "hubs", label: "Hubs", swatch: "hsl(var(--primary))", icon: Warehouse });
  if (present.zones && layerState.zones)
    legendCategories.push({ id: "zones", label: "Zones", swatch: "hsl(var(--primary))", icon: Shapes });
  if (present.traffic && layerState.traffic)
    legendCategories.push({ id: "traffic", label: "Traffic", swatch: "hsl(var(--chart-4))", icon: Gauge });
  if (routes.length > 0)
    legendCategories.push({ id: "routes", label: "Routes", swatch: "hsl(var(--primary))", icon: RouteIcon });
  if (driversWithLocation.length > 0)
    legendCategories.push({ id: "drivers", label: "Drivers", swatch: "hsl(var(--primary))", icon: Truck });
  if (incidents.length > 0)
    legendCategories.push({ id: "incidents", label: "Incidents", swatch: "hsl(var(--destructive))", icon: AlertTriangle });

  // Helper to split geometry for tracking. Returns segments described by intent
  // (traveled vs. remaining/full) rather than raw colors — the casing + colored
  // stroke and token classes are applied at render time (Req 12.5, 12.6). A
  // per-route `color` is honored for the remaining/full stroke when provided;
  // the traveled portion is always muted via the --muted-foreground token.
  const getRouteSegments = (routeRecord) => {
    const geometry = routeRecord.geometry || [];
    const explicitColor = routeRecord.color || null;

    if (!tracking || tracking.driver_id !== routeRecord.driver_id || !tracking.location || geometry.length < 2) {
      return [{ positions: geometry, kind: "remaining", explicitColor, weight: 4, key: "full" }];
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
      { positions: traveled, kind: "traveled", weight: 4, key: "traveled" },
      { positions: remaining, kind: "remaining", explicitColor, weight: 5, key: "remaining" },
    ];
  };

  return (
    <div className="map-wrap relative w-full" style={{ height }}>
      <MapContainer center={center} zoom={12} zoomControl={false} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
        <TileLayer
          key={tiles.variant}
          attribution={tiles.attribution}
          url={tiles.url}
        />

        {layerState.traffic && speedBands.map((s, i) => (
          <Polyline
            key={`sb-${i}`}
            positions={[[s.StartLat, s.StartLon], [s.EndLat, s.EndLon]]}
            pathOptions={{ color: speedColor(s.SpeedBand || 4), weight: 3, opacity: 0.5 }}
          />
        ))}

        {layerState.zones && zones.map((z) => {
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
              <LTooltip sticky className="lc-tooltip">{z.name} {isHighlighted && " (Your Zone)"}</LTooltip>
            </Polygon>
          );
        })}

        {routes.map((r, i) => (
          <React.Fragment key={`rt-wrap-${i}`}>
            {getRouteSegments(r).map((seg) => {
              const isTraveled = seg.kind === "traveled";
              // Casing: a wider, lower-opacity --background stroke beneath the
              // colored line for legibility against busy basemaps (Req 12.5).
              // Colored stroke: token --primary (or --muted-foreground when
              // traveled) via CSS class so it re-themes; an explicit per-route
              // color overrides the token when supplied.
              const strokeClass = isTraveled
                ? "lc-route-stroke lc-route-stroke--traveled"
                : seg.explicitColor
                ? "lc-route-stroke"
                : "lc-route-stroke lc-route-stroke--primary";
              const strokeOptions = {
                className: strokeClass,
                weight: seg.weight,
                opacity: isTraveled ? 0.6 : 0.95,
                lineCap: "round",
                lineJoin: "round",
                dashArray: isTraveled ? "6 9" : null,
              };
              if (!isTraveled && seg.explicitColor) strokeOptions.color = seg.explicitColor;
              return (
                <React.Fragment key={`rt-${i}-seg-${seg.key}`}>
                  <Polyline
                    positions={seg.positions}
                    interactive={false}
                    pathOptions={{
                      className: "lc-route-casing",
                      weight: seg.weight + 5,
                      opacity: 0.55,
                      lineCap: "round",
                      lineJoin: "round",
                    }}
                  />
                  <Polyline positions={seg.positions} pathOptions={strokeOptions} />
                </React.Fragment>
              );
            })}
            {getRouteArrows(r.geometry).map((a, ai) => (
              <Marker
                key={`rt-${i}-arrow-${ai}`}
                position={a.position}
                icon={buildArrowIcon(a.angle, r.color || undefined)}
                interactive={false}
                keyboard={false}
              />
            ))}
          </React.Fragment>
        ))}

        {layerState.hubs && hubs.map((h) => {
          const isHighlighted = highlight.hubId === h.id;
          return (
            <Marker key={h.id} position={[h.lat, h.lng]} icon={buildMarkerIcon("hub", { isDefault: !!h.is_default, isHighlighted, color: h.color })}>
              <Popup className="lc-popup">
                <div className="text-xs text-foreground space-y-0.5">
                  <div className="font-semibold flex items-center gap-1.5">
                    <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: h.color || "hsl(var(--primary))" }}></span>
                    <span>{h.name}</span>
                    {h.is_default && <span className="text-destructive">· default</span>}
                    {isHighlighted && <span className="text-primary">· YOUR HUB</span>}
                  </div>
                  {h.address && <div className="text-muted-foreground">{h.address}</div>}
                  <div className="text-muted-foreground">{h.lat.toFixed(4)}, {h.lng.toFixed(4)}</div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {layerState.hubs && showHub && hubs.length === 0 && (
          <Marker position={[1.3521, 103.8198]} icon={buildMarkerIcon("hub", { isDefault: true })}>
            <Popup className="lc-popup">Central Hub</Popup>
          </Marker>
        )}

        {layerState.orders && (
        <MarkerClusterGroup
          chunkedLoading
          showCoverageOnHover={false}
          maxClusterRadius={50}
          iconCreateFunction={(cluster) => buildClusterIcon(cluster.getChildCount())}
        >
          {orders.map((o) => (
            <Marker key={o.id} position={[o.lat, o.lng]} icon={buildMarkerIcon("order", { status: o.status })}>
              <Popup className="lc-popup">
                <div className="text-xs text-foreground space-y-0.5">
                  <div className="font-semibold">{o.code}</div>
                  <div>{o.address}</div>
                  <div className="text-muted-foreground">Postal {o.postal_code} · {o.weight_kg} kg</div>
                  <div>Status: <b className="font-semibold">{o.status}</b></div>
                  {o.sequence && <div>Sequence: #{o.sequence}</div>}
                </div>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
        )}

        {driversWithLocation.map((d) => (
          <Marker key={d.id} position={[d.location.lat, d.location.lng]} icon={buildMarkerIcon("driver", { initial: (d.name || "?")[0] })}>
            <Popup className="lc-popup">
              <div className="text-xs text-foreground space-y-0.5">
                <div className="font-semibold">{d.name}</div>
                <div>Status: {d.status}</div>
                <div className="text-muted-foreground">Last update: {d.location.updated_at}</div>
              </div>
            </Popup>
          </Marker>
        ))}

        {incidents.map((e, i) => (
          <Marker key={`inc-${i}`} position={[e.Latitude, e.Longitude]} icon={buildMarkerIcon("incident")}>
            <Popup className="lc-popup"><div className="text-xs text-foreground max-w-[260px]"><b className="font-semibold">{e.Type}</b><br/>{e.Message}</div></Popup>
          </Marker>
        ))}

        <MapControls
          layers={layerState}
          present={present}
          onToggleLayer={toggleLayer}
          getFitPoints={getFitPoints}
        />
        <MapLegend categories={legendCategories} />
      </MapContainer>

      {!hasContent && (
        <div className="pointer-events-none absolute inset-0 z-[1100] flex items-center justify-center p-4">
          <div className="pointer-events-auto w-full max-w-sm">
            <EmptyState
              title="No map data"
              message={emptyMessage}
              icon={MapPinOff}
            />
          </div>
        </div>
      )}
    </div>
  );
}
