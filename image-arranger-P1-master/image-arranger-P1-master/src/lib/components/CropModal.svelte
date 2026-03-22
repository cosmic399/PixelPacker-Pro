<script>
	import { X, ZoomIn, ZoomOut, Check, RotateCw } from 'lucide-svelte';
	import { cropImage } from '../utils/imageUtils.js';

	let { image, onClose = () => {}, onApply = () => {} } = $props();

	let imageZoom = $state(1);
	let imagePan = $state({ x: 0, y: 0 });
	let isPanning = $state(false);
	let panStart = $state({ x: 0, y: 0 });
	let cropBox = $state({ x: 0, y: 0, width: 0, height: 0 });
	let isDraggingCrop = $state(false);
	let isResizingCrop = $state(false);
	let cropResizeHandle = $state(null);
	let cropDragStart = $state({ x: 0, y: 0 });
	let cropResizeStart = $state({ x: 0, y: 0, width: 0, height: 0 });
	let aspectRatio = $state(null); // null = free, or ratio like 1, 4/3, 16/9
	let containerRef = $state(null);
	let imageRef = $state(null);

	// Initialize crop box to cover most of the image
	$effect(() => {
		if (image && containerRef && imageRef) {
			// Wait for image to load
			const img = new Image();
			img.onload = () => {
				const containerRect = containerRef.getBoundingClientRect();
				// Use 80% of container or image, whichever is smaller
				const maxSize = Math.min(containerRect.width * 0.8, containerRect.height * 0.8);
				const size = Math.min(maxSize, Math.min(img.width, img.height) * 0.8);
				cropBox = {
					x: (containerRect.width - size) / 2,
					y: (containerRect.height - size) / 2,
					width: size,
					height: size
				};
			};
			img.src = image.originalUrl || image.url;
		}
	});

	function handleWheel(e) {
		e.preventDefault();
		const delta = e.deltaY > 0 ? 0.9 : 1.1;
		const newZoom = Math.max(0.5, Math.min(5, imageZoom * delta));
		
		// Zoom towards mouse position
		const rect = containerRef.getBoundingClientRect();
		const mouseX = e.clientX - rect.left;
		const mouseY = e.clientY - rect.top;
		
		const zoomChange = newZoom / imageZoom;
		imagePan = {
			x: mouseX - (mouseX - imagePan.x) * zoomChange,
			y: mouseY - (mouseY - imagePan.y) * zoomChange
		};
		
		imageZoom = newZoom;
	}

	function handleImageMouseDown(e) {
		if (e.target === imageRef || e.target.closest('.crop-image-container')) {
			isPanning = true;
			panStart = {
				x: e.clientX - imagePan.x,
				y: e.clientY - imagePan.y
			};
		}
	}

	function handleImageMouseMove(e) {
		if (isPanning) {
			imagePan = {
				x: e.clientX - panStart.x,
				y: e.clientY - panStart.y
			};
		}
	}

	function handleImageMouseUp() {
		isPanning = false;
	}

	function handleCropBoxMouseDown(e) {
		if (e.target.closest('.crop-handle')) {
			isResizingCrop = true;
			cropResizeHandle = e.target.closest('.crop-handle').dataset.handle;
			const rect = containerRef.getBoundingClientRect();
			cropResizeStart = {
				x: e.clientX - rect.left,
				y: e.clientY - rect.top,
				width: cropBox.width,
				height: cropBox.height,
				cropX: cropBox.x,
				cropY: cropBox.y
			};
		} else {
			isDraggingCrop = true;
			const rect = containerRef.getBoundingClientRect();
			cropDragStart = {
				x: e.clientX - rect.left - cropBox.x,
				y: e.clientY - rect.top - cropBox.y
			};
		}
		e.stopPropagation();
	}

	function handleCropBoxMouseMove(e) {
		if (isDraggingCrop) {
			const rect = containerRef.getBoundingClientRect();
			const newX = e.clientX - rect.left - cropDragStart.x;
			const newY = e.clientY - rect.top - cropDragStart.y;
			
			// Constrain to container bounds
			cropBox = {
				...cropBox,
				x: Math.max(0, Math.min(rect.width - cropBox.width, newX)),
				y: Math.max(0, Math.min(rect.height - cropBox.height, newY))
			};
		} else if (isResizingCrop) {
			const rect = containerRef.getBoundingClientRect();
			const deltaX = (e.clientX - rect.left) - cropResizeStart.x;
			const deltaY = (e.clientY - rect.top) - cropResizeStart.y;
			
			let newWidth = cropResizeStart.width;
			let newHeight = cropResizeStart.height;
			let newX = cropResizeStart.cropX;
			let newY = cropResizeStart.cropY;
			
			const ratio = aspectRatio || (cropResizeStart.width / cropResizeStart.height);
			
			switch (cropResizeHandle) {
				case 'se':
					newWidth = Math.max(50, cropResizeStart.width + deltaX);
					newHeight = aspectRatio ? newWidth / ratio : cropResizeStart.height + deltaY;
					if (aspectRatio) newHeight = newWidth / ratio;
					break;
				case 'sw':
					newWidth = Math.max(50, cropResizeStart.width - deltaX);
					newHeight = aspectRatio ? newWidth / ratio : cropResizeStart.height + deltaY;
					if (aspectRatio) newHeight = newWidth / ratio;
					newX = cropResizeStart.cropX + cropResizeStart.width - newWidth;
					break;
				case 'ne':
					newWidth = Math.max(50, cropResizeStart.width + deltaX);
					newHeight = aspectRatio ? newWidth / ratio : cropResizeStart.height - deltaY;
					if (aspectRatio) newHeight = newWidth / ratio;
					newY = cropResizeStart.cropY + cropResizeStart.height - newHeight;
					break;
				case 'nw':
					newWidth = Math.max(50, cropResizeStart.width - deltaX);
					newHeight = aspectRatio ? newWidth / ratio : cropResizeStart.height - deltaY;
					if (aspectRatio) newHeight = newWidth / ratio;
					newX = cropResizeStart.cropX + cropResizeStart.width - newWidth;
					newY = cropResizeStart.cropY + cropResizeStart.height - newHeight;
					break;
			}
			
			// Constrain to container
			const rectBounds = containerRef.getBoundingClientRect();
			if (newX < 0) {
				newWidth += newX;
				newX = 0;
				if (aspectRatio) newHeight = newWidth / ratio;
			}
			if (newY < 0) {
				newHeight += newY;
				newY = 0;
				if (aspectRatio) newWidth = newHeight * ratio;
			}
			if (newX + newWidth > rectBounds.width) {
				newWidth = rectBounds.width - newX;
				if (aspectRatio) newHeight = newWidth / ratio;
			}
			if (newY + newHeight > rectBounds.height) {
				newHeight = rectBounds.height - newY;
				if (aspectRatio) newWidth = newHeight * ratio;
			}
			
			cropBox = {
				x: Math.max(0, newX),
				y: Math.max(0, newY),
				width: Math.max(50, newWidth),
				height: Math.max(50, newHeight)
			};
		}
	}

	function handleCropBoxMouseUp() {
		isDraggingCrop = false;
		isResizingCrop = false;
		cropResizeHandle = null;
	}

	function zoomIn() {
		imageZoom = Math.min(5, imageZoom + 0.2);
	}

	function zoomOut() {
		imageZoom = Math.max(0.5, imageZoom - 0.2);
	}

	function setAspectRatio(ratio) {
		aspectRatio = ratio;
		if (ratio) {
			// Adjust crop box to maintain aspect ratio
			const currentRatio = cropBox.width / cropBox.height;
			if (currentRatio > ratio) {
				cropBox.height = cropBox.width / ratio;
			} else {
				cropBox.width = cropBox.height * ratio;
			}
		}
	}

	async function applyCrop() {
		try {
			// Load original image to get dimensions
			const img = new Image();
			img.src = image.originalUrl || image.url;
			await new Promise((resolve, reject) => {
				img.onload = resolve;
				img.onerror = reject;
			});
			
			const containerRect = containerRef.getBoundingClientRect();
			const imageRect = imageRef.getBoundingClientRect();
			
			// Container center
			const containerCenterX = containerRect.width / 2;
			const containerCenterY = containerRect.height / 2;
			
			// Image center in container (accounting for pan)
			const imageCenterX = containerCenterX + imagePan.x;
			const imageCenterY = containerCenterY + imagePan.y;
			
			// Crop box center relative to container
			const cropBoxCenterX = cropBox.x + cropBox.width / 2;
			const cropBoxCenterY = cropBox.y + cropBox.height / 2;
			
			// Calculate crop box position relative to image center (in container coordinates)
			const relativeX = (cropBoxCenterX - imageCenterX) / imageZoom;
			const relativeY = (cropBoxCenterY - imageCenterY) / imageZoom;
			
			// Image display dimensions (at current zoom)
			const imageDisplayWidth = imageRect.width;
			const imageDisplayHeight = imageRect.height;
			
			// Crop box dimensions in image coordinates
			const cropWidth = cropBox.width / imageZoom;
			const cropHeight = cropBox.height / imageZoom;
			
			// Crop box top-left in image coordinates (relative to image center)
			const cropX = (imageDisplayWidth / 2) + relativeX - (cropWidth / 2);
			const cropY = (imageDisplayHeight / 2) + relativeY - (cropHeight / 2);
			
			// Convert to original image pixel coordinates
			const scaleX = img.width / imageDisplayWidth;
			const scaleY = img.height / imageDisplayHeight;
			
			const finalCropX = Math.max(0, Math.min(img.width - 1, cropX * scaleX));
			const finalCropY = Math.max(0, Math.min(img.height - 1, cropY * scaleY));
			const finalCropWidth = Math.max(1, Math.min(img.width - finalCropX, cropWidth * scaleX));
			const finalCropHeight = Math.max(1, Math.min(img.height - finalCropY, cropHeight * scaleY));
			
			const croppedUrl = await cropImage(
				image.originalUrl || image.url,
				finalCropX,
				finalCropY,
				finalCropWidth,
				finalCropHeight
			);
			
			// Create new image to get dimensions
			const newImg = new Image();
			newImg.onload = () => {
				onApply({
					...image,
					url: croppedUrl,
					originalUrl: croppedUrl,
					width: newImg.width,
					height: newImg.height,
					scale: 1
				});
				onClose();
			};
			newImg.src = croppedUrl;
		} catch (error) {
			console.error('Crop error:', error);
			alert('Failed to crop image. Please try again.');
		}
	}

	$effect(() => {
		if (isPanning || isDraggingCrop || isResizingCrop) {
			window.addEventListener('mousemove', isPanning ? handleImageMouseMove : handleCropBoxMouseMove);
			window.addEventListener('mouseup', isPanning ? handleImageMouseUp : handleCropBoxMouseUp);
			return () => {
				window.removeEventListener('mousemove', handleImageMouseMove);
				window.removeEventListener('mousemove', handleCropBoxMouseMove);
				window.removeEventListener('mouseup', handleImageMouseUp);
				window.removeEventListener('mouseup', handleCropBoxMouseUp);
			};
		}
	});

	function handleBackdropClick(e) {
		if (e.target === e.currentTarget) {
			onClose();
		}
	}
