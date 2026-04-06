export type CellType = 'empty' | 'wall' | 'water' | 'start' | 'end'
export type CellState = 'idle' | 'path' | 'current' | 'visited' | 'raise' | 'lower'
export type CellVisibility = 'unseen' | 'seen' | 'visible'
export type HeuristicType = 'manhattan' | 'euclidean' | 'chebyshev'

export interface Coord {
  x: number
  y: number
}

export interface Cell {
  x: number
  y: number
  type: CellType
  state: CellState
  visibility: CellVisibility
  weight: number // 1-9, terrain cost
}

export interface DStarState {
  agentPos: Coord
  plannedPath: Coord[]
  traversedPath: Coord[]
  raisedNodes: Coord[]
  loweredNodes: Coord[]
  message: string
  phase: 'planning' | 'moving' | 'replanning' | 'finished'
  found: boolean
  replanCount: number
  nodesProcessed: number
}
