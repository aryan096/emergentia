<script lang="ts">
	interface Props {
		isRunning: boolean;
		tickCount: number;
		targetFPS: number;
		onToggle: () => void;
		onStep: () => void;
		onReset: () => void;
		onFPSChange: (fps: number) => void;
	}

	let {
		isRunning,
		tickCount,
		targetFPS,
		onToggle,
		onStep,
		onReset,
		onFPSChange
	}: Props = $props();

	function handleFPSChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		onFPSChange(parseInt(target.value, 10));
	}
</script>

<div class="flex flex-wrap items-center gap-4 rounded-lg bg-gray-800 p-4">
	<!-- Playback controls -->
	<div class="flex items-center gap-2">
		<button
			onclick={onToggle}
			class="rounded-md px-4 py-2 font-medium text-white transition-colors {isRunning
				? 'bg-red-600 hover:bg-red-700'
				: 'bg-green-600 hover:bg-green-700'}"
		>
			{isRunning ? 'Pause' : 'Start'}
		</button>

		<button
			onclick={onStep}
			disabled={isRunning}
			class="rounded-md bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
		>
			Step
		</button>

		<button
			onclick={onReset}
			class="rounded-md bg-gray-600 px-4 py-2 font-medium text-white transition-colors hover:bg-gray-700"
		>
			Reset
		</button>
	</div>

	<!-- Tick counter -->
	<div class="text-gray-300">
		<span class="text-gray-500">Tick:</span>
		<span class="ml-1 font-mono">{tickCount}</span>
	</div>

	<!-- FPS selector -->
	<div class="flex items-center gap-2">
		<label for="fps" class="text-gray-400">FPS:</label>
		<select
			id="fps"
			value={targetFPS}
			onchange={handleFPSChange}
			class="rounded-md bg-gray-700 px-2 py-1 text-gray-200"
		>
			<option value={1}>1</option>
			<option value={2}>2</option>
			<option value={5}>5</option>
			<option value={10}>10</option>
			<option value={15}>15</option>
			<option value={30}>30</option>
			<option value={60}>60</option>
		</select>
	</div>
</div>
