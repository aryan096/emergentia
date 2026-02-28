import type { Grid } from '../simulation/Grid';
import { CELL_REGISTRY, type CellType } from '../simulation/types';
import type { SunlightField } from '../simulation/Sunlight';

/**
 * Canvas renderer for the simulation grid
 * Renders each cell as a single pixel using ImageData for performance
 */
export class CanvasRenderer {
	private ctx: CanvasRenderingContext2D;
	private imageData: ImageData;
	private width: number;
	private height: number;

	constructor(canvas: HTMLCanvasElement, width: number, height: number) {
		this.width = width;
		this.height = height;

		// Set canvas size
		canvas.width = width;
		canvas.height = height;

		const ctx = canvas.getContext('2d');
		if (!ctx) {
			throw new Error('Failed to get 2D canvas context');
		}
		this.ctx = ctx;

		// Create ImageData buffer for efficient pixel manipulation
		this.imageData = ctx.createImageData(width, height);

		// Initialize alpha channel to 255 (fully opaque)
		const data = this.imageData.data;
		for (let i = 3; i < data.length; i += 4) {
			data[i] = 255;
		}
	}

	/**
	 * Render the grid to the canvas.
	 * When sunlight is provided, cell brightness is modulated by received light.
	 */
	render(grid: Grid, sunlight?: SunlightField): void {
		const cells = grid.getCells();
		const data = this.imageData.data;

		// Minimum brightness so caves aren't pitch black during daytime
		const AMBIENT = 0.15;

		for (let i = 0; i < cells.length; i++) {
			const cellType = cells[i] as CellType;
			const [r, g, b] = CELL_REGISTRY[cellType].color;

			let brightness = 1.0;
			if (sunlight) {
				const x = i % this.width;
				const y = Math.floor(i / this.width);
				const light = sunlight.get(x, y);
				brightness = AMBIENT + (1 - AMBIENT) * light;
			}

			// Each pixel is 4 bytes: R, G, B, A
			const pixelIndex = i * 4;
			data[pixelIndex] = Math.round(r * brightness);
			data[pixelIndex + 1] = Math.round(g * brightness);
			data[pixelIndex + 2] = Math.round(b * brightness);
			// Alpha is already set to 255
		}

		// Draw the image data to the canvas
		this.ctx.putImageData(this.imageData, 0, 0);
	}
}
