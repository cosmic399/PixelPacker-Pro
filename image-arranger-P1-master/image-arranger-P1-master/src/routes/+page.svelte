<script>
	import { onMount } from 'svelte';
	import {
		Download,
		FileImage,
		FileText,
		Trash2,
		Upload,
		ZoomIn,
		ZoomOut,
		RotateCcw,
		Sparkles,
		X,
		ChevronLeft,
		ChevronRight,
		Plus
	} from 'lucide-svelte';
	import ImageUpload from '$lib/components/ImageUpload.svelte';
	import ImageFilters from '$lib/components/ImageFilters.svelte';
	import CropModal from '$lib/components/CropModal.svelte';
	import Canvas from '$lib/components/Canvas.svelte';
	import { exportAsPNG, exportAsJPEG, exportAsPDF } from '$lib/utils/exportUtils.js';

	// A4 dimensions at 96 DPI: 210mm x 297mm = 794px x 1123px
	const A4_WIDTH = 794;
	const A4_HEIGHT = 1123;

	let pages = $state([{ id: crypto.randomUUID(), images: [] }]);
	let activePageIndex = $state(0);

	let selectedImageId = $state(null);
	let canvasRef = $state(null);
	let canvasScale = $state(1);
	let isExporting = $state(false);
	let cropModalOpen = $state(false);
	let cropImageData = $state(null);

	function handleImagesAdded(newImages) {
		const currentImages = pages[activePageIndex].images;
		const maxZ = currentImages.reduce((max, img) => Math.max(max, img.zIndex), 0);
		let currentZ = maxZ + 1;

		newImages.forEach((img, index) => {
			if (!img.width) img.width = 100;
			if (!img.height) img.height = 100;

			const targetWidth = A4_WIDTH * 0.8;
			const targetHeight = A4_HEIGHT * 0.8;

			if (img.width > targetWidth || img.height > targetHeight) {
				const scaleW = targetWidth / img.width;
				const scaleH = targetHeight / img.height;
				const fitScale = Math.min(scaleW, scaleH);
				img.scale = fitScale;
				img.scaleX = fitScale;
				img.scaleY = fitScale;
			} else {
				img.scale = 1;
				img.scaleX = 1;
				img.scaleY = 1;
			}

			const displayW = img.width * (img.scaleX || 1);
			const displayH = img.height * (img.scaleY || 1);

			img.x = (A4_WIDTH - displayW) / 2 + index * 20; 
			img.y = (A4_HEIGHT - displayH) / 2 + index * 20;
			img.zIndex = currentZ++;
		});
		pages[activePageIndex].images = [...currentImages, ...newImages];
	}

	function handleImageUpdate(updatedImage) {
		pages[activePageIndex].images = pages[activePageIndex].images.map((img) => (img.id === updatedImage.id ? updatedImage : img));
	}

	function handleImageDelete(id) {
		const image = pages[activePageIndex].images.find((img) => img.id === id);
		if (image && image.url.startsWith('blob:')) {
			URL.revokeObjectURL(image.url);
		}
		pages[activePageIndex].images = pages[activePageIndex].images.filter((img) => img.id !== id);
		if (selectedImageId === id) {
			selectedImageId = null;
		}
	}

	function handleImageSelect(id) {
		selectedImageId = id;
		const maxZ = Math.max(...pages[activePageIndex].images.map((img) => img.zIndex), 0);
		pages[activePageIndex].images = pages[activePageIndex].images.map((img) => (img.id === id ? { ...img, zIndex: maxZ + 1 } : img));
	}

	function clearAll() {
		if (confirm('Clear all images on this page?')) {
			pages[activePageIndex].images.forEach((img) => {
				if (img.url.startsWith('blob:')) {
					URL.revokeObjectURL(img.url);
				}
			});
			pages[activePageIndex].images = [];
			selectedImageId = null;
		}
	}

	function addPage() {
		const newPage = { id: crypto.randomUUID(), images: [] };
		// Splice adds at a specific index, shifting others forward
		pages.splice(activePageIndex + 1, 0, newPage);
		// Auto-navigate to the new blank page
		activePageIndex += 1;
		selectedImageId = null;
	}

	function deletePage() {
		if (pages.length === 1) {
			clearAll();
			return;
		}
		if (confirm('Delete this page?')) {
			pages[activePageIndex].images.forEach((img) => {
				if (img.url.startsWith('blob:')) {
					URL.revokeObjectURL(img.url);
				}
			});
			pages = pages.filter((_, i) => i !== activePageIndex);
			if (activePageIndex >= pages.length) {
				activePageIndex = pages.length - 1;
			}
			selectedImageId = null;
		}
	}

	function goToPage(index) {
		if (index >= 0 && index < pages.length) {
			activePageIndex = index;
			selectedImageId = null;
		}
	}

	function handlePageInput(e) {
		if (e.key === 'Enter') {
			let val = parseInt(e.target.value, 10);
			if (!isNaN(val) && val >= 1 && val <= pages.length) {
				goToPage(val - 1);
			} else {
				e.target.value = activePageIndex + 1;
			}
		}
	}

	// Zoom functions kept for potential keyboard shortcuts, but slider is primary control
	function zoomIn() {
		canvasScale = Math.min(2, canvasScale + 0.1);
	}

	function zoomOut() {
		canvasScale = Math.max(0.25, canvasScale - 0.1);
	}

	function resetZoom() {
		canvasScale = 1;
	}

	async function exportImage(format) {
		const hasImages = pages.some(p => p.images.length > 0);
		if (!canvasRef || !hasImages) {
			alert('Please add some images first!');
			return;
		}

		isExporting = true;
		try {
			let result;
			const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');

			switch (format) {
				case 'png':
					result = await exportAsPNG(pages, `image-arrangement-${timestamp}.png`);
					break;
				case 'jpg':
					result = await exportAsJPEG(pages, `image-arrangement-${timestamp}.jpg`);
					break;
				case 'pdf':
					result = await exportAsPDF(pages, `image-arrangement-${timestamp}.pdf`);
					break;
			}

			if (!result.success) {
				alert(`Export failed: ${result.error}`);
			}
		} catch (error) {
			// console.error('Export error:', error);
			alert('Export failed. Please try again.');
		} finally {
			isExporting = false;
		}
	}

	function handleCanvasClick(e) {
		// Only deselect if clicking directly on canvas background, not on images or controls
		if (
			e.target === canvasRef ||
			(e.target.classList.contains('canvas-area') &&
				!e.target.closest('.control-panel') &&
				!e.target.closest('img'))
		) {
			selectedImageId = null;
		}
	}

	const selectedImage = $derived(pages[activePageIndex]?.images.find((img) => img.id === selectedImageId));

	function handleCropRequest(image) {
		cropImageData = image;
		cropModalOpen = true;
	}

	function handleCropApply(croppedImage) {
		handleImageUpdate(croppedImage);
		cropModalOpen = false;
		cropImageData = null;
	}

	function handleCropClose() {
		cropModalOpen = false;
		cropImageData = null;
	}
