import { useMemo, useState } from 'react'
import { hierarchy, tree } from 'd3-hierarchy'
import type { GraphData } from '../types'
import { buildRadialTree, type RadialTreeNode } from '../utils/buildRadialTree'
import { nodeDiameter } from './RelationshipNode'

// Real counterpart to relationshipWeb's now-superseded src/dev/RawRadialDemo.tsx mock demo --
// same rendering approach (compact circle + label, no per-node cards; labels stay horizontal
// and flip which side they anchor from rather than rotating, so there's no upside-down-text
// problem to solve), adapted to real GraphData instead of mock TreeUser data. Selection is
// owned by the host (RelationshipMap.tsx), same onNodeClick contract GraphCanvas already uses,
// so both canvases share one RightPanel without RightPanel needing to know which is active.

interface Props {
  graphData: GraphData
  currentUserId: string
  selectedNodeId: string | null
  pickerMode: boolean
  pickerEligibleIds: Set<string>
  onNodeClick: (nodeId: string) => void
  height: string
}

const RADIUS = 260
const PAD = 170

function polar(angle: number, radius: number, center: number) {
  const a = angle - Math.PI / 2
  return { x: center + radius * Math.cos(a), y: center + radius * Math.sin(a) }
}

function pruneCollapsed(node: RadialTreeNode, collapsed: Set<string>): RadialTreeNode {
  if (collapsed.has(node.id)) return { ...node, children: [] }
  return { ...node, children: node.children.map(c => pruneCollapsed(c, collapsed)) }
}

// Depth-1 nodes stay expanded by default; everything past that starts collapsed, since real
// multi-hop data (max_hops up to 3) can mean hundreds of nodes -- dumping all of it on screen
// at once defeats the point of a graph.
function defaultCollapsed(root: RadialTreeNode): Set<string> {
  const collapsed = new Set<string>()
  for (const depth1 of root.children) {
    for (const depth2 of depth1.children) collapsed.add(depth2.id)
  }
  return collapsed
}

export function RadialCanvas({ graphData, currentUserId, selectedNodeId, pickerMode, pickerEligibleIds, onNodeClick, height }: Props) {
  const fullTree = useMemo(() => buildRadialTree(graphData, currentUserId), [graphData, currentUserId])
  const [collapsed, setCollapsed] = useState<Set<string>>(() => (fullTree ? defaultCollapsed(fullTree) : new Set()))

  const root = useMemo(() => {
    if (!fullTree) return null
    const pruned = pruneCollapsed(fullTree, collapsed)
    const h = hierarchy(pruned, d => (d.children.length ? d.children : undefined))
    const layout = tree<RadialTreeNode>()
      .size([2 * Math.PI, RADIUS])
      .separation((a, b) => (a.parent === b.parent ? 1 : 2) / Math.max(a.depth, 1))
    return layout(h)
  }, [fullTree, collapsed])

  function toggle(id: string) {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (!fullTree || !root) {
    return (
      <div style={{ flex: 1, height, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#18150f' }}>
        <span style={{ fontSize: 13, color: '#8a7f70' }}>No graph data for this user</span>
      </div>
    )
  }

  const center = RADIUS + PAD
  const size = center * 2
  const nodes = root.descendants()
  const links = root.links()

  return (
    // `size` is a fixed logical diagram extent (RADIUS+PAD radial layout math), not tied to
    // this container's actual rendered size -- a host embedding this at less than size x size
    // (e.g. pooledTools's Connections panel, a wide-but-short ~920x415 box) used to clip
    // roughly half the diagram below the fold behind this div's own `overflow: auto`, with no
    // scrollbar affordance a real user would think to use. Fixed by letting the SVG's viewBox
    // scale the whole fixed-size diagram down (or up) to fit whatever box it's actually given,
    // instead of rendering at a literal size x size pixel size and relying on scrolling.
    <div style={{ flex: 1, height, overflow: 'hidden', background: '#18150f' }}>
      <svg viewBox={`0 0 ${size} ${size}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style={{ display: 'block' }}>
        {links.map((l, i) => {
          const s = polar(l.source.x, l.source.y, center)
          const t = polar(l.target.x, l.target.y, center)
          return <line key={i} x1={s.x} y1={s.y} x2={t.x} y2={t.y} stroke="#3a342c" strokeWidth={1.5} />
        })}
        {nodes.map(n => {
          const p = polar(n.x, n.y, center)
          const onRight = Math.cos(n.x - Math.PI / 2) >= 0
          const isFocalNode = n.data.id === currentUserId
          const isSelected = n.data.id === selectedNodeId
          const isCollapsed = collapsed.has(n.data.id)
          const hasChildren = n.data.children.length > 0
          const primaryColor = n.data.edgeTypes[0]?.color_hex || '#8a7f70'
          const dimmed = pickerMode && !pickerEligibleIds.has(n.data.id) && !isFocalNode
          const r = nodeDiameter(n.data.user, isFocalNode) / 2 / 3 // radial nodes are compact dots, not full avatars -- scale down from the force graph's avatar-sized diameter while still reflecting degree
          const etc = n.data.user.eligible_tool_count

          return (
            <g key={n.data.id} transform={`translate(${p.x},${p.y})`} style={{ opacity: dimmed ? 0.25 : 1 }}>
              <circle
                r={isFocalNode ? 11 : r}
                fill={isCollapsed ? '#3a342c' : (isFocalNode ? '#1d9e75' : primaryColor)}
                stroke={isSelected ? '#ee5524' : '#18150f'}
                strokeWidth={isSelected ? 3 : 2}
                style={{ cursor: hasChildren ? 'pointer' : 'default' }}
                onClick={hasChildren ? () => toggle(n.data.id) : undefined}
              />
              <text
                x={onRight ? 14 : -14}
                y={!isFocalNode && etc !== undefined ? -4 : 0}
                dy="0.32em"
                textAnchor={onRight ? 'start' : 'end'}
                onClick={() => onNodeClick(n.data.id)}
                style={{ cursor: 'pointer', fontSize: 12, fontWeight: isSelected ? 700 : 500, fill: isSelected ? '#f0ebe4' : '#c0b8ae' }}
              >
                {n.data.user.display_name}
              </text>
              {!isFocalNode && etc !== undefined && (
                <text
                  x={onRight ? 14 : -14}
                  y={12}
                  dy="0.32em"
                  textAnchor={onRight ? 'start' : 'end'}
                  onClick={() => onNodeClick(n.data.id)}
                  style={{ cursor: 'pointer', fontSize: 10, fontWeight: 500, fill: '#8a7f70' }}
                >
                  {(() => { const t = etc ?? 0; return `${t} tool${t === 1 ? '' : 's'}` })()}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
