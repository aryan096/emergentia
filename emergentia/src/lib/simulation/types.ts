/**
 * Cell type definitions and constants for the simulation
 */

export enum CellType {
	Air = 0,
	Water = 1,
	Soil = 2,
	Rock = 3,
	Stone = 4, // Immovable solid for testing platforms
	Vapor = 5, // Evaporated water, rises to top
	Cloud = 6  // Condensed vapor; floats, drifts, casts shadow
}

/**
 * Density values for each cell type (lower = lighter, rises above heavier)
 * Used for unified buoyancy/gravity rules
 */
export const CELL_DENSITY: Record<CellType, number> = {
	[CellType.Air]: 0,
	[CellType.Water]: 1,
	[CellType.Soil]: 2,
	[CellType.Rock]: 3,
	[CellType.Stone]: Infinity,
	[CellType.Vapor]: 0.0, // Lighter than Air; rises via VaporRules
	[CellType.Cloud]: 0.0, // Same as vapor; floats via CloudRules
};

/**
 * Whether a cell type is a fluid (can be displaced by buoyancy)
 * Air can only rise through fluids, not solids
 */
export const CELL_IS_FLUID: Record<CellType, boolean> = {
	[CellType.Air]: true,
	[CellType.Water]: true,
	[CellType.Soil]: false,
	[CellType.Rock]: false,
	[CellType.Stone]: false,
	[CellType.Vapor]: true,  // Air can pass through vapor
	[CellType.Cloud]: false, // Blocks air and water flow
};

/**
 * Metadata for each cell type
 */
export interface CellTypeInfo {
	name: string;
	color: [number, number, number]; // RGB
	opacity: number; // 0 = transparent, 1 = fully opaque (for sunlight blocking)
}

/**
 * Registry of all cell types with their metadata
 */
export const CELL_REGISTRY: Record<CellType, CellTypeInfo> = {
	[CellType.Air]: { name: 'Air', color: [135, 206, 235], opacity: 0 },
	[CellType.Water]: { name: 'Water', color: [30, 144, 255], opacity: 0.3 },
	[CellType.Soil]: { name: 'Soil', color: [139, 90, 43], opacity: 1 },
	[CellType.Rock]: { name: 'Rock', color: [105, 105, 105], opacity: 1 },
	[CellType.Stone]: { name: 'Stone', color: [60, 60, 60], opacity: 1 },
	[CellType.Vapor]: { name: 'Vapor', color: [200, 210, 220], opacity: 0.00 },
	[CellType.Cloud]: { name: 'Cloud', color: [240, 245, 250], opacity: 0.0005 }
};

/**
 * Simulation constants
 */
export const GRID_WIDTH = 400;
export const GRID_HEIGHT = 250;
export const TICK_RATE = 60; // Fixed tick rate (matches typical frame rate)

/**
 * World generation constants
 */
export const WORLD_GEN = {
	TERRAIN_SCALE: 0.008,        // Noise frequency (lower = smoother)
	TERRAIN_OCTAVES: 4,          // Fractal noise octaves
	TERRAIN_BASE: 0.45,          // Base terrain height (% from top)
	TERRAIN_AMPLITUDE: 0.18,     // Terrain variation (+/- %)
	SOIL_DEPTH_MIN: 30,          // Minimum soil depth
	SOIL_DEPTH_MAX: 60,          // Maximum soil depth
	WATER_LEVEL: 0.40,           // Sea level (% from top)
	CAVE_THRESHOLD: 0.6,         // Threshold for cave formation (future)
} as const;
