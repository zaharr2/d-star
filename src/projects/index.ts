import type { Component } from 'vue'
import DStarProject from './dstar/DStarProject.vue'
import AStarProject from './astar/AStarProject.vue'
import DijkstraProject from './dijkstra/DijkstraProject.vue'

export interface ProjectDef {
  id: string
  title: string
  component: Component | null
  disabled?: boolean
  badge?: string
}

export const projects: ProjectDef[] = [
  { id: 'dstar', title: 'Пошук шляху D*', component: DStarProject },
  { id: 'astar', title: 'A*', component: AStarProject },
  { id: 'dijkstra', title: 'Дейкстра', component: DijkstraProject },
]

export const defaultProjectId = 'dstar'
