# Project Overview: Emergent 2D Cellular Simulation

## High-Level Idea

This project is a browser-based, interactive 2D cellular simulation that explores emergent behavior arising from simple, local interaction rules. The system is inspired by cellular automata (e.g., Game of Life) and sandbox simulations (e.g., falling-sand games), but extended to include ecological processes such as water cycles, plant growth, and energy flow.

The simulation has no explicit goals, win conditions, or scripted events. All large-scale structures (e.g., rivers, forests, clouds) should emerge solely from local interactions between neighboring cells and probabilistic rules.

---

## Core Design Principles

- **Discrete space, discrete time**:  
  The world is a finite 2D grid updated in discrete ticks.

- **Local rules only**:  
  Cell behavior depends exclusively on its own state and the states of nearby cells.  
  *Exception*: Some cell types (e.g., roots, leaves) may use a larger neighborhood to sense gradients.

- **Emergence over scripting**:  
  No global controllers, pathfinding, or hard-coded structures.

- **Probabilistic dynamics**:  
  Many transitions are stochastic rather than deterministic to avoid rigidity.

- **Layered complexity**:  
  Systems are introduced incrementally (matter → water cycles → life).

- **Extensibility**:  
  The framework must make it easy to add new cell types and rules without restructuring core logic.

---

## World Representation

- The simulation world is a 2D grid of cells.
- **Grid size**: 400×250 (fixed for performance).
- **Tick rate**: 60 ticks per second (fixed).
- **Render FPS**: User-controllable (1-60, default 60).
- Each cell has:
  - A **type** (e.g., air, water, soil, rock, stone)
  - A **density** value for physics (lighter rises, heavier sinks)
  - A **fluid** flag (air/water are fluids, solids are not)

Cells are updated using **double buffering**:
- One grid represents the current state (read-only during tick).
- A second grid stores the next state (write-only during tick).
- `wasWritten()` tracking prevents double-updates.
- Update order varies by rule type (bottom→top for water, top→bottom for air).

---

## Sunlight Model

Sunlight is modeled as an **external field**, not a cell type:

- The **sun** has a configurable position near the top of the world.
- Light **intensity decreases gradually with distance** from the sun (soft falloff).
- Light is **blocked by opaque cells** (rock, soil, dense plant matter), creating shadows.
- Cells below opaque objects receive reduced or zero light.
- No day/night cycle for now (static sun position).

This matters for:
- Evaporation (water → vapor)
- Future plant growth (leaves optimize toward light)

---

## Cell Types

### Phase 1: Inert / Physical
- **Air** — empty space, transparent, density 0, fluid
- **Water** — flows downward and equalizes horizontally, density 1, fluid
- **Soil** — solid, can hold moisture, supports plant growth later, density 2
- **Rock** — solid, impermeable, does not hold moisture, density 3
- **Stone** — immovable solid for test platforms, density ∞

### Phase 1.5: Water Cycle (Not Yet Implemented)
- **Vapor** — rises, can aggregate into clouds
- **Cloud** — aggregated vapor, can condense into rain

### Phase 2: Biological (Future)
- **Seed** — dormant, activates when conditions are met
- **Root** — grows toward moisture gradients (larger neighborhood sensing)
- **Stem / Bark** — structural, connects roots to leaves
- **Leaf** — grows toward light (larger neighborhood sensing)
- **Flower / Fruit** — reproduction mechanism
- **Dead matter** — decays into soil over time

Biological cells will use **organism IDs** to enable coordinated behavior (e.g., death propagation, resource sharing).

---

## Neighborhood Rules

Neighborhood size varies by cell type:

| Cell Type | Neighborhood | Reason |
|-----------|--------------|--------|
| Water     | 4 (Von Neumann) | Simple flow physics |
| Vapor     | 4 (Von Neumann) | Rising behavior |
| Soil      | 8 (Moore) | Moisture diffusion |
| Root      | Extended (e.g., 5×5) | Sense moisture gradients |
| Leaf      | Extended (e.g., 5×5) | Sense light gradients |

---

## Interaction & Rule Examples

Rules are expressed as local conditional transformations. Examples:

### Water Physics (Pressure-Based)
- Water moves **downward** if the cell below is air.
- Water **equalizes horizontally**: if a water column is higher than an adjacent column, water flows sideways to balance.
- Water at the surface **evaporates** when exposed to sufficient sunlight → becomes vapor.

