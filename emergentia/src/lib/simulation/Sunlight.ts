import type { Grid } from './Grid';
import { CELL_REGISTRY } from './types';

/** ~2 minutes at 60 ticks/sec */
const DAY_CYCLE_TICKS = 400;

/**
 * Sunlight field: top-down directional light with a sinusoidal day/night cycle.
 * Recomputed from scratch each tick (pure function of grid + tickCount).
 * Single buffer — no double-buffering needed.
 */
export class SunlightField {
	private buffer: Float32Array; // 0.0–1.0 per cell (light received)
	readonly width: number;
	readonly height: number;

	constructor(width: number, height: number) {
		this.width = width;
		this.height = height;
		this.buffer = new Float32Array(width * height);
	}

	/**
	 * Global sun intensity for this tick based on sinusoidal day-night cycle.
	 * Returns 0 during night (negative half of sine), 0–1 during day.
	 */
	getSunIntensity(tickCount: number): number {
		const phase = (tickCount % DAY_CYCLE_TICKS) / DAY_CYCLE_TICKS;
		return Math.max(0, Math.sin(phase * Math.PI * 2));
	}

	/**
	 * Top-down pass: propagate sunlight through each column.
	 * Each cell stores the light it receives (before its own opacity attenuates it).
	 */
	propagate(grid: Grid, tickCount: number): void {
		const sunIntensity = this.getSunIntensity(tickCount);
		for (let x = 0; x < this.width; x++) {
			let light = sunIntensity;
			for (let y = 0; y < this.height; y++) {
				const opacity = CELL_REGISTRY[grid.get(x, y)].opacity;
				this.buffer[y * this.width + x] = light;
				light *= 1 - opacity;
			}
		}
	}

	/** Light level received at (x, y): [0.0, 1.0] */
	get(x: number, y: number): number {
		return this.buffer[y * this.width + x];
	}

	/** Raw buffer for renderer access */
	getBuffer(): Float32Array {
		return this.buffer;
	}
}
