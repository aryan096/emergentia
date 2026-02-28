# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Emergentia** is a browser-based 2D cellular automaton simulation (falling-sand / ecological style) built with SvelteKit + TypeScript. The app directory is `emergentia/`. All commands must be run from there.

## Commands

```bash
cd emergentia

npm run dev          # Start Vite dev server (http://localhost:5173)
npm run build        # Production build
npm run check        # Type-check with svelte-check
npm run lint         # Prettier + ESLint check
npm run format       # Auto-format with Prettier
npm run test:e2e     # Playwright E2E tests
```

## Architecture

### Simulation Core (`src/lib/simulation/`)

The simulation runs at a fixed 60 ticks/sec on a fixed 400×250 grid (100K cells). Render FPS is decoupled and user-controllable.

**Double-buffering**: `Grid` holds two buffers — `current` (read-only during tick) and `next` (write-only). After each tick, buffers swap. `wasWritten()` tracks which cells have already been updated this tick to prevent double-processing.

**Critical**: `isAir()` in `RuleUtils.ts` reads from the NEXT buffer (`getNext()`), not the current. This lets cascading physics work in a single tick — when water falls and leaves air behind via `setUnclaimed()`, the cell above can immediately see it as available.

**Tick order** (per `Simulation.tick()`):
1. `SunlightField.propagate()` — top-down column pass, pure function of grid + tickCount
2. `applyAllWaterRules(grid, sunlightField)` — **bottom→top**; includes evaporation at idle step
3. `applyAllAirRules(grid)` — **top→bottom**; buoyancy bubbles
4. `applyAllVaporRules(grid)` — **top→bottom**; fast multi-step rise + condensation (top 25% only)
5. `applyAllCloudRules(grid)` — drift, absorption of adjacent vapor, slow evaporation

**Cell type system** (`types.ts`): `CellType` enum (Air=0, Water=1, Soil=2, Rock=3, Stone=4, Vapor=5, Cloud=6) backed by `CELL_REGISTRY` (metadata/color/opacity), `CELL_DENSITY`, and `CELL_IS_FLUID` maps. Air buoyancy only rises through fluid cells (`CELL_IS_FLUID[type] === true`). Cloud is `CELL_IS_FLUID = false` (blocks water/air flow). Vapor is `CELL_IS_FLUID = true`.

**Rule files**: `WaterRules.ts`, `AirRules.ts`, `VaporRules.ts`, `CloudRules.ts`. Sunlight in `Sunlight.ts` (sinusoidal day/night, 7200-tick cycle). Shared utilities in `RuleUtils.ts` (seeded RNG, `isAir()`, `isBlocked()`, `isVapor()`, `isCloud()`, `shouldSink()`/`shouldRise()`).

**World generation** (`WorldGen.ts`): Uses custom Simplex noise (no external library — `utils/noise.ts`). `generateTestWorld()` creates terrain with caves, water pools, waterfalls, and stone platforms.

### Extending the Simulation

- **New cell type**: Add to `CellType` enum, `CELL_REGISTRY`, `CELL_DENSITY`, `CELL_IS_FLUID` in `types.ts`
- **New physics rule**: Create a `*Rules.ts` file, call it from `Simulation.tick()`
- **World generation changes**: Edit `generateTestWorld()` in `WorldGen.ts`

### Rendering (`src/lib/rendering/`)

`CanvasRenderer.ts` writes directly to `ImageData` (1 cell = 1 pixel). CSS scales the canvas to 75% viewport width with `image-rendering: pixelated`. The render loop in `SimulationCanvas.svelte` runs independently of the simulation tick loop.

### Svelte Components

- `+page.svelte` — orchestrates simulation lifecycle and state
- `SimulationCanvas.svelte` — canvas wrapper with render loop
- `ControlPanel.svelte` — start/pause/step/reset, FPS selector

**Svelte 5 runes**: Use `$state`, `$props`, `$effect`. Do NOT use old reactive `let` declarations.

## Roadmap Context

| Version | Status | Focus |
|---------|--------|-------|
| v0.2 | ✅ Done | Water physics, noise, world gen, decoupled FPS |
| v0.3 | ✅ Done | Sunlight field, day/night cycle, Vapor cell, evaporation, Cloud cell, cloud growth/drift |
| v0.4 | Next | Rainfall (Cloud → Water), moisture soil, close the full water cycle |
| v0.5 | Planned | User brush tools, save/load, seed input |
| v1.0 | Future | Biological cells (Seed, Root, Leaf), organism IDs, energy system |

See `BIGPICTURE.md` for design principles and full roadmap.