### Vapor & Cloud Cycle
- Vapor **rises** (moves upward if cell above is air).
- Vapor **aggregates into clouds** when density in a region exceeds a threshold.
- Clouds **condense and rain** when density exceeds a higher threshold → water falls.

### Future: Plant Rules
- Seeds accumulate energy from nearby water and sunlight.
- Roots grow toward higher local moisture gradients (extended neighborhood).
- Leaves grow toward higher light exposure and self-prune when shaded.
- Living cells lose energy over time and decay when energy reaches zero.

No rule should reference global state beyond predefined environmental fields (sunlight).

---

## World Generation

The initial world is generated from a **random seed** but follows realistic terrain rules:

### Ground Layer (bottom ~60% of grid)
- **Rock** forms the deep base layer
- **Soil** sits above rock, with varying depth
- **Water bodies** (lakes, ponds) form in terrain depressions
- Terrain uses noise functions (e.g., Perlin/Simplex) for natural variation

### Atmosphere Layer (top ~40% of grid)
- Mostly **air**
- **Clouds** scattered at high altitudes
- **Sun** positioned near the top (configurable x-position)

### Seed Options
- Numeric seed for reproducibility
- Presets (e.g., "desert", "wetlands", "rocky") could be added later

---

## Update Loop

Each simulation tick performs the following steps:

1. Compute sunlight field (raycast from sun, accounting for shadows).
2. Iterate over all grid cells (chunked/parallelized for performance).
3. For each cell:
   - Read local neighborhood (size depends on cell type).
   - Apply rules probabilistically.
   - Write results to the next grid buffer.
4. Swap buffers.
5. Render the updated grid.

---

## Rendering & Interaction

- Rendering is done using HTML Canvas (2D).
- **Each cell = 1 pixel** (no zoom/pan for now).
- Visual encodings may include:
  - Color by cell type
  - Brightness or tint for energy, moisture, or temperature
- User interactions:
  - Place or remove cell types
  - Pause / resume simulation
  - Step simulation frame-by-frame
  - Reset with a new random or custom seed

---

## Technical Constraints

- Runs entirely in the browser.
- No external physics engine.
- No backend dependencies.
- Simulation logic and rendering logic must be cleanly separated.
- Written in TypeScript.

---

## Non-Goals (Current Scope)

- No realistic physics accuracy.
- No optimization for massive grid sizes initially.
- No AI agents or centralized planners.
- No narrative or progression system.
- No day/night cycle (static sun).
- No temperature system (may add later).

---

## Long-Term Possibilities

- Parameter tuning via UI sliders.
- Saving and sharing initial seeds.
- Visualization of invisible fields (sunlight, moisture).
- Performance optimizations (chunked updates, WebGL, WebAssembly).
- Use as a generative art or educational systems-thinking tool.
- Day/night cycle, seasons.
- Animal life / fauna.

---

## Stack

- **Language**: TypeScript
- **Framework**: Svelte (SvelteKit)
- **Build Tool**: Vite
- **Renderer**: HTML Canvas 2D (WebGL as future optimization)
- **Testing**: Vitest for unit tests

---

## Version Roadmap

### v0.0 — Minimal Proof of Concept ✅
- [x] Set up project structure within existing SvelteKit scaffold
- [x] Implement basic Grid class (single buffer for now)
- [x] Define initial cell types: Air, Rock, Soil, Water (enum + colors)
- [x] Basic Canvas renderer (cell type → color, 1 cell = 1 pixel)
- [x] Simple simulation loop (fixed tick rate)
- [x] Hardcoded test world (no noise yet)
- [x] Minimal UI: start/pause button

### v0.1 — Core Framework & Extensibility ✅
- [x] Refactor to double buffering
- [x] Implement CellType registry (extensible pattern for adding new types)
- [x] Implement Rule system (extensible pattern for adding new rules)
- [x] Configurable tick rate (UI slider)
- [x] Minimal UI: step button, reset button

### v0.2 — Basic Matter & Physics ✅ (Partial)
- [x] Water physics: gravity (falls down), pressure equalization (flows sideways)
- [x] Implement custom Simplex noise (no external library)
- [x] Basic world generation with noise (terrain, caves, water bodies)
- [x] Stone cell type for immovable platforms
- [x] Density-based physics system
- [x] Decoupled tick rate (60/sec fixed) from render FPS (user-controlled)
- [ ] Air bubble issue not fully resolved (bubbles slowly rise out)
- [ ] UI: grid size selector (removed - fixed at 400×250 for performance)

