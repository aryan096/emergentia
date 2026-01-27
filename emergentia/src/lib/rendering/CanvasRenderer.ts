import type { Grid } from '../simulation/Grid';
import { CELL_REGISTRY, type CellType } from '../simulation/types';

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
	 * Render the grid to the canvas
	 */
	render(grid: Grid): void {
		const cells = grid.getCells();
		const data = this.imageData.data;

		for (let i = 0; i < cells.length; i++) {
			const cellType = cells[i] as CellType;
			const info = CELL_REGISTRY[cellType];
			const color = info.color;

			// Each pixel is 4 bytes: R, G, B, A
			const pixelIndex = i * 4;
			data[pixelIndex] = color[0]; // R
			data[pixelIndex + 1] = color[1]; // G
			data[pixelIndex + 2] = color[2]; // B
			// Alpha is already set to 255
		}

		// Draw the image data to the canvas
		this.ctx.putImageData(this.imageData, 0, 0);
	}
}
