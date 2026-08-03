import { useCallback, useMemo, useState } from 'react'
import Tree from 'react-d3-tree'
import type { RawNodeDatum, CustomNodeElementProps } from 'react-d3-tree'
import { buildEgoTree, findInTree, type TreeUser } from './buildEgoTree'
import { SEED_CURRENT_USER_ID } from './seedData'
import { NodeDetailPanel } from './NodeDetailPanel'
import { TYPE_COLORS, DEFAULT_TYPE_COLOR } from './relationshipTypeColors'

// react-d3-tree has no radial mode (Orientation = 'horizontal' | 'vertical' only — checked
// node_modules/react-d3-tree/lib/types/types/common.d.ts directly). This demo is the
// horizontal/vertical tidy-tree option: less code than RawRadialDemo because collapse/expand
// state is handled by the library, at the cost of not matching the circular reference image.
//
// Nodes are compact (circle + label) rather than full cards — a card per node overlapped
// badly once several were on screen. Full detail lives in the single NodeDetailPanel instead,
// same pattern as the real RightPanel.tsx in the force graph.
// RawNodeDatum.attributes only accepts string | number | boolean — `null` (a real, distinct
// "not eligible" state, not "unset") gets encoded as the string 'null' and decoded back below.
function toRawNodeDatum(u: TreeUser): RawNodeDatum {
  return {
    name: u.name,
    attributes: {
      id: u.id,
      types: u.types.join(','),
      ...(u.eligibleToolCount !== undefined
        ? { eligibleToolCount: u.eligibleToolCount === null ? 'null' : u.eligibleToolCount }
        : {}),
    },
    children: u.children?.map(toRawNodeDatum),
  }
}

export function TreeLibraryDemo() {
  const [focalId, setFocalId] = useState(SEED_CURRENT_USER_ID)
  const [selectedId, setSelectedId] = useState(SEED_CURRENT_USER_ID)
  const tree = useMemo(() => buildEgoTree(focalId), [focalId])
  const data = useMemo(() => toRawNodeDatum(tree), [tree])
  const selectedNode = useMemo(() => findInTree(tree, selectedId), [tree, selectedId])

  function focus(id: string) {
    setFocalId(id)
    setSelectedId(id)
  }

  const renderNode = useCallback(({ nodeDatum, toggleNode }: CustomNodeElementProps) => {
    const id = String(nodeDatum.attributes?.id ?? '')
    const types = String(nodeDatum.attributes?.types ?? '').split(',').filter(Boolean)
    const hasChildren = !!(nodeDatum.children && nodeDatum.children.length)
    const collapsed = !!nodeDatum.__rd3t.collapsed
    const isSelected = id === selectedId
    const isFocalNode = id === focalId
    const primaryColor = types[0] ? (TYPE_COLORS[types[0]] ?? DEFAULT_TYPE_COLOR) : '#8a7f70'
    const etcRaw = nodeDatum.attributes?.eligibleToolCount
    const eligibleToolCount = etcRaw === undefined ? undefined : etcRaw === 'null' ? null : Number(etcRaw)

    return (
      <g>
        <circle
          r={8}
          fill={collapsed ? '#3a342c' : primaryColor}
          stroke={isSelected ? '#ee5524' : '#18150f'}
          strokeWidth={isSelected ? 3 : 2}
          onClick={hasChildren ? toggleNode : undefined}
          style={{ cursor: hasChildren ? 'pointer' : 'default' }}
        />
        <text
          x={15}
          dy="0.32em"
          onClick={() => setSelectedId(id)}
          style={{ cursor: 'pointer', fontSize: 12, fontWeight: isSelected ? 700 : 500, fill: isSelected ? '#f0ebe4' : '#c0b8ae' }}
        >
          {nodeDatum.name}
        </text>
        {!isFocalNode && eligibleToolCount !== undefined && (
          <text
            x={15}
            y={14}
            onClick={() => setSelectedId(id)}
            style={{ cursor: 'pointer', fontSize: 10, fontWeight: 500, fill: '#8a7f70' }}
          >
            {(() => { const n = eligibleToolCount ?? 0; return `${n} tool${n === 1 ? '' : 's'}` })()}
          </text>
        )}
      </g>
    )
  }, [selectedId, focalId])

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
        <div style={{ flex: 1, minWidth: 0 }}>
          <Tree
            key={focalId}
            data={data}
            orientation="horizontal"
            renderCustomNodeElement={renderNode}
            collapsible
            pathFunc="step"
            translate={{ x: 60, y: 300 }}
            separation={{ siblings: 1, nonSiblings: 1.3 }}
            nodeSize={{ x: 180, y: 52 }}
            zoomable
          />
        </div>
        <NodeDetailPanel node={selectedNode} isFocal={selectedId === focalId} onFocus={focus} />
      </div>
    </div>
  )
}
