import { useState, useEffect } from 'react'
import type { RelationshipType, PickerUser, User } from '../types'

interface Props {
  title: string
  eligibleUsers: PickerUser[]
  allUsersInGraph: number
  relationshipTypes: RelationshipType[]
  maxDepth: number
  allowedTypes: string[]
  requireAlongPath: boolean
  onDepthChange: (depth: number) => void
  onTypesChange: (types: string[]) => void
  onConfirm: (selected: User[]) => void
  onCancel: () => void
}

export function PickerOverlay({
  title,
  eligibleUsers,
  allUsersInGraph,
  relationshipTypes,
  maxDepth,
  allowedTypes,
  onDepthChange,
  onTypesChange,
  onConfirm,
  onCancel,
}: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [localDepth, setLocalDepth] = useState(maxDepth)
  const [localTypes, setLocalTypes] = useState<string[]>(allowedTypes)

  useEffect(() => { setLocalDepth(maxDepth) }, [maxDepth])
  useEffect(() => { setLocalTypes(allowedTypes) }, [allowedTypes])

  function toggleType(key: string) {
    const next = localTypes.includes(key) ? localTypes.filter(t => t !== key) : [...localTypes, key]
    setLocalTypes(next)
    onTypesChange(next)
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const selectedUsers = eligibleUsers.filter(u => selected.has(u.id)).map(u => ({
    id: u.id,
    display_name: u.display_name,
    photo_url: u.photo_url,
    host_user_id: u.host_user_id,
  }))

  const ineligibleCount = allUsersInGraph - eligibleUsers.length

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      background: 'rgba(0,0,0,0.55)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
    }}>
      <div style={{
        background: '#231f19',
        borderRadius: 12,
        width: 480,
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
        border: '1px solid #2a251e',
      }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #2a251e' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#f0ebe4' }}>{title}</div>
        </div>

        {/* Filters */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid #2a251e', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Depth */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, color: '#8a7f70', fontWeight: 500, minWidth: 60 }}>Depth</span>
            <div style={{ display: 'flex', gap: 6 }}>
              {[1, 2, 3].map(d => (
                <button
                  key={d}
                  onClick={() => { setLocalDepth(d); onDepthChange(d) }}
                  style={{
                    padding: '3px 12px',
                    borderRadius: 20,
                    border: '1px solid #2a251e',
                    cursor: 'pointer',
                    fontSize: 12,
                    background: localDepth === d ? '#ee5524' : '#2e2920',
                    color: localDepth === d ? '#fff' : '#8a7f70',
                    fontWeight: 500,
                  }}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Type filter chips */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <span style={{ fontSize: 12, color: '#8a7f70', fontWeight: 500, minWidth: 60, paddingTop: 4 }}>Types</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {relationshipTypes.map(rt => {
                const active = localTypes.includes(rt.key)
                return (
                  <button
                    key={rt.key}
                    onClick={() => toggleType(rt.key)}
                    style={{
                      padding: '2px 10px',
                      borderRadius: 20,
                      border: `1px solid ${active ? rt.color_hex : '#2a251e'}`,
                      cursor: 'pointer',
                      fontSize: 11,
                      background: active ? rt.color_hex + '22' : '#2e2920',
                      color: active ? rt.color_hex : '#8a7f70',
                      fontWeight: active ? 600 : 400,
                    }}
                  >
                    {rt.name}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Eligible user list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {eligibleUsers.length === 0 && (
            <div style={{ padding: '20px', textAlign: 'center', color: '#8a7f70', fontSize: 13 }}>
              No eligible people found with these filters
            </div>
          )}
          {eligibleUsers.map(user => (
            <div
              key={user.id}
              onClick={() => toggleSelect(user.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 20px',
                cursor: 'pointer',
                background: selected.has(user.id) ? 'rgba(238,85,36,0.12)' : 'transparent',
              }}
            >
              <input
                type="checkbox"
                checked={selected.has(user.id)}
                onChange={() => {}}
                style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#ee5524' }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#c0b8ae' }}>{user.display_name}</div>
                {user.hop_count > 1 && user.path.length > 1 && (
                  <div style={{ fontSize: 11, color: '#8a7f70' }}>
                    via {user.path.slice(1, -1).join(' → ')}
                  </div>
                )}
              </div>
              <span style={{
                padding: '1px 7px',
                borderRadius: 10,
                background: '#2e2920',
                fontSize: 11,
                color: '#8a7f70',
              }}>
                {user.hop_count === 1 ? 'direct' : `${user.hop_count} hops`}
              </span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid #2a251e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ fontSize: 12, color: '#8a7f70' }}>
            <span style={{ color: '#1d9e75', fontWeight: 600 }}>{eligibleUsers.length} eligible</span>
            {selected.size > 0 && <span style={{ color: '#ee5524', fontWeight: 600 }}> · {selected.size} selected</span>}
            {ineligibleCount > 0 && <span> · {ineligibleCount} ineligible</span>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={onCancel}
              style={{ padding: '6px 16px', borderRadius: 6, border: '1px solid #3a342c', background: '#2e2920', cursor: 'pointer', fontSize: 13, color: '#c0b8ae' }}
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(selectedUsers)}
              disabled={selected.size === 0}
              style={{
                padding: '6px 16px',
                borderRadius: 6,
                border: 'none',
                background: selected.size > 0 ? '#ee5524' : '#2e2920',
                color: selected.size > 0 ? '#fff' : '#8a7f70',
                cursor: selected.size > 0 ? 'pointer' : 'default',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
