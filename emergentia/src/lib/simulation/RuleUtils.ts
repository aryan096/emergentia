import type { Grid } from './Grid';
import { CellType, CELL_DENSITY, CELL_IS_FLUID } from './types';

/**
 * Shared utilities for cell rules
 * Provides common functions used across different rule sets
 */

/**
 * Simple seeded random for deterministic randomness within a tick
 */
let randomSeed = 1;

export function setRandomSeed(seed: number): void {
	randomSeed = seed;
}

export function random(): number {
	randomSeed = (randomSeed * 1103515245 + 12345) & 0x7fffffff;
	return randomSeed / 0x7fffffff;
}

/**
 * Get density of a cell type
 */
export function getDensity(cellType: CellType): number {
	return CELL_DENSITY[cellType];
}

/**
 * Check if a cell type is a fluid (can be displaced by buoyancy)
 */
export function isFluid(cellType: CellType): boolean {
	return CELL_IS_FLUID[cellType];
}

/**
 * Check if cellA should sink below cellB (cellA is denser)
 */
export function shouldSink(cellA: CellType, cellB: CellType): boolean {
	return CELL_DENSITY[cellA] > CELL_DENSITY[cellB];
}

/**
 * Check if cellA should rise above cellB (cellA is lighter)
 */
export function shouldRise(cellA: CellType, cellB: CellType): boolean {
	return CELL_DENSITY[cellA] < CELL_DENSITY[cellB];
}

/**
 * Check if a cell is available for falling into
 * 
 * CRITICAL: Reads from NEXT buffer, not CURRENT!
 * This is essential for continuous falling streams:
 * - Water at y=10 falls to y=11, leaving Air at y=10 (unclaimed)
 * - Water at y=9 checks isAir(y=10)
 * - If we read CURRENT: still shows Water → water can't fall → air gaps!
 * - If we read NEXT: shows Air → water falls → continuous stream!
 * 
 * A cell is available if:
 * - NEXT buffer has Air (either original Air, or just vacated)
 * - AND it's not claimed (wasWritten returns false)
 */
export function isAir(grid: Grid, x: number, y: number): boolean {
	return grid.getNext(x, y) === CellType.Air && !grid.wasWritten(x, y);
}

/**
 * Check if a cell is NOT available (solid, water, or claimed)
 * Also reads from NEXT buffer for consistency with isAir()
 */
export function isBlocked(grid: Grid, x: number, y: number): boolean {
	return grid.getNext(x, y) !== CellType.Air || grid.wasWritten(x, y);
}

/**
 * Check if a cell is water and not already claimed
 */
export function isWater(grid: Grid, x: number, y: number): boolean {
	return grid.get(x, y) === CellType.Water && !grid.wasWritten(x, y);
}

/**
 * Check if a cell is vapor and not already claimed
 */
export function isVapor(grid: Grid, x: number, y: number): boolean {
	return grid.get(x, y) === CellType.Vapor && !grid.wasWritten(x, y);
}

/**
 * Check if a cell is cloud and not already claimed
 */
export function isCloud(grid: Grid, x: number, y: number): boolean {
	return grid.get(x, y) === CellType.Cloud && !grid.wasWritten(x, y);
}

/**
 * Check if a cell is unclaimed (not written to this tick)
 */
export function isUnclaimed(grid: Grid, x: number, y: number): boolean {
	return !grid.wasWritten(x, y);
}
