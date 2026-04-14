<script setup lang="ts">
import { computed } from 'vue'
import TabBar from './components/TabBar.vue'
import { projects, defaultProjectId } from './projects'
import { useActiveTab } from './composables/useActiveTab'

const validIds = projects.filter(p => !p.disabled).map(p => p.id)
const { activeId } = useActiveTab(validIds, defaultProjectId)

const activeProject = computed(
  () => projects.find(p => p.id === activeId.value) ?? projects[0]
)
</script>

<template>
  <div class="app">
    <h1 class="title">Візуалізація алгоритмів пошуку шляху</h1>

    <TabBar
      :projects="projects"
      :active-id="activeId"
      @update:active-id="activeId = $event"
    />

    <div
      class="panel"
      role="tabpanel"
      :id="`tabpanel-${activeProject.id}`"
      :aria-labelledby="`tab-${activeProject.id}`"
    >
      <component :is="activeProject.component" v-if="activeProject.component" :key="activeProject.id" />
      <div v-else class="placeholder">
        <p>{{ activeProject.title }} — в розробці</p>
      </div>
    </div>
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
  text-align: center;
}

.panel {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.placeholder {
  padding: 3rem;
  color: var(--color-text-muted);
  font-size: 1rem;
}
</style>
