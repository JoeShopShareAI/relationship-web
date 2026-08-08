import { useState, useCallback, useEffect, useMemo } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import { useGraphData } from './hooks/useGraphData'
import { api } from './api'
import { GraphCanvas } from './components/GraphCanvas'
import { RadialCanvas } from './components/RadialCanvas'
import { TopBar } from './components/TopBar'
import { LeftSidebar } from './components/LeftSidebar'
import { RightPanel } from './components/RightPanel'
import { PickerOverlay } from './components/PickerOverlay'
import { AddConnectionOverlay } from './components/AddConnectionOverlay'
import { toDirectGraphData } from './utils/directConnections'
import type {
  RelationshipMapProps,
  UserSearchResult,
  RelationshipType,
  GraphData,
  GraphUser,
  GraphEdge,
  GraphEdgeType,
  PickerUser,
  User,
} from './types'

// Mirrors the backend seed data — used to resolve type keys in controlled mode
const RELATIONSHIP_TYPES: RelationshipType[] = [
  { id: 1,  key: 'spouse_partner',    name: 'Spouse / Partner',   color_hex: '#7F77DD', edge_style: 'solid',  sort_order: 1,  is_active: true },
  { id: 2,  key: 'family',            name: 'Family',             color_hex: '#534AB7', edge_style: 'solid',  sort_order: 2,  is_active: true },
  { id: 3,  key: 'best_friend',       name: 'Best Friend',        color_hex: '#1D9E75', edge_style: 'solid',  sort_order: 3,  is_active: true },
  { id: 4,  key: 'friend',            name: 'Friend',             color_hex: '#5DCAA5', edge_style: 'solid',  sort_order: 4,  is_active: true },
  { id: 5,  key: 'romantic',          name: 'Romantic',           color_hex: '#D4537E', edge_style: 'dashed', sort_order: 5,  is_active: true },
  { id: 6,  key: 'colleague',         name: 'Colleague',          color_hex: '#378ADD', edge_style: 'solid',  sort_order: 6,  is_active: true },
  { id: 7,  key: 'manager_report',    name: 'Manager / Report',   color_hex: '#0C447C', edge_style: 'dashed', sort_order: 7,  is_active: true },
  { id: 8,  key: 'mentor_mentee',     name: 'Mentor / Mentee',    color_hex: '#BA7517', edge_style: 'solid',  sort_order: 8,  is_active: true },
  { id: 9,  key: 'vendor',            name: 'Vendor',             color_hex: '#D85A30', edge_style: 'solid',  sort_order: 9,  is_active: true },
  { id: 10, key: 'customer_client',   name: 'Customer / Client',  color_hex: '#993C1D', edge_style: 'dashed', sort_order: 10, is_active: true },
  { id: 11, key: 'neighbor',          name: 'Neighbor',           color_hex: '#639922', edge_style: 'solid',  sort_order: 11, is_active: true },
  { id: 12, key: 'classmate_alumni',  name: 'Classmate / Alumni', color_hex: '#97C459', edge_style: 'dashed', sort_order: 12, is_active: true },
  { id: 13, key: 'acquaintance',      name: 'Acquaintance',       color_hex: '#888780', edge_style: 'dashed', sort_order: 13, is_active: true },
]

const RT_BY_KEY = new Map(RELATIONSHIP_TYPES.map(r => [r.key, r]))

function resolveEdgeTypes(keys: string[]): GraphEdgeType[] {
  return keys.map(key => {
    const rt = RT_BY_KEY.get(key)
    return rt
      ? { key: rt.key, name: rt.name, color_hex: rt.color_hex, edge_style: rt.edge_style }
      : { key, name: key, color_hex: '#9ca3af', edge_style: 'solid' as const }
  })
}

