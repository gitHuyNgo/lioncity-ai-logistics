/**
 * Declarative role-based navigation configuration for the LionCity client.
 *
 * Replaces the inline `NAV` array + branching role filter that previously lived
 * in `App.js`. Each navigation item carries an explicit `roles` array, so
 * visibility is expressed as *data* rather than conditional logic. The
 * filtering is performed by the pure {@link buildNav} function (see the
 * `buildNav` pseudocode in design.md), and {@link getNavForRole} is the
 * convenience wrapper bound to {@link NAV_CONFIG}.
 *
 * Parity guarantee (design.md "Nav parity", Property 3): for every role the
 * output is identical to the previous inline `App.js` filter — same groups,
 * same items, same order, with empty groups dropped.
 *
 * The previous inline filter behaved as:
 *   - super_admin → every item
 *   - hub_manager → every item EXCEPT "/hub-managers"
 *   - shipper     → only items whose `to` ∈ ["/", "/shipper", "/routing"]
 *   - any other / missing role → no items
 *
 * Those rules are encoded below via each item's `roles` array.
 *
 * @see {@link buildNav}
 * @see {@link getNavForRole}
 */

import {
  LayoutDashboard,
  Route as RouteIcon,
  Package,
  Users,
  Truck,
  Map,
  Warehouse,
  UserCircle2,
  RadioTower,
} from "lucide-react";

/**
 * A user's permission level.
 * @typedef {"super_admin"|"hub_manager"|"shipper"} Role
 */

/**
 * A single navigation destination.
 * @typedef {Object} NavItem
 * @property {string} to        Route path (e.g. "/", "/routing").
 * @property {string} label     Human-readable label shown in the sidebar.
 * @property {import("lucide-react").LucideIcon} icon  Lucide icon component.
 * @property {boolean} [end]    Passed to `NavLink` `end` for exact matching.
 * @property {Role[]} roles     Roles permitted to see/activate this item.
 */

/**
 * A labeled group of navigation items.
 * @typedef {Object} NavGroup
 * @property {string} group     Group heading.
 * @property {NavItem[]} items  Items belonging to the group.
 */

/** All three roles — convenience constant for items visible to everyone. */
const ALL_ROLES = /** @type {Role[]} */ (["super_admin", "hub_manager", "shipper"]);

/** Roles for hub-level operational items (super admin + hub manager). */
const OPERATIONS_ROLES = /** @type {Role[]} */ (["super_admin", "hub_manager"]);

/** Roles for admin-only items. */
const ADMIN_ROLES = /** @type {Role[]} */ (["super_admin"]);

/**
 * Declarative navigation configuration. Group order and item order are
 * significant and preserved by {@link buildNav}.
 *
 * @type {NavGroup[]}
 */
export const NAV_CONFIG = [
  {
    group: "Command",
    items: [
      { to: "/", label: "Overview", icon: LayoutDashboard, end: true, roles: ALL_ROLES },
      { to: "/routing", label: "Route Planning", icon: RouteIcon, roles: ALL_ROLES },
    ],
  },
  {
    group: "Operations (Hub Manager)",
    items: [
      { to: "/orders", label: "Orders & Dispatch", icon: Package, roles: OPERATIONS_ROLES },
      { to: "/drivers", label: "Shippers", icon: Users, roles: OPERATIONS_ROLES },
      { to: "/vehicles", label: "Fleet", icon: Truck, roles: OPERATIONS_ROLES },
      { to: "/zones", label: "Zones", icon: Map, roles: OPERATIONS_ROLES },
      { to: "/hubs", label: "Hubs", icon: Warehouse, roles: OPERATIONS_ROLES },
    ],
  },
  {
    group: "Admin & Field",
    items: [
      { to: "/hub-managers", label: "Hub Managers", icon: UserCircle2, roles: ADMIN_ROLES },
      { to: "/shipper", label: "Shipper Cockpit", icon: RadioTower, roles: ALL_ROLES },
    ],
  },
];

/**
 * Filter a navigation config down to the items a given role may see.
 *
 * Pure function. Preserves group order and item order, includes only items
 * whose `roles` array contains `role`, and drops any group left with zero
 * items. An unknown or missing `role` yields an empty array (no group has an
 * item permitting it), matching the previous inline filter's `return false`
 * default.
 *
 * @param {NavGroup[]} navConfig The declarative navigation config.
 * @param {Role|string|null|undefined} role The authenticated user's role.
 * @returns {NavGroup[]} Role-filtered navigation, order-preserved, no empty groups.
 */
export function buildNav(navConfig, role) {
  const visibleNav = [];
  for (const group of navConfig) {
    const items = group.items.filter((item) => item.roles.includes(role));
    if (items.length > 0) {
      visibleNav.push({ ...group, items });
    }
  }
  return visibleNav;
}

/**
 * Convenience wrapper: the role-filtered navigation derived from
 * {@link NAV_CONFIG}.
 *
 * @param {Role|string|null|undefined} role The authenticated user's role.
 * @returns {NavGroup[]} `buildNav(NAV_CONFIG, role)`.
 */
export function getNavForRole(role) {
  return buildNav(NAV_CONFIG, role);
}
