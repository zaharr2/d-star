<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useGrid } from '../../composables/useGrid'
import { useVisibility } from '../../composables/useVisibility'
import { useRunner } from '../../composables/useRunner'
import GridCanvas from '../../components/GridCanvas.vue'
import ControlPanel from '../../components/ControlPanel.vue'
import InfoPanel from '../../components/InfoPanel.vue'
import Legend from '../../components/Legend.vue'

type PickMode = 'none' | 'start' | 'end'

const grid = useGrid()
const visibility = useVisibility(grid.cells)
visibility.initFog(grid.start.value)

const runner = useRunner(
  grid.cells, grid.start, grid.end, grid.clearAlgorithmState,
  visibility.radius, visibility.updateVisibility, visibility.initFog,
  visibility.enabled
)

const pickMode = ref<PickMode>('none')

const algorithmActive = computed(() => runner.isRunning.value || runner.isPaused.value)
const drawVersion = computed(() => grid.drawVersion.value + runner.drawVersion.value)

const GRID_MAX_SIZE = 1000
const windowWidth = ref(window.innerWidth)
function onResize() { windowWidth.value = window.innerWidth }

const gridSize = computed(() => Math.min(GRID_MAX_SIZE, windowWidth.value - 48))

function handleGenerateMaze() {
  runner.reset()
  grid.generateMaze()
  visibility.initFog(grid.start.value)
}

function handleReset() {
  runner.reset()
  visibility.initFog(grid.start.value)
}

function handleRadiusChange(value: number) {
  runner.reset()
  visibility.radius.value = value
  visibility.initFog(grid.start.value)
}

function handleDensityChange(value: number) {
  grid.wallDensity.value = value
}

function handleFogToggle(value: boolean) {
  runner.reset()
  visibility.enabled.value = value
  visibility.initFog(grid.start.value)
}

function handleHeuristicChange(value: string) {
  runner.reset()
  runner.heuristicType.value = value as any
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
  visibility.initFog(grid.start.value)
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
      :heuristic-type="runner.heuristicType.value"
      :visibility-radius="visibility.radius.value"
      :wall-density="grid.wallDensity.value"
      :pick-mode="pickMode"
      :fog-enabled="visibility.enabled.value"
      @play="runner.play()"
      @pause="runner.pause()"
      @step="runner.step()"
      @reset="handleReset"
      @generate-maze="handleGenerateMaze"
      @pick-start="startPick('start')"
      @pick-end="startPick('end')"
      @cancel-pick="cancelPick"
      @update:speed="runner.speed.value = $event"
      @update:heuristic-type="handleHeuristicChange"
      @update:visibility-radius="handleRadiusChange"
      @update:wall-density="handleDensityChange"
      @update:fog-enabled="handleFogToggle"
    />

    <InfoPanel
      :message="runner.currentMessage.value"
      :step-count="runner.stepCount.value"
      :is-finished="runner.isFinished.value"
      :path-found="runner.pathFound.value"
      :replan-count="runner.replanCount.value"
      :nodes-processed="runner.nodesProcessed.value"
      :escape-count="runner.escapeCount.value"
    />

    <GridCanvas
      :cells="grid.cells.value"
      :grid-size="gridSize"
      :draw-version="drawVersion"
      :agent-pos="runner.agentPos.value"
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
