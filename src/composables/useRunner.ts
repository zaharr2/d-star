import { ref, onScopeDispose, type Ref } from 'vue'
import { focusedDStar } from '../dstar'
import type { Cell, Coord, HeuristicType, DStarState } from '../types'

export function useRunner(
  cells: Ref<Cell[][]>,
  start: Ref<Coord>,
  end: Ref<Coord>,
  clearAlgorithmState: () => void,
  visibilityRadius: Ref<number>,
  updateVisibility: (pos: Coord) => void,
  initFog: (pos: Coord) => void,
  fogEnabled: Ref<boolean>
) {
  const drawVersion = ref(0)
  const isRunning = ref(false)
  const isPaused = ref(false)
  const isFinished = ref(false)
  const pathFound = ref(false)
  const speed = ref(50)
  const heuristicType = ref<HeuristicType>('manhattan')
  const stepCount = ref(0)
  const currentMessage = ref('')
  const agentPos = ref<Coord | null>(null)
  const replanCount = ref(0)
  const nodesProcessed = ref(0)
  const escapeCount = ref(0)

  let generator: Generator<DStarState> | null = null
  let animationId: number | null = null
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  function applyState(state: DStarState) {
    for (const row of cells.value) {
      for (const cell of row) {
        cell.state = 'idle'
      }
    }

    for (const c of state.traversedPath) {
      const cell = cells.value[c.y]?.[c.x]
      if (cell) cell.state = 'visited'
    }

    const pathKeys = new Set(state.plannedPath.map(c => c.y * 100 + c.x))
    for (const c of state.plannedPath) {
      const cell = cells.value[c.y]?.[c.x]
      if (cell && cell.visibility !== 'unseen') cell.state = 'path'
    }

    for (const c of state.raisedNodes) {
      const cell = cells.value[c.y]?.[c.x]
      if (cell && !pathKeys.has(c.y * 100 + c.x)) cell.state = 'raise'
    }

    const raisedKeys = new Set(state.raisedNodes.map(c => c.y * 100 + c.x))
    for (const c of state.loweredNodes) {
      const cell = cells.value[c.y]?.[c.x]
      const key = c.y * 100 + c.x
      if (cell && !pathKeys.has(key) && !raisedKeys.has(key)) cell.state = 'lower'
    }

    if (state.agentPos) {
      const ac = cells.value[state.agentPos.y]?.[state.agentPos.x]
      if (ac) ac.state = 'current'
    }

    agentPos.value = state.agentPos
    currentMessage.value = state.message
    isFinished.value = state.phase === 'finished'
    pathFound.value = state.found
    replanCount.value = state.replanCount
    nodesProcessed.value = state.nodesProcessed
    if (state.escapeCount !== undefined) escapeCount.value = state.escapeCount

    if (state.agentPos) {
      updateVisibility(state.agentPos)
    }

    drawVersion.value++
  }

  function doStep(): boolean {
    if (!generator) return true
    const result = generator.next()
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

  function getVisibleWalls(pos: Coord): Coord[] {
    const walls: Coord[] = []
    const rowCount = cells.value.length
    const colCount = cells.value[0]?.length ?? 0

    if (!fogEnabled.value) {
      for (let y = 0; y < rowCount; y++) {
        for (let x = 0; x < colCount; x++) {
          const t = cells.value[y][x].type
          if (t === 'wall' || t === 'water') walls.push({ x, y })
        }
      }
      return walls
    }

    const r = visibilityRadius.value
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const nx = pos.x + dx
        const ny = pos.y + dy
        if (nx < 0 || nx >= colCount || ny < 0 || ny >= rowCount) continue
        if (Math.max(Math.abs(dx), Math.abs(dy)) > r) continue
        const t = cells.value[ny][nx].type
        if (t === 'wall' || t === 'water') {
          walls.push({ x: nx, y: ny })
        }
      }
    }
    return walls
  }

  function getWeight(x: number, y: number): number {
    return cells.value[y]?.[x]?.weight ?? 1
  }

  function initGenerator() {
    clearAlgorithmState()
    initFog(start.value)
    stepCount.value = 0
    currentMessage.value = ''
    isFinished.value = false
    pathFound.value = false
    replanCount.value = 0
    nodesProcessed.value = 0
    escapeCount.value = 0
    generator = focusedDStar(start.value, end.value, heuristicType.value, getVisibleWalls, getWeight)
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
    agentPos.value = null
    replanCount.value = 0
    nodesProcessed.value = 0
    escapeCount.value = 0
    clearAlgorithmState()
    drawVersion.value++
  }

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
    speed, heuristicType, stepCount, currentMessage,
    agentPos, replanCount, nodesProcessed, escapeCount,
    play, pause, step, reset,
  }
}
