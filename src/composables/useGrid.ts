import { ref } from 'vue'
import type { Cell, CellType, Coord } from '../types'

const ROWS = 100
const COLS = 100
const START: Coord = { x: 2, y: 50 }
const GOAL: Coord = { x: 97, y: 50 }

// Simple value noise for terrain generation
function generateNoise(rows: number, cols: number, scale: number): number[][] {
  // Random gradient grid
  const gRows = Math.ceil(rows / scale) + 2
  const gCols = Math.ceil(cols / scale) + 2
  const grad: number[][] = []
  for (let y = 0; y < gRows; y++) {
    grad[y] = []
    for (let x = 0; x < gCols; x++) {
      grad[y][x] = Math.random()
    }
  }

  function smoothstep(t: number): number {
    return t * t * (3 - 2 * t)
  }

  function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t
  }

  const result: number[][] = []
  for (let y = 0; y < rows; y++) {
    result[y] = []
    for (let x = 0; x < cols; x++) {
      const gx = x / scale
      const gy = y / scale
      const x0 = Math.floor(gx)
      const y0 = Math.floor(gy)
      const fx = smoothstep(gx - x0)
      const fy = smoothstep(gy - y0)

      const top = lerp(grad[y0][x0], grad[y0][x0 + 1], fx)
      const bottom = lerp(grad[y0 + 1][x0], grad[y0 + 1][x0 + 1], fx)
      result[y][x] = lerp(top, bottom, fy)
    }
  }
  return result
}

function generateTerrain(rows: number, cols: number): number[][] {
  // Multi-octave noise for natural-looking terrain
  const o1 = generateNoise(rows, cols, 20)
  const o2 = generateNoise(rows, cols, 10)
  const o3 = generateNoise(rows, cols, 5)

  const result: number[][] = []
  for (let y = 0; y < rows; y++) {
    result[y] = []
    for (let x = 0; x < cols; x++) {
      const v = o1[y][x] * 0.5 + o2[y][x] * 0.3 + o3[y][x] * 0.2
      // Map to 1-9
      result[y][x] = Math.max(1, Math.min(9, Math.round(v * 8 + 1)))
    }
  }
  return result
}

export function useGrid() {
  const cells = ref<Cell[][]>([])
  const drawVersion = ref(0)
  const start = ref<Coord>({ ...START })
  const end = ref<Coord>({ ...GOAL })
  const wallDensity = ref(0.3)

  function createGrid() {
    const terrain = generateTerrain(ROWS, COLS)
    const grid: Cell[][] = []
    for (let y = 0; y < ROWS; y++) {
      const row: Cell[] = []
      for (let x = 0; x < COLS; x++) {
        let type: CellType = 'empty'
        if (x === start.value.x && y === start.value.y) type = 'start'
        else if (x === end.value.x && y === end.value.y) type = 'end'
        row.push({ x, y, type, state: 'idle', visibility: 'unseen', weight: terrain[y][x] })
      }
      grid.push(row)
    }
    cells.value = grid
  }

  function generateMaze() {
    createGrid()
    const d = wallDensity.value

    // Generate lakes in low terrain using a separate noise layer
    const lakeNoise = generateNoise(ROWS, COLS, 15)
    const LAKE_THRESHOLD = 0.35 // lower = fewer lakes

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const cell = cells.value[y][x]
        if (cell.type === 'start' || cell.type === 'end') continue

        // Lakes form where terrain is low AND lake noise is low
        if (cell.weight <= 3 && lakeNoise[y][x] < LAKE_THRESHOLD) {
          cell.type = 'water'
          continue
        }

        if (Math.random() < d) {
          cell.type = 'wall'
        }
      }
    }
    drawVersion.value++
  }

  function clearAll() {
    createGrid()
    drawVersion.value++
  }

  function toggleWall(x: number, y: number) {
    const cell = cells.value[y]?.[x]
    if (!cell || cell.type === 'start' || cell.type === 'end') return
    cell.type = cell.type === 'wall' ? 'empty' : 'wall'
    drawVersion.value++
  }

  function setWall(x: number, y: number) {
    const cell = cells.value[y]?.[x]
    if (!cell || cell.type === 'start' || cell.type === 'end') return
    cell.type = 'wall'
    drawVersion.value++
  }

  function setStart(x: number, y: number): boolean {
    const cell = cells.value[y]?.[x]
    if (!cell) return false
    if (x === end.value.x && y === end.value.y) return false

    const oldStart = start.value
    const oldCell = cells.value[oldStart.y]?.[oldStart.x]
    if (oldCell) oldCell.type = 'empty'

    if (cell.type === 'wall') cell.type = 'empty'
    cell.type = 'start'
    start.value = { x, y }
    drawVersion.value++
    return true
  }

  function setEnd(x: number, y: number): boolean {
    const cell = cells.value[y]?.[x]
    if (!cell) return false
    if (x === start.value.x && y === start.value.y) return false

    const oldEnd = end.value
    const oldCell = cells.value[oldEnd.y]?.[oldEnd.x]
    if (oldCell) oldCell.type = 'empty'

    if (cell.type === 'wall') cell.type = 'empty'
    cell.type = 'end'
    end.value = { x, y }
    drawVersion.value++
    return true
  }

  function clearAlgorithmState() {
    for (const row of cells.value) {
      for (const cell of row) {
        cell.state = 'idle'
      }
    }
  }

  createGrid()

  return {
    cells,
    drawVersion,
    start,
    end,
    wallDensity,
    rows: ROWS,
    cols: COLS,
    toggleWall,
    setWall,
    setStart,
    setEnd,
    generateMaze,
    clearAll,
    clearAlgorithmState,
  }
}
