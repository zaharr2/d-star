import type { Coord, HeuristicType, DStarState } from './types'

const INF = Infinity
const ROWS = 100
const COLS = 100

function heuristic(a: Coord, b: Coord, type: HeuristicType): number {
  const dx = Math.abs(a.x - b.x)
  const dy = Math.abs(a.y - b.y)
  switch (type) {
    case 'manhattan': return dx + dy
    case 'euclidean': return Math.sqrt(dx * dx + dy * dy)
    case 'chebyshev': return Math.max(dx, dy)
  }
}

function coordKey(x: number, y: number): number {
  return y * COLS + x
}

const DIRS: Coord[] = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
]

function getNeighbors(x: number, y: number): Coord[] {
  const result: Coord[] = []
  for (const d of DIRS) {
    const nx = x + d.x
    const ny = y + d.y
    if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS) {
      result.push({ x: nx, y: ny })
    }
  }
  return result
}

type NodeTag = 'NEW' | 'OPEN' | 'CLOSED'

interface DNode {
  x: number
  y: number
  h: number
  k: number
  tag: NodeTag
  bx: number
  by: number
}

/**
 * Min-heap priority queue with index map.
 * Priority = k + heuristic(node, robot) for focused bias.
 * getKmin() returns raw k for termination checks.
 */
class OpenList {
  private heap: DNode[] = []
  private idx = new Map<number, number>()
  private robotPos: Coord = { x: 0, y: 0 }
  private hType: HeuristicType = 'manhattan'

  setRobot(pos: Coord) { this.robotPos = pos }
  setHeuristic(ht: HeuristicType) { this.hType = ht }

  private prio(n: DNode): number {
    return n.k + heuristic({ x: n.x, y: n.y }, this.robotPos, this.hType)
  }

  private less(i: number, j: number): boolean {
    return this.prio(this.heap[i]) < this.prio(this.heap[j])
  }

  private swap(i: number, j: number) {
    const a = this.heap[i], b = this.heap[j]
    this.heap[i] = b
    this.heap[j] = a
    this.idx.set(coordKey(b.x, b.y), i)
    this.idx.set(coordKey(a.x, a.y), j)
  }

  private siftUp(i: number) {
    while (i > 0) {
      const p = (i - 1) >> 1
      if (this.less(i, p)) { this.swap(i, p); i = p } else break
    }
  }

  private siftDown(i: number) {
    const n = this.heap.length
    while (true) {
      let s = i
      const l = 2 * i + 1, r = 2 * i + 2
      if (l < n && this.less(l, s)) s = l
      if (r < n && this.less(r, s)) s = r
      if (s !== i) { this.swap(i, s); i = s } else break
    }
  }

  add(node: DNode) {
    const key = coordKey(node.x, node.y)
    const existing = this.idx.get(key)
    if (existing !== undefined) {
      this.removeAt(existing, key)
    }
    node.tag = 'OPEN'
    const pos = this.heap.length
    this.heap.push(node)
    this.idx.set(key, pos)
    this.siftUp(pos)
  }

  getKmin(): number {
    return this.heap.length === 0 ? INF : this.heap[0].k
  }

  pop(): DNode | null {
    if (this.heap.length === 0) return null
    const top = this.heap[0]
    this.idx.delete(coordKey(top.x, top.y))
    const last = this.heap.pop()!
    if (this.heap.length > 0) {
      this.heap[0] = last
      this.idx.set(coordKey(last.x, last.y), 0)
      this.siftDown(0)
    }
    top.tag = 'CLOSED'
    return top
  }

  private removeAt(i: number, key: number) {
    this.idx.delete(key)
    if (i === this.heap.length - 1) {
      this.heap.pop()
      return
    }
    const last = this.heap.pop()!
    this.heap[i] = last
    this.idx.set(coordKey(last.x, last.y), i)
    this.siftUp(i)
    this.siftDown(i)
  }

  get empty(): boolean { return this.heap.length === 0 }
}

/**
 * Focused D* (Stentz 1994/1995).
 * Backward search: goal → start.
 * h(X) = cost from X to goal.
 * b(X) = backpointer toward goal.
 * k(X) = min h since last placed on OPEN.
 */
