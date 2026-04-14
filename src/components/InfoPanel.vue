<script setup lang="ts">
defineProps<{
  message: string
  stepCount: number
  isFinished: boolean
  pathFound: boolean
  replanCount: number
  nodesProcessed: number
  escapeCount: number
}>()
</script>

<template>
  <div class="info-panel">
    <span>Steps: <strong>{{ stepCount }}</strong></span>
    <span>Replans: <strong>{{ replanCount }}</strong></span>
    <span v-if="escapeCount > 0" class="escape" title="Виходи з циклів">
      Escapes: <strong>{{ escapeCount }}</strong>
    </span>
    <span>Nodes: <strong>{{ nodesProcessed }}</strong></span>
    <span v-if="isFinished" :class="pathFound ? 'success' : 'fail'">
      {{ pathFound ? 'Found!' : 'No path' }}
    </span>
    <span v-if="message" class="message">{{ message }}</span>
  </div>
</template>

<style scoped>
.info-panel {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
  padding: 0.6rem 1rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 0.85rem;
  width: 100%;
  max-width: 1000px;
}

.message {
  color: var(--color-text-muted);
}

.success { color: #22c55e; font-weight: bold; }
.fail { color: #ef4444; font-weight: bold; }
.escape { color: #f59e0b; }
</style>
