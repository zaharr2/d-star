<script setup lang="ts">
const items = [
  { color: '#22c55e', label: 'Start' },
  { color: '#ef4444', label: 'End' },
  { color: '#0f172a', label: 'Wall' },
  { color: '#1565c0', label: 'Water' },
  { color: '#eab308', label: 'Path' },
  { color: '#6366f1', label: 'Visited' },
  { color: '#06b6d4', label: 'Agent' },
  { color: '#f97316', label: 'Raise' },
  { color: '#14b8a6', label: 'Lower' },
]
</script>

<template>
  <div class="legend">
    <div v-for="item in items" :key="item.label" class="legend-item">
      <span class="swatch" :style="{ background: item.color }" />
      <span>{{ item.label }}</span>
    </div>
  </div>
</template>

<style scoped>
.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.swatch {
  display: inline-block;
  width: 14px;
  height: 14px;
  border-radius: 3px;
  border: 1px solid var(--color-border);
}
</style>
