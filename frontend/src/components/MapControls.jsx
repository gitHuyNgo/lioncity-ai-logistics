import * as React from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { ZoomIn, ZoomOut, Maximize, Gauge, Shapes, Warehouse, Package } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * MapControls — an on-map overlay cluster of Design_System-styled controls for
 * zoom, fit-to-content (recenter), and layer visibility (Requirement 12.7).
 *
 * Rendered as a child of `<MapContainer>` so it can drive the Leaflet map via
 * `useMap()` directly (`zoomIn`/`zoomOut`/`fitBounds`) and so it positions
 * itself absolutely within the map's (relatively-positioned) root element.
 *
 * Accessibility / interaction notes:
 *   - Every control is a real `<button>` (shadcn `Button`/`Toggle`) so it is
 *     keyboard reachable and Enter/Space-activatable with a `:focus-visible`
 *     ring (Req 12.7, 7.x). Icon-only controls carry an `aria-label` and a
 *     `Tooltip` describing their purpose.
 *   - Pointer/scroll events on the overlay are stopped from propagating to the
 *     map so clicking a control never pans/zooms the map underneath.
 *   - All colors resolve through Design_Tokens (no raw hex).
 *
 * Layer toggles are only rendered for the categories actually present in the
 * map data (`present`), so the overlay never offers a toggle for data that is
 * not on the map.
 *
 * @param {Object} props
 * @param {{traffic?:boolean,zones?:boolean,hubs?:boolean,orders?:boolean}} props.layers
 *   Current visibility state for each toggleable layer.
 * @param {(key:"traffic"|"zones"|"hubs"|"orders")=>void} props.onToggleLayer
 *   Called when the user toggles a layer.
 * @param {{traffic?:boolean,zones?:boolean,hubs?:boolean,orders?:boolean}} [props.present]
 *   Which toggleable categories exist in the current data. Only present
 *   categories get a toggle.
 * @param {() => Array<[number, number]>} [props.getFitPoints] Returns the
 *   lat/lng points to frame for fit-to-content; if it returns none, fit no-ops.
 * @returns {JSX.Element}
 */
export default function MapControls({ layers = {}, onToggleLayer, present = {}, getFitPoints }) {
  const map = useMap();

  // Stop map drag/scroll when interacting with the overlay.
  const stopRef = React.useCallback((el) => {
    if (el) {
      L.DomEvent.disableClickPropagation(el);
      L.DomEvent.disableScrollPropagation(el);
    }
  }, []);

  const handleZoomIn = React.useCallback(() => map.zoomIn(), [map]);
  const handleZoomOut = React.useCallback(() => map.zoomOut(), [map]);
  const handleFit = React.useCallback(() => {
    const pts = typeof getFitPoints === "function" ? getFitPoints() : [];
    if (!Array.isArray(pts) || pts.length === 0) return; // no-op when nothing to frame
    map.fitBounds(L.latLngBounds(pts), { padding: [40, 40] });
  }, [map, getFitPoints]);

  const LAYER_DEFS = [
    { key: "traffic", label: "Traffic", icon: Gauge },
    { key: "zones", label: "Zones", icon: Shapes },
    { key: "hubs", label: "Hubs", icon: Warehouse },
    { key: "orders", label: "Orders", icon: Package },
  ];
  const visibleLayers = LAYER_DEFS.filter((l) => present[l.key]);

  return (
    <TooltipProvider delayDuration={300}>
      <div
        ref={stopRef}
        className="lc-map-controls absolute right-3 top-3 z-[1000] flex flex-col items-end gap-2"
      >
        {/* Zoom + fit cluster */}
        <div className="flex flex-col overflow-hidden rounded-md border border-border bg-card shadow">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="rounded-none"
                aria-label="Zoom in"
                onClick={handleZoomIn}
              >
                <ZoomIn />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Zoom in</TooltipContent>
          </Tooltip>
          <div className="h-px w-full bg-border" aria-hidden="true" />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="rounded-none"
                aria-label="Zoom out"
                onClick={handleZoomOut}
              >
                <ZoomOut />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Zoom out</TooltipContent>
          </Tooltip>
          <div className="h-px w-full bg-border" aria-hidden="true" />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="rounded-none"
                aria-label="Fit map to content"
                onClick={handleFit}
              >
                <Maximize />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Fit to content</TooltipContent>
          </Tooltip>
        </div>

        {/* Layer visibility toggles (only for present categories) */}
        {visibleLayers.length > 0 ? (
          <div className="flex flex-col gap-1 rounded-md border border-border bg-card p-1 shadow">
            {visibleLayers.map(({ key, label, icon: Icon }) => {
              const on = layers[key] !== false;
              return (
                <Tooltip key={key}>
                  <TooltipTrigger asChild>
                    <Toggle
                      size="sm"
                      pressed={on}
                      onPressedChange={() => onToggleLayer && onToggleLayer(key)}
                      aria-label={`${on ? "Hide" : "Show"} ${label} layer`}
                      className={cn(
                        "justify-start gap-2 px-2",
                        on ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      <Icon />
                      <span className="text-xs font-medium">{label}</span>
                    </Toggle>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    {on ? `Hide ${label}` : `Show ${label}`}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        ) : null}
      </div>
    </TooltipProvider>
  );
}