export function* focusedDStar(
  start: Coord,
  goal: Coord,
  heuristicType: HeuristicType,
  getVisibleWalls: (pos: Coord) => Coord[],
  getWeight: (x: number, y: number) => number
): Generator<DStarState> {
  const PROCESS_LIMIT = ROWS * COLS * 2
  const MOVE_LIMIT = ROWS * COLS * 4
  const VISIT_LIMIT = 3

  const open = new OpenList()
  open.setHeuristic(heuristicType)

  let robotPos = { ...start }
  open.setRobot(robotPos)

  let replanCount = 0
  let totalProcessed = 0
  const knownWalls = new Set<number>()
  const traversedPath: Coord[] = [{ ...start }]
  const visitCount = new Map<number, number>()
  visitCount.set(coordKey(start.x, start.y), 1)

  // Flat node storage for O(1) access
  const nodes: (DNode | null)[] = new Array(ROWS * COLS).fill(null)

  function getNode(x: number, y: number): DNode {
    const key = coordKey(x, y)
    let n = nodes[key]
    if (!n) {
      n = { x, y, h: INF, k: INF, tag: 'NEW', bx: -1, by: -1 }
      nodes[key] = n
    }
    return n
  }

  function arcCost(toX: number, toY: number): number {
    if (knownWalls.has(coordKey(toX, toY))) return INF
    return getWeight(toX, toY)
  }

  function insertNode(node: DNode, hnew: number) {
    if (node.tag === 'NEW') {
      node.k = hnew
    } else if (node.tag === 'OPEN') {
      node.k = Math.min(node.k, hnew)
    } else {
      node.k = Math.min(node.h, hnew)
    }
    node.h = hnew
    open.add(node)
  }

  function processState(): { raised: Coord[]; lowered: Coord[] } | null {
    if (open.empty) return null

    const X = open.pop()!
    const kold = X.k
    totalProcessed++

    const raised: Coord[] = []
    const lowered: Coord[] = []
    const neighbors = getNeighbors(X.x, X.y)

    if (kold < X.h) {
      // RAISE state
      raised.push({ x: X.x, y: X.y })
      for (const nc of neighbors) {
        const Y = getNode(nc.x, nc.y)
        const cYX = arcCost(X.x, X.y)
        if (Y.h <= kold && X.h > Y.h + cYX) {
          X.bx = Y.x
          X.by = Y.y
          X.h = Y.h + cYX
        }
      }
    }

    if (kold === X.h) {
      // LOWER state
      lowered.push({ x: X.x, y: X.y })
      for (const nc of neighbors) {
        const Y = getNode(nc.x, nc.y)
        const cXY = arcCost(nc.x, nc.y)
        if (
          Y.tag === 'NEW' ||
          (Y.bx === X.x && Y.by === X.y && Y.h !== X.h + cXY) ||
          (!(Y.bx === X.x && Y.by === X.y) && Y.h > X.h + cXY)
        ) {
          Y.bx = X.x
          Y.by = X.y
          insertNode(Y, X.h + cXY)
          lowered.push({ x: Y.x, y: Y.y })
        }
      }
    } else {
      // RAISE continued
      for (const nc of neighbors) {
        const Y = getNode(nc.x, nc.y)
        const cXY = arcCost(nc.x, nc.y)
        const cYX = arcCost(X.x, X.y)
        const yBackIsX = Y.bx === X.x && Y.by === X.y

        if (Y.tag === 'NEW' || (yBackIsX && Y.h !== X.h + cXY)) {
          Y.bx = X.x
          Y.by = X.y
          insertNode(Y, X.h + cXY)
          lowered.push({ x: Y.x, y: Y.y })
        } else {
          if (!yBackIsX && Y.h > X.h + cXY) {
            insertNode(X, X.h)
            raised.push({ x: X.x, y: X.y })
          } else if (
            !yBackIsX && X.h > Y.h + cYX &&
            Y.tag === 'CLOSED' && Y.h > kold
          ) {
            insertNode(Y, Y.h)
            raised.push({ x: Y.x, y: Y.y })
          }
        }
      }
    }

    return { raised, lowered }
  }

  function planUntilRobotSettled(): { raised: Coord[]; lowered: Coord[] } {
    const allRaised: Coord[] = []
    const allLowered: Coord[] = []
    let iterations = 0

    while (!open.empty && iterations < PROCESS_LIMIT) {
      const rn = getNode(robotPos.x, robotPos.y)
      if (
        rn.tag === 'CLOSED' &&
        rn.h < INF &&
        rn.bx !== -1 &&
        !knownWalls.has(coordKey(rn.bx, rn.by)) &&
        open.getKmin() >= rn.h
      ) {
        break
      }
      const result = processState()
      if (!result) break
      allRaised.push(...result.raised)
      allLowered.push(...result.lowered)
      iterations++
    }

    return { raised: allRaised, lowered: allLowered }
  }

  function extractPath(): Coord[] {
    const path: Coord[] = []
    let cx = robotPos.x, cy = robotPos.y
    const visited = new Set<number>()
    const maxLen = ROWS * COLS

    for (let i = 0; i < maxLen; i++) {
      const key = coordKey(cx, cy)
      if (visited.has(key)) break
      visited.add(key)
      path.push({ x: cx, y: cy })
      if (cx === goal.x && cy === goal.y) break

      const node = getNode(cx, cy)
      if (node.h === INF || node.bx === -1) break
      cx = node.bx
      cy = node.by
    }
    return path
  }

  function pathReachesGoal(path: Coord[]): boolean {
    return path.length > 0 &&
      path[path.length - 1].x === goal.x &&
      path[path.length - 1].y === goal.y
  }

  function modifyCost(nx: number, ny: number) {
    const node = getNode(nx, ny)
    if (node.tag === 'CLOSED') {
      insertNode(node, node.h)
    }
  }

  function makeState(
    plannedPath: Coord[],
    raised: Coord[],
    lowered: Coord[],
    message: string,
    phase: DStarState['phase'],
    found: boolean
  ): DStarState {
    return {
      agentPos: { ...robotPos },
      plannedPath: [...plannedPath],
      traversedPath: [...traversedPath],
      raisedNodes: raised,
      loweredNodes: lowered,
      message,
      phase,
      found,
      replanCount,
      nodesProcessed: totalProcessed,
    }
  }

  // ===== INITIAL PLANNING =====
  const goalNode = getNode(goal.x, goal.y)
  insertNode(goalNode, 0)

  const initResult = planUntilRobotSettled()
  let plannedPath = extractPath()

  yield makeState(
    plannedPath, initResult.raised, initResult.lowered,
    `Початкове планування завершено. Шлях: ${plannedPath.length} клітинок`,
    'planning', pathReachesGoal(plannedPath)
  )

  // ===== MAIN LOOP =====
  let moveCount = 0

  while (robotPos.x !== goal.x || robotPos.y !== goal.y) {
    if (++moveCount > MOVE_LIMIT) {
      yield makeState([], [], [],
        `Зациклення: перевищено ліміт ${MOVE_LIMIT} кроків`,
        'finished', false)
      return
    }

    // 1. Discover walls
    const newWalls = getVisibleWalls(robotPos)
    const discovered: Coord[] = []
    for (const w of newWalls) {
      const wk = coordKey(w.x, w.y)
      if (!knownWalls.has(wk)) {
        knownWalls.add(wk)
        discovered.push(w)
      }
    }

    // 2. Replan if new walls
    if (discovered.length > 0) {
      for (const w of discovered) {
        for (const nb of getNeighbors(w.x, w.y)) {
          modifyCost(nb.x, nb.y)
        }
      }

      const replanResult = planUntilRobotSettled()
      replanCount++
      plannedPath = extractPath()

      yield makeState(
        plannedPath, replanResult.raised, replanResult.lowered,
        `Виявлено ${discovered.length} стін. Replan #${replanCount}`,
        'replanning', pathReachesGoal(plannedPath)
      )
    }

    // 3. Check if path exists
    const rNode = getNode(robotPos.x, robotPos.y)
    if (rNode.h === INF || rNode.bx === -1) {
      yield makeState([], [], [],
        `Шлях не знайдено з (${robotPos.x}, ${robotPos.y})`,
        'finished', false)
      return
    }

    // 4. Check backpointer leads to wall
    const nextX = rNode.bx
    const nextY = rNode.by
    if (knownWalls.has(coordKey(nextX, nextY))) {
      insertNode(rNode, rNode.h)
      planUntilRobotSettled()
      replanCount++
      plannedPath = extractPath()

      const rn2 = getNode(robotPos.x, robotPos.y)
      if (rn2.h === INF || rn2.bx === -1) {
        yield makeState([], [], [],
          `Шлях заблоковано`,
          'finished', false)
        return
      }
      continue
    }

    // 5. Detect oscillation
    const nextKey = coordKey(nextX, nextY)
    const visits = (visitCount.get(nextKey) ?? 0) + 1
    visitCount.set(nextKey, visits)

    if (visits >= VISIT_LIMIT) {
      // Force replan: reset robot node
      const rn = getNode(robotPos.x, robotPos.y)
      rn.tag = 'NEW'
      rn.h = INF
      rn.k = INF
      rn.bx = -1
      rn.by = -1
      insertNode(rn, INF)
      planUntilRobotSettled()
      replanCount++
      plannedPath = extractPath()

      const rn2 = getNode(robotPos.x, robotPos.y)
      if (rn2.h === INF || rn2.bx === -1) {
        yield makeState([], [], [],
          `Зациклення: не вдалося знайти альтернативний шлях`,
          'finished', false)
        return
      }
      visitCount.clear()
      continue
    }

    // 6. Move
    robotPos = { x: nextX, y: nextY }
    open.setRobot(robotPos)
    traversedPath.push({ ...robotPos })
    plannedPath = extractPath()

    yield makeState(
      plannedPath, [], [],
      `Крок до (${robotPos.x}, ${robotPos.y})`,
      'moving', false
    )
  }

  yield makeState([], [], [],
    `Фініш! Replans: ${replanCount}, вузлів: ${totalProcessed}, кроків: ${traversedPath.length}`,
    'finished', true)
}
