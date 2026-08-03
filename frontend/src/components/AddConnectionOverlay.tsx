import { useState, useEffect, useRef } from 'react'
import type { RelationshipType, UserSearchResult } from '../types'

interface Props {
  relationshipTypes: RelationshipType[]
  onSearch: (query: string) => Promise<UserSearchResult[]>
  onConfirm: (user: UserSearchResult, primaryType: string, secondaryTypes: string[]) => Promise<void>
  onCancel: () => void
}

function Avatar({ user }: { user: UserSearchResult }) {
  const initials = user.display_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div style={{
      width: 36, height: 36, borderRadius: '50%', background: '#2e2920',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 12, fontWeight: 600, color: '#8a7f70', flexShrink: 0, overflow: 'hidden',
    }}>
      {user.photo_url
        ? <img src={user.photo_url} alt={user.display_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : initials}
    </div>
  )
}

export function AddConnectionOverlay({ relationshipTypes, onSearch, onConfirm, onCancel }: Props) {
  const [step, setStep] = useState<'search' | 'types'>('search')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<UserSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null)
  const [primaryType, setPrimaryType] = useState('')
  const [secondaryTypes, setSecondaryTypes] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const timer = setTimeout(async () => {
      setSearching(true)
      setSearchError('')
      try {
        setResults(await onSearch(query.trim()))
      } catch {
        setSearchError('Search failed. Try again.')
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query, onSearch])

  function selectUser(user: UserSearchResult) {
    setSelectedUser(user)
    setPrimaryType('')
    setSecondaryTypes([])
    setSaveError('')
    setStep('types')
  }

  function toggleSecondary(key: string) {
    setSecondaryTypes(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  async function handleConfirm() {
    if (!selectedUser || !primaryType) return
    setSaving(true)
    setSaveError('')
    try {
      await onConfirm(selectedUser, primaryType, secondaryTypes)
    } catch {
      setSaving(false)
      setSaveError('Could not save connection. Try again.')
    }
  }

  const activeTypes = relationshipTypes.filter(rt => rt.is_active)

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.55)',
    }}>
      <div style={{
        background: '#231f19', borderRadius: 12, width: 420, maxHeight: '80vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 8px 32px rgba(0,0,0,0.55)',
        border: '1px solid #2a251e',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid #2a251e',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#f0ebe4' }}>
              {step === 'search' ? 'Add a connection' : 'Set relationship type'}
            </div>
            {step === 'types' && selectedUser && (
              <div style={{ fontSize: 12, color: '#8a7f70', marginTop: 2 }}>
                with {selectedUser.display_name}
              </div>
            )}
          </div>
          <button
            onClick={onCancel}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#8a7f70', lineHeight: 1 }}
          >×</button>
        </div>

        {/* Step 1 — Search */}
        {step === 'search' && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <div style={{ padding: '12px 20px', borderBottom: '1px solid #2a251e' }}>
              <input
                ref={inputRef}
                type="text"
                placeholder="Search by name, email, or mobile…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: 7,
                  border: '1px solid #2a251e', fontSize: 14, outline: 'none',
                  boxSizing: 'border-box', background: '#1c1814', color: '#c0b8ae',
                }}
              />
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {searching && (
                <div style={{ padding: '20px', textAlign: 'center', color: '#8a7f70', fontSize: 13 }}>
                  Searching…
                </div>
              )}
              {searchError && (
                <div style={{ padding: '12px 20px', color: '#ef4444', fontSize: 13 }}>{searchError}</div>
              )}
              {!searching && query && results.length === 0 && !searchError && (
                <div style={{ padding: '20px', textAlign: 'center', color: '#8a7f70', fontSize: 13 }}>
                  No users found
                </div>
              )}
              {results.map(user => (
                <div
                  key={user.id}
                  onClick={() => selectUser(user)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 20px', cursor: 'pointer',
                    borderBottom: '1px solid #2a251e',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#2e2920')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <Avatar user={user} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#c0b8ae' }}>{user.display_name}</div>
                    <div style={{ fontSize: 12, color: '#8a7f70' }}>{user.id}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 2 — Type selection */}
        {step === 'types' && selectedUser && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
              {/* Primary type */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#8a7f70', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Primary relationship *
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {activeTypes.map(rt => (
                    <button
                      key={rt.key}
                      onClick={() => {
                        setPrimaryType(rt.key)
                        setSecondaryTypes(prev => prev.filter(k => k !== rt.key))
                      }}
                      style={{
                        padding: '5px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                        fontWeight: 500, border: '2px solid',
                        borderColor: primaryType === rt.key ? rt.color_hex : '#3a342c',
                        background: primaryType === rt.key ? rt.color_hex + '22' : '#2e2920',
                        color: primaryType === rt.key ? rt.color_hex : '#8a7f70',
                        transition: 'all 0.1s',
                      }}
                    >
                      {rt.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Secondary types */}
              {primaryType && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#8a7f70', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Also… (optional)
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {activeTypes.filter(rt => rt.key !== primaryType).map(rt => (
                      <button
                        key={rt.key}
                        onClick={() => toggleSecondary(rt.key)}
                        style={{
                          padding: '5px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                          fontWeight: 500, border: '2px solid',
                          borderColor: secondaryTypes.includes(rt.key) ? rt.color_hex : '#3a342c',
                          background: secondaryTypes.includes(rt.key) ? rt.color_hex + '22' : '#2e2920',
                          color: secondaryTypes.includes(rt.key) ? rt.color_hex : '#8a7f70',
                          transition: 'all 0.1s',
                        }}
                      >
                        {rt.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {saveError && (
                <div style={{ marginTop: 12, color: '#ef4444', fontSize: 13 }}>{saveError}</div>
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: '12px 20px', borderTop: '1px solid #2a251e',
              display: 'flex', gap: 8, justifyContent: 'flex-end',
            }}>
              <button
                onClick={() => setStep('search')}
                style={{
                  padding: '7px 16px', borderRadius: 7, border: '1px solid #3a342c',
                  background: '#2e2920', cursor: 'pointer', fontSize: 13, color: '#c0b8ae',
                }}
              >
                Back
              </button>
              <button
                onClick={handleConfirm}
                disabled={!primaryType || saving}
                style={{
                  padding: '7px 16px', borderRadius: 7, border: 'none',
                  background: primaryType ? '#ee5524' : '#2e2920',
                  color: primaryType ? '#fff' : '#8a7f70',
                  cursor: primaryType && !saving ? 'pointer' : 'not-allowed',
                  fontSize: 13, fontWeight: 600,
                }}
              >
                {saving ? 'Saving…' : 'Add connection'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
