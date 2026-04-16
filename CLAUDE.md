# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start Vite dev server
- `npm run build` — type-check with `vue-tsc -b` and build with Vite
- `npm run preview` — preview production build

No test or lint scripts are configured.

## Architecture

Interactive Vue 3 + TypeScript + Vite visualization of the Focused D* pathfinding algorithm (Stentz 1994/1995) on a 100x100 grid with fog of war.

### Core algorithm (`src/dstar.ts`)

`focusedDStar()` is a generator that yields `DStarState` snapshots per step. Grid dimensions are hardcoded as `ROWS = COLS = 100`.

- Backward search from goal → start; `h(X)` is cost-to-goal, `b(X)` is backpointer toward goal, `k(X)` is the focused key.
- `OpenList` is a min-heap keyed by `k + heuristic(node, robotPos)` (focused bias). It maintains an index map for O(log n) updates; call `setRobot()` whenever the robot moves so priorities re-focus.
- Node storage is a flat `nodes[y*COLS + x]` array (via `coordKey`) for O(1) access; `NodeTag` is `NEW | OPEN | CLOSED`.
- `processState()` implements the canonical RAISE/LOWER logic distinguishing `kold < h` (raise) vs `kold === h` (lower).
- Main loop: discover walls via `getVisibleWalls(robotPos)` → `modifyCost` on affected neighbors → `planUntilRobotSettled()` (stops once robot node is CLOSED and `kmin >= h(robot)`) → follow backpointer one step.
- Safety limits: `PROCESS_LIMIT`, `MOVE_LIMIT`, `VISIT_LIMIT=3` (forces a node reset + replan on oscillation).

### Vue layer

`src/App.vue` wires three composables — the algorithm has no Vue dependencies; composables are the boundary:

- `composables/useGrid.ts` — reactive `cells`, start/end, maze generation, wall toggling, `drawVersion` (bumped to trigger canvas redraws).
- `composables/useVisibility.ts` — fog of war; exposes `radius`, `initFog`, `updateVisibility`, and supplies the `getVisibleWalls` callback.
- `composables/useRunner.ts` — drives the `focusedDStar` generator, manages play/pause/step/speed, tracks stats (`replanCount`, `nodesProcessed`), and owns its own `drawVersion`.

`App.vue` combines both drawVersions into one `computed` passed to `GridCanvas` so either grid edits or algorithm steps trigger a repaint. Components under `src/components/` (`GridCanvas`, `ControlPanel`, `InfoPanel`, `Legend`) are presentational.

### Conventions

- UI strings and algorithm messages are in Ukrainian (e.g. `"Крок до (${x}, ${y})"`). Preserve this when editing user-facing text.
- The algorithm is a pure generator — keep Vue/reactivity out of `dstar.ts`.
- If grid dimensions need to change, update `ROWS`/`COLS` in `dstar.ts` together with grid construction in `useGrid.ts`.

## Coding Guidelines (Karpathy)

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
