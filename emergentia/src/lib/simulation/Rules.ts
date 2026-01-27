import type { Grid } from './Grid';
import { CellType } from './types';

/**
 * Context passed to each rule function
 */
export interface RuleContext {
	x: number;
	y: number;
	cell: CellType;
	grid: Grid; // For reading neighbors (current buffer)
}

/**
 * A rule is a pure function that decides what a cell should become
 * Returns a new CellType, or null to indicate no change
 */
export type Rule = (ctx: RuleContext) => CellType | null;

/**
 * Rule engine that manages and applies rules to cells
 * Rules are applied in order; first non-null result wins
 */
export class RuleEngine {
	private rules: Rule[] = [];

	/**
	 * Register a new rule
	 * Rules are applied in registration order
	 */
	register(rule: Rule): void {
		this.rules.push(rule);
	}

	/**
	 * Clear all registered rules
	 */
	clear(): void {
		this.rules = [];
	}

	/**
	 * Apply all rules to a cell and return the resulting type
	 * First non-null result wins; if all return null, cell is unchanged
	 */
	apply(ctx: RuleContext): CellType {
		for (const rule of this.rules) {
			const result = rule(ctx);
			if (result !== null) {
				return result;
			}
		}
		return ctx.cell; // No rule matched, keep unchanged
	}

	/**
	 * Apply rules to entire grid
	 * Reads from current buffer, writes to next buffer
	 * Skips cells that were already written to (claimed by movement)
	 */
	applyAll(grid: Grid): void {
		for (let y = 0; y < grid.height; y++) {
			for (let x = 0; x < grid.width; x++) {
				// Skip cells that were already claimed by another cell's movement
				if (grid.wasWritten(x, y)) continue;
				
				const cell = grid.get(x, y);
				const ctx: RuleContext = { x, y, cell, grid };
				const newCell = this.apply(ctx);
				grid.set(x, y, newCell);
			}
		}
	}

	/**
	 * Get number of registered rules
	 */
	get ruleCount(): number {
		return this.rules.length;
	}
}
