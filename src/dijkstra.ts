import type { Coord } from './types'

const ROWS = 100
const COLS = 100

function coordKey(x: number, y: number): number {
  return y * COLS + x
}

const DIRS: Coord[] = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
]

export type DijkstraPhase = 'searching' | 'reconstructing' | 'finished'

export interface DijkstraState {
  current: Coord | null
  openSet: Coord[]
  closedSet: Coord[]
  plannedPath: Coord[]
  message: string
  phase: DijkstraPhase
  found: boolean
  nodesProcessed: number
  pathCost: number
}

interface HeapEntry {
  x: number
  y: number
  g: number        // primary key
  seq: number      // monotonic insertion counter; FIFO tiebreak on equal g
}

/**
 * Binary min-heap keyed by (g, seq).
 * Dijkstra uses only g (no f, no h — that is the whole point vs A*).
 * Lazy deletion: when g is improved we push a fresh entry; older entries
 * become stale and are skipped on pop by comparing entry.g to bestG[key].
 * Equal-g ties break by insertion order (smaller seq first) for determinism.
 */
class MinHeap {
  private heap: HeapEntry[] = []

  private less(i: number, j: number): boolean {
    const a = this.heap[i]
    const b = this.heap[j]
    if (a.g !== b.g) return a.g < b.g
    return a.seq < b.seq
  }

