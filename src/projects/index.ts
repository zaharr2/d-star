import type { Component } from 'vue'
import DStarProject from './dstar/DStarProject.vue'

export interface ProjectDef {
  id: string
  title: string
  component: Component | null
  disabled?: boolean
  badge?: string
}

export const projects: ProjectDef[] = [
  { id: 'dstar', title: 'Пошук шляху D*', component: DStarProject },
  { id: 'astar', title: 'A*', component: null, disabled: true, badge: 'Скоро' },
  { id: 'dijkstra', title: 'Дейкстра', component: null, disabled: true, badge: 'Скоро' },
]

export const defaultProjectId = 'dstar'
