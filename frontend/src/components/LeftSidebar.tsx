import { useState } from 'react'
import type { GraphUser, GraphEdge, RelationshipType } from '../types'

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

interface Props {
  users: GraphUser[]
  edges: GraphEdge[]
  currentUserId: string
  selectedNodeId: string | null
  relationshipTypes: RelationshipType[]
  onSelectNode: (id: string) => void
  onAddPerson: (query: string) => void
  showSearch: boolean
  showAddPerson?: boolean
  // Default 'graph': fixed 220px alongside the canvas. 'list' (RelationshipMap's layout='list',
  // no canvas) goes full-width instead — this pane IS the screen in that mode, not a fixed-width
  // rail next to one.
  layout?: 'graph' | 'list'
}

export function LeftSidebar({
  users,
  edges,
  currentUserId,
  selectedNodeId,
  relationshipTypes,
  onSelectNode,
  onAddPerson,
  showSearch,
  showAddPerson = true,
  layout = 'graph',
}: Props) {
  const [search, setSearch] = useState('')
  const [showLegend, setShowLegend] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  // Search-on-demand (decided 2026-10-15): beside the canvas, a host that shows the search box
  // gets matches only while a query is typed, since the canvas already shows everyone. A host
  // that hides the box (pooledTools), or list layout (no canvas), keeps the full roster: it's
  // the only keyboard and screen-reader path to people.
  const onDemand = showSearch && layout === 'graph'
  const query = search.trim().toLowerCase()

  const sortedUsers = [...users]
    .filter(u => u.id !== currentUserId)
    .filter(u => u.display_name.toLowerCase().includes(query))
    .sort((a, b) => a.display_name.localeCompare(b.display_name))
  const visibleUsers = onDemand && !query ? [] : sortedUsers
  const listOpen = !onDemand || visibleUsers.length > 0
  const active = Math.min(activeIndex, Math.max(visibleUsers.length - 1, 0))

  const choose = (id: string) => {
    onSelectNode(id)
    if (onDemand) setSearch('')
  }

  const onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!onDemand) return
    if (e.key === 'ArrowDown' && visibleUsers.length) {
      e.preventDefault()
      setActiveIndex((active + 1) % visibleUsers.length)
    } else if (e.key === 'ArrowUp' && visibleUsers.length) {
      e.preventDefault()
      setActiveIndex((active - 1 + visibleUsers.length) % visibleUsers.length)
    } else if (e.key === 'Enter' && visibleUsers[active]) {
      e.preventDefault()
      choose(visibleUsers[active].id)
    } else if (e.key === 'Escape') {
      setSearch('')
    }
  }

  const listId = 'rm-people-list'
  const optionId = (id: string) => `rm-person-${id}`

  return (
    <div style={{
      width: layout === 'list' ? '100%' : 220,
      borderRight: layout === 'list' ? 'none' : '1px solid #2a251e',
      background: '#1c1814',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      overflow: 'hidden',
    }}>
      {/* Search */}
      {showSearch && (
        <div style={{ padding: '10px 12px', borderBottom: '1px solid #2a251e' }}>
          <input
            type="text"
            placeholder={onDemand ? 'Find a person…' : 'Search people…'}
            aria-label={onDemand ? 'Find a person' : 'Search people'}
            value={search}
            onChange={e => { setSearch(e.target.value); setActiveIndex(0) }}
            onKeyDown={onSearchKeyDown}
            {...(onDemand ? {
              role: 'combobox',
              'aria-autocomplete': 'list' as const,
              'aria-expanded': visibleUsers.length > 0,
              'aria-controls': listId,
              'aria-activedescendant': visibleUsers[active] ? optionId(visibleUsers[active].id) : undefined,
            } : {})}
            style={{
              width: '100%',
              padding: '6px 10px',
              borderRadius: 6,
              border: '1px solid #2a251e',
              fontSize: 13,
              outline: 'none',
              boxSizing: 'border-box',
              background: '#231f19',
              color: '#c0b8ae',
            }}
          />
        </div>
      )}

      {/* People list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: listOpen ? '8px 0' : 0 }}>
        {onDemand && query && visibleUsers.length === 0 && (
          <div role="status" style={{ padding: '10px 12px', fontSize: 12, color: '#a09484' }}>
            No one matches “{search.trim()}”
          </div>
        )}
        <div id={listId} {...(onDemand ? { role: 'listbox', 'aria-label': 'Matching people' } : {})}>
        {visibleUsers.map((user, i) => {
          const edge = edges.find(e => e.target_user_id === user.id)
          const primaryType = edge?.types[0]
          const highlighted = onDemand ? i === active : selectedNodeId === user.id
          return (
            <div
              key={user.id}
              id={optionId(user.id)}
              onClick={() => choose(user.id)}
              {...(onDemand ? { role: 'option', 'aria-selected': i === active } : {})}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '7px 12px',
                cursor: 'pointer',
                background: highlighted ? 'rgba(238,85,36,0.12)' : 'transparent',
                borderLeft: highlighted ? '3px solid #ee5524' : '3px solid transparent',
              }}
            >
              <div style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: '#2e2920',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 600,
                color: '#a09484',
                flexShrink: 0,
                overflow: 'hidden',
              }}>
                {user.photo_url
                  ? <img src={user.photo_url} alt={user.display_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : initials(user.display_name)
                }
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#c0b8ae', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.display_name}
                </div>
                {primaryType && (
                  <div style={{ fontSize: 11, color: primaryType.color_hex, fontWeight: 500 }}>
                    {primaryType.name}
                  </div>
                )}
              </div>
            </div>
          )
        })}
        </div>
      </div>

      {/* Add person button */}
      {showAddPerson && (
        <div style={{ padding: '10px 12px', borderTop: '1px solid #2a251e' }}>
          <button
            onClick={() => onAddPerson('')}
            style={{
              width: '100%',
              padding: '7px 0',
              borderRadius: 6,
              border: '1px dashed #3a342c',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: 13,
              color: '#a09484',
              fontWeight: 500,
            }}
          >
            + Add person
          </button>
        </div>
      )}

      {/* Legend toggle */}
      <div style={{ borderTop: '1px solid #2a251e' }}>
        <button
          onClick={() => setShowLegend(s => !s)}
          style={{
            width: '100%',
            padding: '8px 12px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontSize: 12,
            color: '#a09484',
            textAlign: 'left',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <span>Legend</span>
          <span>{showLegend ? '▲' : '▼'}</span>
        </button>
        {showLegend && (
          <div style={{ padding: '4px 12px 12px' }}>
            {relationshipTypes.map(rt => (
              <div key={rt.key} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <div style={{
                  width: 24,
                  height: 3,
                  background: rt.color_hex,
                  borderRadius: 2,
                  flexShrink: 0,
                  ...(rt.edge_style === 'dashed' ? {
                    background: 'transparent',
                    borderTop: `2px dashed ${rt.color_hex}`,
                    height: 0,
                  } : {}),
                }} />
                <span style={{ fontSize: 11, color: '#a09484' }}>{rt.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
