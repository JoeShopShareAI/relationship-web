import { SEED_USERS, SEED_CONNECTIONS } from './seedData'

export interface TreeUser {
  id: string
  name: string
  types: string[]
  // Same three-state semantics as User.eligible_tool_count in types.ts — sourced from
  // SEED_USERS here rather than a separate fake map, since it's already there.
  eligibleToolCount?: number | null
  children?: TreeUser[]
}

const usersById = new Map(SEED_USERS.map(u => [u.id, u]))

// Builds an ego tree rooted at `focalId`, walking only connections OWNED by each node —
// matches the existing "graph canvas only shows connections owned by the focal user"
// convention noted in seedData.ts, so re-rooting behaves the same way the real force graph
// does when you switch focal users. A person who owns no connections in this small seed set
// renders as a leaf; that's sparse mock data, not a bug — every real user would own their own
// connections list.
export function buildEgoTree(focalId: string, maxDepth = 2): TreeUser {
  function walk(id: string, depth: number, cameFrom: string | null): TreeUser {
    const user = usersById.get(id)
    const edgeFromParent = cameFrom
      ? SEED_CONNECTIONS.find(c => c.owner_user_id === cameFrom && c.target_user_id === id)
      : undefined
    const owned = SEED_CONNECTIONS.filter(c => c.owner_user_id === id && c.target_user_id !== cameFrom)
    return {
      id,
      name: user?.display_name ?? id,
      types: edgeFromParent?.types ?? [],
      eligibleToolCount: user?.eligible_tool_count,
      children: depth < maxDepth ? owned.map(c => walk(c.target_user_id, depth + 1, id)) : undefined,
    }
  }
  return walk(focalId, 0, null)
}

export function findInTree(root: TreeUser, id: string): TreeUser | null {
  if (root.id === id) return root
  for (const child of root.children ?? []) {
    const found = findInTree(child, id)
    if (found) return found
  }
  return null
}

export function hasChildrenMap(root: TreeUser): Record<string, boolean> {
  const acc: Record<string, boolean> = {}
  function visit(n: TreeUser) {
    acc[n.id] = !!(n.children && n.children.length)
    n.children?.forEach(visit)
  }
  visit(root)
  return acc
}

// A person's full list of owned connections, independent of the current tree's depth cap or
// collapse state — this is what powers "their connections" inside the card, so you can jump
// straight to someone even past where inline expansion stops.
export function ownedConnections(id: string): Array<{ id: string; name: string; types: string[] }> {
  return SEED_CONNECTIONS
    .filter(c => c.owner_user_id === id)
    .map(c => ({
      id: c.target_user_id,
      name: usersById.get(c.target_user_id)?.display_name ?? c.target_user_id,
      types: c.types,
    }))
}
