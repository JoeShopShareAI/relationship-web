import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import './GraphCanvas.css'
import { RelationshipNode, nodeDiameter, type RelationshipNodeData } from './RelationshipNode'
import { RelationshipEdge, type RelationshipEdgeData } from './RelationshipEdge'
import { useForceLayout } from '../hooks/useForceLayout'
import type { GraphData, RatingDimension } from '../types'

const nodeTypes = { relationship: RelationshipNode }
const edgeTypes = { relationship: RelationshipEdge }

type DragHandler = (event: React.MouseEvent, node: Node) => void

interface Props {
  graphData: GraphData
  currentUserId: string
  selectedNodeId: string | null
  ratingDimensions: RatingDimension[]
  visibleRatingDimensions: string[]
  pickerMode: boolean
  pickerEligibleIds: Set<string>
  onNodeClick: (nodeId: string) => void
  onNodeDragStop: (nodeId: string, x: number, y: number) => void
  height: string
}

function toRFNodes(
  graphData: GraphData,
  positions: Map<string, { x: number; y: number }>,
  selectedNodeId: string | null,
  currentUserId: string,
  ratingDimensions: RatingDimension[],
  visibleRatingDimensions: string[],
  pickerMode: boolean,
  pickerEligibleIds: Set<string>,
): Node[] {
  return graphData.users.map(user => {
    const pos = positions.get(user.id) ?? { x: user.pos_x ?? 0, y: user.pos_y ?? 0 }
    const isFocal = user.id === currentUserId
    const data: RelationshipNodeData = {
      user,
      ratings: graphData.ratings,
      ratingDimensions,
      visibleRatingDimensions,
      isSelected: selectedNodeId === user.id,
      isFocal,
      dimmed: pickerMode && !pickerEligibleIds.has(user.id) && user.id !== currentUserId,
      eligible: pickerEligibleIds.has(user.id),
      pickerMode,
    }
    // initialWidth/initialHeight (approximate -- RelationshipNode's real rendered size varies
    // a little with name length and whether the tool-count badge shows) make @xyflow/react
    // treat this node as measured from the very first render, instead of waiting on its own
    // ResizeObserver-driven async measurement. That async path is what was actually broken:
    // handleTick below replaces the whole `nodes` array with fresh object references on every
    // d3-force tick (the standard, correct way to animate a controlled layout), and that
    // continuous churn meant the internal "measured" bookkeeping this library keeps per node
    // never got a stable frame to persist across -- so real accounts never got past
    // `visibility: hidden` at all, confirmed live (a fresh account, any viewport width, even a
    // 10s+ wait). initialWidth/initialHeight are only a fallback hint used before real
    // measurement lands (see getNodeInlineStyleDimensions in @xyflow/react) -- once/if it does,
    // the node's actual CSS reverts to sizing from its own content, so a slightly-off estimate
    // here only affects the brief instant before that, not the node's real rendered size.
    const diameter = nodeDiameter(user, isFocal)
    const initialWidth = Math.max(diameter, 90)
    const initialHeight = diameter + 50 + (!isFocal && user.eligible_tool_count !== undefined ? 24 : 0)
    return {
      id: user.id,
      type: 'relationship',
      position: pos,
      data,
      draggable: true,
      zIndex: user.id === currentUserId ? 10 : 1,
      initialWidth,
      initialHeight,
    }
  })
}

function toRFEdges(graphData: GraphData, pickerMode: boolean, pickerEligibleIds: Set<string>): Edge[] {
  return graphData.edges.map(edge => {
    const dimmed = pickerMode && !pickerEligibleIds.has(edge.target_user_id)
    const data: RelationshipEdgeData = { primary_type: edge.primary_type, types: edge.types, dimmed }
    return {
      id: String(edge.id),
      source: edge.owner_user_id,
      target: edge.target_user_id,
      type: 'relationship',
      data,
    }
  })
}

