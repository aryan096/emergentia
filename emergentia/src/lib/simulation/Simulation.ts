import { Grid } from './Grid';
import { RuleEngine } from './Rules';
import { TICK_RATE } from './types';
import { setRandomSeed } from './RuleUtils';
import { applyAllWaterRules } from './WaterRules';
import { applyAllAirRules } from './AirRules';
import { applyAllVaporRules } from './VaporRules';
import { applyAllCloudRules } from './CloudRules';
import { SunlightField } from './Sunlight';

export type TickCallback = (tickCount: number) => void;

/**
 * Simulation controller
 * Manages the simulation loop, grid state, and rule execution
 */
export class Simulation {
	readonly grid: Grid;
	readonly rules: RuleEngine;
	private readonly _tickRate: number;
	private animationFrameId: number | null = null;
	private _tickCount: number = 0;
	private onTick: TickCallback | null = null;
	private lastTime: number = 0;
	private accumulator: number = 0;
	private readonly sunlightField: SunlightField;

	constructor(grid: Grid, tickRate: number = TICK_RATE) {
		this.grid = grid;
		this.rules = new RuleEngine();
		this._tickRate = tickRate;
		this.sunlightField = new SunlightField(grid.width, grid.height);
	}

	/** Sunlight field — exposed for the renderer */
	get sunlight(): SunlightField {
		return this.sunlightField;
	}

	/**
	 * Current tick count
	 */
	get tickCount(): number {
		return this._tickCount;
	}

	/**
	 * Current tick rate (ticks per second)
	 */
	get tickRate(): number {
		return this._tickRate;
	}

	/**
	 * Whether the simulation is currently running
	 */
	get isRunning(): boolean {
		return this.animationFrameId !== null;
	}

	/**
	 * Set callback to be called on each tick
	 */
	setOnTick(callback: TickCallback | null): void {
		this.onTick = callback;
	}

	/**
	 * Perform one simulation tick
	 *
	 * UPDATE ORDERING IS CRITICAL:
	 * 1. Sunlight  — pure top-down propagation, no buffer interaction
	 * 2. Water     — bottom→top; includes evaporation (needs sunlight)
	 * 3. Air       — top→bottom; rises through fluid cells
	 * 4. Vapor     — top→bottom; rises fast, may condense into Cloud
	 * 5. Cloud     — drift + evaporation; processed after vapor so newly
	 *                condensed clouds don't immediately drift this tick
	 */
	tick(): void {
		this._tickCount++;

		// Set random seed for this tick (for deterministic-ish behavior)
		setRandomSeed(this._tickCount);

		// Pass 1: Recompute sunlight (top-down, pure function of grid + tickCount)
		this.sunlightField.propagate(this.grid, this._tickCount);

		// Pass 2: Water rules (bottom→top) — includes evaporation via sunlightField
		applyAllWaterRules(this.grid, this.sunlightField);

		// Pass 3: Air rules (top→bottom)
		applyAllAirRules(this.grid);

		// Pass 4: Vapor rules (top→bottom)
		applyAllVaporRules(this.grid);

		// Pass 5: Cloud rules (drift + evaporation)
		applyAllCloudRules(this.grid);

		// Swap buffers (next becomes current)
		this.grid.swap();

		// Notify listeners
		if (this.onTick) {
			this.onTick(this._tickCount);
		}
	}

	/**
	 * Start the simulation loop
	 */
	start(): void {
		if (this.isRunning) return;

		this.lastTime = performance.now();
		this.accumulator = 0;
		
		const msPerTick = 1000 / this._tickRate;
		const maxTicksPerFrame = 2; // Keep it simple - max 2 ticks per frame
		
		const loop = (currentTime: number) => {
			const deltaTime = currentTime - this.lastTime;
			this.lastTime = currentTime;
			this.accumulator += deltaTime;
			
			// Run ticks to catch up, capped to prevent death spiral
			let ticksThisFrame = 0;
			while (this.accumulator >= msPerTick && ticksThisFrame < maxTicksPerFrame) {
				this.tick();
				this.accumulator -= msPerTick;
				ticksThisFrame++;
			}
			
			// Discard excess time if falling behind
			if (this.accumulator > msPerTick * 2) {
				this.accumulator = 0;
			}
			
			this.animationFrameId = window.requestAnimationFrame(loop);
		};
		
		this.animationFrameId = window.requestAnimationFrame(loop);
	}

	/**
	 * Stop the simulation loop
	 */
	stop(): void {
		if (this.animationFrameId !== null) {
			window.cancelAnimationFrame(this.animationFrameId);
			this.animationFrameId = null;
		}
	}

	/**
	 * Toggle between running and stopped
	 */
	toggle(): void {
		if (this.isRunning) {
			this.stop();
		} else {
			this.start();
		}
	}

	/**
	 * Reset the simulation (stops loop, resets tick count)
	 * Note: Does not regenerate the world - caller should do that
	 */
	reset(): void {
		this.stop();
		this._tickCount = 0;
		if (this.onTick) {
			this.onTick(0);
		}
	}
}