function controlledDataToGraphData(
  data: NonNullable<RelationshipMapProps['data']>,
  currentUserId: string,
): GraphData {
  // Only show connections owned by the focal user in the graph canvas
  const ownedConns = data.connections.filter(c => c.owner_user_id === currentUserId)
  const targetIds = new Set(ownedConns.map(c => c.target_user_id))

  // connection_count = degree across all connections (both directions)
  const degree = new Map<string, number>()
  for (const c of data.connections) {
    degree.set(c.owner_user_id, (degree.get(c.owner_user_id) ?? 0) + 1)
    degree.set(c.target_user_id, (degree.get(c.target_user_id) ?? 0) + 1)
  }

  // Include focal user + all direct targets
  const visibleIds = new Set([currentUserId, ...targetIds])
  const users: GraphUser[] = data.users
    .filter(u => visibleIds.has(u.id))
    .map(u => ({
      ...u,
      is_pinned: false,
      connection_count: degree.get(u.id) ?? 0,
      pos_x: null,
      pos_y: null,
    }))

  const edges: GraphEdge[] = ownedConns.map(c => ({
    id: c.id,
    owner_user_id: c.owner_user_id,
    target_user_id: c.target_user_id,
    primary_type: c.primary_type ?? c.types[0] ?? '',
    types: resolveEdgeTypes(c.types),
  }))

  return {
    users,
    edges,
    ratings: data.ratings,
    relationship_types: RELATIONSHIP_TYPES,
  }
}

// Client-side BFS replicating the backend /picker endpoint
function clientPickerBFS(
  data: NonNullable<RelationshipMapProps['data']>,
  currentUserId: string,
  maxDepth: number,
  allowedTypes: string[],
  requireAlongPath: boolean,
): PickerUser[] {
  const allowed = new Set(allowedTypes)

  function edgePasses(types: string[]): boolean {
    if (!allowed.size) return true
    return types.some(t => allowed.has(t))
  }

  const visited = new Map<string, { hop: number; path: string[] }>()
  visited.set(currentUserId, { hop: 0, path: [currentUserId] })
  const queue: string[] = [currentUserId]

  while (queue.length > 0) {
    const current = queue.shift()!
    const { hop, path } = visited.get(current)!
    if (hop >= maxDepth) continue

    for (const conn of data.connections.filter(c => c.owner_user_id === current)) {
      const neighbor = conn.target_user_id
      if (visited.has(neighbor)) continue

      if (requireAlongPath && allowed.size && !edgePasses(conn.types)) continue

      visited.set(neighbor, { hop: hop + 1, path: [...path, neighbor] })
      queue.push(neighbor)
    }
  }

  const userMap = new Map(data.users.map(u => [u.id, u]))
  return [...visited.entries()]
    .filter(([id]) => id !== currentUserId)
    .flatMap(([id, { hop, path }]) => {
      const u = userMap.get(id)
      if (!u) return []
      return [{ id: u.id, display_name: u.display_name, photo_url: u.photo_url ?? null, host_user_id: u.host_user_id, hop_count: hop, path }]
    })
    .sort((a, b) => a.hop_count - b.hop_count || a.display_name.localeCompare(b.display_name))
}

