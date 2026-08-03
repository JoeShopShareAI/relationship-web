import type { GraphData } from '../types'

// Both canvases (Force and Radial) should read as "who I'm connected to," not the full
// multi-hop closure the backend returns (which includes other people's edges, and both
// directions of a mutual connection -- needed elsewhere, e.g. the picker and the RightPanel's
// selected-person detail view, but not for what gets drawn as the primary user's graph).
// Restrict to edges the focal user actually owns, then drop any node that isn't the focal user
// or the target of one of those edges -- a node only reachable through someone else's edge
// would otherwise render with no line at all (Force) or as a deeper tree branch (Radial).
export function toDirectGraphData(graphData: GraphData, currentUserId: string): GraphData {
  const edges = graphData.edges.filter(e => e.owner_user_id === currentUserId)
  const directIds = new Set([currentUserId, ...edges.map(e => e.target_user_id)])
  const users = graphData.users.filter(u => directIds.has(u.id))
  return { ...graphData, users, edges }
}
