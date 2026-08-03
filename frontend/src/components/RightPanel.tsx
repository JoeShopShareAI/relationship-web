import { useState } from 'react'
import type { MouseEvent } from 'react'
import type { GraphUser, GraphEdge, GraphEdgeType, Rating, RatingDimension, RelationshipType } from '../types'

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

interface Props {
  user: GraphUser | null
  currentUserId: string
  edge: GraphEdge | null
  ratings: Rating[]
  ratingDimensions: RatingDimension[]
  onRate: (dimensionKey: string, score: number) => Promise<void>
  onClose: () => void
  // The selected user's own connections — null when unavailable (see the onFocusUser doc
  // comment on RelationshipMapProps), empty array when they genuinely have none.
  connections?: Array<{ id: string; name: string; types: GraphEdgeType[] }> | null
  onFocusUser?: (userId: string) => void
  // Full catalog of relationship types (not just ones already applied) — needed to offer types
  // not yet set, only actually used when onToggleConnectionType is supplied.
  allRelationshipTypes?: RelationshipType[]
  // If supplied, the relationship-type tags below become an editable multi-select instead of
  // read-only. Only ever called while `edge` is non-null (a connection owned by currentUserId
  // to the selected person) — see the doc comment on RelationshipMapProps.
  onToggleConnectionType?: (targetUserId: string, typeKey: string, add: boolean) => Promise<void>
}

function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {[1, 2, 3, 4, 5].map(s => (
        <button
          key={s}
          onMouseEnter={() => setHover(s)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(s)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 20,
            color: s <= (hover || value) ? '#f59e0b' : '#3a342c',
            padding: 0,
          }}
        >★</button>
      ))}
    </div>
  )
}

