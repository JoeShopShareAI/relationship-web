import { ownedConnections, type TreeUser } from './buildEgoTree'
import { TYPE_COLORS, TYPE_LABELS, DEFAULT_TYPE_COLOR } from './relationshipTypeColors'

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

// Styled to match the real RightPanel.tsx deliberately — same width, colors, section
// structure — so this reads as one system across all three views, not a different design
// language per demo.
export function NodeDetailPanel({
  node,
  isFocal,
  onFocus,
}: {
  node: TreeUser | null
  isFocal: boolean
  onFocus: (id: string) => void
}) {
  if (!node) {
    return (
      <div style={{ width: 260, borderLeft: '1px solid #2a251e', background: '#1c1814', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: 13, color: '#8a7f70' }}>Select a person</span>
      </div>
    )
  }

  const connections = ownedConnections(node.id)

  return (
    <div style={{ width: 260, borderLeft: '1px solid #2a251e', background: '#1c1814', display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden' }}>
      <div style={{ padding: '10px 14px', borderBottom: '1px solid #2a251e' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#c0b8ae' }}>Detail</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div
            style={{
              width: 52, height: 52, borderRadius: '50%', background: '#2e2920',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, fontWeight: 600, color: '#8a7f70', flexShrink: 0,
              border: isFocal ? '2px solid #ee5524' : '2px solid transparent',
            }}
          >
            {initials(node.name)}
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#f0ebe4' }}>
              {node.name}{isFocal ? ' (focused)' : ''}
            </div>
            <div style={{ fontSize: 11, color: '#8a7f70', marginTop: 1 }}>
              {connections.length} connection{connections.length === 1 ? '' : 's'}
            </div>
            {node.eligibleToolCount !== undefined && !isFocal && (
              <div style={{ fontSize: 11, color: '#8a7f70', marginTop: 2 }}>
                {(() => {
                  const n = node.eligibleToolCount ?? 0
                  return `${n} tool${n === 1 ? '' : 's'} you could borrow`
                })()}
              </div>
            )}
          </div>
        </div>

        {node.types.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#8a7f70', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Relationship
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {node.types.map(t => {
                const color = TYPE_COLORS[t] ?? DEFAULT_TYPE_COLOR
                return (
                  <span
                    key={t}
                    style={{
                      padding: '2px 8px', borderRadius: 12, background: color + '22',
                      color, border: `1px solid ${color}66`, fontSize: 11, fontWeight: 600,
                    }}
                  >
                    {TYPE_LABELS[t] ?? t}
                  </span>
                )
              })}
            </div>
          </div>
        )}

        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#8a7f70', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {node.name}&rsquo;s connections
          </div>
          {connections.length === 0 ? (
            <p style={{ fontSize: 12.5, color: '#5c5348', margin: 0 }}>No connections listed yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {connections.map(c => {
                const primaryColor = TYPE_COLORS[c.types[0]] ?? DEFAULT_TYPE_COLOR
                return (
                  <button
                    key={c.id}
                    onClick={() => onFocus(c.id)}
                    style={{
                      all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center',
                      gap: 8, padding: '6px 6px', borderRadius: 6, width: '100%', boxSizing: 'border-box',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#2e2920' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: primaryColor }} />
                    <span style={{ fontSize: 13, color: '#f0ebe4', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.name}
                    </span>
                    {c.types[0] && (
                      <span style={{ marginLeft: 'auto', fontSize: 10.5, color: '#8a7f70', flexShrink: 0 }}>
                        {TYPE_LABELS[c.types[0]] ?? c.types[0]}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
