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
		Wand2,
		X,
		ChevronLeft,
		ChevronRight,
		Plus,
		Moon,
		Sun
	} from 'lucide-svelte';
	import ImageUpload from '$lib/components/ImageUpload.svelte';
	import ImageFilters from '$lib/components/ImageFilters.svelte';
	import ImageItem from '$lib/components/ImageItem.svelte';
	import BackgroundEngine from '$lib/components/BackgroundEngine.svelte';
	import CropModal from '$lib/components/CropModal.svelte';
	import Canvas from '$lib/components/Canvas.svelte';
	import { exportAsPNG, exportAsJPEG, exportAsPDF } from '$lib/utils/exportUtils.js';

	// A4 dimensions at 96 DPI: 210mm x 297mm = 794px x 1123px
	const A4_WIDTH = 794;
	const A4_HEIGHT = 1123;
	const A4_AREA = A4_WIDTH * A4_HEIGHT; // 891,962 px²

	let pages = $state([{ id: crypto.randomUUID(), images: [] }]);
	let activePageIndex = $state(0);

	let selectedImageId = $state(null);
	let canvasRef = $state(null);
	let canvasScale = $state(1);
	let isExporting = $state(false);
	let isArranging = $state(false);
	let allowRotation = $state(true);
	let arrangeError = $state(null);
	let cropModalOpen = $state(false);
	let cropImageData = $state(null);
	let activeTheme = $state('professional');
	let mounted = $state(false);

	onMount(() => {
		mounted = true;
	});

	// Reactive effect only runs in browser (after onMount sets `mounted = true`)
	$effect(() => {
		if (!mounted) return;
		if (activeTheme === 'ultimate') {
			document.documentElement.classList.add('theme-ultimate');
		} else {
			document.documentElement.classList.remove('theme-ultimate');
		}
	});

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
		pages[activePageIndex].images = pages[activePageIndex].images.map((img) =>
			img.id === updatedImage.id ? updatedImage : img
		);
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
		pages[activePageIndex].images = pages[activePageIndex].images.map((img) =>
			img.id === id ? { ...img, zIndex: maxZ + 1 } : img
		);
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
		const hasImages = pages.some((p) => p.images.length > 0);
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

	const selectedImage = $derived(
		pages[activePageIndex]?.images.find((img) => img.id === selectedImageId)
	);

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

	/**
	 * Auto-Arrange: sends current page image dimensions to the Python solver
	 * at POST /api/arrange, then applies the returned x/y coordinates back
	 * into the images array using immutable-style spread updates.
	 */
	async function autoArrange() {
		const currentImages = pages[activePageIndex].images;
		if (currentImages.length < 2) {
			arrangeError = 'Add at least 2 images to auto-arrange.';
			setTimeout(() => (arrangeError = null), 3000);
			return;
		}

		// Pre-check: total image area must not exceed canvas area
		const totalArea = currentImages.reduce((sum, img) => {
			const w = Math.max(1, Math.round((img.width || 100) * (img.scaleX || img.scale || 1)));
			const h = Math.max(1, Math.round((img.height || 100) * (img.scaleY || img.scale || 1)));
			return sum + w * h;
		}, 0);
		if (totalArea > A4_AREA) {
			arrangeError = `Images are too large to fit the canvas (${Math.round(totalArea / 1000)}k px² vs ${Math.round(A4_AREA / 1000)}k px² canvas). Scale them down first.`;
			setTimeout(() => (arrangeError = null), 5000);
			return;
		}

		// Reset zoom to 100% for a clean arrangement view
		canvasScale = 1;

		isArranging = true;
		arrangeError = null;

		// Build payload: use displayed (scaled) dimensions so the solver
		// works in the same pixel space as the A4 canvas.
		// Guard every value: NaN/null/0 all cause a FastAPI 422.
		const images = currentImages
			.map((img) => ({
				id: String(img.id),
				width: Math.max(1, Math.round((img.width || 100) * (img.scaleX || img.scale || 1))),
				height: Math.max(1, Math.round((img.height || 100) * (img.scaleY || img.scale || 1)))
			}))
			.filter((img) => img.width > 0 && img.height > 0 && img.id);

		if (images.length < 2) {
			arrangeError = 'Not enough valid images to arrange.';
			isArranging = false;
			setTimeout(() => (arrangeError = null), 3000);
			return;
		}

		const payload = {
			canvas: { width: A4_WIDTH, height: A4_HEIGHT },
			images,
			allow_rotation: allowRotation
		};
		console.log('[Auto-Arrange] payload →', JSON.stringify(payload));

		try {
			const res = await fetch('/api/arrange', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});

			if (!res.ok) {
				let errorMessage = `Server error ${res.status}`;
				try {
					const errorData = await res.json();
					if (errorData.detail) errorMessage = errorData.detail;
				} catch (e) {
					// Fallback if not JSON
				}
				throw new Error(errorMessage);
			}

			const data = await res.json();

			if (data.status === 'INFEASIBLE') {
				arrangeError = 'Images are too large to fit on the canvas. Try scaling them down first.';
				isArranging = false;
				return;
			}

			// Add a slight delay so the user feels the "calculation" and sees the canvas shrink
			await new Promise((resolve) => setTimeout(resolve, 600));

			const posMap = Object.fromEntries(data.layout.map((p) => [p.id, p]));
			pages[activePageIndex].images = currentImages.map((img) => {
				const pos = posMap[img.id];
				if (!pos) return img;

				let newX = pos.x;
				let newY = pos.y;

				// The OR-Tools solver returns the VISUAL top-left coordinate.
				// If the solver rotated the image, CSS will rotate it from the center.
				// We must offset the CSS left/top so the visual bounding box matches the solver's placement.
				if (pos.rotation === 90) {
					const displayW = Math.max(
						1,
						Math.round((img.width || 100) * (img.scaleX || img.scale || 1))
					);
					const displayH = Math.max(
						1,
						Math.round((img.height || 100) * (img.scaleY || img.scale || 1))
					);
					newX = pos.x + (displayH - displayW) / 2;
					newY = pos.y + (displayW - displayH) / 2;
				}

				return { ...img, x: newX, y: newY, rotation: pos.rotation || 0 };
			});
		} catch (err) {
			arrangeError = err.message ?? 'Auto-arrange failed. Is the solver running?';
		} finally {
			isArranging = false;
			if (arrangeError) setTimeout(() => (arrangeError = null), 4000);
		}
	}
