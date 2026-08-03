import { useMemo, useState } from 'react'
import { hierarchy, tree } from 'd3-hierarchy'
import { buildEgoTree, findInTree, hasChildrenMap, type TreeUser } from './buildEgoTree'
import { SEED_CURRENT_USER_ID } from './seedData'
import { NodeDetailPanel } from './NodeDetailPanel'
import { TYPE_COLORS, DEFAULT_TYPE_COLOR } from './relationshipTypeColors'

// True radial layout via raw d3-hierarchy — matches the circular reference image, unlike
// TreeLibraryDemo (react-d3-tree has no radial mode). Cost: collapse/expand state, pruning,
// and re-rooting are all hand-rolled here instead of library-provided.
//
// Nodes are compact (circle + label) rather than full cards — cards overlapped badly once
// several were on screen, especially here where siblings pack tightly around the circle. Full
// detail lives in the single NodeDetailPanel instead, same pattern as the real RightPanel.tsx.
// Labels stay horizontal (never rotated to follow the spoke) and just flip which side they
// anchor from — right half anchors left-to-right, left half anchors right-to-left — so they're
// always readable with no upside-down-text problem to solve.

const RADIUS = 220
const PAD = 155
const CENTER = RADIUS + PAD
const SIZE = CENTER * 2

function polar(angle: number, radius: number) {
  const a = angle - Math.PI / 2
  return { x: CENTER + radius * Math.cos(a), y: CENTER + radius * Math.sin(a) }
}

function pruneCollapsed(node: TreeUser, collapsed: Set<string>): TreeUser {
  if (collapsed.has(node.id)) return { ...node, children: undefined }
  return { ...node, children: node.children?.map(c => pruneCollapsed(c, collapsed)) }
}

export function RawRadialDemo() {
  const [focalId, setFocalId] = useState(SEED_CURRENT_USER_ID)
  const [selectedId, setSelectedId] = useState(SEED_CURRENT_USER_ID)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const fullTree = useMemo(() => buildEgoTree(focalId), [focalId])
  const hasChildren = useMemo(() => hasChildrenMap(fullTree), [fullTree])
  const selectedNode = useMemo(() => findInTree(fullTree, selectedId), [fullTree, selectedId])

  const root = useMemo(() => {
    const prunedRoot = pruneCollapsed(fullTree, collapsed)
    const h = hierarchy(prunedRoot, d => d.children)
    const layout = tree<TreeUser>()
      .size([2 * Math.PI, RADIUS])
      .separation((a, b) => (1.4 * (a.parent === b.parent ? 1 : 2)) / Math.max(a.depth, 1))
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

  function focus(id: string) {
    setFocalId(id)
    setSelectedId(id)
    setCollapsed(new Set())
  }

  const nodes = root.descendants()
  const links = root.links()

  return (
    <div style={{ width: '100%', height: '100%', background: '#18150f', display: 'flex', flexDirection: 'column' }}>
      {focalId !== SEED_CURRENT_USER_ID && (
        <button
          onClick={() => focus(SEED_CURRENT_USER_ID)}
          style={{
            alignSelf: 'flex-start', margin: 10, padding: '5px 12px', borderRadius: 999,
            border: '1px solid #3a342c', background: 'transparent', color: '#c0b8ae',
            fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
          }}
        >
          ← Reset to Alice
        </button>
      )}
      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        <div style={{ flex: 1, minWidth: 0, overflow: 'auto' }}>
          <svg width={SIZE} height={SIZE}>
            {links.map((l, i) => {
              const s = polar(l.source.x, l.source.y)
              const t = polar(l.target.x, l.target.y)
              return <line key={i} x1={s.x} y1={s.y} x2={t.x} y2={t.y} stroke="#3a342c" strokeWidth={1.5} />
            })}
            {nodes.map(n => {
              const p = polar(n.x, n.y)
              const onRight = Math.cos(n.x - Math.PI / 2) >= 0
              const nodeHasChildren = hasChildren[n.data.id]
              const isCollapsed = collapsed.has(n.data.id)
              const isSelected = n.data.id === selectedId
              const isFocalNode = n.data.id === focalId
              const primaryColor = n.data.types[0] ? (TYPE_COLORS[n.data.types[0]] ?? DEFAULT_TYPE_COLOR) : '#8a7f70'
              const etc = n.data.eligibleToolCount
              return (
                <g key={n.data.id} transform={`translate(${p.x},${p.y})`}>
                  <circle
                    r={n.depth === 0 ? 11 : 7}
                    fill={isCollapsed ? '#3a342c' : primaryColor}
                    stroke={isSelected ? '#ee5524' : '#18150f'}
                    strokeWidth={isSelected ? 3 : 2}
                    style={{ cursor: nodeHasChildren ? 'pointer' : 'default' }}
                    onClick={nodeHasChildren ? () => toggle(n.data.id) : undefined}
                  />
                  <text
                    x={onRight ? 13 : -13}
                    y={etc !== undefined && !isFocalNode ? -4 : 0}
                    dy="0.32em"
                    textAnchor={onRight ? 'start' : 'end'}
                    onClick={() => setSelectedId(n.data.id)}
                    style={{ cursor: 'pointer', fontSize: 11.5, fontWeight: isSelected ? 700 : 500, fill: isSelected ? '#f0ebe4' : '#c0b8ae' }}
                  >
                    {n.data.name}
                  </text>
                  {!isFocalNode && etc !== undefined && (
                    <text
                      x={onRight ? 13 : -13}
                      y={12}
                      dy="0.32em"
                      textAnchor={onRight ? 'start' : 'end'}
                      onClick={() => setSelectedId(n.data.id)}
                      style={{ cursor: 'pointer', fontSize: 10, fontWeight: 500, fill: '#8a7f70' }}
                    >
                      {(() => { const n = etc ?? 0; return `${n} tool${n === 1 ? '' : 's'}` })()}
                    </text>
                  )}
                </g>
              )
            })}
          </svg>
        </div>
        <NodeDetailPanel node={selectedNode} isFocal={selectedId === focalId} onFocus={focus} />
      </div>
    </div>
  )
}
