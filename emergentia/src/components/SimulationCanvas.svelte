<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { CanvasRenderer, type Grid } from '$lib';

	interface Props {
		grid: Grid;
		targetFPS?: number; // Target frames per second for rendering
	}

	let { grid, targetFPS = 5 }: Props = $props();

	let canvas: HTMLCanvasElement;
	let renderer: CanvasRenderer | null = null;
	let renderIntervalId: ReturnType<typeof setInterval> | null = null;

	onMount(() => {
		renderer = new CanvasRenderer(canvas, grid.width, grid.height);
		renderer.render(grid);
		
		// Start fixed-rate render loop (independent of simulation tick rate)
		const renderIntervalMs = 1000 / targetFPS;
		renderIntervalId = setInterval(() => {
			if (renderer) {
				renderer.render(grid);
			}
		}, renderIntervalMs);
	});

	onDestroy(() => {
		if (renderIntervalId !== null) {
			clearInterval(renderIntervalId);
		}
	});

	// Update render interval when targetFPS changes
	$effect(() => {
		if (renderIntervalId !== null) {
			clearInterval(renderIntervalId);
			const renderIntervalMs = 1000 / targetFPS;
			renderIntervalId = setInterval(() => {
				if (renderer) {
					renderer.render(grid);
				}
			}, renderIntervalMs);
		}
	});
</script>

<canvas
	bind:this={canvas}
	class="border border-gray-700 shadow-lg"
	style="image-rendering: pixelated; width: 75vw; height: auto; aspect-ratio: {grid.width} / {grid.height};"
></canvas>
