import { ref, onScopeDispose, type Ref } from 'vue'
import { dijkstra } from '../dijkstra'
import type { DijkstraState } from '../dijkstra'
import type { Cell, Coord } from '../types'

export function useDijkstraRunner(
  cells: Ref<Cell[][]>,
  start: Ref<Coord>,
  end: Ref<Coord>,
  clearAlgorithmState: () => void,
) {
  const drawVersion = ref(0)
  const isRunning = ref(false)
  const isPaused = ref(false)
  const isFinished = ref(false)
  const pathFound = ref(false)
  const speed = ref(5)
  const stepCount = ref(0)
  const currentMessage = ref('')
  const nodesProcessed = ref(0)
  const pathCost = ref(0)
  const elapsedMs = ref(0)

  let generator: Generator<DijkstraState> | null = null
  let animationId: number | null = null
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  function revealAll() {
    for (const row of cells.value) {
      for (const cell of row) {
        cell.visibility = 'visible'
      }
    }
  }

  function applyState(state: DijkstraState) {
    for (const row of cells.value) {
      for (const cell of row) {
        cell.state = 'idle'
      }
    }

    // Precedence: current > path > open > visited (closed)
    const closedKeys = new Set(state.closedSet.map(c => c.y * 100 + c.x))
    for (const c of state.closedSet) {
      const cell = cells.value[c.y]?.[c.x]
      if (cell) cell.state = 'visited'
    }

    const openKeys = new Set(state.openSet.map(c => c.y * 100 + c.x))
    for (const c of state.openSet) {
      const cell = cells.value[c.y]?.[c.x]
      if (cell) cell.state = 'open'
    }

    const pathKeys = new Set(state.plannedPath.map(c => c.y * 100 + c.x))
    for (const c of state.plannedPath) {
      const cell = cells.value[c.y]?.[c.x]
      if (cell) cell.state = 'path'
    }

    if (state.current) {
      const cc = cells.value[state.current.y]?.[state.current.x]
      if (cc) cc.state = 'current'
    }

    // Suppress unused-warning noise
    void closedKeys; void openKeys; void pathKeys

    currentMessage.value = state.message
    isFinished.value = state.phase === 'finished'
    pathFound.value = state.found
    nodesProcessed.value = state.nodesProcessed
    pathCost.value = state.pathCost

    drawVersion.value++
  }

  function doStep(): boolean {
    if (!generator) return true
    const t0 = performance.now()
    const result = generator.next()
    const t1 = performance.now()
    elapsedMs.value += (t1 - t0)
    if (result.done) {
      isRunning.value = false
      isFinished.value = true
      return true
    }
    stepCount.value++
    applyState(result.value)
    if (result.value.phase === 'finished') {
      isRunning.value = false
      return true
    }
    return false
  }

  function scheduleNext() {
    if (!isRunning.value || isPaused.value) return
    if (speed.value === 0) {
      let count = 0
      while (!doStep() && ++count < 100) {}
      if (!isFinished.value) {
        animationId = requestAnimationFrame(() => scheduleNext())
      }
      return
    }
    timeoutId = setTimeout(() => {
      const done = doStep()
      if (!done) {
        animationId = requestAnimationFrame(() => scheduleNext())
      }
    }, speed.value)
  }

  function getWalls(): Coord[] {
    const walls: Coord[] = []
    const rowCount = cells.value.length
    const colCount = cells.value[0]?.length ?? 0
    for (let y = 0; y < rowCount; y++) {
      for (let x = 0; x < colCount; x++) {
        const t = cells.value[y][x].type
        if (t === 'wall' || t === 'water') walls.push({ x, y })
      }
    }
    return walls
  }

  function getWeight(x: number, y: number): number {
    return cells.value[y]?.[x]?.weight ?? 1
  }

  function initGenerator() {
    clearAlgorithmState()
    revealAll()
    stepCount.value = 0
    currentMessage.value = ''
    isFinished.value = false
    pathFound.value = false
    nodesProcessed.value = 0
    pathCost.value = 0
    elapsedMs.value = 0
    generator = dijkstra(start.value, end.value, getWalls, getWeight)
  }

  function play() {
    if (isFinished.value) return
    if (!generator) initGenerator()
    isRunning.value = true
    isPaused.value = false
    scheduleNext()
  }

  function pause() {
    isPaused.value = true
    isRunning.value = false
    if (timeoutId) clearTimeout(timeoutId)
    if (animationId) cancelAnimationFrame(animationId)
  }

  function step() {
    if (isFinished.value) return
    if (!generator) initGenerator()
    isPaused.value = true
    isRunning.value = false
    doStep()
  }

  function reset() {
    pause()
    isPaused.value = false
    generator = null
    stepCount.value = 0
    currentMessage.value = ''
    isFinished.value = false
    pathFound.value = false
    nodesProcessed.value = 0
    pathCost.value = 0
    elapsedMs.value = 0
    clearAlgorithmState()
    revealAll()
    drawVersion.value++
  }

  // Ensure cells are visible immediately (no fog for Dijkstra)
  revealAll()

  onScopeDispose(() => {
    if (timeoutId) clearTimeout(timeoutId)
    if (animationId) cancelAnimationFrame(animationId)
    timeoutId = null
    animationId = null
    generator = null
    isRunning.value = false
  })

  return {
    drawVersion, isRunning, isPaused, isFinished, pathFound,
    speed, stepCount, currentMessage,
    nodesProcessed, pathCost, elapsedMs,
    play, pause, step, reset,
  }
}