### v0.3 — Sunlight & Evaporation
- [ ] Implement sunlight field (sun position, intensity falloff, shadow casting)
- [ ] Implement Vapor cell type
- [ ] Water evaporation rule (water + sunlight → vapor)
- [ ] Vapor rising behavior
- [ ] Debug visualization: toggle sunlight intensity overlay

### v0.4 — Water Cycle Completion
- [ ] Implement Cloud cell type
- [ ] Vapor aggregation into clouds
- [ ] Cloud condensation and rainfall
- [ ] Moisture field for soil (absorbs water, dries over time)
- [ ] Complete water cycle: ocean → evaporation → clouds → rain → rivers → ocean

### v0.5 — Polish & Interaction
- [ ] User tools: place/remove cell types (brush tool)
- [ ] Save/load world state (JSON export)
- [ ] Seed input for reproducible worlds
- [ ] Performance profiling and optimization
- [ ] Visual polish: better color palettes, smooth rendering

### v1.0 — Plant Life (Future)
- [ ] Implement biological cell types: Seed, Root, Stem, Leaf
- [ ] Organism ID system for connected structures
- [ ] Energy system for living cells
- [ ] Root growth toward moisture (extended neighborhood sensing)
- [ ] Leaf growth toward light (extended neighborhood sensing)
- [ ] Death and decay mechanics

---

## Architecture Notes

### Directory Structure (Current)
```
emergentia/                  # SvelteKit project root
├── src/
│   ├── lib/
│   │   ├── simulation/
│   │   │   ├── types.ts         # CellType enum, CELL_REGISTRY, CELL_DENSITY, CELL_IS_FLUID, constants
│   │   │   ├── Grid.ts          # Grid class with double buffering + wasWritten tracking
│   │   │   ├── Rules.ts         # Rule type, RuleContext, RuleEngine (generic, not heavily used)
│   │   │   ├── RuleUtils.ts     # Shared utilities: random(), isAir(), isFluid(), shouldSink(), etc.
│   │   │   ├── WaterRules.ts    # Water physics rules (gravity, diagonal, pressure, extended flow)
│   │   │   ├── AirRules.ts      # Air physics rules (buoyancy through fluids only)
│   │   │   ├── Simulation.ts    # Simulation controller (requestAnimationFrame loop)
│   │   │   ├── WorldGen.ts      # World generation with Simplex noise
│   │   │   └── Sunlight.ts      # (Future) Sunlight field computation
│   │   ├── rendering/
│   │   │   └── CanvasRenderer.ts  # Renders grid to canvas via ImageData
│   │   ├── utils/
│   │   │   └── noise.ts         # Custom Simplex noise + fBm implementation
│   │   └── index.ts             # Re-exports public API
│   ├── components/
│   │   ├── SimulationCanvas.svelte  # Canvas wrapper with fixed-interval render loop
│   │   └── ControlPanel.svelte      # UI controls (start/pause/step/reset/FPS)
│   └── routes/
│       └── +page.svelte         # Main app page
├── BIGPICTURE.md               # Project vision and roadmap
└── v0.2.md                     # Development summary through v0.2
```

### Key Design Patterns
- **CellType Registry**: `CELL_REGISTRY` maps each `CellType` to metadata (name, color, opacity).
- **Density System**: `CELL_DENSITY` and `CELL_IS_FLUID` enable physics without hardcoding cell types.
- **Separate Rule Files**: Water rules in `WaterRules.ts`, air rules in `AirRules.ts`, shared utils in `RuleUtils.ts`.
- **Double Buffering**: Grid has `current` (read) and `next` (write) buffers, swapped after each tick.
- **wasWritten Tracking**: Prevents cells from being processed multiple times per tick.
- **Iteration Order Matters**: Water processed bottom→top, air processed top→bottom.
- **Separation of Concerns**: Simulation logic knows nothing about rendering; renderer knows nothing about rules.

### Critical Implementation Notes
- **Svelte 5**: Uses runes syntax (`$state`, `$props`, `$effect`), NOT old reactive `let` declarations.
- **Water Movement**: `moveWater()` uses `setUnclaimed()` to leave air behind without claiming it, enabling cascade.
- **Buffer Reading for Availability**: `isAir()` reads from NEXT buffer via `getNext()`, NOT CURRENT. This is critical - vacated cells must be visible as Air immediately for continuous falling streams.
- **Air Buoyancy**: Only rises through fluids (`CELL_IS_FLUID[type] === true`), not through solids.
- **Performance**: Grid is 400×250 (100K cells), tick rate is 60/sec. Larger sizes caused lag.