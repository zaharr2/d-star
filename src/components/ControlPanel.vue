<script setup lang="ts">
import type { HeuristicType } from '../types'

const props = defineProps<{
  isRunning: boolean
  isPaused: boolean
  isFinished: boolean
  speed: number
  heuristicType: HeuristicType
  visibilityRadius: number
  wallDensity: number
}>()

const emit = defineEmits<{
  play: []
  pause: []
  step: []
  reset: []
  generateMaze: []
  'update:speed': [value: number]
  'update:heuristicType': [value: HeuristicType]
  'update:visibilityRadius': [value: number]
  'update:wallDensity': [value: number]
}>()

const algorithmActive = props.isRunning || props.isPaused
</script>

<template>
  <div class="control-panel">
    <div class="row">
      <button v-if="!isRunning" @click="emit('play')" :disabled="isFinished">
        {{ isPaused ? 'Resume' : 'Play' }}
      </button>
      <button v-else @click="emit('pause')">Pause</button>
      <button @click="emit('step')" :disabled="isFinished">Step</button>
      <button @click="emit('reset')">Reset</button>
      <button @click="emit('generateMaze')" :disabled="isRunning || isPaused">
        Generate Maze
      </button>
    </div>

    <div class="row">
      <label>
        Speed: {{ speed === 0 ? 'Max' : speed + 'ms' }}
        <input type="range" min="0" max="200" step="5"
          :value="speed" @input="emit('update:speed', +($event.target as HTMLInputElement).value)" />
      </label>

      <label>
        Visibility: {{ visibilityRadius }}
        <input type="range" min="1" max="20" step="1"
          :value="visibilityRadius" @input="emit('update:visibilityRadius', +($event.target as HTMLInputElement).value)" />
      </label>

      <label>
        Walls: {{ Math.round(wallDensity * 100) }}%
        <input type="range" min="0.05" max="0.5" step="0.01"
          :value="wallDensity"
          :disabled="isRunning || isPaused"
          @input="emit('update:wallDensity', +($event.target as HTMLInputElement).value)" />
      </label>

      <label>
        Heuristic:
        <select
          :value="heuristicType"
          @change="emit('update:heuristicType', ($event.target as HTMLSelectElement).value as HeuristicType)"
          :disabled="isRunning || isPaused"
        >
          <option value="manhattan">Manhattan</option>
          <option value="euclidean">Euclidean</option>
          <option value="chebyshev">Chebyshev</option>
        </select>
      </label>
    </div>
  </div>
</template>

<style scoped>
.control-panel {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  width: 100%;
  max-width: 1000px;
}

.row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
}

label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

input[type="range"] {
  width: 100px;
}
</style>
