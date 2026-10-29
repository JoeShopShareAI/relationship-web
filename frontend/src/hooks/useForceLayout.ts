import { useRef, useEffect, useCallback } from 'react'
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  type Simulation,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from 'd3-force'
import type { GraphUser, GraphEdge } from '../types'

export interface SimNode extends SimulationNodeDatum {
  id: string
}

type SimLink = SimulationLinkDatum<SimNode>

export function useForceLayout(
  users: GraphUser[],
  edges: GraphEdge[],
  width: number,
  height: number,
  // alpha: the simulation's current energy (1 at start, falling toward 0 as it settles), so a
  // caller can tell an early frame from a settled one.
  onTick: (positions: Map<string, { x: number; y: number }>, alpha: number) => void,
) {
  const simRef = useRef<Simulation<SimNode, SimLink> | null>(null)
  const nodesRef = useRef<SimNode[]>([])
  const onTickRef = useRef(onTick)
  onTickRef.current = onTick

  useEffect(() => {
    // Preserve existing positions when the node list changes
    const prevById = new Map(nodesRef.current.map(n => [n.id, n]))

    nodesRef.current = users.map(u => {
      const prev = prevById.get(u.id)
      const node: SimNode = {
        id: u.id,
        x: prev?.x ?? u.pos_x ?? width / 2 + (Math.random() - 0.5) * 200,
        y: prev?.y ?? u.pos_y ?? height / 2 + (Math.random() - 0.5) * 200,
      }
      if (u.is_pinned && u.pos_x != null) { node.fx = prev?.x ?? u.pos_x; node.fy = prev?.y ?? u.pos_y }
      return node
    })

    const links: SimLink[] = edges
      .filter(e => nodesRef.current.some(n => n.id === e.owner_user_id) && nodesRef.current.some(n => n.id === e.target_user_id))
      .map(e => ({ source: e.owner_user_id, target: e.target_user_id }))

    simRef.current?.stop()

    const sim = forceSimulation<SimNode, SimLink>(nodesRef.current)
      .force('link', forceLink<SimNode, SimLink>(links).id(d => d.id).distance(160).strength(0.5))
      .force('charge', forceManyBody<SimNode>().strength(-500))
      .force('center', forceCenter<SimNode>(width / 2, height / 2).strength(0.05))
      .force('collision', forceCollide<SimNode>(55))
      .alphaDecay(0.02)

    sim.on('tick', () => {
      const positions = new Map<string, { x: number; y: number }>()
      for (const n of nodesRef.current) {
        positions.set(n.id, { x: n.x ?? 0, y: n.y ?? 0 })
      }
      onTickRef.current(positions, sim.alpha())
    })

    simRef.current = sim
    return () => { sim.stop() }
  }, [users.length, edges.length, width, height])

  const fixNode = useCallback((id: string, x: number, y: number) => {
    const node = nodesRef.current.find(n => n.id === id)
    if (node) { node.fx = x; node.fy = y }
    simRef.current?.alpha(0.1).restart()
  }, [])

  const releaseNode = useCallback((id: string) => {
    const node = nodesRef.current.find(n => n.id === id)
    if (node) { node.fx = undefined; node.fy = undefined }
    simRef.current?.alpha(0.3).restart()
  }, [])

  const reheat = useCallback(() => {
    simRef.current?.alpha(0.8).restart()
  }, [])

  return { fixNode, releaseNode, reheat, nodesRef }
}
