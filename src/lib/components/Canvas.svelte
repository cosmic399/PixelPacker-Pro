<script>
	import { Upload } from 'lucide-svelte';
	import ImageItem from '$lib/components/ImageItem.svelte';

	// A4 dimensions at 96 DPI: 210mm x 297mm = 794px x 1123px
	const A4_WIDTH = 794;
	const A4_HEIGHT = 1123;

	let {
		images = $bindable([]),
		selectedImageId = $bindable(null),
		canvasScale = 1,
		isExporting = false,
		canvasRef = $bindable(),
		onCanvasClick,
		onCropRequest
	} = $props();

	function handleImageUpdate(updatedImage) {
		images = images.map((img) => (img.id === updatedImage.id ? updatedImage : img));
	}

	function handleImageDelete(id) {
		const image = images.find((img) => img.id === id);
		if (image && image.url.startsWith('blob:')) {
			URL.revokeObjectURL(image.url);
		}
		images = images.filter((img) => img.id !== id);
		if (selectedImageId === id) {
			selectedImageId = null;
		}
	}

	function handleImageSelect(id) {
		selectedImageId = id;
		const maxZ = Math.max(...images.map((img) => img.zIndex), 0);
		images = images.map((img) => (img.id === id ? { ...img, zIndex: maxZ + 1 } : img));
	}

</script>

<div class="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="canvas-area relative mx-auto overflow-visible rounded-lg shadow-2xl"
		style="width: {A4_WIDTH}px; height: {A4_HEIGHT}px; transform: scale({canvasScale}) translate3d(0,0,0); transform-origin: top center; background-color: rgb(255, 255, 255); will-change: transform;"
		bind:this={canvasRef}
		onclick={onCanvasClick}
	>
		{#if images.length === 0}
			<div class="absolute inset-0 flex items-center justify-center">
				<div class="text-center">
					<div
						class="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl border border-white/20 bg-gradient-to-br from-cyan-500/20 to-purple-500/20"
					>
						<Upload class="h-10 w-10 text-white/50" />
					</div>
					<p class="text-sm font-light text-white/60">Drop images to begin</p>
				</div>
			</div>
		{:else}
			{#each images as image (image.id)}
				<ImageItem
					{image}
					isSelected={selectedImageId === image.id}
					onUpdate={handleImageUpdate}
					onDelete={handleImageDelete}
					onSelect={() => handleImageSelect(image.id)}
					onCropRequest={onCropRequest}
				/>
			{/each}
		{/if}
	</div>

	{#if isExporting}
		<div class="mt-4 text-center">
			<div class="inline-flex items-center gap-2 text-sm text-white/60">
				<div
					class="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white/80"
				></div>
				<span class="font-light">Exporting...</span>
			</div>
		</div>
	{/if}
</div>

<style>
	.canvas-area {
		transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	}
</style>
