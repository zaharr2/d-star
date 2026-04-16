<script setup lang="ts">
import type { HeuristicType } from '../types'

type PickMode = 'none' | 'start' | 'end'

withDefaults(defineProps<{
  isRunning: boolean
  isPaused: boolean
  isFinished: boolean
  speed: number
  heuristicType: HeuristicType
  visibilityRadius: number
  wallDensity: number
  pickMode: PickMode
  fogEnabled: boolean
  showFogControls?: boolean
  showHeuristic?: boolean
}>(), {
  showFogControls: true,
  showHeuristic: true,
})

const emit = defineEmits<{
  play: []
  pause: []
  step: []
  reset: []
  generateMaze: []
  'pick-start': []
  'pick-end': []
  'cancel-pick': []
  'update:speed': [value: number]
  'update:heuristicType': [value: HeuristicType]
  'update:visibilityRadius': [value: number]
  'update:wallDensity': [value: number]
  'update:fogEnabled': [value: boolean]
}>()
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
      <button
        class="pick-btn start"
        :class="{ active: pickMode === 'start' }"
        :disabled="isRunning || isPaused"
        :aria-pressed="pickMode === 'start'"
        :title="'Поставити старт (S)'"
        @click="emit('pick-start')"
      >
        <span class="marker-dot start-dot" aria-hidden="true"></span>
        Поставити старт
      </button>
      <button
        class="pick-btn end"
        :class="{ active: pickMode === 'end' }"
        :disabled="isRunning || isPaused"
        :aria-pressed="pickMode === 'end'"
        :title="'Поставити фініш (F)'"
        @click="emit('pick-end')"
      >
        <span class="marker-dot end-dot" aria-hidden="true"></span>
        Поставити фініш
      </button>
    </div>

    <div v-if="pickMode !== 'none'" class="hint" role="status">
      <span>
        Клікніть на гриді, щоб поставити
        {{ pickMode === 'start' ? 'старт' : 'фініш' }}.
      </span>
      <button class="cancel" @click="emit('cancel-pick')">Скасувати (Esc)</button>
    </div>

    <div class="row">
      <label>
        Speed: {{ speed === 0 ? 'Max' : speed + 'ms' }}
        <input type="range" min="0" max="200" step="5"
          :value="speed" @input="emit('update:speed', +($event.target as HTMLInputElement).value)" />
      </label>

      <label v-if="showFogControls" class="toggle">
        <input
          type="checkbox"
          :checked="fogEnabled"
          :disabled="isRunning || isPaused"
          @change="emit('update:fogEnabled', ($event.target as HTMLInputElement).checked)"
        />
        Туман війни
      </label>

      <label v-if="showFogControls" :class="{ muted: !fogEnabled }">
        Visibility: {{ visibilityRadius }}
        <input type="range" min="1" max="20" step="1"
          :value="visibilityRadius"
          :disabled="!fogEnabled"
          @input="emit('update:visibilityRadius', +($event.target as HTMLInputElement).value)" />
      </label>

      <label>
        Walls: {{ Math.round(wallDensity * 100) }}%
        <input type="range" min="0.05" max="0.5" step="0.01"
          :value="wallDensity"
          :disabled="isRunning || isPaused"
          @input="emit('update:wallDensity', +($event.target as HTMLInputElement).value)" />
      </label>

      <label v-if="showHeuristic">
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

.pick-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.pick-btn.active {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 1px var(--color-accent);
  background: color-mix(in srgb, var(--color-accent) 18%, var(--color-surface));
}

.marker-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
}

.start-dot { background: #22c55e; }
.end-dot { background: #ef4444; }

.hint {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.55rem 0.85rem;
  border-radius: 6px;
  background: color-mix(in srgb, var(--color-accent) 14%, var(--color-surface));
  border: 1px solid color-mix(in srgb, var(--color-accent) 40%, var(--color-border));
  color: var(--color-text);
  font-size: 0.85rem;
}

.cancel {
  padding: 0.3rem 0.6rem;
  font-size: 0.8rem;
}

.toggle {
  gap: 0.4rem;
}

.muted {
  opacity: 0.55;
}
</style>
