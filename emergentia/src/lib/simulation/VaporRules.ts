import type { Grid } from './Grid';
import { CellType } from './types';
import { random, isAir } from './RuleUtils';

/**
 * Vapor Physics Rules
 *
 * Vapor rises through air at up to VAPOR_RISE_SPEED cells/tick,
 * processed top→bottom so rising chains propagate in one tick.
 *
 * Condensation: vapor with enough vapor/cloud neighbours condenses
 * into a Cloud cell — the seed mechanism for cloud formation.
 */

const VAPOR_RISE_SPEED = 20;

// Minimum vapour neighbours to trigger nucleation (no adjacent cloud)
const CONDENSE_THRESHOLD = 6;
// Base condensation rate when threshold met
const CONDENSE_RATE = 0.06;
// Extra condensation rate when touching an existing cloud cell
const CONDENSE_CLOUD_BOOST = 0.25;

/**
 * Count vapor and cloud neighbours in the CURRENT buffer (8-connected).
 * Uses current buffer so decisions reflect the world state at tick start.
 */
function countNeighbours(
	grid: Grid,
	x: number,
	y: number
): { vapor: number; cloud: number } {
	let vapor = 0;
	let cloud = 0;
	for (let dy = -1; dy <= 1; dy++) {
		for (let dx = -1; dx <= 1; dx++) {
			if (dx === 0 && dy === 0) continue;
			const nx = x + dx;
			const ny = y + dy;
			if (nx < 0 || nx >= grid.width || ny < 0 || ny >= grid.height) continue;
			const cell = grid.get(nx, ny);
			if (cell === CellType.Vapor) vapor++;
			else if (cell === CellType.Cloud) cloud++;
		}
	}
	return { vapor, cloud };
}

function applyVaporRules(grid: Grid, x: number, y: number): void {
	if (grid.get(x, y) !== CellType.Vapor) return;
	if (grid.wasWritten(x, y)) return;

	// ── Condensation check (top 25% of grid only) ────────────────────────
	if (y < grid.height * 0.25) {
		const { vapor: vaporN, cloud: cloudN } = countNeighbours(grid, x, y);
		const condensationRate =
			(vaporN >= CONDENSE_THRESHOLD ? CONDENSE_RATE : 0) +
			(cloudN > 0 ? CONDENSE_CLOUD_BOOST : 0);
		if (condensationRate > 0 && random() < condensationRate) {
			grid.set(x, y, CellType.Cloud);
			return;
		}
	}

	// ── Multi-step straight rise (farthest first, fallback to closer) ─────
	for (let rise = VAPOR_RISE_SPEED; rise >= 1; rise--) {
		if (y - rise < 0) continue;
		if (!isAir(grid, x, y - rise)) continue;
		// Ensure all intermediate cells are also clear
		let clear = true;
		for (let mid = 1; mid < rise; mid++) {
			if (!isAir(grid, x, y - mid)) {
				clear = false;
				break;
			}
		}
		if (!clear) continue;
		grid.set(x, y - rise, CellType.Vapor);
		grid.setUnclaimed(x, y, CellType.Air);
		return;
	}

	// ── Diagonal rise (1 step, randomise L/R to avoid bias) ──────────────
	const [left, right]: [-1 | 1, -1 | 1] = random() < 0.5 ? [-1, 1] : [1, -1];
	if (y > 0 && isAir(grid, x + left, y - 1)) {
		grid.set(x + left, y - 1, CellType.Vapor);
		grid.setUnclaimed(x, y, CellType.Air);
		return;
	}
	if (y > 0 && isAir(grid, x + right, y - 1)) {
		grid.set(x + right, y - 1, CellType.Vapor);
		grid.setUnclaimed(x, y, CellType.Air);
		return;
	}

	// Blocked — stay (vapor collects at ceilings / cloud undersides)
	grid.set(x, y, CellType.Vapor);
}

/**
 * Apply vapor rules to the entire grid.
 * Iterates top→bottom so rising chains propagate in one tick.
 */
export function applyAllVaporRules(grid: Grid): void {
	for (let y = 0; y < grid.height; y++) {
		if (random() < 0.5) {
			for (let x = 0; x < grid.width; x++) {
				applyVaporRules(grid, x, y);
			}
		} else {
			for (let x = grid.width - 1; x >= 0; x--) {
				applyVaporRules(grid, x, y);
			}
		}
	}
}
