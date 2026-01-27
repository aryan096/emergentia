import { Grid } from './Grid';
import { RuleEngine } from './Rules';
import { TICK_RATE } from './types';
import { setRandomSeed } from './RuleUtils';
import { applyAllWaterRules } from './WaterRules';
import { applyAllAirRules } from './AirRules';

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

	constructor(grid: Grid, tickRate: number = TICK_RATE) {
		this.grid = grid;
		this.rules = new RuleEngine();
		this._tickRate = tickRate;
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
	 * 1. Water rules first (bottom→top) - water falls and spreads
	 * 2. Air rules second (top→bottom) - air rises through water
	 * 
	 * If air is updated first, it blocks water collapse.
	 */
	tick(): void {
		this._tickCount++;
		
		// Set random seed for this tick (for deterministic-ish behavior)
		setRandomSeed(this._tickCount);

		// Pass 1: Water rules (bottom→top iteration)
		applyAllWaterRules(this.grid);
		
		// Pass 2: Air rules (top→bottom iteration)
		applyAllAirRules(this.grid);
		
		// Apply any other registered rules (top-down for non-gravity things)
		// this.rules.applyAll(this.grid);

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
