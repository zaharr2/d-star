<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import type { Cell } from '../types'

const COLORS: Record<string, string> = {
  wall: '#0f172a',
  water: '#1565c0',
  start: '#22c55e',
  end: '#ef4444',
  path: '#eab308',
  current: '#a855f7',
  visited: '#6366f1',
  raise: '#f97316',
  lower: '#14b8a6',
  open: '#38bdf8',
  agent: '#06b6d4',
  border: '#475569',
}

// Topographic color ramp: weight 1 (low/green) → 9 (high/brown)
const TOPO_COLORS = [
  '#1a6632', // 1 - deep green (valley)
  '#2d8a4e', // 2
  '#4caf50', // 3 - green
  '#8bc34a', // 4 - light green
  '#cddc39', // 5 - yellow-green
  '#e6b422', // 6 - yellow-brown
  '#c68c3c', // 7 - light brown
  '#a0522d', // 8 - brown
  '#6d4c41', // 9 - dark brown (peak)
]

const props = defineProps<{
  cells: Cell[][]
  gridSize: number
  drawVersion: number
  agentPos: { x: number; y: number } | null
  disabled: boolean
  pickMode?: 'none' | 'start' | 'end'
}>()

const emit = defineEmits<{
  toggleWall: [x: number, y: number]
  setWall: [x: number, y: number]
  pickAt: [x: number, y: number]
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const isDrawing = ref(false)
let animFrame: number | null = null

function getCellFromEvent(e: MouseEvent): { x: number; y: number } | null {
  const canvas = canvasRef.value
  if (!canvas) return null
  const rect = canvas.getBoundingClientRect()
  const scale = canvas.width / rect.width
  const px = (e.clientX - rect.left) * scale
  const py = (e.clientY - rect.top) * scale
  const cellSize = getCellSize()
  const x = Math.floor(px / cellSize)
  const y = Math.floor(py / cellSize)
  const rows = props.cells.length
  const cols = props.cells[0]?.length ?? 0
  if (x < 0 || x >= cols || y < 0 || y >= rows) return null
  return { x, y }
}

function handleMouseDown(e: MouseEvent) {
  if (props.disabled) return
  const pos = getCellFromEvent(e)
  if (!pos) return
  if (props.pickMode && props.pickMode !== 'none') {
    emit('pickAt', pos.x, pos.y)
    return
  }
  isDrawing.value = true
  emit('toggleWall', pos.x, pos.y)
}

function handleMouseMove(e: MouseEvent) {
  if (!isDrawing.value || props.disabled) return
  if (props.pickMode && props.pickMode !== 'none') return
  const pos = getCellFromEvent(e)
  if (!pos) return
  emit('setWall', pos.x, pos.y)
}

function handleMouseUp() {
  isDrawing.value = false
}

function getCellSize(): number {
  const rows = props.cells.length
  const cols = props.cells[0]?.length ?? 1
  return props.gridSize / Math.max(rows, cols)
}

function draw() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const cellSize = getCellSize()
  const rows = props.cells.length
  const cols = props.cells[0]?.length ?? 0
  const w = Math.round(cols * cellSize)
  const h = Math.round(rows * cellSize)

  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w
    canvas.height = h
  }

  ctx.clearRect(0, 0, w, h)

  for (const row of props.cells) {
    for (const cell of row) {
      const px = cell.x * cellSize
      const py = cell.y * cellSize

      // Cell color: terrain base + state overlay
      if (cell.type === 'start') ctx.fillStyle = COLORS.start
      else if (cell.type === 'end') ctx.fillStyle = COLORS.end
      else if (cell.type === 'wall') ctx.fillStyle = COLORS.wall
      else if (cell.type === 'water') ctx.fillStyle = COLORS.water
      else if (cell.state === 'path') ctx.fillStyle = COLORS.path
      else if (cell.state === 'current') ctx.fillStyle = COLORS.current
      else if (cell.state === 'visited') ctx.fillStyle = COLORS.visited
      else if (cell.state === 'raise') ctx.fillStyle = COLORS.raise
      else if (cell.state === 'lower') ctx.fillStyle = COLORS.lower
      else if (cell.state === 'open') ctx.fillStyle = COLORS.open
      else ctx.fillStyle = TOPO_COLORS[Math.min(cell.weight - 1, 8)]

      ctx.fillRect(px, py, cellSize, cellSize)

      // Border
      if (cellSize >= 4) {
        ctx.strokeStyle = COLORS.border
        ctx.lineWidth = 0.5
        ctx.strokeRect(px, py, cellSize, cellSize)
      }

      // Fog overlay
      if (cell.visibility !== 'visible') {
        ctx.fillStyle = cell.visibility === 'unseen'
          ? 'rgba(0, 0, 0, 0.8)'
          : 'rgba(0, 0, 0, 0.5)'
        ctx.fillRect(px, py, cellSize, cellSize)
      }
    }
  }

  // Agent
  if (props.agentPos) {
    const ax = props.agentPos.x * cellSize + cellSize / 2
    const ay = props.agentPos.y * cellSize + cellSize / 2
    const r = cellSize * 0.35
    ctx.beginPath()
    ctx.arc(ax, ay, Math.max(r, 2), 0, Math.PI * 2)
    ctx.fillStyle = COLORS.agent
    ctx.fill()
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = Math.max(1, cellSize * 0.06)
    ctx.stroke()
  }

  // Start/End labels
  if (cellSize >= 12) {
    const fontSize = Math.max(6, cellSize * 0.4)
    ctx.font = `bold ${fontSize}px system-ui`
    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    for (const row of props.cells) {
      for (const cell of row) {
        if (cell.type === 'start' || cell.type === 'end') {
          const label = cell.type === 'start' ? 'S' : 'E'
          ctx.fillText(label, cell.x * cellSize + cellSize / 2, cell.y * cellSize + cellSize / 2)
        }
      }
    }
  }
}

function scheduleDraw() {
  if (animFrame) return
  animFrame = requestAnimationFrame(() => {
    animFrame = null
    draw()
  })
}

watch(() => props.drawVersion, scheduleDraw)
watch(() => props.gridSize, scheduleDraw)

onMounted(() => {
  draw()
  window.addEventListener('mouseup', handleMouseUp)
})
onUnmounted(() => {
  if (animFrame) cancelAnimationFrame(animFrame)
  window.removeEventListener('mouseup', handleMouseUp)
})
</script>

<template>
  <canvas
    ref="canvasRef"
    class="grid-canvas"
    :style="{
      maxWidth: gridSize + 'px',
      maxHeight: gridSize + 'px',
      cursor: pickMode && pickMode !== 'none' ? 'crosshair' : 'pointer',
    }"
    @mousedown.prevent="handleMouseDown"
    @mousemove="handleMouseMove"
    @mouseleave="handleMouseUp"
  />
</template>

<style scoped>
.grid-canvas {
  border: 2px solid var(--color-border);
  border-radius: 8px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
  width: 100%;
  height: auto;
}
</style>
