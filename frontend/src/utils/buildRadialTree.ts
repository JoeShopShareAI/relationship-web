import type { GraphData, GraphUser, GraphEdgeType } from '../types'

export interface RadialTreeNode {
  id: string
  user: GraphUser
  edgeTypes: GraphEdgeType[] // type(s) of the edge FROM parent TO this node; [] for the root
  children: RadialTreeNode[]
}

// Flattens GraphData's edge list into a spanning tree rooted at rootId via BFS, mirroring the
// same owner_user_id -> target_user_id traversal the backend used to discover this data
// (relmap/routes/graph.py's layered BFS) -- so the tree shape matches how the data was
// actually reached, not an arbitrary re-derivation. GraphData is a real graph, not a tree (it
// can contain cycles and multiple paths to the same node once max_hops > 1); each node keeps
// only its first-discovered parent, same spanning-tree convention as the backend's own
// `visited` set.
export function buildRadialTree(graphData: GraphData, rootId: string): RadialTreeNode | null {
  const usersById = new Map(graphData.users.map(u => [u.id, u]))
  const rootUser = usersById.get(rootId)
  if (!rootUser) return null

  const edgesByOwner = new Map<string, GraphData['edges']>()
  for (const e of graphData.edges) {
    const list = edgesByOwner.get(e.owner_user_id) ?? []
    list.push(e)
    edgesByOwner.set(e.owner_user_id, list)
  }

  const visited = new Set([rootId])
  const root: RadialTreeNode = { id: rootId, user: rootUser, edgeTypes: [], children: [] }
  const queue: RadialTreeNode[] = [root]

  while (queue.length) {
    const node = queue.shift()!
    for (const edge of edgesByOwner.get(node.id) ?? []) {
      if (visited.has(edge.target_user_id)) continue
      const targetUser = usersById.get(edge.target_user_id)
      if (!targetUser) continue
      visited.add(edge.target_user_id)
      const child: RadialTreeNode = {
        id: edge.target_user_id,
        user: targetUser,
        edgeTypes: edge.types,
        children: [],
      }
      node.children.push(child)
      queue.push(child)
    }
  }

  return root
}