</script>

<div
	class="relative min-h-screen overflow-hidden"
	style="background: linear-gradient(135deg, var(--app-bg-from), var(--app-bg-via) 50%, var(--app-bg-to));"
>
	<!-- Theme-aware animated background blobs -->
	<BackgroundEngine theme={activeTheme} />

	<div class="relative z-10 min-h-screen">
		<!-- Minimal Header -->
		<header
			class="relative z-50 backdrop-blur-xl"
			style="border-bottom: 1px solid var(--header-border); background: var(--header-bg);"
		>
			<div class="mx-auto max-w-[1400px] px-6 py-4">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-3">
						<div
							class="flex h-10 w-10 items-center justify-center rounded-xl shadow-lg"
							style="background: linear-gradient(135deg, #C5F40E, #00E5CC); box-shadow: 0 0 16px rgba(197,244,14,0.4);"
						>
							<Sparkles class="h-5 w-5 text-black" />
						</div>
						<div>
							<h1 class="text-xl font-light tracking-wide" style="color: var(--text-main);">
								PixelPacker Pro
							</h1>
							<p class="text-xs font-light" style="color: var(--text-muted);">A4 Canvas</p>
						</div>
					</div>

					<div class="flex items-center gap-3">
						<button
							onclick={() =>
								(activeTheme = activeTheme === 'professional' ? 'ultimate' : 'professional')}
							class="flex h-10 w-10 items-center justify-center rounded-xl backdrop-blur-xl transition-all"
							style="border: 1px solid var(--panel-border); background: var(--panel-bg);"
							title={activeTheme === 'professional'
								? 'Switch to Dark Mode'
								: 'Switch to Light Mode'}
						>
							{#if activeTheme === 'professional'}
								<Moon class="h-4 w-4" style="color: var(--accent);" />
							{:else}
								<Sun class="h-4 w-4" style="color: #C5F40E" />
							{/if}
						</button>
						<div class="mx-1 h-6 w-px" style="background: var(--divider);"></div>

						<!-- Page Navigation -->
						<div
							class="flex items-center gap-2 rounded-xl px-2 py-1.5 backdrop-blur-xl"
							style="border: 1px solid var(--panel-border); background: var(--panel-bg);"
						>
							<button
								onclick={() => goToPage(activePageIndex - 1)}
								disabled={activePageIndex === 0}
								class="rounded-lg p-1 transition-all disabled:opacity-30"
								style="color: var(--text-dim);"
							>
								<ChevronLeft class="h-4 w-4" />
							</button>
							<div
								class="flex items-center gap-1 text-sm font-light"
								style="color: var(--text-sub);"
							>
								<input
									type="text"
									value={activePageIndex + 1}
									onkeydown={handlePageInput}
									class="w-8 rounded px-1 py-0.5 text-center outline-none"
									style="background: var(--tile-bg); color: var(--text-main); border: 1px solid var(--tile-border);"
								/>
								<span style="color: var(--text-muted);">/ {pages.length}</span>
							</div>
							<button
								onclick={() => goToPage(activePageIndex + 1)}
								disabled={activePageIndex === pages.length - 1}
								class="rounded-lg p-1 transition-all disabled:opacity-30"
								style="color: var(--text-dim);"
							>
								<ChevronRight class="h-4 w-4" />
							</button>
							<div class="ml-1 flex gap-1 pl-2" style="border-left: 1px solid var(--divider);">
								<button
									onclick={addPage}
									title="Add Page"
									class="rounded-lg p-1 transition-all"
									style="color: var(--accent);"
								>
									<Plus class="h-4 w-4" />
								</button>
								<button
									onclick={deletePage}
									title="Delete Page"
									class="flex items-center gap-1 rounded-lg p-1 text-red-500 transition-all"
								>
									<Trash2 class="h-4 w-4" />
									<span class="text-xs font-medium">Delete</span>
								</button>
							</div>
						</div>

						<!-- Zoom Slider -->
						<div
							class="flex min-w-[200px] items-center gap-3 rounded-xl px-4 py-2 backdrop-blur-xl"
							style="border: 1px solid var(--panel-border); background: var(--panel-bg);"
						>
							<ZoomOut class="h-4 w-4 flex-shrink-0" style="color: var(--text-muted);" />
							<input
								type="range"
								min="25"
								max="200"
								value={canvasScale * 100}
								oninput={(e) => (canvasScale = parseFloat(e.target.value) / 100)}
								class="h-1.5 flex-1 cursor-pointer appearance-none rounded-lg"
								style="background: var(--slider-track); accent-color: var(--accent);"
							/>
							<span
								class="min-w-[3.5rem] text-right text-sm font-medium"
								style="color: var(--text-sub);"
							>
								{Math.round(canvasScale * 100)}%
							</span>
							<ZoomIn class="h-4 w-4 flex-shrink-0" style="color: var(--text-muted);" />
						</div>

						<!-- Auto-Arrange Tools -->
						<div
							class="flex items-center gap-4 rounded-xl px-2 py-1 backdrop-blur-xl"
							style="border: 1px solid var(--panel-border); background: var(--panel-bg);"
						>
							<label
								class="flex cursor-pointer items-center gap-2 px-2 text-sm font-medium"
								style="color: var(--text-sub);"
							>
								<input
									type="checkbox"
									bind:checked={allowRotation}
									class="h-4 w-4 rounded focus:ring-offset-0"
									style="accent-color: var(--accent);"
								/>
								Allow Rotation
							</label>
							<div class="h-6 w-px" style="background: var(--divider);"></div>
							<div class="relative py-1 pr-1">
								<button
									onclick={autoArrange}
									disabled={isArranging || pages[activePageIndex].images.length < 2}
									title="Auto-arrange all images on this page"
									class="flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-semibold text-black shadow-lg transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-30"
									style="background: linear-gradient(135deg, #C5F40E, #00E5CC); box-shadow: 0 0 16px rgba(197,244,14,0.35);"
								>
									{#if isArranging}
										<span class="auto-arrange-spinner"></span>
									{:else}
										<Wand2 class="h-4 w-4" />
									{/if}
									Auto-Arrange
								</button>
								{#if arrangeError}
									<div
										class="absolute top-full right-0 z-50 mt-2 w-72 rounded-xl border border-red-400/30 bg-red-500/90 px-4 py-3 text-sm text-white shadow-xl backdrop-blur-xl"
									>
										{arrangeError}
									</div>
								{/if}
							</div>
						</div>

						<!-- Export -->
						<div class="flex items-center gap-2">
							<button
								onclick={() => exportImage('png')}
								disabled={isExporting ||
									pages.every((p) => p.images.length === 0) ||
									pages.length > 1}
								class="rounded-xl px-4 py-2 text-sm font-semibold text-black shadow-lg transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-30"
								style="background: linear-gradient(135deg, #C5F40E, #00E5CC); box-shadow: 0 0 14px rgba(197,244,14,0.3);"
								title={pages.length > 1
									? 'PNG export is only available for single-page documents'
									: ''}
							>
								PNG
							</button>
							<button
								onclick={() => exportImage('pdf')}
								disabled={isExporting || pages.every((p) => p.images.length === 0)}
								class="rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-lg transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-30"
								style="background: linear-gradient(135deg, #FF2D78, #FF6B35); box-shadow: 0 0 14px rgba(255,45,120,0.3);"
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
					<div
						class="rounded-2xl p-4 backdrop-blur-xl"
						style="border: 1px solid var(--panel-border); background: var(--panel-bg);"
					>
						<ImageUpload onImagesAdded={handleImagesAdded} />
					</div>

					<!-- Image List -->
					{#if pages[activePageIndex].images.length > 0}
						<div
							class="custom-scrollbar max-h-[600px] overflow-y-auto rounded-2xl p-4 backdrop-blur-xl"
							style="border: 1px solid var(--panel-border); background: var(--panel-bg);"
						>
							<div class="mb-4 flex items-center justify-between">
								<h2
									class="text-xs font-semibold tracking-wider uppercase"
									style="color: var(--text-dim);"
								>
									Images ({pages[activePageIndex].images.length})
								</h2>
								<button
									onclick={clearAll}
									class="rounded-lg p-1.5 transition-all duration-300"
									style="color: var(--text-muted);"
								>
									<Trash2 class="h-4 w-4" />
								</button>
							</div>
							<div class="space-y-2">
								{#each pages[activePageIndex].images as image (image.id)}
									<button
										onclick={() => handleImageSelect(image.id)}
										class="w-full rounded-xl p-3 text-left transition-all duration-300"
										style={selectedImageId === image.id
											? 'border: 1.5px solid var(--accent); background: var(--accent-soft); box-shadow: var(--glow-shadow);'
											: 'border: 1px solid var(--tile-border); background: var(--tile-bg);'}
									>
										<div class="flex items-center gap-3">
											<div class="relative">
												<img
													src={image.url}
													alt="Thumbnail"
													class="h-12 w-12 rounded-lg object-cover"
												/>
											</div>
											<div class="min-w-0 flex-1">
												<p class="truncate text-xs font-medium" style="color: var(--text-sub);">
													{image.file.name}
												</p>
												<p class="mt-0.5 text-xs" style="color: var(--text-muted);">
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
							class="animate-slide-in rounded-2xl p-4 backdrop-blur-xl"
							style="border: 1px solid var(--panel-border); background: var(--panel-bg);"
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

	.animate-slide-in {
		animation: slide-in 0.3s ease-out;
	}

	.custom-scrollbar::-webkit-scrollbar {
		width: 6px;
	}

	.custom-scrollbar::-webkit-scrollbar-track {
		background: var(--scrollbar-track);
		border-radius: 10px;
	}

	.custom-scrollbar::-webkit-scrollbar-thumb {
		background: var(--scrollbar-thumb);
		border-radius: 10px;
	}

	.custom-scrollbar::-webkit-scrollbar-thumb:hover {
		background: var(--scrollbar-hover);
	}

	/* Auto-arrange button loading spinner */
	.auto-arrange-spinner {
		display: inline-block;
		width: 1rem;
		height: 1rem;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-top-color: white;
		border-radius: 50%;
		animation: spin 0.7s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
