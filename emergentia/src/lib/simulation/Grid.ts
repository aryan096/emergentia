import { CellType, GRID_WIDTH, GRID_HEIGHT } from './types';

/**
 * Grid class representing the 2D world
 * Uses double buffering to avoid order-dependent update artifacts
 * 
 * - `current` buffer: read-only during tick (the world as it is now)
 * - `next` buffer: write-only during tick (the world after this tick)
 * - After each tick, buffers are swapped
 */
export class Grid {
	readonly width: number;
	readonly height: number;
	private current: Uint8Array;
	private next: Uint8Array;
	private written: Set<number>; // Track cells written to this tick

	constructor(width: number = GRID_WIDTH, height: number = GRID_HEIGHT) {
		this.width = width;
		this.height = height;
		this.current = new Uint8Array(width * height);
		this.next = new Uint8Array(width * height);
		this.written = new Set();
		this.fill(CellType.Air);
	}

	/**
	 * Convert (x, y) to flat array index
	 */
	private index(x: number, y: number): number {
		return y * this.width + x;
	}

	/**
	 * Check if coordinates are within bounds
	 */
	inBounds(x: number, y: number): boolean {
		return x >= 0 && x < this.width && y >= 0 && y < this.height;
	}

	/**
	 * Get cell type at (x, y) from CURRENT buffer (read-only during tick)
	 * Returns Rock if out of bounds (world is enclosed by solid walls)
	 */
	get(x: number, y: number): CellType {
		if (!this.inBounds(x, y)) return CellType.Rock;
		return this.current[this.index(x, y)] as CellType;
	}

	/**
	 * Set cell type at (x, y) in NEXT buffer (write-only during tick)
	 * Also marks this cell as "claimed" so it won't be overwritten
	 * No-op if out of bounds
	 */
	set(x: number, y: number, type: CellType): void {
		if (!this.inBounds(x, y)) return;
		const idx = this.index(x, y);
		this.next[idx] = type;
		this.written.add(idx);
	}

	/**
	 * Set cell type WITHOUT marking as claimed
	 * Use for vacated positions (air left behind by moving particles)
	 * These positions should remain available for other particles to fall into
	 */
	setUnclaimed(x: number, y: number, type: CellType): void {
		if (!this.inBounds(x, y)) return;
		this.next[this.index(x, y)] = type;
	}

	/**
	 * Check if a cell was already written to this tick
	 */
	wasWritten(x: number, y: number): boolean {
		if (!this.inBounds(x, y)) return true; // Treat out-of-bounds as "claimed"
		return this.written.has(this.index(x, y));
	}

	/**
	 * Set cell type at (x, y) in CURRENT buffer (for initialization only)
	 * No-op if out of bounds
	 */
	setDirect(x: number, y: number, type: CellType): void {
		if (!this.inBounds(x, y)) return;
		this.current[this.index(x, y)] = type;
	}

	/**
	 * Swap buffers at end of tick
	 * Next becomes current, and next is prepared for the next tick
	 */
	swap(): void {
		const temp = this.current;
		this.current = this.next;
		this.next = temp;
		// Copy current to next as starting point for next tick
		this.next.set(this.current);
		// Clear written tracking for next tick
		this.written.clear();
	}

	/**
	 * Fill entire grid with a cell type (both buffers)
	 */
	fill(type: CellType): void {
		this.current.fill(type);
		this.next.fill(type);
	}

	/**
	 * Fill a rectangular region with a cell type (current buffer, for initialization)
	 */
	fillRect(x: number, y: number, width: number, height: number, type: CellType): void {
		for (let dy = 0; dy < height; dy++) {
			for (let dx = 0; dx < width; dx++) {
				this.setDirect(x + dx, y + dy, type);
			}
		}
	}

	/**
	 * Sync next buffer to match current (call after initialization)
	 */
	sync(): void {
		this.next.set(this.current);
	}

	/**
	 * Get cell type at (x, y) from NEXT buffer
	 * 
	 * CRITICAL: This enables continuous falling streams!
	 * When water falls and vacates a cell (via setUnclaimed), the cell above
	 * needs to see that the cell is now Air to fall into it in the same tick.
	 * Reading from CURRENT would still show Water, blocking the cascade.
	 * Reading from NEXT shows Air, enabling continuous flow.
	 */
	getNext(x: number, y: number): CellType {
		if (!this.inBounds(x, y)) return CellType.Rock;
		return this.next[this.index(x, y)] as CellType;
	}

	/**
	 * Get raw cell data for rendering (current buffer)
	 */
	getCells(): Uint8Array {
		return this.current;
	}
}
