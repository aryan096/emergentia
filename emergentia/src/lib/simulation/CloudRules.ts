import type { Grid } from './Grid';
import { CellType } from './types';
import { random, isAir } from './RuleUtils';

/**
 * Cloud Physics Rules
 *
 * Clouds are condensed vapour masses that float in the upper atmosphere
 * (top 25% of the grid).
 *
 * - A cloud cell needs CLOUD_EVAP_THRESHOLD cloud neighbours to be stable;
 *   below that it slowly evaporates back to vapour.
 * - Stable cloud cells actively absorb adjacent vapour to grow outward.
 * - All cloud cells drift very slowly sideways.
 *
 * Cloud cells are NOT fluid (CELL_IS_FLUID = false), so water and air
 * cannot flow through them.
 */

// Need this many cloud neighbours to be considered part of a stable mass
const CLOUD_EVAP_THRESHOLD = 10;
// Per-tick probability of an under-supported cloud cell reverting to air
const CLOUD_EVAP_RATE = 0;
// Per-tick probability per adjacent vapour cell of absorbing it into the cloud
// (only applies in the top 25% of the grid)
const CLOUD_ABSORB_RATE = 0.2;
// Per-tick probability of drifting one cell sideways
const CLOUD_DRIFT_RATE = 0.1;
// Clouds only absorb vapour in this fraction of the grid from the top
const CLOUD_ZONE = 0.25;
// Min cloud neighbours for a cell to be able to rain (dense, well-embedded cell)
const RAIN_THRESHOLD = 5;
// Per-tick probability of a rain-eligible cloud cell shedding a water droplet
const RAIN_RATE = 0.02;

/**
 * Count how many of the 8 neighbours are Cloud in the CURRENT buffer.
 */
function countCloudNeighbours(grid: Grid, x: number, y: number): number {
	let count = 0;
	for (let dy = -1; dy <= 1; dy++) {
		for (let dx = -1; dx <= 1; dx++) {
			if (dx === 0 && dy === 0) continue;
			const nx = x + dx;
			const ny = y + dy;
			if (nx < 0 || nx >= grid.width || ny < 0 || ny >= grid.height) continue;
			if (grid.get(nx, ny) === CellType.Cloud) count++;
		}
	}
	return count;
}

function applyCloudRules(grid: Grid, x: number, y: number): void {
	if (grid.get(x, y) !== CellType.Cloud) return;
	if (grid.wasWritten(x, y)) return;

	const cloudN = countCloudNeighbours(grid, x, y);

	// Dense cloud cells shed water droplets (rainfall)
	if (cloudN >= RAIN_THRESHOLD && random() < RAIN_RATE) {
		grid.setUnclaimed(x, y, CellType.Water);
		return;
	}

	// Under-supported cells slowly dissipate into air (no vapor drizzle)
	if (cloudN < CLOUD_EVAP_THRESHOLD && random() < CLOUD_EVAP_RATE) {
		grid.setUnclaimed(x, y, CellType.Air);
		return;
	}

	// Actively absorb adjacent vapour to grow the cloud mass (top zone only)
	if (y < grid.height * CLOUD_ZONE) {
		for (let dy = -1; dy <= 1; dy++) {
			for (let dx = -1; dx <= 1; dx++) {
				if (dx === 0 && dy === 0) continue;
				const nx = x + dx;
				const ny = y + dy;
				if (nx < 0 || nx >= grid.width || ny < 0 || ny >= grid.height) continue;
				if (
					grid.get(nx, ny) === CellType.Vapor &&
					!grid.wasWritten(nx, ny) &&
					random() < CLOUD_ABSORB_RATE
				) {
					grid.set(nx, ny, CellType.Cloud);
				}
			}
		}
	}

	// Slow horizontal drift into adjacent air
	if (random() < CLOUD_DRIFT_RATE) {
		const dir = random() < 0.5 ? -1 : 1;
		const nx = x + dir;
		if (nx >= 0 && nx < grid.width && isAir(grid, nx, y)) {
			grid.set(nx, y, CellType.Cloud);
			grid.setUnclaimed(x, y, CellType.Air);
			return;
		}
	}

	// Stay in place
	grid.set(x, y, CellType.Cloud);
}

/**
 * Apply cloud rules to the entire grid.
 * Scan order is randomised per row to avoid directional drift bias.
 */
export function applyAllCloudRules(grid: Grid): void {
	for (let y = 0; y < grid.height; y++) {
		if (random() < 0.5) {
			for (let x = 0; x < grid.width; x++) {
				applyCloudRules(grid, x, y);
			}
		} else {
			for (let x = grid.width - 1; x >= 0; x--) {
				applyCloudRules(grid, x, y);
			}
		}
	}
}
