import type { RatingDimension } from '../types'

interface Props {
  mode: 'explorer' | 'picker'
  onModeChange: (m: 'explorer' | 'picker') => void
  view: 'force' | 'radial'
  onViewChange: (v: 'force' | 'radial') => void
  ratingDimensions: RatingDimension[]
  visibleRatingDimensions: string[]
  onToggleDimension: (key: string) => void
  focusPath?: Array<{ id: string; name: string }>
  onFocusUser?: (userId: string, displayName: string) => void
  pickerLabel?: string
  // Default true. False when RelationshipMap's layout='list' — the Force/Radial toggle has
  // nothing to control once no canvas is rendered.
  showViewToggle?: boolean
}

export function TopBar({ mode, onModeChange, view, onViewChange, ratingDimensions, visibleRatingDimensions, onToggleDimension, focusPath, onFocusUser, pickerLabel = 'Picker', showViewToggle = true }: Props) {
  const modeLabels: Record<'explorer' | 'picker', string> = { explorer: 'Explorer', picker: pickerLabel }
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '8px 16px',
      borderBottom: '1px solid #2a251e',
      background: '#1c1814',
      flexShrink: 0,
    }}>
      {/* Mode toggle */}
      <div style={{ display: 'flex', borderRadius: 6, border: '1px solid #2a251e', overflow: 'hidden' }}>
        {(['explorer', 'picker'] as const).map(m => (
          <button
            key={m}
            onClick={() => onModeChange(m)}
            style={{
              padding: '4px 14px',
              fontSize: 13,
              fontWeight: 500,
              border: 'none',
              cursor: 'pointer',
              background: mode === m ? '#ee5524' : '#1c1814',
              color: mode === m ? '#fff' : '#8a7f70',
              whiteSpace: 'nowrap',
            }}
          >
            {modeLabels[m]}
          </button>
        ))}
      </div>

      {/* View toggle -- also hidden in picker mode: a picker overlay (e.g. pooledTools'
          pending-requests list) covers the canvas, so Force/Radial has nothing visible
          to switch between (docs/backlog.md "Explorer toolbars stay visible and
          non-functional on the Requests tab"). */}
      {showViewToggle && mode !== 'picker' && (
        <div style={{ display: 'flex', borderRadius: 6, border: '1px solid #2a251e', overflow: 'hidden' }}>
          {([
            { key: 'force' as const, label: 'Force' },
            { key: 'radial' as const, label: 'Radial' },
          ]).map(v => (
            <button
              key={v.key}
              onClick={() => onViewChange(v.key)}
              style={{
                padding: '4px 14px',
                fontSize: 13,
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer',
                background: view === v.key ? '#ee5524' : '#1c1814',
                color: view === v.key ? '#fff' : '#8a7f70',
              }}
            >
              {v.label}
            </button>
          ))}
        </div>
      )}

      {/* Rating dimension toggles -- also hidden in picker mode, same reasoning as the
          view toggle above: nothing visible on screen for these to affect once a picker
          overlay covers the canvas. */}
      {mode !== 'picker' && ratingDimensions.map(dim => (
        <button
          key={dim.key}
          onClick={() => onToggleDimension(dim.key)}
          style={{
            padding: '3px 10px',
            fontSize: 12,
            borderRadius: 20,
            border: '1px solid #2a251e',
            cursor: 'pointer',
            background: visibleRatingDimensions.includes(dim.key) ? 'rgba(238,85,36,0.15)' : '#2e2920',
            color: visibleRatingDimensions.includes(dim.key) ? '#ee5524' : '#8a7f70',
            fontWeight: 500,
          }}
        >
          {dim.label}
        </button>
      ))}

      {/* Breadcrumb — only shown once browsing has drilled past the starting person */}
      {focusPath && focusPath.length > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto', overflow: 'hidden' }}>
          {focusPath.map((p, i) => {
            const isLast = i === focusPath.length - 1
            return (
              <span key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
                {i > 0 && <span style={{ color: '#5c5348', fontSize: 12 }}>/</span>}
                {isLast ? (
                  <span style={{ fontSize: 12.5, color: '#f0ebe4', fontWeight: 600, whiteSpace: 'nowrap' }}>{p.name}</span>
                ) : (
                  <button
                    onClick={() => onFocusUser?.(p.id, p.name)}
                    style={{
                      all: 'unset', cursor: 'pointer', fontSize: 12.5, color: '#8a7f70',
                      fontWeight: 500, whiteSpace: 'nowrap',
                    }}
                  >
                    {p.name}
                  </button>
                )}
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}