</script>

<div
	class="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center"
	onclick={handleBackdropClick}
	onkeydown={(e) => e.key === 'Escape' && onClose()}
	role="dialog"
	aria-modal="true"
	tabindex="-1"
>
	<div class="relative w-full h-full flex flex-col">
		<!-- Header -->
		<div class="flex items-center justify-between p-4 bg-black/50 backdrop-blur-xl border-b border-white/10">
			<div class="flex items-center gap-4">
				<h2 class="text-lg font-light text-white">Crop Image</h2>
				<!-- Aspect Ratio Options -->
				<div class="flex items-center gap-2">
					<button
						onclick={() => setAspectRatio(null)}
						class="px-3 py-1 text-xs rounded-lg transition-colors {aspectRatio === null
							? 'bg-cyan-500 text-white'
							: 'bg-white/10 text-white/70 hover:bg-white/20'}"
					>
						Free
					</button>
					<button
						onclick={() => setAspectRatio(1)}
						class="px-3 py-1 text-xs rounded-lg transition-colors {aspectRatio === 1
							? 'bg-cyan-500 text-white'
							: 'bg-white/10 text-white/70 hover:bg-white/20'}"
					>
						1:1
					</button>
					<button
						onclick={() => setAspectRatio(4 / 3)}
						class="px-3 py-1 text-xs rounded-lg transition-colors {aspectRatio === 4 / 3
							? 'bg-cyan-500 text-white'
							: 'bg-white/10 text-white/70 hover:bg-white/20'}"
					>
						4:3
					</button>
					<button
						onclick={() => setAspectRatio(16 / 9)}
						class="px-3 py-1 text-xs rounded-lg transition-colors {aspectRatio === 16 / 9
							? 'bg-cyan-500 text-white'
							: 'bg-white/10 text-white/70 hover:bg-white/20'}"
					>
						16:9
					</button>
				</div>
			</div>
			<div class="flex items-center gap-2">
				<!-- Zoom Controls -->
				<div class="flex items-center gap-1 bg-white/10 rounded-lg p-1">
					<button
						onclick={zoomOut}
						class="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors"
					>
						<ZoomOut class="w-4 h-4" />
					</button>
					<span class="px-2 text-xs text-white/70">{Math.round(imageZoom * 100)}%</span>
					<button
						onclick={zoomIn}
						class="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors"
					>
						<ZoomIn class="w-4 h-4" />
					</button>
				</div>
				<button
					onclick={onClose}
					class="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
				>
					<X class="w-5 h-5" />
				</button>
			</div>
		</div>

		<!-- Image Container -->
		<div
			bind:this={containerRef}
			class="flex-1 relative overflow-hidden bg-black/30"
			onwheel={handleWheel}
		>
			<!-- Image with zoom/pan -->
			<div
				class="crop-image-container absolute inset-0 cursor-move"
				onmousedown={handleImageMouseDown}
				role="button"
				tabindex="0"
				style="transform: translate({imagePan.x}px, {imagePan.y}px) scale({imageZoom}); transform-origin: center center;"
			>
				<img
					bind:this={imageRef}
					src={image.originalUrl || image.url}
					alt=""
					class="max-w-none h-full w-auto mx-auto"
					draggable="false"
				/>
			</div>

			<!-- Dark overlay outside crop box -->
			<svg class="absolute inset-0 pointer-events-none">
				<defs>
					<mask id="crop-mask">
						<rect width="100%" height="100%" fill="black" />
						<rect
							x={cropBox.x}
							y={cropBox.y}
							width={cropBox.width}
							height={cropBox.height}
							fill="white"
						/>
					</mask>
				</defs>
				<rect width="100%" height="100%" fill="black" opacity="0.5" mask="url(#crop-mask)" />
			</svg>

			<!-- Crop Box -->
			<div
				class="absolute border-2 border-cyan-400 cursor-move"
				style="left: {cropBox.x}px; top: {cropBox.y}px; width: {cropBox.width}px; height: {cropBox.height}px;"
				onmousedown={handleCropBoxMouseDown}
				role="button"
				tabindex="0"
			>
				<!-- Grid lines -->
				<div class="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
					{#each Array(2) as _, i}
						<div
							class="border-r border-cyan-400/30"
							style="grid-column: {i + 1}; grid-row: 1 / 4;"
						></div>
					{/each}
					{#each Array(2) as _, i}
						<div
							class="border-b border-cyan-400/30"
							style="grid-row: {i + 1}; grid-column: 1 / 4;"
						></div>
					{/each}
				</div>

				<!-- Resize Handles -->
				<div
					class="crop-handle absolute -top-1 -left-1 w-4 h-4 bg-cyan-400 rounded-full border-2 border-white cursor-nwse-resize"
					data-handle="nw"
				></div>
				<div
					class="crop-handle absolute -top-1 -right-1 w-4 h-4 bg-cyan-400 rounded-full border-2 border-white cursor-nesw-resize"
					data-handle="ne"
				></div>
				<div
					class="crop-handle absolute -bottom-1 -left-1 w-4 h-4 bg-cyan-400 rounded-full border-2 border-white cursor-nesw-resize"
					data-handle="sw"
				></div>
				<div
					class="crop-handle absolute -bottom-1 -right-1 w-4 h-4 bg-cyan-400 rounded-full border-2 border-white cursor-nwse-resize"
					data-handle="se"
				></div>
			</div>
		</div>

		<!-- Footer Controls -->
		<div class="flex items-center justify-between p-4 bg-black/50 backdrop-blur-xl border-t border-white/10">
			<div class="text-sm text-white/60 font-light">
				Use mouse wheel to zoom • Drag image to pan • Drag crop box to adjust
			</div>
			<div class="flex items-center gap-3">
				<button
					onclick={onClose}
					class="px-6 py-2 bg-white/10 text-white/80 rounded-xl hover:bg-white/20 transition-colors font-light"
				>
					Cancel
				</button>
				<button
					onclick={applyCrop}
					class="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl hover:from-cyan-400 hover:to-blue-400 transition-all duration-300 shadow-lg shadow-cyan-500/30 font-light flex items-center gap-2"
				>
					<Check class="w-4 h-4" />
					Apply Crop
				</button>
			</div>
		</div>
	</div>
</div>

<style>
	.crop-image-container {
		user-select: none;
		-webkit-user-select: none;
	}
</style>