export function RelationshipMap(props: RelationshipMapProps) {
  const {
    currentUserId,
    mode: modeProp = 'explorer',
    apiUrl,
    authToken,
    searchUsers: searchUsersProp,
    data: controlledInput,
    ratingDimensions = [],
    pickerTitle = 'Select a person',
    pickerMaxDepth = 2,
    pickerAllowedTypes = [],
    pickerRequireTypesAlongPath = true,
    onSelect,
    onNodeClick,
    onRatingSubmit,
    onFocusUser,
    focusPath,
    maxHops,
    visibleRatingDimensions: visibleProp,
    showSearch = true,
    showAddPerson = true,
    pickerLabel,
    renderPickerOverlay,
    onModeChange,
    onToggleConnectionType,
    height = '600px',
    layout = 'graph',
  } = props

  const isControlled = controlledInput != null

  const [mode, setMode] = useState<'explorer' | 'picker'>(modeProp)
  const [view, setView] = useState<'force' | 'radial'>('force')
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [visibleDimensions, setVisibleDimensions] = useState<string[]>(
    visibleProp ?? ratingDimensions.map(d => d.key),
  )
  const [pickerDepth, setPickerDepth] = useState(pickerMaxDepth)
  const [pickerTypes, setPickerTypes] = useState<string[]>(pickerAllowedTypes)
  const [pickerEligible, setPickerEligible] = useState<PickerUser[]>([])
  const [addingConnection, setAddingConnection] = useState(false)

  // API-backed data path
  const { data: fetchedData, loading, error, refresh, setData: setFetchedData } = useGraphData(
    isControlled ? undefined : apiUrl,
    currentUserId,
    authToken,
    maxHops,
  )

  // Controlled mode: convert input data to GraphData whenever input or focal user changes
  const [controlledData, setControlledData] = useState<GraphData | null>(null)
  useEffect(() => {
    if (controlledInput) {
      setControlledData(controlledDataToGraphData(controlledInput, currentUserId))
    }
  }, [controlledInput, currentUserId])

  const graphData = isControlled ? controlledData : fetchedData
  const setData = isControlled ? setControlledData : setFetchedData

  // Picker: client-side BFS or API call. Skipped entirely when a host has taken over picker
  // mode with renderPickerOverlay -- that eligibility computation (and the dimming it drives
  // on the canvas) is specific to this component's own "select eligible people" semantics,
  // which don't apply to whatever the host is using picker mode for instead.
  useEffect(() => {
    if (mode !== 'picker' || renderPickerOverlay) return
    if (isControlled && controlledInput) {
      setPickerEligible(
        clientPickerBFS(controlledInput, currentUserId, pickerDepth, pickerTypes, pickerRequireTypesAlongPath),
      )
    } else if (apiUrl) {
      api.fetchPicker(apiUrl, currentUserId, {
        maxDepth: pickerDepth,
        types: pickerTypes,
        requireAlongPath: pickerRequireTypesAlongPath,
      }, authToken)
        .then(res => setPickerEligible(res.eligible))
        .catch(() => {})
    }
  }, [isControlled, controlledInput, apiUrl, mode, renderPickerOverlay, currentUserId, pickerDepth, pickerTypes, pickerRequireTypesAlongPath, authToken])

  // Seed rating dimensions to the backend on mount
  useEffect(() => {
    if (!apiUrl || !ratingDimensions.length) return
    api.upsertRatingDimensions(
      apiUrl,
      ratingDimensions.map((d, i) => ({ key: d.key, label: d.label, icon: d.icon, sort_order: i })),
      authToken,
    ).catch(() => {})
  }, [apiUrl, ratingDimensions, authToken])

  const pickerEligibleIds = useMemo(() => new Set(pickerEligible.map(u => u.id)), [pickerEligible])

  const handleNodeClick = useCallback(
    (nodeId: string) => {
      // In list layout, a host supplying onNodeClick owns detail display itself (pooledTools: a
      // richer Drawer with tools/loans/would-lend info) -- swapping to this component's own
      // RightPanel too would be a second, conflicting full-width detail view fighting the host's
      // for the same mobile-width screen (the host's Drawer mask ends up blocking clicks on
      // RightPanel's Back button underneath it). Graph layout is unchanged: both always fire,
      // since RightPanel has its own room alongside the canvas regardless of what a host does
      // with onNodeClick.
      if (!(layout === 'list' && onNodeClick)) {
        setSelectedNodeId(prev => (prev === nodeId ? null : nodeId))
      }
      if (graphData && onNodeClick) {
        const user = graphData.users.find(u => u.id === nodeId)
        if (user) onNodeClick(user)
      }
    },
    [graphData, onNodeClick, layout],
  )

  const handleNodeDragStop = useCallback(
    (nodeId: string, x: number, y: number) => {
      // Persist position in the local GraphData state
      setData(prev => {
        if (!prev) return prev
        return {
          ...prev,
          users: prev.users.map(u =>
            u.id === nodeId ? { ...u, pos_x: x, pos_y: y, is_pinned: true } : u,
          ),
        }
      })
      // Also persist to API if available
      if (apiUrl && graphData) {
        const isPinned = graphData.users.find(u => u.id === nodeId)?.is_pinned ?? false
        api.savePositions(apiUrl, currentUserId, [
          { target_user_id: nodeId, pos_x: x, pos_y: y, is_pinned: isPinned },
        ], authToken).catch(() => {})
      }
    },
    [apiUrl, graphData, currentUserId, setData, authToken],
  )

  const handleToggleDimension = useCallback((key: string) => {
    setVisibleDimensions(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key],
    )
  }, [])

  const handleRate = useCallback(
    async (dimensionKey: string, score: number) => {
      if (!selectedNodeId) return
      const newRating = {
        id: Date.now(),
        rated_user_id: selectedNodeId,
        rater_user_id: currentUserId,
        dimension_key: dimensionKey,
        score,
        notes: null,
        created_at: new Date().toISOString(),
      }
      // Submit to API if available; otherwise just update local state
      const savedRating = apiUrl
        ? await api.submitRating(apiUrl, {
            rated_user_id: selectedNodeId,
            rater_user_id: currentUserId,
            dimension_key: dimensionKey,
            score,
          }, authToken)
        : newRating
      if (onRatingSubmit) onRatingSubmit(savedRating)
      setData(prev => {
        if (!prev) return prev
        const idx = prev.ratings.findIndex(
          r =>
            r.rated_user_id === selectedNodeId &&
            r.rater_user_id === currentUserId &&
            r.dimension_key === dimensionKey,
        )
        const newRatings = [...prev.ratings]
        if (idx >= 0) newRatings[idx] = savedRating
        else newRatings.push(savedRating)
        return { ...prev, ratings: newRatings }
      })
    },
    [apiUrl, selectedNodeId, currentUserId, onRatingSubmit, setData, authToken],
  )

  // Wraps the host's onToggleConnectionType with a refetch afterward, so RightPanel's chips
  // reflect the change immediately without the host needing its own refresh mechanism (and
  // without losing the current selection the way remounting this whole component would).
  const handleToggleConnectionType = useCallback(
    async (targetUserId: string, typeKey: string, add: boolean) => {
      if (!onToggleConnectionType) return
      await onToggleConnectionType(targetUserId, typeKey, add)
      refresh()
    },
    [onToggleConnectionType, refresh],
  )

  const handleSearchUsers = useCallback(async (query: string): Promise<UserSearchResult[]> => {
    if (searchUsersProp) return searchUsersProp(query)
    if (apiUrl) return api.searchUsers(apiUrl, query, graphData?.users.map(u => u.id), authToken)
    return []
  }, [searchUsersProp, apiUrl, graphData, authToken])

  const handleAddConnectionConfirm = useCallback(async (
    targetUser: UserSearchResult,
    primaryType: string,
    secondaryTypes: string[],
  ) => {
    if (!apiUrl) return
    await api.createUser(apiUrl, {
      id: targetUser.id,
      display_name: targetUser.display_name,
      host_user_id: targetUser.id,
      photo_url: targetUser.photo_url ?? undefined,
    }, authToken)
    const allTypes = [primaryType, ...secondaryTypes]
    await api.createConnection(apiUrl, {
      owner_user_id: currentUserId,
      target_user_id: targetUser.id,
      primary_type: primaryType,
      types: allTypes,
    }, authToken)
    setAddingConnection(false)
    refresh()
  }, [apiUrl, currentUserId, refresh, authToken])

  const handlePickerConfirm = useCallback(
    (users: User[]) => {
      if (onSelect) onSelect(users)
      setMode('explorer')
    },
    [onSelect],
  )

  if (loading) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
        <span style={{ fontSize: 14, color: '#6b7280' }}>Loading relationship map…</span>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ height, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fef2f2', gap: 8 }}>
        <span style={{ fontSize: 14, color: '#dc2626', fontWeight: 600 }}>Failed to load</span>
        <span style={{ fontSize: 12, color: '#6b7280' }}>{error}</span>
        <button onClick={refresh} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #d1d5db', cursor: 'pointer', fontSize: 13 }}>Retry</button>
      </div>
    )
  }

  if (!graphData) return null

  // Both canvases only draw the focal user's own outgoing connections -- the multi-hop
  // closure the backend returns is still needed as-is by LeftSidebar, RightPanel's selected-
  // person detail (below), and picker eligibility, so this is scoped to the two canvas props
  // rather than applied to `graphData` itself.
  const canvasGraphData = toDirectGraphData(graphData, currentUserId)

  const selectedUser = graphData.users.find(u => u.id === selectedNodeId) ?? null
  const selectedEdge = selectedNodeId
    ? graphData.edges.find(e => e.owner_user_id === currentUserId && e.target_user_id === selectedNodeId) ?? null
    : null

  // Now works in BOTH modes, unlike when this was first built: apiUrl mode used to only ever
  // fetch the focal user's own depth-1 edges, so a selected non-focal person's own connections
  // were never in graphData at all. Now that the backend returns real multi-hop data
  // (max_hops), graphData.edges already contains edges owned by other visible people too —
  // this just reads what's already there instead of needing controlledInput specifically.
  const selectedUserConnections = selectedNodeId
    ? graphData.edges
        .filter(e => e.owner_user_id === selectedNodeId)
        .map(e => ({
          id: e.target_user_id,
          name: graphData.users.find(u => u.id === e.target_user_id)?.display_name ?? e.target_user_id,
          types: e.types,
        }))
    : null

  return (
    <div style={{ height, display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, -apple-system, sans-serif', overflow: 'hidden', background: '#fff' }}>
      <TopBar
        mode={mode}
        onModeChange={m => { setMode(m); onModeChange?.(m) }}
        view={view}
        onViewChange={setView}
        ratingDimensions={ratingDimensions}
        visibleRatingDimensions={visibleDimensions}
        onToggleDimension={handleToggleDimension}
        focusPath={focusPath}
        onFocusUser={onFocusUser}
        pickerLabel={pickerLabel}
        showViewToggle={layout !== 'list'}
      />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        {layout === 'list' ? (
          // Master-detail swap, no canvas -- see the layout prop's doc comment in types.ts for
          // why (RightPanel's fixed 260px alone leaves a canvas too little room at phone width).
          selectedUser ? (
            <RightPanel
              user={selectedUser}
              currentUserId={currentUserId}
              edge={selectedEdge}
              ratings={graphData.ratings}
              ratingDimensions={ratingDimensions}
              onRate={handleRate}
              onClose={() => setSelectedNodeId(null)}
              connections={selectedUserConnections}
              onFocusUser={onFocusUser}
              allRelationshipTypes={graphData.relationship_types}
              onToggleConnectionType={onToggleConnectionType ? handleToggleConnectionType : undefined}
              layout="list"
            />
          ) : (
            <LeftSidebar
              users={graphData.users}
              edges={graphData.edges}
              currentUserId={currentUserId}
              selectedNodeId={selectedNodeId}
              relationshipTypes={graphData.relationship_types}
              onSelectNode={handleNodeClick}
              onAddPerson={() => setAddingConnection(true)}
              showSearch={showSearch}
              showAddPerson={showAddPerson}
              layout="list"
            />
          )
        ) : (
          <>
            <LeftSidebar
              users={graphData.users}
              edges={graphData.edges}
              currentUserId={currentUserId}
              selectedNodeId={selectedNodeId}
              relationshipTypes={graphData.relationship_types}
              onSelectNode={handleNodeClick}
              onAddPerson={() => setAddingConnection(true)}
              showSearch={showSearch}
              showAddPerson={showAddPerson}
            />

            {view === 'force' ? (
              <ReactFlowProvider>
                <GraphCanvas
                  graphData={canvasGraphData}
                  currentUserId={currentUserId}
                  selectedNodeId={selectedNodeId}
                  ratingDimensions={ratingDimensions}
                  visibleRatingDimensions={visibleDimensions}
                  pickerMode={mode === 'picker' && !renderPickerOverlay}
                  pickerEligibleIds={pickerEligibleIds}
                  onNodeClick={handleNodeClick}
                  onNodeDragStop={handleNodeDragStop}
                  height="100%"
                />
              </ReactFlowProvider>
            ) : (
              <RadialCanvas
                graphData={canvasGraphData}
                currentUserId={currentUserId}
                selectedNodeId={selectedNodeId}
                pickerMode={mode === 'picker' && !renderPickerOverlay}
                pickerEligibleIds={pickerEligibleIds}
                onNodeClick={handleNodeClick}
                height="100%"
              />
            )}

            <RightPanel
              user={selectedUser}
              currentUserId={currentUserId}
              edge={selectedEdge}
              ratings={graphData.ratings}
              ratingDimensions={ratingDimensions}
              onRate={handleRate}
              onClose={() => setSelectedNodeId(null)}
              connections={selectedUserConnections}
              onFocusUser={onFocusUser}
              allRelationshipTypes={graphData.relationship_types}
              onToggleConnectionType={onToggleConnectionType ? handleToggleConnectionType : undefined}
            />
          </>
        )}

        {addingConnection && graphData && (
          <AddConnectionOverlay
            relationshipTypes={graphData.relationship_types}
            onSearch={handleSearchUsers}
            onConfirm={handleAddConnectionConfirm}
            onCancel={() => setAddingConnection(false)}
          />
        )}

        {mode === 'picker' && (
          renderPickerOverlay ? renderPickerOverlay(refresh) : (
            <PickerOverlay
              title={pickerTitle}
              eligibleUsers={pickerEligible}
              allUsersInGraph={graphData.users.length - 1}
              relationshipTypes={graphData.relationship_types}
              maxDepth={pickerDepth}
              allowedTypes={pickerTypes}
              requireAlongPath={pickerRequireTypesAlongPath}
              onDepthChange={setPickerDepth}
              onTypesChange={setPickerTypes}
              onConfirm={handlePickerConfirm}
              onCancel={() => setMode('explorer')}
            />
          )
        )}
      </div>
    </div>
  )
}
