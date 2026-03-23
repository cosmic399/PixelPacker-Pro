<script>
	import { ImageOff, Palette, RotateCcw } from 'lucide-svelte';

	let { image, onUpdate = () => {} } = $props();

	function toggleFilter(filterName) {
		const newFilters = {
			...image.filters,
			[filterName]: !image.filters[filterName]
		};
		onUpdate({ ...image, filters: newFilters });
	}

	function resetFilters() {
		onUpdate({
			...image,
			filters: {
				invert: false,
				grayscale: false,
				sepia: false,
				brightness: 100,
				contrast: 100,
				saturate: 100
			}
		});
	}

	function updateFilterValue(filterName, value) {
		const newFilters = {
			...image.filters,
			[filterName]: parseInt(value)
		};
		onUpdate({ ...image, filters: newFilters });
	}
</script>

<div class="space-y-4">
	<div class="flex items-center justify-between mb-4">
		<h3 class="text-sm font-light text-white/80 uppercase tracking-wider flex items-center gap-2">
			<Palette class="w-4 h-4" />
			Filters
		</h3>
		<button
			onclick={resetFilters}
			class="p-1.5 text-white/50 hover:text-white/80 hover:bg-white/10 rounded-lg transition-all duration-200"
			title="Reset Filters"
		>
			<RotateCcw class="w-4 h-4" />
		</button>
	</div>

	<!-- Toggle Filters -->
	<div class="grid grid-cols-2 gap-2">
		<button
			onclick={() => toggleFilter('invert')}
			class="p-3 rounded-xl border-2 transition-all duration-300 {image.filters.invert
				? 'border-cyan-400 bg-cyan-500/20 text-cyan-300'
				: 'border-white/20 bg-white/5 text-white/70 hover:border-white/40 hover:bg-white/10'}"
		>
			<div class="flex items-center gap-2 justify-center">
				<ImageOff class="w-4 h-4" />
				<span class="text-xs font-light">Negative</span>
			</div>
		</button>
		<button
			onclick={() => toggleFilter('grayscale')}
			class="p-3 rounded-xl border-2 transition-all duration-300 {image.filters.grayscale
				? 'border-cyan-400 bg-cyan-500/20 text-cyan-300'
				: 'border-white/20 bg-white/5 text-white/70 hover:border-white/40 hover:bg-white/10'}"
		>
			<div class="flex items-center gap-2 justify-center">
				<ImageOff class="w-4 h-4" />
				<span class="text-xs font-light">Grayscale</span>
			</div>
		</button>
	</div>

	<!-- Slider Controls -->
	<div class="space-y-3">
		<div>
			<label for="brightness-slider" class="text-xs text-white/60 mb-1 block font-light">
				Brightness: {image.filters.brightness}%
			</label>
			<input
				id="brightness-slider"
				type="range"
				min="0"
				max="200"
				value={image.filters.brightness}
				oninput={(e) => updateFilterValue('brightness', e.target.value)}
				class="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-500"
			/>
		</div>
		<div>
			<label for="contrast-slider" class="text-xs text-white/60 mb-1 block font-light">
				Contrast: {image.filters.contrast}%
			</label>
			<input
				id="contrast-slider"
				type="range"
				min="0"
				max="200"
				value={image.filters.contrast}
				oninput={(e) => updateFilterValue('contrast', e.target.value)}
				class="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-500"
			/>
		</div>
		<div>
			<label for="saturate-slider" class="text-xs text-white/60 mb-1 block font-light">
				Saturation: {image.filters.saturate}%
			</label>
			<input
				id="saturate-slider"
				type="range"
				min="0"
				max="200"
				value={image.filters.saturate}
				oninput={(e) => updateFilterValue('saturate', e.target.value)}
				class="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-500"
			/>
		</div>
	</div>
</div>

