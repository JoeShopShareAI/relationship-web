import { useState } from 'react'
import { RelationshipMap } from './RelationshipMap'
import { TreeLibraryDemo } from './dev/TreeLibraryDemo'
import { RawRadialDemo } from './dev/RawRadialDemo'
import {
  SEED_DATA,
  SEED_USERS,
  SEED_RATING_DIMENSIONS,
  SEED_CURRENT_USER_ID,
} from './dev/seedData'
import type { User } from './types'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/relmap'

type DataSource = 'mock' | 'api'
type View = 'force' | 'tree' | 'radial'

const VIEWS: Array<{ key: View; label: string }> = [
  { key: 'force', label: 'Force graph (current)' },
  { key: 'tree', label: 'Tree (react-d3-tree)' },
  { key: 'radial', label: 'Radial (raw d3-hierarchy)' },
]

function nameFor(id: string) {
  return SEED_USERS.find(u => u.id === id)?.display_name ?? id
}

export default function DevApp() {
  const [view, setView] = useState<View>('force')
  const [source, setSource] = useState<DataSource>('mock')
  // Breadcrumb trail is the source of truth; focalUserId is derived from its last entry.
  // Kept in the host (not inside RelationshipMap) because RelationshipMap remounts on every
  // currentUserId change (see the `key` below) and would lose any history it tried to track.
  const [focusPath, setFocusPath] = useState<Array<{ id: string; name: string }>>([
    { id: SEED_CURRENT_USER_ID, name: nameFor(SEED_CURRENT_USER_ID) },
  ])
  const focalUserId = focusPath[focusPath.length - 1].id
  const [lastSelected, setLastSelected] = useState<User[] | null>(null)
  const [log, setLog] = useState<string[]>([])

  function addLog(msg: string) {
    setLog(prev => [`${new Date().toLocaleTimeString()} ${msg}`, ...prev].slice(0, 20))
  }

  // Used by in-graph navigation (connection-list clicks, breadcrumb clicks): if the target is
  // already in the path (going "back"), truncate to it rather than appending a duplicate; if
  // it's new (going "forward"), append.
  function handleFocusUser(id: string) {
    setFocusPath(prev => {
      const existingIdx = prev.findIndex(p => p.id === id)
      return existingIdx !== -1 ? prev.slice(0, existingIdx + 1) : [...prev, { id, name: nameFor(id) }]
    })
    setLastSelected(null)
    addLog(`onFocusUser: ${nameFor(id)}`)
  }

  // Used by the dev-only "Focal user" dropdown: an explicit jump-to-anyone, so it starts a
  // fresh trail rather than extending the current one.
  function handleDropdownChange(id: string) {
    setFocusPath([{ id, name: nameFor(id) }])
    setLastSelected(null)
  }

  const TOOLBAR_HEIGHT = 44

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Dev toolbar */}
      <div style={{
        height: TOOLBAR_HEIGHT,
        background: '#0f172a',
        color: '#cbd5e1',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '0 16px',
        flexShrink: 0,
        fontSize: 13,
      }}>
        <span style={{ color: '#38bdf8', fontWeight: 700, letterSpacing: '0.05em', fontSize: 11 }}>
          DEV HARNESS
        </span>

        {/* View switcher */}
        <div style={{ display: 'flex', borderRadius: 5, border: '1px solid #334155', overflow: 'hidden' }}>
          {VIEWS.map(v => (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              style={{
                padding: '3px 12px',
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 500,
                background: view === v.key ? '#3b82f6' : 'transparent',
                color: view === v.key ? '#fff' : '#94a3b8',
                whiteSpace: 'nowrap',
              }}
            >
              {v.label}
            </button>
          ))}
        </div>

        {view === 'force' && (
          <>
            {/* Data source toggle */}
            <div style={{ display: 'flex', borderRadius: 5, border: '1px solid #334155', overflow: 'hidden' }}>
              {(['mock', 'api'] as DataSource[]).map(s => (
                <button
                  key={s}
                  onClick={() => setSource(s)}
                  style={{
                    padding: '3px 12px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 500,
                    background: source === s ? '#3b82f6' : 'transparent',
                    color: source === s ? '#fff' : '#94a3b8',
                  }}
                >
                  {s === 'mock' ? 'Mock data' : `Live API`}
                </button>
              ))}
            </div>

            {source === 'api' && (
              <span style={{ fontSize: 11, color: '#475569' }}>{API_URL}</span>
            )}

            {/* Focal user selector */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: '#64748b', fontSize: 11 }}>Focal user</span>
              <select
                value={focalUserId}
                onChange={e => handleDropdownChange(e.target.value)}
                style={{
                  background: '#1e293b',
                  color: '#e2e8f0',
                  border: '1px solid #334155',
                  borderRadius: 4,
                  padding: '2px 6px',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                {SEED_USERS.map(u => (
                  <option key={u.id} value={u.id}>{u.display_name}</option>
                ))}
              </select>
            </label>
          </>
        )}

        {(view === 'tree' || view === 'radial') && (
          <span style={{ fontSize: 11, color: '#475569' }}>
            Illustrative data — rooted at Alice, same people as the force graph's mock data.
          </span>
        )}

        <div style={{ flex: 1 }} />

        {/* Event log */}
        {log.length > 0 && (
          <span style={{ fontSize: 11, color: '#475569', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {log[0]}
          </span>
        )}

        {lastSelected && (
          <span style={{ fontSize: 11, color: '#34d399' }}>
            Picked: {lastSelected.map(u => u.display_name).join(', ')}
          </span>
        )}
      </div>

      {/* Component under test — remount when focal user or source changes */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {view === 'force' && (
          <RelationshipMap
            key={`${focalUserId}-${source}`}
            currentUserId={focalUserId}
            {...(source === 'mock'
              ? { data: SEED_DATA }
              : { apiUrl: API_URL }
            )}
            ratingDimensions={SEED_RATING_DIMENSIONS}
            pickerTitle="Select a trusted person"
            pickerMaxDepth={2}
            pickerAllowedTypes={['friend', 'best_friend', 'family', 'colleague']}
            pickerRequireTypesAlongPath
            height={`calc(100vh - ${TOOLBAR_HEIGHT}px)`}
            showSearch
            onSelect={users => {
              setLastSelected(users)
              addLog(`onSelect: ${users.map(u => u.display_name).join(', ')}`)
            }}
            onNodeClick={user => addLog(`onNodeClick: ${user.display_name}`)}
            onRatingSubmit={r => addLog(`onRatingSubmit: ${JSON.stringify(r)}`)}
            onFocusUser={handleFocusUser}
            focusPath={focusPath}
          />
        )}
        {view === 'tree' && <TreeLibraryDemo />}
        {view === 'radial' && <RawRadialDemo />}
      </div>
    </div>
  )
}