export function RightPanel({ user, currentUserId, edge, ratings, ratingDimensions, onRate, onClose, connections, onFocusUser, allRelationshipTypes, onToggleConnectionType }: Props) {
  const [ratingValues, setRatingValues] = useState<Record<string, number>>({})
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({})
  const [togglingTypes, setTogglingTypes] = useState<Record<string, boolean>>({})

  if (!user) {
    return (
      <div style={{ width: 260, borderLeft: '1px solid #2a251e', background: '#1c1814', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: 13, color: '#8a7f70' }}>Select a person</span>
      </div>
    )
  }

  const userRatings = ratings.filter(r => r.rated_user_id === user.id)
  const myRatings = userRatings.filter(r => r.rater_user_id === currentUserId)
  const myRatingMap = new Map(myRatings.map(r => [r.dimension_key, r.score]))

  function avgByDim(key: string) {
    const relevant = userRatings.filter(r => r.dimension_key === key)
    if (!relevant.length) return null
    return relevant.reduce((s, r) => s + r.score, 0) / relevant.length
  }

  async function handleToggleType(typeKey: string, add: boolean) {
    if (!onToggleConnectionType || !user) return
    setTogglingTypes(t => ({ ...t, [typeKey]: true }))
    try {
      await onToggleConnectionType(user.id, typeKey, add)
    } finally {
      setTogglingTypes(t => ({ ...t, [typeKey]: false }))
    }
  }

  async function handleSubmitRating(dimKey: string) {
    const score = ratingValues[dimKey]
    if (!score) return
    setSubmitting(s => ({ ...s, [dimKey]: true }))
    try {
      await onRate(dimKey, score)
      setRatingValues(v => ({ ...v, [dimKey]: 0 }))
    } finally {
      setSubmitting(s => ({ ...s, [dimKey]: false }))
    }
  }

  return (
    <div style={{
      width: 260,
      borderLeft: '1px solid #2a251e',
      background: '#1c1814',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid #2a251e' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#c0b8ae' }}>Detail</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#8a7f70' }}>×</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
        {/* Avatar + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: '#2e2920',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            fontWeight: 600,
            color: '#8a7f70',
            overflow: 'hidden',
            flexShrink: 0,
          }}>
            {user.photo_url
              ? <img src={user.photo_url} alt={user.display_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : initials(user.display_name)
            }
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#f0ebe4' }}>{user.display_name}</div>
            <div style={{ fontSize: 11, color: '#8a7f70', marginTop: 1 }}>{user.connection_count} connection{user.connection_count !== 1 ? 's' : ''}</div>
            {user.eligible_tool_count !== undefined && user.id !== currentUserId && (
              <div style={{ fontSize: 11, color: '#8a7f70', marginTop: 2 }}>
                {(() => {
                  const n = user.eligible_tool_count ?? 0
                  return `${n} tool${n === 1 ? '' : 's'} you could borrow`
                })()}
              </div>
            )}
          </div>
        </div>

        {/* Relationship type tags — editable multi-select when onToggleConnectionType is
            supplied (and there's a connection owned by currentUserId to edit), read-only
            otherwise. Editable mode still renders with zero types set, so there's a way to add
            the first one; read-only mode keeps hiding when there's nothing to show. */}
        {edge && onToggleConnectionType && allRelationshipTypes ? (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#8a7f70', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Relationship</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {allRelationshipTypes.map(t => {
                const active = edge.types.some(et => et.key === t.key)
                const pending = togglingTypes[t.key]
                return (
                  <button
                    key={t.key}
                    disabled={pending}
                    onClick={() => handleToggleType(t.key, !active)}
                    style={{
                      padding: '2px 8px',
                      borderRadius: 12,
                      background: active ? t.color_hex + '22' : 'transparent',
                      color: active ? t.color_hex : '#8a7f70',
                      border: `1px solid ${active ? t.color_hex + '66' : '#3a342c'}`,
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: pending ? 'default' : 'pointer',
                      opacity: pending ? 0.6 : 1,
                    }}
                  >
                    {pending ? '…' : t.name}
                  </button>
                )
              })}
            </div>
          </div>
        ) : edge && edge.types.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#8a7f70', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Relationship</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {edge.types.map(t => (
                <span key={t.key} style={{
                  padding: '2px 8px',
                  borderRadius: 12,
                  background: t.color_hex + '22',
                  color: t.color_hex,
                  border: `1px solid ${t.color_hex}66`,
                  fontSize: 11,
                  fontWeight: 600,
                }}>
                  {t.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Ratings */}
        {ratingDimensions.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#8a7f70', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ratings</div>
            {ratingDimensions.map(dim => {
              const avg = avgByDim(dim.key)
              const myScore = myRatingMap.get(dim.key)
              return (
                <div key={dim.key} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: '#c0b8ae', fontWeight: 500 }}>{dim.label}</span>
                    <span style={{ fontSize: 12, color: '#8a7f70' }}>
                      {avg != null ? `avg ${avg.toFixed(1)}` : '—'}
                      {myScore != null ? ` · you: ${myScore.toFixed(1)}` : ''}
                    </span>
                  </div>
                  {user.id !== currentUserId && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <StarInput
                        value={ratingValues[dim.key] ?? 0}
                        onChange={v => setRatingValues(prev => ({ ...prev, [dim.key]: v }))}
                      />
                      {ratingValues[dim.key] > 0 && (
                        <button
                          onClick={() => handleSubmitRating(dim.key)}
                          disabled={submitting[dim.key]}
                          style={{
                            padding: '2px 8px',
                            fontSize: 11,
                            borderRadius: 4,
                            border: '1px solid #ee5524',
                            background: '#ee5524',
                            color: '#fff',
                            cursor: 'pointer',
                          }}
                        >
                          {submitting[dim.key] ? '…' : 'Save'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Notes */}
        {user.notes && (
          <div style={{ marginBottom: connections ? 14 : 0 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#8a7f70', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Notes</div>
            <p style={{ fontSize: 13, color: '#c0b8ae', margin: 0, whiteSpace: 'pre-wrap' }}>{user.notes}</p>
          </div>
        )}

        {/* Their connections — null means unavailable for this data mode, not "none" */}
        {connections && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#8a7f70', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {user.display_name}&rsquo;s connections
            </div>
            {connections.length === 0 ? (
              <p style={{ fontSize: 12.5, color: '#5c5348', margin: 0 }}>No connections listed yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {connections.map(c => {
                  const primary = c.types[0]
                  const Row = onFocusUser ? 'button' : 'div'
                  return (
                    <Row
                      key={c.id}
                      {...(onFocusUser ? { onClick: () => onFocusUser(c.id) } : {})}
                      style={{
                        all: onFocusUser ? 'unset' : undefined,
                        cursor: onFocusUser ? 'pointer' : 'default',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '6px 6px',
                        borderRadius: 6,
                        width: '100%',
                        boxSizing: 'border-box',
                      }}
                      onMouseEnter={onFocusUser ? (e: MouseEvent<HTMLElement>) => { e.currentTarget.style.background = '#2e2920' } : undefined}
                      onMouseLeave={onFocusUser ? (e: MouseEvent<HTMLElement>) => { e.currentTarget.style.background = 'transparent' } : undefined}
                    >
                      <span
                        style={{
                          width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                          background: primary?.color_hex ?? '#8a7f70',
                        }}
                      />
                      <span style={{ fontSize: 13, color: '#f0ebe4', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.name}
                      </span>
                      {primary && (
                        <span style={{ marginLeft: 'auto', fontSize: 10.5, color: '#8a7f70', flexShrink: 0 }}>{primary.name}</span>
                      )}
                    </Row>
                  )
                })}
              </div>
            )}
            {!onFocusUser && connections.length > 0 && (
              <p style={{ fontSize: 11, color: '#5c5348', marginTop: 6, marginBottom: 0 }}>
                Host hasn&rsquo;t wired onFocusUser — list is read-only.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
