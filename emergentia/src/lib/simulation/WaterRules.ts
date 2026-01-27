import type { Grid } from './Grid';
import { CellType } from './types';
import { random, isAir, isBlocked } from './RuleUtils';

/**
 * Water Physics Rules
 * 
 * Rules in priority order:
 * 1. Gravity (fall down) - always
 * 2. Diagonal falling (slope flow)
 * 3. Pressure spill (flow toward lower columns)
 * 4. Extended horizontal flow (multi-step splash)
 * 5. Idle (mark as processed)
 * 
 * Key: Iterate bottom→top, randomize horizontal order
 */

/**
 * Water behavior tuning parameters
 */
export const WATER_CONFIG = {
	// Rule 2: Diagonal falling - how often water flows diagonally around obstacles
	DIAGONAL_PROB: 0.9,
	
	// Rule 3: Pressure spill - how often water flows toward lower pressure columns
	PRESSURE_SPILL_PROB: 0.9,
	
	// Rule 4: Extended horizontal flow - how often water does multi-step side flow
	EXTENDED_FLOW_PROB: 0.7,
	
	// Maximum cells water can travel horizontally in one tick (splash distance)
	MAX_FLOW_DISTANCE: 6,
	
	// Max depth to check for pressure calculation (performance limit)
	MAX_PRESSURE_CHECK: 5,
};

/**
 * Move water from one cell to another (destination must be air)
 * Claims the destination but leaves source UNCLAIMED so other water can fall into it
 */
function moveWater(grid: Grid, fromX: number, fromY: number, toX: number, toY: number): void {
	grid.set(toX, toY, CellType.Water);
	grid.setUnclaimed(fromX, fromY, CellType.Air);
}

/**
 * Get water column height from a given cell going up
 */
function getColumnHeight(grid: Grid, x: number, fromY: number): number {
	let height = 0;
	for (let checkY = fromY; checkY >= 0 && height < WATER_CONFIG.MAX_PRESSURE_CHECK; checkY--) {
		if (grid.get(x, checkY) === CellType.Water) {
			height++;
		} else {
			break;
		}
	}
	return height;
}

/**
 * Find the furthest air cell in a direction for extended horizontal flow
 */
function findFurthestAir(grid: Grid, x: number, y: number, direction: -1 | 1): number | null {
	let furthest: number | null = null;
	
	for (let dist = 1; dist <= WATER_CONFIG.MAX_FLOW_DISTANCE; dist++) {
		const checkX = x + (direction * dist);
		if (isAir(grid, checkX, y)) {
			furthest = checkX;
		} else {
			break;
		}
	}
	
	return furthest;
}

/**
 * Apply water rules to a single cell
 */
function applyWaterRules(grid: Grid, x: number, y: number): boolean {
	const cell = grid.get(x, y);
	if (cell !== CellType.Water) return false;
	if (grid.wasWritten(x, y)) return false;
	
	// Rule 1: Gravity (fall straight down)
	if (isAir(grid, x, y + 1)) {
		moveWater(grid, x, y, x, y + 1);
		return true;
	}
	
	// Rule 2: Diagonal falling (slope flow)
	if (random() < WATER_CONFIG.DIAGONAL_PROB) {
		const canDownLeft = isAir(grid, x - 1, y + 1);
		const canDownRight = isAir(grid, x + 1, y + 1);
		
		if (canDownLeft && canDownRight) {
			if (random() < 0.5) {
				moveWater(grid, x, y, x - 1, y + 1);
			} else {
				moveWater(grid, x, y, x + 1, y + 1);
			}
			return true;
		} else if (canDownLeft) {
			moveWater(grid, x, y, x - 1, y + 1);
			return true;
		} else if (canDownRight) {
			moveWater(grid, x, y, x + 1, y + 1);
			return true;
		}
	}
	
	// Rule 3: Pressure spill (flow toward lower pressure columns)
	const below = grid.get(x, y + 1);
	if (below === CellType.Water || below === CellType.Rock || below === CellType.Soil) {
		if (random() < WATER_CONFIG.PRESSURE_SPILL_PROB) {
			const canLeft = isAir(grid, x - 1, y);
			const canRight = isAir(grid, x + 1, y);
			
			if (canLeft || canRight) {
				const myHeight = getColumnHeight(grid, x, y);
				let leftLower = false;
				let rightLower = false;
				
				if (canLeft) {
					const leftHeight = getColumnHeight(grid, x - 1, y);
					leftLower = leftHeight < myHeight;
				}
				if (canRight) {
					const rightHeight = getColumnHeight(grid, x + 1, y);
					rightLower = rightHeight < myHeight;
				}
				
				if (leftLower && rightLower) {
					if (random() < 0.5) {
						moveWater(grid, x, y, x - 1, y);
					} else {
						moveWater(grid, x, y, x + 1, y);
					}
					return true;
				} else if (leftLower) {
					moveWater(grid, x, y, x - 1, y);
					return true;
				} else if (rightLower) {
					moveWater(grid, x, y, x + 1, y);
					return true;
				}
			}
		}
	}
	
	// Rule 4: Extended horizontal flow (multi-step splash)
	if (isBlocked(grid, x, y + 1)) {
		if (random() < WATER_CONFIG.EXTENDED_FLOW_PROB) {
			const furthestLeft = findFurthestAir(grid, x, y, -1);
			const furthestRight = findFurthestAir(grid, x, y, 1);
			
			const leftDist = furthestLeft !== null ? x - furthestLeft : 0;
			const rightDist = furthestRight !== null ? furthestRight - x : 0;
			
			if (leftDist > 0 && rightDist > 0) {
				if (leftDist > rightDist) {
					moveWater(grid, x, y, furthestLeft!, y);
				} else if (rightDist > leftDist) {
					moveWater(grid, x, y, furthestRight!, y);
				} else {
					if (random() < 0.5) {
						moveWater(grid, x, y, furthestLeft!, y);
					} else {
						moveWater(grid, x, y, furthestRight!, y);
					}
				}
				return true;
			} else if (leftDist > 0) {
				moveWater(grid, x, y, furthestLeft!, y);
				return true;
			} else if (rightDist > 0) {
				moveWater(grid, x, y, furthestRight!, y);
				return true;
			}
		}
	}
	
	// Rule 5: Idle - mark cell as processed
	grid.set(x, y, CellType.Water);
	return false;
}

/**
 * Apply water rules to entire grid
 * Iterates bottom→top with randomized horizontal order per row
 */
export function applyAllWaterRules(grid: Grid): void {
	for (let y = grid.height - 1; y >= 0; y--) {
		if (random() < 0.5) {
			for (let x = 0; x < grid.width; x++) {
				applyWaterRules(grid, x, y);
			}
		} else {
			for (let x = grid.width - 1; x >= 0; x--) {
				applyWaterRules(grid, x, y);
			}
		}
	}
}
