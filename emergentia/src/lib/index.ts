// Re-export simulation modules
export {
	CellType,
	CELL_REGISTRY,
	GRID_WIDTH,
	GRID_HEIGHT,
	TICK_RATE,
	WORLD_GEN,
	type CellTypeInfo
} from './simulation/types';
export { Grid } from './simulation/Grid';
export { Simulation } from './simulation/Simulation';
export { RuleEngine, type Rule, type RuleContext } from './simulation/Rules';
export { CanvasRenderer } from './rendering/CanvasRenderer';
export { generateWorld, generateTestWorld } from './simulation/WorldGen';
export { SimplexNoise } from './utils/noise';
