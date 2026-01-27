import type { Grid } from './Grid';
import { CellType } from './types';
import { random, isFluid } from './RuleUtils';

/**
 * Air Physics Rules
 * 
 * Rules in priority order:
 * 1. Buoyancy - air rises through denser materials (density-based)
 * 2. Lateral diffusion - air drifts sideways when surrounded by water
 * 3. Bubble collapse - tiny isolated bubbles dissolve (controlled hack)
 * 
 * Key: Iterate top→bottom so air bubbles rise properly
 */

/**
 * Air behavior tuning parameters
 */
export const AIR_CONFIG = {
	// Rule 1: Buoyancy - how often air rises through denser materials
	BUOYANCY_PROB: 0.95,
};

/**
 * Apply air rules to a single cell
 */
function applyAirRules(grid: Grid, x: number, y: number): boolean {
	const cell = grid.get(x, y);
	if (cell !== CellType.Air) return false;
	if (grid.wasWritten(x, y)) return false;
	
	const above = grid.get(x, y - 1);
	
	// Buoyancy - air rises through FLUIDS only (not solids)
	if (!grid.wasWritten(x, y - 1) && isFluid(above) && above !== CellType.Air) {
		if (random() < AIR_CONFIG.BUOYANCY_PROB) {
			// Swap: air rises, fluid sinks
			grid.set(x, y - 1, CellType.Air);
			grid.set(x, y, above);
			return true;
		}
	}
	
	return false;
}

/**
 * Apply air rules to entire grid
 * Iterates top→bottom so air bubbles rise properly
 */
export function applyAllAirRules(grid: Grid): void {
	for (let y = 0; y < grid.height; y++) {
		// Randomize horizontal order to prevent directional bias
		if (random() < 0.5) {
			for (let x = 0; x < grid.width; x++) {
				applyAirRules(grid, x, y);
			}
		} else {
			for (let x = grid.width - 1; x >= 0; x--) {
				applyAirRules(grid, x, y);
			}
		}
	}
}
