<script setup lang="ts">
import { ref, nextTick } from 'vue'
import type { ProjectDef } from '../projects'

const props = defineProps<{
  projects: ProjectDef[]
  activeId: string
}>()
const emit = defineEmits<{ (e: 'update:activeId', id: string): void }>()

const tabRefs = ref<Record<string, HTMLButtonElement | null>>({})

function setRef(id: string, el: Element | any | null) {
  tabRefs.value[id] = el as HTMLButtonElement | null
}

function selectableIndices(): number[] {
  return props.projects
    .map((p, i) => (p.disabled ? -1 : i))
    .filter((i) => i >= 0)
}

function focusAt(index: number) {
  const p = props.projects[index]
  if (!p) return
  nextTick(() => tabRefs.value[p.id]?.focus())
}

function onKey(e: KeyboardEvent, idx: number) {
  const selectable = selectableIndices()
  const pos = selectable.indexOf(idx)
  if (pos < 0) return

  if (e.key === 'ArrowRight') {
    e.preventDefault()
    const next = selectable[(pos + 1) % selectable.length]
    emit('update:activeId', props.projects[next].id)
    focusAt(next)
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault()
    const prev = selectable[(pos - 1 + selectable.length) % selectable.length]
    emit('update:activeId', props.projects[prev].id)
    focusAt(prev)
  } else if (e.key === 'Home') {
    e.preventDefault()
    const first = selectable[0]
    emit('update:activeId', props.projects[first].id)
    focusAt(first)
  } else if (e.key === 'End') {
    e.preventDefault()
    const last = selectable[selectable.length - 1]
    emit('update:activeId', props.projects[last].id)
    focusAt(last)
  }
}

function onClick(p: ProjectDef) {
  if (p.disabled) return
  emit('update:activeId', p.id)
}
</script>

<template>
  <div class="tabbar-wrap">
    <div class="tabbar" role="tablist" aria-label="Підпроєкти">
      <button
        v-for="(p, i) in projects"
        :key="p.id"
        :ref="(el) => setRef(p.id, el)"
        role="tab"
        :aria-selected="p.id === activeId"
        :aria-controls="`tabpanel-${p.id}`"
        :id="`tab-${p.id}`"
        :tabindex="p.id === activeId ? 0 : -1"
        :disabled="p.disabled"
        :class="['tab', { active: p.id === activeId, disabled: p.disabled }]"
        :title="p.disabled ? 'В розробці' : undefined"
        @click="onClick(p)"
        @keydown="onKey($event, i)"
      >
        <span>{{ p.title }}</span>
        <span v-if="p.badge" class="badge">{{ p.badge }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.tabbar-wrap {
  width: 100%;
  max-width: 1000px;
  overflow-x: auto;
  overflow-y: hidden;
  border-bottom: 1px solid var(--color-border);
  scrollbar-width: thin;
}

.tabbar {
  display: flex;
  gap: 0.25rem;
  min-width: max-content;
}

.tab {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1rem;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  border-radius: 0;
  color: var(--color-text-muted);
  font-size: 0.9rem;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
  white-space: nowrap;
  margin-bottom: -1px;
}

.tab:hover:not(:disabled):not(.active) {
  color: var(--color-text);
  border-bottom-color: color-mix(in srgb, var(--color-accent) 40%, transparent);
  background: transparent;
}

.tab.active {
  color: var(--color-accent);
  border-bottom-color: var(--color-accent);
}

.tab.active:focus-visible,
.tab:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: -2px;
}

.tab.disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.badge {
  font-size: 0.7rem;
  padding: 0.1rem 0.4rem;
  border-radius: 10px;
  background: var(--color-border);
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

@media (prefers-reduced-motion: reduce) {
  .tab { transition: none; }
}
</style>
