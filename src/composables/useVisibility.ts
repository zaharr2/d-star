import { ref, type Ref } from 'vue'
import type { Cell, Coord } from '../types'

export function useVisibility(cells: Ref<Cell[][]>) {
  const radius = ref(5)
  const enabled = ref(true)

  function revealAll() {
    for (const row of cells.value) {
      for (const cell of row) {
        cell.visibility = 'visible'
      }
    }
  }

  function updateVisibility(agentPos: Coord) {
    if (!enabled.value) {
      revealAll()
      return
    }

    const rows = cells.value.length
    const cols = cells.value[0]?.length ?? 0

    for (const row of cells.value) {
      for (const cell of row) {
        if (cell.visibility === 'visible') {
          cell.visibility = 'seen'
        }
      }
    }

    const r = radius.value
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const nx = agentPos.x + dx
        const ny = agentPos.y + dy
        if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue
        if (Math.max(Math.abs(dx), Math.abs(dy)) <= r) {
          cells.value[ny][nx].visibility = 'visible'
        }
      }
    }
  }

  function initFog(agentPos: Coord) {
    if (!enabled.value) {
      revealAll()
      return
    }
    for (const row of cells.value) {
      for (const cell of row) {
        cell.visibility = 'unseen'
      }
    }
    updateVisibility(agentPos)
  }

  return { radius, enabled, updateVisibility, initFog }
}
