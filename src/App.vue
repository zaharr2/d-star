<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useGrid } from './composables/useGrid'
import { useVisibility } from './composables/useVisibility'
import { useRunner } from './composables/useRunner'
import GridCanvas from './components/GridCanvas.vue'
import ControlPanel from './components/ControlPanel.vue'
import InfoPanel from './components/InfoPanel.vue'
import Legend from './components/Legend.vue'

const grid = useGrid()
const visibility = useVisibility(grid.cells)
visibility.initFog(grid.start.value)

const runner = useRunner(
  grid.cells, grid.start, grid.end, grid.clearAlgorithmState,
  visibility.radius, visibility.updateVisibility, visibility.initFog
)

const algorithmActive = computed(() => runner.isRunning.value || runner.isPaused.value)
const drawVersion = computed(() => grid.drawVersion.value + runner.drawVersion.value)

const GRID_MAX_SIZE = 1000
const windowWidth = ref(window.innerWidth)
function onResize() { windowWidth.value = window.innerWidth }
onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))

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

function handleHeuristicChange(value: string) {
  runner.reset()
  runner.heuristicType.value = value as any
}
</script>

<template>
  <div class="app">
    <h1 class="title">D* Pathfinding</h1>

    <ControlPanel
      :is-running="runner.isRunning.value"
      :is-paused="runner.isPaused.value"
      :is-finished="runner.isFinished.value"
      :speed="runner.speed.value"
      :heuristic-type="runner.heuristicType.value"
      :visibility-radius="visibility.radius.value"
      :wall-density="grid.wallDensity.value"
      @play="runner.play()"
      @pause="runner.pause()"
      @step="runner.step()"
      @reset="handleReset"
      @generate-maze="handleGenerateMaze"
      @update:speed="runner.speed.value = $event"
      @update:heuristic-type="handleHeuristicChange"
      @update:visibility-radius="handleRadiusChange"
      @update:wall-density="handleDensityChange"
    />

    <InfoPanel
      :message="runner.currentMessage.value"
      :step-count="runner.stepCount.value"
      :is-finished="runner.isFinished.value"
      :path-found="runner.pathFound.value"
      :replan-count="runner.replanCount.value"
      :nodes-processed="runner.nodesProcessed.value"
    />

    <GridCanvas
      :cells="grid.cells.value"
      :grid-size="gridSize"
      :draw-version="drawVersion"
      :agent-pos="runner.agentPos.value"
      :disabled="algorithmActive"
      @toggle-wall="grid.toggleWall"
      @set-wall="grid.setWall"
    />

    <Legend />
  </div>
</template>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  min-height: 100vh;
  padding: 1.5rem 1rem;
}

.title {
  font-size: 1.75rem;
  font-weight: 700;
  background: linear-gradient(135deg, var(--color-accent), #a855f7);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
</style>
