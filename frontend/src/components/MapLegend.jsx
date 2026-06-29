import * as React from "react";
import L from "leaflet";
import { ChevronDown, ChevronUp } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

/**
 * MapLegend — a collapsible Design_System card (bottom-left of the map) that
 * names each marker / route / overlay category currently shown on the map
 * (Requirements 10.2, 12.7). Each entry pairs a token-driven color swatch with
 * a lucide icon and the category label, so categories are distinguishable by
 * both color and shape.
 *
 * Rendered as a child of `<MapContainer>` so it positions absolutely within the
 * map root. Pointer/scroll events are stopped from reaching the map so
 * expanding/collapsing the legend never pans the map underneath.
 *
 * All colors resolve through Design_Tokens (swatches use `hsl(var(--token))`);
 * no raw hex values.
 *
 * @param {Object} props
 * @param {Array<{id:string,label:string,swatch:string,icon:import("lucide-react").LucideIcon}>} props.categories
 *   The categories currently visible on the map. When empty the legend renders
 *   nothing (the empty-state overlay covers the no-data case).
 * @param {boolean} [props.defaultOpen=true] Whether the legend starts expanded.
 * @returns {JSX.Element|null}
 */
export default function MapLegend({ categories = [], defaultOpen = true }) {
  const [open, setOpen] = React.useState(defaultOpen);

  const stopRef = React.useCallback((el) => {
    if (el) {
      L.DomEvent.disableClickPropagation(el);
      L.DomEvent.disableScrollPropagation(el);
    }
  }, []);

  if (!Array.isArray(categories) || categories.length === 0) return null;

  return (
    <div ref={stopRef} className="lc-map-legend absolute bottom-3 left-3 z-[1000]">
      <Card className="w-44 overflow-hidden p-0">
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              aria-label={open ? "Collapse map legend" : "Expand map legend"}
            >
              <span>Legend</span>
              {open ? (
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              ) : (
                <ChevronUp className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ul className="space-y-1.5 px-3 pb-3 pt-1">
              {categories.map(({ id, label, swatch, icon: Icon }) => (
                <li key={id} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span
                    aria-hidden="true"
                    className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm text-[hsl(var(--primary-foreground))]"
                    style={{ background: swatch }}
                  >
                    {Icon ? <Icon className="h-2.5 w-2.5" /> : null}
                  </span>
                  <span className="text-foreground">{label}</span>
                </li>
              ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  );
}
