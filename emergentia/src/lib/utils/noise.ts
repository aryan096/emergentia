/**
 * Custom 2D Simplex Noise implementation
 * Based on Stefan Gustavson's paper and implementation
 * 
 * Returns values in range [-1, 1]
 */

// Gradient vectors for 2D
const GRAD2 = [
	[1, 1], [-1, 1], [1, -1], [-1, -1],
	[1, 0], [-1, 0], [0, 1], [0, -1]
];

// Skewing factors for 2D simplex
const F2 = 0.5 * (Math.sqrt(3) - 1); // Skew factor
const G2 = (3 - Math.sqrt(3)) / 6;   // Unskew factor

/**
 * Simple seeded random number generator (Mulberry32)
 */
function mulberry32(seed: number): () => number {
	return function() {
		let t = seed += 0x6D2B79F5;
		t = Math.imul(t ^ t >>> 15, t | 1);
		t ^= t + Math.imul(t ^ t >>> 7, t | 61);
		return ((t ^ t >>> 14) >>> 0) / 4294967296;
	};
}

/**
 * Simplex noise generator
 */
export class SimplexNoise {
	private perm: Uint8Array;
	private permMod8: Uint8Array;

	constructor(seed: number = 12345) {
		this.perm = new Uint8Array(512);
		this.permMod8 = new Uint8Array(512);
		
		// Initialize permutation table
		const p = new Uint8Array(256);
		for (let i = 0; i < 256; i++) {
			p[i] = i;
		}
		
		// Shuffle using seeded RNG
		const random = mulberry32(seed);
		for (let i = 255; i > 0; i--) {
			const j = Math.floor(random() * (i + 1));
			[p[i], p[j]] = [p[j], p[i]];
		}
		
		// Duplicate for wrapping
		for (let i = 0; i < 512; i++) {
			this.perm[i] = p[i & 255];
			this.permMod8[i] = this.perm[i] & 7;
		}
	}

	/**
	 * 2D Simplex noise
	 * @param x X coordinate
	 * @param y Y coordinate
	 * @returns Noise value in range [-1, 1]
	 */
	noise2D(x: number, y: number): number {
		// Skew input space to determine which simplex cell we're in
		const s = (x + y) * F2;
		const i = Math.floor(x + s);
		const j = Math.floor(y + s);
		
		// Unskew back to (x, y) space
		const t = (i + j) * G2;
		const X0 = i - t;
		const Y0 = j - t;
		
		// Distances from cell origin
		const x0 = x - X0;
		const y0 = y - Y0;
		
		// Determine which simplex we're in
		let i1: number, j1: number;
		if (x0 > y0) {
			i1 = 1; j1 = 0; // Lower triangle
		} else {
			i1 = 0; j1 = 1; // Upper triangle
		}
		
		// Offsets for middle and last corners
		const x1 = x0 - i1 + G2;
		const y1 = y0 - j1 + G2;
		const x2 = x0 - 1 + 2 * G2;
		const y2 = y0 - 1 + 2 * G2;
		
		// Hash coordinates of corners
		const ii = i & 255;
		const jj = j & 255;
		
		// Calculate contributions from each corner
		let n0 = 0, n1 = 0, n2 = 0;
		
		// Corner 0
		let t0 = 0.5 - x0 * x0 - y0 * y0;
		if (t0 >= 0) {
			t0 *= t0;
			const gi0 = this.permMod8[ii + this.perm[jj]];
			n0 = t0 * t0 * this.dot2(GRAD2[gi0], x0, y0);
		}
		
		// Corner 1
		let t1 = 0.5 - x1 * x1 - y1 * y1;
		if (t1 >= 0) {
			t1 *= t1;
			const gi1 = this.permMod8[ii + i1 + this.perm[jj + j1]];
			n1 = t1 * t1 * this.dot2(GRAD2[gi1], x1, y1);
		}
		
		// Corner 2
		let t2 = 0.5 - x2 * x2 - y2 * y2;
		if (t2 >= 0) {
			t2 *= t2;
			const gi2 = this.permMod8[ii + 1 + this.perm[jj + 1]];
			n2 = t2 * t2 * this.dot2(GRAD2[gi2], x2, y2);
		}
		
		// Scale to [-1, 1]
		return 70 * (n0 + n1 + n2);
	}

	/**
	 * Dot product with gradient
	 */
	private dot2(g: number[], x: number, y: number): number {
		return g[0] * x + g[1] * y;
	}

	/**
	 * Normalized noise in range [0, 1]
	 */
	noise2DNormalized(x: number, y: number): number {
		return (this.noise2D(x, y) + 1) / 2;
	}

	/**
	 * Fractal Brownian Motion (fBm) for more natural terrain
	 * Combines multiple octaves of noise
	 */
	fbm2D(x: number, y: number, octaves: number = 4, lacunarity: number = 2, persistence: number = 0.5): number {
		let total = 0;
		let frequency = 1;
		let amplitude = 1;
		let maxValue = 0;
		
		for (let i = 0; i < octaves; i++) {
			total += this.noise2D(x * frequency, y * frequency) * amplitude;
			maxValue += amplitude;
			amplitude *= persistence;
			frequency *= lacunarity;
		}
		
		return total / maxValue;
	}
}