</script>

<div
	class="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900"
>
	<!-- Animated Background -->
	<div class="pointer-events-none fixed inset-0 overflow-hidden">
		<div
			class="animate-blob absolute top-0 left-1/4 h-96 w-96 rounded-full bg-cyan-500/20 blur-3xl"
		></div>
		<div
			class="animate-blob animation-delay-2000 absolute top-1/4 right-1/4 h-96 w-96 rounded-full bg-purple-500/20 blur-3xl"
		></div>
		<div
			class="animate-blob animation-delay-4000 absolute bottom-0 left-1/2 h-96 w-96 rounded-full bg-pink-500/20 blur-3xl"
		></div>
	</div>

	<div class="relative z-10 min-h-screen">
		<!-- Minimal Header -->
		<header class="border-b border-white/10 bg-white/5 backdrop-blur-xl">
			<div class="mx-auto max-w-[1400px] px-6 py-4">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-3">
						<div
							class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-purple-500 shadow-lg shadow-cyan-500/50"
						>
							<Sparkles class="h-5 w-5 text-white" />
						</div>
						<div>
							<h1 class="text-xl font-light tracking-wide text-white/90">Image Arranger</h1>
							<p class="text-xs font-light text-white/50">A4 Canvas</p>
						</div>
					</div>

					<div class="flex items-center gap-3">
						<!-- Page Navigation -->
						<div class="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2 py-1.5 backdrop-blur-xl">
							<button
								onclick={() => goToPage(activePageIndex - 1)}
								disabled={activePageIndex === 0}
								class="rounded-lg p-1 text-white/70 transition-all hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
							>
								<ChevronLeft class="h-4 w-4" />
							</button>
							<div class="flex items-center gap-1 text-sm font-light text-white/80">
								<input
									type="text"
									value={activePageIndex + 1}
									onkeydown={handlePageInput}
									class="w-8 rounded bg-white/10 px-1 py-0.5 text-center text-white outline-none focus:ring-2 focus:ring-cyan-500/50"
								/>
								<span class="text-white/50">/ {pages.length}</span>
							</div>
							<button
								onclick={() => goToPage(activePageIndex + 1)}
								disabled={activePageIndex === pages.length - 1}
								class="rounded-lg p-1 text-white/70 transition-all hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
							>
								<ChevronRight class="h-4 w-4" />
							</button>
							<div class="ml-1 flex gap-1 border-l border-white/10 pl-2">
								<button
									onclick={addPage}
									title="Add Page"
									class="rounded-lg p-1 text-cyan-400 transition-all hover:bg-white/10 hover:text-cyan-300"
								>
									<Plus class="h-4 w-4" />
								</button>
								<button
									onclick={deletePage}
									title="Delete Page"
									class="flex items-center gap-1 rounded-lg p-1 text-red-400 transition-all hover:bg-white/10 hover:text-red-300"
								>
									<Trash2 class="h-4 w-4" />
									<span class="text-xs font-medium">Delete</span>
								</button>
							</div>
						</div>

						<!-- Zoom Slider -->
						<div
							class="flex min-w-[200px] items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-xl"
						>
							<ZoomOut class="h-4 w-4 flex-shrink-0 text-white/70" />
							<input
								type="range"
								min="25"
								max="200"
								value={canvasScale * 100}
								oninput={(e) => (canvasScale = parseFloat(e.target.value) / 100)}
								class="h-1.5 flex-1 cursor-pointer appearance-none rounded-lg bg-white/10 accent-cyan-500"
							/>
							<span class="min-w-[3.5rem] text-right text-sm font-light text-white/80">
								{Math.round(canvasScale * 100)}%
							</span>
							<ZoomIn class="h-4 w-4 flex-shrink-0 text-white/70" />
						</div>

						<!-- Export -->
						<div class="flex items-center gap-2">
							<button
								onclick={() => exportImage('png')}
								disabled={isExporting || pages.every(p => p.images.length === 0) || pages.length > 1}
								class="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2 text-sm font-light text-white shadow-lg shadow-cyan-500/30 transition-all duration-300 hover:from-cyan-400 hover:to-blue-400 hover:shadow-cyan-500/50 disabled:cursor-not-allowed disabled:opacity-30"
								title={pages.length > 1 ? "PNG export is only available for single-page documents" : ""}
							>
								PNG
							</button>
							<button
								onclick={() => exportImage('pdf')}
								disabled={isExporting || pages.every(p => p.images.length === 0)}
								class="rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2 text-sm font-light text-white shadow-lg shadow-purple-500/30 transition-all duration-300 hover:from-purple-400 hover:to-pink-400 hover:shadow-purple-500/50 disabled:cursor-not-allowed disabled:opacity-30"
							>
								PDF
							</button>
						</div>
					</div>
				</div>
			</div>
		</header>

		<div class="mx-auto max-w-[1400px] px-6 py-8">
			<div class="grid grid-cols-12 gap-6">
				<!-- Sidebar -->
				<aside class="col-span-3 space-y-4">
					<!-- Upload -->
					<div class="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
						<ImageUpload onImagesAdded={handleImagesAdded} />
					</div>

					<!-- Image List -->
					{#if pages[activePageIndex].images.length > 0}
						<div
							class="custom-scrollbar max-h-[600px] overflow-y-auto rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl"
						>
							<div class="mb-4 flex items-center justify-between">
								<h2 class="text-sm font-light tracking-wider text-white/70 uppercase">
									Images ({pages[activePageIndex].images.length})
								</h2>
								<button
									onclick={clearAll}
									class="rounded-lg p-1.5 text-white/50 transition-all duration-300 hover:bg-white/10 hover:text-white/80"
								>
									<Trash2 class="h-4 w-4" />
								</button>
							</div>
							<div class="space-y-2">
								{#each pages[activePageIndex].images as image (image.id)}
									<button
										onclick={() => handleImageSelect(image.id)}
										class="w-full rounded-xl p-3 text-left transition-all duration-300 {selectedImageId ===
										image.id
											? 'border border-cyan-400/50 bg-gradient-to-r from-cyan-500/20 to-purple-500/20'
											: 'border border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'}"
									>
										<div class="flex items-center gap-3">
											<div class="relative">
												<img
													src={image.url}
													alt="Thumbnail"
													class="h-12 w-12 rounded-lg object-cover"
												/>
												{#if selectedImageId === image.id}
													<div class="absolute inset-0 rounded-lg bg-cyan-400/20"></div>
												{/if}
											</div>
											<div class="min-w-0 flex-1">
												<p class="truncate text-xs font-light text-white/80">
													{image.file.name}
												</p>
												<p class="mt-0.5 text-xs text-white/50">
													{Math.round(image.width * image.scale)} × {Math.round(
														image.height * image.scale
													)}
												</p>
											</div>
										</div>
									</button>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Filters Panel -->
					{#if selectedImage}
						<div
							class="animate-slide-in rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl"
						>
							<ImageFilters image={selectedImage} onUpdate={handleImageUpdate} />
						</div>
					{/if}
				</aside>

				<!-- Canvas -->
				<main class="col-span-9">
					<Canvas
						bind:images={pages[activePageIndex].images}
						{canvasScale}
						bind:selectedImageId
						{isExporting}
						bind:canvasRef
						onCanvasClick={handleCanvasClick}
						onCropRequest={handleCropRequest}
					/>
				</main>
			</div>
		</div>
	</div>

	<!-- Crop Modal -->
	{#if cropModalOpen && cropImageData}
		<CropModal image={cropImageData} onClose={handleCropClose} onApply={handleCropApply} />
	{/if}
</div>

<style>
	@keyframes blob {
		0%,
		100% {
			transform: translate(0, 0) scale(1);
		}
		33% {
			transform: translate(30px, -50px) scale(1.1);
		}
		66% {
			transform: translate(-20px, 20px) scale(0.9);
		}
	}

	@keyframes slide-in {
		from {
			opacity: 0;
			transform: translateY(-10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.animate-blob {
		animation: blob 20s infinite;
	}

	.animate-slide-in {
		animation: slide-in 0.3s ease-out;
	}

	.animation-delay-2000 {
		animation-delay: 2s;
	}

	.animation-delay-4000 {
		animation-delay: 4s;
	}

	.custom-scrollbar::-webkit-scrollbar {
		width: 6px;
	}

	.custom-scrollbar::-webkit-scrollbar-track {
		background: rgba(255, 255, 255, 0.05);
		border-radius: 10px;
	}

	.custom-scrollbar::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.2);
		border-radius: 10px;
	}

	.custom-scrollbar::-webkit-scrollbar-thumb:hover {
		background: rgba(255, 255, 255, 0.3);
	}
</style>
