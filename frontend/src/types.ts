import type { ReactNode } from 'react'

export interface User {
  id: string
  display_name: string
  photo_url?: string | null
  host_user_id: string
  notes?: string | null
  created_at?: string
  // How many of this person's tools the CURRENT VIEWER (not this user) is eligible to borrow
  // per pooledTools' lending-rule policy engine. relationshipWeb has no access to Tool or
  // policy data at all — this is entirely host-supplied. Three distinct states, not two:
  //   undefined -> host hasn't wired this; render nothing (fully backward compatible)
  //   null      -> host wired it, and evaluated this person as NOT eligible for the viewer
  //   number    -> host wired it, person IS eligible, this many tools (0 is valid: eligible,
  //                nothing currently listed)
  eligible_tool_count?: number | null
}

export interface GraphUser extends User {
  pos_x?: number | null
  pos_y?: number | null
  is_pinned: boolean
  connection_count: number
}

export interface RelationshipType {
  id: number
  key: string
  name: string
  color_hex: string
  edge_style: 'solid' | 'dashed'
  sort_order: number
  is_active: boolean
}

export interface GraphEdgeType {
  key: string
  name: string
  color_hex: string
  edge_style: 'solid' | 'dashed'
}

export interface GraphEdge {
  id: number
  owner_user_id: string
  target_user_id: string
  primary_type: string
  types: GraphEdgeType[]
}

export interface Rating {
  id: number
  rated_user_id: string
  rater_user_id: string
  dimension_key: string
  score: number
  notes?: string | null
  created_at: string
}

export interface RatingDimension {
  key: string
  label: string
  icon?: string
}

export interface GraphData {
  users: GraphUser[]
  edges: GraphEdge[]
  ratings: Rating[]
  relationship_types: RelationshipType[]
}

export interface PickerUser {
  id: string
  display_name: string
  photo_url?: string | null
  host_user_id: string
  hop_count: number
  path: string[]
}

export interface PickerResponse {
  eligible: PickerUser[]
  total_in_graph: number
}

export interface NodePositionItem {
  target_user_id: string
  pos_x: number
  pos_y: number
  is_pinned: boolean
}

export interface UserSearchResult {
  id: string
  display_name: string
  photo_url?: string | null
}

export interface RelationshipMapProps {
  currentUserId: string
  mode?: 'explorer' | 'picker'
  apiUrl?: string
  // Bearer token attached to every apiUrl request (graph fetch, connection
  // create/update/delete, positions, ratings, picker, user upsert). Hosts
  // embedding this package behind an authenticated API must supply this --
  // without it, requests are sent with no Authorization header at all.
  authToken?: string
  searchUsers?: (query: string) => Promise<UserSearchResult[]>
  data?: {
    users: User[]
    connections: Array<{ id: number; owner_user_id: string; target_user_id: string; primary_type?: string; types: string[] }>
    ratings: Rating[]
  }
  // How many hops out from currentUserId to fetch, in apiUrl mode only (controlled/`data` mode
  // stays depth-1, unchanged — it's host-supplied mock/demo data, not a live multi-hop fetch).
  // Backend caps this at 3 regardless of what's passed. Defaults to 1 (today's behavior) if
  // omitted, so this is purely additive for existing hosts.
  maxHops?: number
  ratingDimensions?: RatingDimension[]
  pickerTitle?: string
  pickerMaxDepth?: number
  pickerAllowedTypes?: string[]
  pickerRequireTypesAlongPath?: boolean
  onSelect?: (users: User[]) => void
  onNodeClick?: (user: User) => void
  onConnectionAdd?: (conn: unknown) => void
  onRatingSubmit?: (rating: unknown) => void
  // Fired when the user clicks a connection inside the detail panel's "their connections"
  // list (or an earlier breadcrumb in the TopBar), requesting the graph re-center on that
  // person. Second argument is that person's display name, since RelationshipMap has no
  // reliable way to resolve it again once they've fallen out of graphData.users -- the host
  // needs it to build `focusPath` below. RelationshipMap does not change `currentUserId`
  // itself -- it's a host-owned prop -- so the host must handle this by updating whatever
  // value it passes as `currentUserId`. Without this callback wired, the list still renders
  // but rows aren't clickable.
  //
  // apiUrl mode: re-centering onto someone other than the authenticated viewer is an
  // access-control decision (should the viewer be able to walk beyond their own N-hop
  // network?) -- that's the host's route/auth call, not this library's. pooledTools resolves
  // it by only authorizing re-center onto a user already reachable within the viewer's own
  // maxHops network (see backend/relmap/routes/graph.py), so focusing never exposes anyone
  // the viewer couldn't already see an edge to.
  onFocusUser?: (userId: string, displayName: string) => void
  // Breadcrumb trail from wherever browsing started to the current currentUserId, oldest
  // first, rendered in the TopBar when there's more than one entry. Host-owned and
  // host-resolved (names, not just ids) for the same reason onFocusUser is host-owned:
  // once you've focused past someone, they may have fallen out of graphData.users entirely
  // (the canvas only shows the current focal user's owned connections), so the library has no
  // reliable way to resolve an ancestor's display name on its own.
  focusPath?: Array<{ id: string; name: string }>
  visibleRatingDimensions?: string[]
  showSearch?: boolean
  // Gates LeftSidebar's own "+ Add person" button (default true, so existing hosts see no
  // change). That button creates a relmap connection directly (api.createConnection), with no
  // request/accept step — a host that layers its own consent-based connection-request flow on
  // top (like pooledTools) should set this false, or the two ways of adding someone diverge:
  // one asks the other person, one doesn't.
  showAddPerson?: boolean
  // TopBar's mode-toggle button text for the 'picker' mode, default 'Picker'. Exists so a host
  // repurposing picker mode for something else entirely (pooledTools: pending connection
  // requests, not "select eligible people") can relabel the button without this component
  // needing to know why.
  pickerLabel?: string
  // If supplied, replaces the default <PickerOverlay> content when mode === 'picker'.
  // PickerOverlay.tsx itself is untouched and still used when this is omitted -- this is an
  // extension point for a host whose "picker mode" means something this library has no
  // business knowing about (e.g. pooledTools' pending-request accept/decline). Receives this
  // component's own graph-refetch function, so the host's content can bring the graph
  // up to date in place (e.g. after an accept) without forcing a full remount that would lose
  // the current selection.
  renderPickerOverlay?: (refresh: () => void) => ReactNode
  // Fired whenever the user flips between explorer/picker mode via TopBar. `mode` itself stays
  // seed-only (matches existing behavior) -- this is just notification, for a host that wants
  // to react to the toggle (e.g. pooledTools clearing a "pending requests" badge).
  onModeChange?: (mode: 'explorer' | 'picker') => void
  // If supplied, RightPanel's relationship-type tags become an editable multi-select instead
  // of read-only. `add` is true to apply a type, false to remove it. Only ever called for a
  // type on a connection OWNED by currentUserId (RightPanel only renders the editable version
  // when such a connection exists) -- matches this package's existing selectedEdge gating.
  onToggleConnectionType?: (targetUserId: string, typeKey: string, add: boolean) => Promise<void>
  height?: string
}
