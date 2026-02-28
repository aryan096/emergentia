<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import {
		Grid,
		Simulation,
		generateTestWorld,
		TICK_RATE,
		GRID_WIDTH,
		GRID_HEIGHT
	} from '$lib';
	import SimulationCanvas from '../components/SimulationCanvas.svelte';
	import ControlPanel from '../components/ControlPanel.svelte';

	// Simulation state
	let simulation: Simulation | null = $state(null);
	let tickCount = $state(0);
	let isRunning = $state(false);
	
	// Render rate (FPS) - independent of tick rate
	let targetFPS = $state(60);

	// For forcing re-render on reset
	let gridKey = $state(0);

	function createSimulation(): Simulation {
		const grid = new Grid(GRID_WIDTH, GRID_HEIGHT);
		generateTestWorld(grid); // Using test world for physics debugging
		const sim = new Simulation(grid, TICK_RATE); // Fixed tick rate

		sim.setOnTick((count) => {
			tickCount = count;
		});

		return sim;
	}

	onMount(() => {
		simulation = createSimulation();
	});

	onDestroy(() => {
		simulation?.stop();
	});

	function handleToggle() {
		if (!simulation) return;
		simulation.toggle();
		isRunning = simulation.isRunning;
	}

	function handleStep() {
		if (!simulation || simulation.isRunning) return;
		simulation.tick();
	}

	function handleReset() {
		simulation?.stop();
		simulation = createSimulation();
		tickCount = 0;
		isRunning = false;
		gridKey++;
	}

	function handleFPSChange(fps: number) {
		targetFPS = fps;
	}
</script>

<svelte:head>
	<title>Emergentia</title>
</svelte:head>

<main class="flex min-h-screen flex-col items-center gap-4 bg-gray-900 p-4">
	<h1 class="text-2xl font-bold text-white">Emergentia</h1>

	<ControlPanel
		{isRunning}
		{tickCount}
		{targetFPS}
		onToggle={handleToggle}
		onStep={handleStep}
		onReset={handleReset}
		onFPSChange={handleFPSChange}
	/>

	{#if simulation}
		{#key gridKey}
			<SimulationCanvas grid={simulation.grid} sunlight={simulation.sunlight} {targetFPS} />
		{/key}
	{:else}
		<div class="text-gray-400">Initializing simulation...</div>
	{/if}

	<p class="text-sm text-gray-500 italic">Work in progress :)</p>
</main>
