import { Grid } from './Grid';
import { CellType, WORLD_GEN } from './types';
import { SimplexNoise } from '../utils/noise';

/**
 * World generation utilities
 * Uses Simplex noise for natural-looking terrain
 */

/**
 * Generate a procedural world with terrain, water, and rock layers
 */
export function generateWorld(grid: Grid, seed: number = Date.now()): void {
	const { width, height } = grid;
	const noise = new SimplexNoise(seed);
	
	// Secondary noise for soil depth variation
	const soilNoise = new SimplexNoise(seed + 1);
	
	// Fill with air first
	grid.fill(CellType.Air);
	
	// Calculate water level (y coordinate)
	const waterLevelY = Math.floor(height * WORLD_GEN.WATER_LEVEL);
	
	// Generate terrain column by column
	for (let x = 0; x < width; x++) {
		// Get terrain height using fractal noise
		const noiseValue = noise.fbm2D(
			x * WORLD_GEN.TERRAIN_SCALE,
			0,
			WORLD_GEN.TERRAIN_OCTAVES
		);
		
		// Map noise [-1, 1] to terrain height
		const terrainHeight = Math.floor(
			height * (WORLD_GEN.TERRAIN_BASE + noiseValue * WORLD_GEN.TERRAIN_AMPLITUDE)
		);
		
		// Variable soil depth using secondary noise
		const soilDepthNoise = soilNoise.noise2DNormalized(x * 0.02, 0);
		const soilDepth = Math.floor(
			WORLD_GEN.SOIL_DEPTH_MIN + 
			soilDepthNoise * (WORLD_GEN.SOIL_DEPTH_MAX - WORLD_GEN.SOIL_DEPTH_MIN)
		);
		
		// Rock starts below soil
		const rockStartY = terrainHeight + soilDepth;
		
		// Fill column from top to bottom
		for (let y = 0; y < height; y++) {
			if (y < terrainHeight) {
				// Above terrain surface
				if (y >= waterLevelY) {
					// Below water level but above terrain = water (lakes in valleys)
					grid.setDirect(x, y, CellType.Water);
				}
				// else: air (already set)
			} else if (y < rockStartY) {
				// Soil layer
				grid.setDirect(x, y, CellType.Soil);
			} else {
				// Rock layer
				grid.setDirect(x, y, CellType.Rock);
			}
		}
	}
	
	// Sync next buffer to match current after initialization
	grid.sync();
}

/**
 * Generate a test world with floating water and platforms for testing physics
 * Uses Stone (immovable) for platforms so they don't interact with physics
 */
export function generateTestWorld(grid: Grid, seed: number = Date.now()): void {
	const { width, height } = grid;
	const noise = new SimplexNoise(seed);
	const caveNoise = new SimplexNoise(seed + 100);

	// Fill with air
	grid.fill(CellType.Air);
	
	// Generate terrain with hills and valleys
	for (let x = 0; x < width; x++) {
		// Multi-frequency terrain for interesting shapes
		const baseHeight = noise.fbm2D(x * 0.015, 0, 3) * 0.2;  // Large hills
		const detail = noise.noise2DNormalized(x * 0.05, 0) * 0.08; // Small bumps
		const mountains = Math.max(0, noise.noise2DNormalized(x * 0.008, 0) - 0.4) * 0.3; // Occasional peaks
		
		const terrainHeight = Math.floor(height * (0.55 + baseHeight + detail + mountains));
		
		// Variable soil depth
		const soilDepth = 8 + Math.floor(noise.noise2DNormalized(x * 0.03, 0) * 12);
		
		for (let y = 0; y < height; y++) {
			if (y >= terrainHeight) {
				if (y < terrainHeight + soilDepth) {
					grid.setDirect(x, y, CellType.Soil);
				} else {
					grid.setDirect(x, y, CellType.Rock);
				}
			}
		}
	}
	
	// Carve caves using 2D noise
	for (let x = 5; x < width - 5; x++) {
		for (let y = Math.floor(height * 0.5); y < height - 10; y++) {
			const caveValue = caveNoise.noise2DNormalized(x * 0.04, y * 0.04);
			const depthFactor = (y - height * 0.5) / (height * 0.5); // Caves more common deeper
			if (caveValue > 0.6 - depthFactor * 0.1) {
				grid.setDirect(x, y, CellType.Air);
			}
		}
	}
	
	// Add underground water pools in some caves
	for (let x = 10; x < width - 10; x++) {
		for (let y = Math.floor(height * 0.7); y < height - 15; y++) {
			// If this is air and has rock/soil below, maybe fill with water
			if (grid.get(x, y) === CellType.Air && 
				grid.get(x, y + 1) !== CellType.Air &&
				noise.noise2DNormalized(x * 0.1, y * 0.1) > 0.7) {
				// Fill this pocket with water upward
				for (let wy = y; wy >= 0 && grid.get(x, wy) === CellType.Air; wy--) {
					if (y - wy > 20) break; // Max water depth
					grid.setDirect(x, wy, CellType.Water);
				}
			}
		}
	}
	
	// Surface water - lakes in valleys (look for low points)
	const waterLevel = Math.floor(height * 0.48);
	for (let x = 0; x < width; x++) {
		for (let y = waterLevel; y < Math.floor(height * 0.6); y++) {
			if (grid.get(x, y) === CellType.Air) {
				grid.setDirect(x, y, CellType.Water);
			}
		}
	}
	
	// Add a waterfall source at a high point
	const peakX = Math.floor(width * 0.75);
	grid.fillRect(peakX - 15, Math.floor(height * 0.2), 30, 25, CellType.Water);
	
	// Stone walls on sides to contain everything
	grid.fillRect(0, 0, 3, height, CellType.Stone);
	grid.fillRect(width - 3, 0, 3, height, CellType.Stone);
	
	// Stone floor
	grid.fillRect(0, height - 5, width, 5, CellType.Stone);
	
	// A few floating platforms to make water flow interesting
	grid.fillRect(Math.floor(width * 0.3), Math.floor(height * 0.35), 50, 8, CellType.Stone);
	grid.fillRect(Math.floor(width * 0.5), Math.floor(height * 0.45), 40, 8, CellType.Stone);
	
	// Sync buffers
	grid.sync();
}
