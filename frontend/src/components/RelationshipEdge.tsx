import { memo, useState } from 'react'
import { useInternalNode, type EdgeProps } from '@xyflow/react'
import type { GraphEdgeType, GraphUser } from '../types'
import type { RelationshipNodeData } from './RelationshipNode'
import { nodeDiameter } from './RelationshipNode'

export interface RelationshipEdgeData {
  primary_type: string
  types: GraphEdgeType[]
  dimmed?: boolean
  [key: string]: unknown
}

// RelationshipNode renders as a circle at the TOP of a taller flex column (avatar, then name
// label, then rating chips below it) — not a circle centered in its own bounding box. Fixed
// Top/Bottom Handles (as this used to use) place edge endpoints at the box's top/bottom
// regardless of the actual angle to the other node, and "bottom" lands well past the circle,
// near the rating chips — which is exactly why edges looked disconnected from the bubbles.
// This computes the true point where the line between the two circles' centers crosses each
// circle's own boundary, so the edge always visually touches the node it connects to.
function circleCenter(internalNode: ReturnType<typeof useInternalNode>): { x: number; y: number; r: number } | null {
  if (!internalNode?.measured?.width || !internalNode.measured.height) return null
  const data = internalNode.data as RelationshipNodeData
  const diameter = nodeDiameter(data.user as GraphUser, data.isFocal)
  const r = diameter / 2
  const { x: left, y: top } = internalNode.internals.positionAbsolute
  return {
    x: left + internalNode.measured.width / 2, // circle is horizontally centered in the box
    y: top + r,                                 // circle is the first child, top-aligned
    r,
  }
}

export const RelationshipEdge = memo(function RelationshipEdge({
  source, target, data,
}: EdgeProps) {
  const [hovered, setHovered] = useState(false)
  const sourceInternal = useInternalNode(source)
  const targetInternal = useInternalNode(target)
  const edgeData = data as RelationshipEdgeData
  const types = edgeData?.types ?? []
  const dimmed = edgeData?.dimmed ?? false

  if (types.length === 0) return null

  const sourceCircle = circleCenter(sourceInternal)
  const targetCircle = circleCenter(targetInternal)
  if (!sourceCircle || !targetCircle) return null

  const dxCenters = targetCircle.x - sourceCircle.x
  const dyCenters = targetCircle.y - sourceCircle.y
  const centerDist = Math.sqrt(dxCenters * dxCenters + dyCenters * dyCenters) || 1
  const ux = dxCenters / centerDist
  const uy = dyCenters / centerDist

  const sourceX = sourceCircle.x + ux * sourceCircle.r
  const sourceY = sourceCircle.y + uy * sourceCircle.r
  const targetX = targetCircle.x - ux * targetCircle.r
  const targetY = targetCircle.y - uy * targetCircle.r

  const primary = types.find(t => t.key === edgeData?.primary_type) ?? types[0]
  const secondaries = types.filter(t => t.key !== primary.key)

  // Quadratic bezier control point (slight perpendicular offset for curve)
  const mx = (sourceX + targetX) / 2
  const my = (sourceY + targetY) / 2
  const dx = targetX - sourceX
  const dy = targetY - sourceY
  const len = Math.sqrt(dx * dx + dy * dy) || 1
  const cx = mx - (dy / len) * 20
  const cy = my + (dx / len) * 20

  const d = `M ${sourceX} ${sourceY} Q ${cx} ${cy} ${targetX} ${targetY}`

  // Tooltip anchored near the bezier midpoint (t=0.5 on quadratic bezier)
  const tipX = 0.25 * sourceX + 0.5 * cx + 0.25 * targetX
  const tipY = 0.25 * sourceY + 0.5 * cy + 0.25 * targetY

  return (
    <g
      style={{ opacity: dimmed ? 0.15 : 1, transition: 'opacity 0.2s' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Wide invisible hit area */}
      <path d={d} style={{ fill: 'none', stroke: 'transparent', strokeWidth: 14 }} />

      {/* Primary type line — inline styles override ReactFlow's CSS class rules */}
      <path
        d={d}
        style={{
          fill: 'none',
          stroke: primary.color_hex || '#c0b8ae',
          strokeWidth: 2.5,
          strokeDasharray: primary.edge_style === 'dashed' ? '8 4' : undefined,
          strokeLinecap: 'round',
        }}
      />

      {/* Multi-type indicator: one colored dot per secondary type, centered on midpoint */}
      {!hovered && secondaries.length > 0 && secondaries.map((t, i) => (
        <circle
          key={t.key}
          cx={tipX + (i - (secondaries.length - 1) / 2) * 11}
          cy={tipY}
          r={4.5}
          fill={t.color_hex}
          stroke="#18150f"
          strokeWidth={1.5}
        />
      ))}

      {/* Hover tooltip: show ALL relationship types (primary + secondary) */}
      {hovered && (
        <foreignObject
          x={tipX - 90}
          y={tipY - 12 - types.length * 22}
          width={180}
          height={10 + types.length * 22}
          style={{ pointerEvents: 'none', overflow: 'visible' }}
        >
          <div style={{
            background: '#1f2937',
            color: '#f9fafb',
            borderRadius: 6,
            padding: '6px 10px',
            fontSize: 12,
            lineHeight: '1.4',
            boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
            whiteSpace: 'nowrap',
          }}>
            {types.map((t, i) => (
              <div key={t.key} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: i < types.length - 1 ? 4 : 0 }}>
                <div style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: t.color_hex,
                  flexShrink: 0,
                }} />
                <span>{t.name}</span>
              </div>
            ))}
          </div>
        </foreignObject>
      )}
    </g>
  )
})
