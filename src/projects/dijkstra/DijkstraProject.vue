<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useGrid } from '../../composables/useGrid'
import { useDijkstraRunner } from '../../composables/useDijkstraRunner'
import GridCanvas from '../../components/GridCanvas.vue'
import ControlPanel from '../../components/ControlPanel.vue'
import InfoPanel from '../../components/InfoPanel.vue'
import Legend from '../../components/Legend.vue'

type PickMode = 'none' | 'start' | 'end'

const grid = useGrid()

// Reveal full grid — Dijkstra has full-map knowledge (no fog of war)
for (const row of grid.cells.value) {
  for (const cell of row) {
    cell.visibility = 'visible'
  }
}

const runner = useDijkstraRunner(
  grid.cells, grid.start, grid.end, grid.clearAlgorithmState,
)

const pickMode = ref<PickMode>('none')

const algorithmActive = computed(() => runner.isRunning.value || runner.isPaused.value)
const drawVersion = computed(() => grid.drawVersion.value + runner.drawVersion.value)

const GRID_MAX_SIZE = 1000
const windowWidth = ref(window.innerWidth)
function onResize() { windowWidth.value = window.innerWidth }

const gridSize = computed(() => Math.min(GRID_MAX_SIZE, windowWidth.value - 48))

function revealAll() {
  for (const row of grid.cells.value) {
    for (const cell of row) {
      cell.visibility = 'visible'
    }
  }
}

function handleGenerateMaze() {
  runner.reset()
  grid.generateMaze()
  revealAll()
}

function handleReset() {
  runner.reset()
  revealAll()
}

function handleDensityChange(value: number) {
  grid.wallDensity.value = value
}

function startPick(mode: PickMode) {
  if (algorithmActive.value) return
  pickMode.value = pickMode.value === mode ? 'none' : mode
}

function cancelPick() {
  pickMode.value = 'none'
}

function handlePickAt(x: number, y: number) {
  if (pickMode.value === 'none' || algorithmActive.value) return

  const ok = pickMode.value === 'start'
    ? grid.setStart(x, y)
    : grid.setEnd(x, y)

  if (!ok) return

  runner.reset()
  revealAll()
  pickMode.value = 'none'
}

function onKey(e: KeyboardEvent) {
  const target = e.target as HTMLElement | null
  const tag = target?.tagName
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return

  if (e.key === 'Escape' && pickMode.value !== 'none') {
    e.preventDefault()
    cancelPick()
  } else if (!algorithmActive.value && (e.key === 's' || e.key === 'S')) {
    e.preventDefault()
    startPick('start')
  } else if (!algorithmActive.value && (e.key === 'f' || e.key === 'F')) {
    e.preventDefault()
    startPick('end')
  }
}

onMounted(() => {
  window.addEventListener('resize', onResize)
  window.addEventListener('keydown', onKey)
})
onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  window.removeEventListener('keydown', onKey)
})
</script>

<template>
  <div class="project">
    <ControlPanel
      :is-running="runner.isRunning.value"
      :is-paused="runner.isPaused.value"
      :is-finished="runner.isFinished.value"
      :speed="runner.speed.value"
      :heuristic-type="'manhattan'"
      :visibility-radius="5"
      :wall-density="grid.wallDensity.value"
      :pick-mode="pickMode"
      :fog-enabled="false"
      :show-fog-controls="false"
      :show-heuristic="false"
      @play="runner.play()"
      @pause="runner.pause()"
      @step="runner.step()"
      @reset="handleReset"
      @generate-maze="handleGenerateMaze"
      @pick-start="startPick('start')"
      @pick-end="startPick('end')"
      @cancel-pick="cancelPick"
      @update:speed="runner.speed.value = $event"
      @update:wall-density="handleDensityChange"
    />

    <InfoPanel
      :message="runner.currentMessage.value"
      :step-count="runner.stepCount.value"
      :is-finished="runner.isFinished.value"
      :path-found="runner.pathFound.value"
      :replan-count="0"
      :nodes-processed="runner.nodesProcessed.value"
      :escape-count="0"
      :path-cost="runner.pathCost.value"
      :elapsed-ms="runner.elapsedMs.value"
    />

    <GridCanvas
      :cells="grid.cells.value"
      :grid-size="gridSize"
      :draw-version="drawVersion"
      :agent-pos="null"
      :disabled="algorithmActive"
      :pick-mode="pickMode"
      @toggle-wall="grid.toggleWall"
      @set-wall="grid.setWall"
      @pick-at="handlePickAt"
    />

    <Legend />
  </div>
</template>

<style scoped>
.project {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  width: 100%;
}
</style>