export function GraphCanvas({
  graphData,
  currentUserId,
  selectedNodeId,
  ratingDimensions,
  visibleRatingDimensions,
  pickerMode,
  pickerEligibleIds,
  onNodeClick,
  onNodeDragStop,
  height,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        // Bail out (same object reference, no re-render) on a sub-pixel-identical
        // measurement -- without this guard, any floating-point jitter in
        // contentRect between successive callbacks feeds straight into
        // useForceLayout's [width, height] dependency array below, which tears
        // down and restarts the whole d3-force simulation from alpha=1 every
        // time. That restart loop never lets the simulation settle, which in
        // turn means useNodesState's controlled `nodes` prop never stops
        // getting replaced on every tick -- and @xyflow/react's own internal
        // node-dimension bookkeeping (which needs a render where its measured
        // size actually sticks) never gets the chance to persist, so every
        // node stays permanently stuck at its own internal `visibility:
        // hidden` "not yet measured" state. Confirmed live: 1000+ ResizeObserver
        // callbacks fired in an 8-second window against a perfectly static
        // container before this fix.
        setDimensions(prev =>
          Math.abs(prev.width - width) < 0.5 && Math.abs(prev.height - height) < 0.5
            ? prev
            : { width, height },
        )
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const [rfNodes, setRfNodes] = useNodesState<Node>([])
  const [rfEdges, setRfEdges] = useEdgesState<Edge>([])
  const { fitView } = useReactFlow()
  const hasFittedRef = useRef(false)

  // Reset fit flag whenever the focal user changes
  useEffect(() => { hasFittedRef.current = false }, [currentUserId])

  const handleTick = useCallback(
    (positions: Map<string, { x: number; y: number }>) => {
      setRfNodes(prev =>
        prev.map(n => {
          const pos = positions.get(n.id)
          if (!pos) return n
          return { ...n, position: pos }
        }),
      )
      // Defer fitView until the force layout has spread nodes out from (0,0)
      if (!hasFittedRef.current && positions.size > 0) {
        hasFittedRef.current = true
        setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 0)
      }
    },
    [setRfNodes, fitView],
  )

  const { fixNode } = useForceLayout(
    graphData.users,
    graphData.edges,
    dimensions.width,
    dimensions.height,
    handleTick,
  )

  // Reinitialize RF nodes/edges when graph topology changes
  const prevUserCount = useRef(-1)
  const prevEdgeCount = useRef(-1)
  useEffect(() => {
    if (
      prevUserCount.current === graphData.users.length &&
      prevEdgeCount.current === graphData.edges.length
    ) return
    prevUserCount.current = graphData.users.length
    prevEdgeCount.current = graphData.edges.length

    setRfNodes(
      toRFNodes(graphData, new Map(), selectedNodeId, currentUserId, ratingDimensions, visibleRatingDimensions, pickerMode, pickerEligibleIds),
    )
    setRfEdges(toRFEdges(graphData, pickerMode, pickerEligibleIds))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphData.users.length, graphData.edges.length])

  // Update node data (selection, picker state, ratings) without reinitializing positions
  useEffect(() => {
    setRfNodes(prev =>
      prev.map(n => ({
        ...n,
        data: {
          ...n.data,
          ratings: graphData.ratings,
          ratingDimensions,
          visibleRatingDimensions,
          isSelected: selectedNodeId === n.id,
          isFocal: n.id === currentUserId,
          dimmed: pickerMode && !pickerEligibleIds.has(n.id) && n.id !== currentUserId,
          eligible: pickerEligibleIds.has(n.id),
          pickerMode,
        },
      })),
    )
    setRfEdges(prev =>
      prev.map(e => {
        const graphEdge = graphData.edges.find(ge => String(ge.id) === e.id)
        if (!graphEdge) return e
        const dimmed = pickerMode && !pickerEligibleIds.has(graphEdge.target_user_id)
        return { ...e, data: { primary_type: graphEdge.primary_type, types: graphEdge.types, dimmed } }
      }),
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNodeId, pickerMode, pickerEligibleIds, visibleRatingDimensions, graphData.ratings])

  const handleNodeDragStart: DragHandler = useCallback(
    (_event, node) => { fixNode(node.id, node.position.x, node.position.y) },
    [fixNode],
  )

  const handleNodeDrag: DragHandler = useCallback(
    (_event, node) => { fixNode(node.id, node.position.x, node.position.y) },
    [fixNode],
  )

  const handleNodeDragStop: DragHandler = useCallback(
    (_event, node) => {
      fixNode(node.id, node.position.x, node.position.y)
      onNodeDragStop(node.id, node.position.x, node.position.y)
    },
    [fixNode, onNodeDragStop],
  )

  return (
    <div ref={containerRef} style={{ flex: 1, height }}>
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeClick={(_event, node) => onNodeClick(node.id)}
        onNodeDragStart={handleNodeDragStart}
        onNodeDrag={handleNodeDrag}
        onNodeDragStop={handleNodeDragStop}
        // React Flow's own default keyboard interaction (select an edge with
        // Enter/Space, remove it with Delete/Backspace) was still active here even
        // though nothing wires edge deletion to a real API call (no onEdgesDelete,
        // no deleteConnection() call anywhere in this component) -- Delete just
        // silently desynced React Flow's internal view from `edges` until the next
        // graphData refresh snapped it back, reading as "I deleted someone's
        // connection" with no confirmation and no actual effect
        // (docs/backlog.md "deleting an edge via keyboard has no confirmation").
        // Disabled outright rather than adding a confirm dialog for an interaction
        // this app doesn't actually support yet.
        deleteKeyCode={null}
        minZoom={0.2}
        maxZoom={2}
        style={{ background: '#18150f' }}
        // MIT license (checked node_modules/@xyflow/react/LICENSE directly, no field-of-use
        // restriction) and hideAttribution is a documented public option, not a workaround --
        // the unhidden badge was one of the three reasons this panel was removed from
        // pooledTools before.
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={28} color="#2a251e" variant={'dots' as any} />
        <Controls />
      </ReactFlow>
    </div>
  )
}
