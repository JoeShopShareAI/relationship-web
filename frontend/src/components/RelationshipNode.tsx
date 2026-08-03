import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { GraphUser, Rating, RatingDimension } from '../types'

export interface RelationshipNodeData {
  user: GraphUser
  ratings: Rating[]
  ratingDimensions: RatingDimension[]
  visibleRatingDimensions: string[]
  isSelected: boolean
  isFocal: boolean
  dimmed: boolean
  eligible: boolean
  pickerMode: boolean
  [key: string]: unknown
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

// Shared with RelationshipEdge.tsx so edges connect to the same circle they see rendered —
// duplicating this formula in two places is how they'd silently drift apart again.
export function nodeDiameter(user: GraphUser, isFocal: boolean): number {
  return isFocal ? 64 : Math.min(48 + user.connection_count * 3, 72)
}

function NodeContent({ data }: { data: RelationshipNodeData }) {
  const { user, isSelected, isFocal, dimmed, eligible, pickerMode } = data

  const size = nodeDiameter(user, isFocal)
  const fontSize = isFocal ? 20 : Math.min(14 + user.connection_count, 20)
  const borderColor = isSelected ? '#ee5524' : isFocal ? '#1d9e75' : '#3a342c'
  const glowColor   = isSelected ? 'rgba(238,85,36,0.35)' : isFocal ? 'rgba(29,158,117,0.3)' : 'none'

  return (
    <div
      style={{
        opacity: dimmed ? 0.25 : 1,
        transition: 'opacity 0.2s',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        position: 'relative',
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          overflow: 'hidden',
          border: `2.5px solid ${borderColor}`,
          boxShadow: glowColor !== 'none' ? `0 0 0 3px ${glowColor}` : '0 2px 8px rgba(0,0,0,0.5)',
          background: '#2e2920',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {user.photo_url ? (
          <img src={user.photo_url} alt={user.display_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ fontSize, fontWeight: 700, color: '#c0b8ae', letterSpacing: 0.5 }}>{initials(user.display_name)}</span>
        )}
      </div>

      {/* Eligible checkmark badge for picker mode */}
      {pickerMode && eligible && (
        <div style={{
          position: 'absolute',
          top: -4,
          right: -4,
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: '#1d9e75',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          color: '#fff',
        }}>✓</div>
      )}

      {/* Name */}
      <div style={{
        fontSize: 11,
        fontWeight: isFocal ? 700 : 500,
        color: isFocal ? '#f0ebe4' : '#c0b8ae',
        textAlign: 'center',
        maxWidth: 90,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        background: 'rgba(24,21,15,0.88)',
        borderRadius: 4,
        padding: '2px 6px',
        border: '1px solid #2e2920',
      }}>
        {user.display_name}
      </div>

      {/* Eligible-tool count — replaces the old inline rating badges. undefined (host hasn't
          wired eligible_tool_count) renders nothing; null (not eligible) displays the same as
          0 — the graph shows a count, not a reason. */}
      {!isFocal && user.eligible_tool_count !== undefined && (
        <div style={{
          background: '#2e2920',
          border: '1px solid #3a342c',
          borderRadius: 4,
          padding: '1px 6px',
          fontSize: 10,
          color: '#8a7f70',
          whiteSpace: 'nowrap',
        }}>
          {(() => {
            const n = user.eligible_tool_count ?? 0
            return `${n} tool${n === 1 ? '' : 's'}`
          })()}
        </div>
      )}
    </div>
  )
}

export const RelationshipNode = memo(function RelationshipNode({ data }: NodeProps) {
  const nodeData = data as RelationshipNodeData
  return (
    <>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <NodeContent data={nodeData} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </>
  )
})