  private swap(i: number, j: number) {
    const t = this.heap[i]
    this.heap[i] = this.heap[j]
    this.heap[j] = t
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

  push(e: HeapEntry) {
    this.heap.push(e)
    this.siftUp(this.heap.length - 1)
  }

  pop(): HeapEntry | null {
    if (this.heap.length === 0) return null
    const top = this.heap[0]
    const last = this.heap.pop()!
    if (this.heap.length > 0) {
      this.heap[0] = last
      this.siftDown(0)
    }
    return top
  }

  get size(): number { return this.heap.length }

  snapshotCoords(): Coord[] {
    // Lazy-deletion can leave multiple stale entries for one cell; UI wants unique coords.
    const seen = new Set<number>()
    const out: Coord[] = []
    for (const e of this.heap) {
      const k = coordKey(e.x, e.y)
      if (seen.has(k)) continue
      seen.add(k)
      out.push({ x: e.x, y: e.y })
    }
    return out
  }
}

/**
 * Dijkstra's algorithm (4-connected, uniform-cost search — no heuristic).
 * Edge cost = getWeight(destination). Walls from getWalls() are impassable and
 * fetched once at init (no fog of war). pathCost sums destination-cell weights
 * along the reconstructed path (excluding the start cell).
 */
export function* dijkstra(
  start: Coord,
  end: Coord,
  getWalls: () => Coord[],
  getWeight: (x: number, y: number) => number,
): Generator<DijkstraState> {
  const PROCESS_LIMIT = ROWS * COLS * 4

  const walls = new Set<number>()
  for (const w of getWalls()) walls.add(coordKey(w.x, w.y))

  const startKey = coordKey(start.x, start.y)
  const endKey = coordKey(end.x, end.y)

  // Edge case: start or end is a wall
  if (walls.has(startKey)) {
    yield {
      current: null,
      openSet: [],
      closedSet: [],
      plannedPath: [],
      message: `Старт знаходиться на стіні`,
      phase: 'finished',
      found: false,
      nodesProcessed: 0,
      pathCost: 0,
    }
    return
  }
  if (walls.has(endKey)) {
    yield {
      current: null,
      openSet: [],
      closedSet: [],
      plannedPath: [],
      message: `Ціль знаходиться на стіні`,
      phase: 'finished',
      found: false,
      nodesProcessed: 0,
      pathCost: 0,
    }
    return
  }

  // Edge case: start === end
  if (start.x === end.x && start.y === end.y) {
    yield {
      current: null,
      openSet: [],
      closedSet: [],
      plannedPath: [{ x: start.x, y: start.y }],
      message: `Старт збігається з ціллю`,
      phase: 'finished',
      found: true,
      nodesProcessed: 0,
      pathCost: 0,
    }
    return
  }

  // Flat arrays for O(1) per-cell state
  const bestG = new Float64Array(ROWS * COLS)
  bestG.fill(Infinity)
  const parentX = new Int32Array(ROWS * COLS)
  const parentY = new Int32Array(ROWS * COLS)
  parentX.fill(-1)
  parentY.fill(-1)
  const closed = new Uint8Array(ROWS * COLS)

  const open = new MinHeap()
  let seqCounter = 0

  bestG[startKey] = 0
  open.push({ x: start.x, y: start.y, g: 0, seq: seqCounter++ })

  let nodesProcessed = 0

  yield {
    current: null,
    openSet: [{ x: start.x, y: start.y }],
    closedSet: [],
    plannedPath: [],
    message: `Старт пошуку`,
    phase: 'searching',
    found: true,
    nodesProcessed: 0,
    pathCost: 0,
  }

  function closedSnapshot(): Coord[] {
    const out: Coord[] = []
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (closed[coordKey(x, y)]) out.push({ x, y })
      }
    }
    return out
  }

  // ===== MAIN SEARCH LOOP =====
  let found = false

  while (open.size > 0) {
    const entry = open.pop()!
    const key = coordKey(entry.x, entry.y)

    // Skip stale entries: a fresher (lower g) push superseded this one.
    if (entry.g !== bestG[key]) continue
    if (closed[key]) continue

    closed[key] = 1
    nodesProcessed++

    // Goal reached
    if (entry.x === end.x && entry.y === end.y) {
      found = true
      yield {
        current: { x: entry.x, y: entry.y },
        openSet: open.snapshotCoords(),
        closedSet: closedSnapshot(),
        plannedPath: [],
        message: `Шлях знайдено, відновлюю`,
        phase: 'searching',
        found: true,
        nodesProcessed,
        pathCost: 0,
      }
      break
    }

    if (nodesProcessed >= PROCESS_LIMIT) {
      yield {
        current: null,
        openSet: open.snapshotCoords(),
        closedSet: closedSnapshot(),
        plannedPath: [],
        message: `Перевищено ліміт обробки ${PROCESS_LIMIT} вузлів`,
        phase: 'finished',
        found: false,
        nodesProcessed,
        pathCost: 0,
      }
      return
    }

    // Relax neighbors
    for (const d of DIRS) {
      const nx = entry.x + d.x
      const ny = entry.y + d.y
      if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) continue
      const nk = coordKey(nx, ny)
      if (walls.has(nk)) continue
      if (closed[nk]) continue

      const stepCost = getWeight(nx, ny)
      const tentativeG = entry.g + stepCost
      if (tentativeG < bestG[nk]) {
        bestG[nk] = tentativeG
        parentX[nk] = entry.x
        parentY[nk] = entry.y
        open.push({ x: nx, y: ny, g: tentativeG, seq: seqCounter++ })
      }
    }

    yield {
      current: { x: entry.x, y: entry.y },
      openSet: open.snapshotCoords(),
      closedSet: closedSnapshot(),
      plannedPath: [],
      message: `Розгортаю (${entry.x}, ${entry.y})`,
      phase: 'searching',
      found: true,
      nodesProcessed,
      pathCost: 0,
    }
  }

  if (!found) {
    yield {
      current: null,
      openSet: [],
      closedSet: closedSnapshot(),
      plannedPath: [],
      message: `Шлях не знайдено`,
      phase: 'finished',
      found: false,
      nodesProcessed,
      pathCost: 0,
    }
    return
  }

  // ===== RECONSTRUCTION =====
  // Walk parents from end back to start, then reverse.
  const reversed: Coord[] = []
  let cx = end.x, cy = end.y
  const safety = ROWS * COLS + 1
  let i = 0
  while (i < safety) {
    reversed.push({ x: cx, y: cy })
    if (cx === start.x && cy === start.y) break
    const k = coordKey(cx, cy)
    const px = parentX[k]
    const py = parentY[k]
    if (px === -1) break
    cx = px
    cy = py
    i++
  }
  const fullPath = reversed.reverse()
  const pathCost = bestG[endKey]

  // Yield one frame per path step appended for smooth visualization.
  const partial: Coord[] = []
  for (const p of fullPath) {
    partial.push(p)
    yield {
      current: null,
      openSet: open.snapshotCoords(),
      closedSet: closedSnapshot(),
      plannedPath: [...partial],
      message: `Відновлення шляху (${partial.length}/${fullPath.length})`,
      phase: 'reconstructing',
      found: true,
      nodesProcessed,
      pathCost,
    }
  }

  yield {
    current: null,
    openSet: [],
    closedSet: closedSnapshot(),
    plannedPath: [...fullPath],
    message: `Завершено. Вартість: ${pathCost}, довжина: ${fullPath.length}`,
    phase: 'finished',
    found: true,
    nodesProcessed,
    pathCost,
  }
}
