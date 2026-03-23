<script>
	import { X, RotateCw, Crop, Trash2, Type } from 'lucide-svelte';
	import { applyFilters } from '../utils/imageUtils.js';

	let {
		image,
		onUpdate = () => {},
		onDelete = () => {},
		onSelect = () => {},
		onCropRequest = () => {},
		isSelected = false
	} = $props();

	let isDragging = $state(false);
	let isResizing = $state(false);
	let resizeHandle = $state(null);
	let dragStart = $state({ x: 0, y: 0 });
	let resizeStart = $state({ x: 0, y: 0, width: 0, height: 0, aspectRatio: 1 });

	let isTextResizing = $state(false);
	let textResizeHandle = $state(null); // 'inner', 'outerTop', 'outerBottom'
	let textResizeStart = $state({ mouseY: 0, baseFontSize: 20 });

	// Virtual Proxy State (Unbounded)
	// We init with image.x/y which might be bounded, but track moves virtually
	let virtualX = $state(image.x);
	let virtualY = $state(image.y);

	// Sync local virual state with updates if external change happens (rare in single user)
	// But crucial if we just loaded or props changed
	$effect(() => {
		if (!isDragging) {
			virtualX = image.x;
			virtualY = image.y;
		}
	});

	let textAreaRef = $state(null);
	let topTextAreaRef = $state(null);
	let bottomTextAreaRef = $state(null);

	// Auto-resize inner textarea
	$effect(() => {
		if (textAreaRef && image.hasText) {
			// Update height based on scroll height
			textAreaRef.style.height = 'auto';
			textAreaRef.style.height = textAreaRef.scrollHeight + 'px';
		}
	});

	// Auto-resize top textarea
	$effect(() => {
		if (topTextAreaRef && image.hasOuterTop) {
			topTextAreaRef.style.height = 'auto';
			topTextAreaRef.style.height = topTextAreaRef.scrollHeight + 'px';
		}
	});

	// Auto-resize bottom textarea
	$effect(() => {
		if (bottomTextAreaRef && image.hasOuterBottom) {
			bottomTextAreaRef.style.height = 'auto';
			bottomTextAreaRef.style.height = bottomTextAreaRef.scrollHeight + 'px';
		}
	});

	// Context-Aware UI
	const isControlsContrastNeeded = $derived(image.y < 50);

	let animationFrameId = null;
	let currentMousePos = { x: 0, y: 0 };
	let startMousePos = { x: 0, y: 0 };
	let currentShiftKey = $state(false);
	let isDirty = false;
	let isRotating = $state(false);
	let hasMoved = false;

	function getCanvasScale(element) {
		const canvas = element.closest('.canvas-area');
		if (!canvas) return 1;
		const style = window.getComputedStyle(canvas);
		const matrix = new WebKitCSSMatrix(style.transform);
		return matrix.a || 1;
	}

	function getCanvasRect(element) {
		const canvas = element.closest('.canvas-area');
		return canvas ? canvas.getBoundingClientRect() : { left: 0, top: 0 };
	}

	function handlePointerDown(e) {
		// CRITICAL: Capture on the wrapper to track mouse even off-screen
		e.currentTarget.setPointerCapture(e.pointerId);

		const canvas = e.target.closest('.canvas-area');
		const scale = getCanvasScale(e.target);
		const rect = getCanvasRect(e.target);

		startMousePos = { x: e.clientX, y: e.clientY };
		hasMoved = false;

		const mouseX = (e.clientX - rect.left) / scale;
		const mouseY = (e.clientY - rect.top) / scale;

		if (e.target.closest('.rotation-handle')) {
			isRotating = true;
			resizeStart = {
				centerX: image.x + (image.width * (image.scaleX || image.scale)) / 2,
				centerY: image.y + (image.height * (image.scaleY || image.scale)) / 2
			};
		} else if (e.target.closest('.resize-handle')) {
			isResizing = true;
			const handle = e.target.closest('.resize-handle');
			resizeHandle = handle.dataset.handle;

			const currentScaleX = image.scaleX || image.scale || 1;
			const currentScaleY = image.scaleY || image.scale || 1;
			const currentWidth = image.width * currentScaleX;
			const currentHeight = image.height * currentScaleY;

			resizeStart = {
				mouseX: mouseX,
				mouseY: mouseY,
				width: currentWidth,
				height: currentHeight,
				aspectRatio: currentWidth / currentHeight,
				imageX: image.x,
				imageY: image.y,
				scale: scale,
				baseScaleX: currentScaleX,
				baseScaleY: currentScaleY
			};
		} else if (e.target.closest('.text-resize-handle')) {
			isTextResizing = true;
			const handle = e.target.closest('.text-resize-handle');
			textResizeHandle = handle.dataset.handle;

			let currentFontSize = 20;
			if (textResizeHandle === 'inner') currentFontSize = image.innerFontSize || 20;
			if (textResizeHandle === 'outerTop') currentFontSize = image.outerTopFontSize || 20;
			if (textResizeHandle === 'outerBottom') currentFontSize = image.outerBottomFontSize || 20;

			textResizeStart = {
				mouseY: e.clientY,
				baseFontSize: currentFontSize
			};
		} else {
			isDragging = false;
			// Start Virtual Tracking
			virtualX = image.x;
			virtualY = image.y;

			dragStart = {
				x: mouseX - image.x,
				y: mouseY - image.y
			};
		}

		// e.preventDefault(); // Sometimes prevents capture? User said "setPointerCapture".
		// Note: preventDefault is needed to stop text selection / native drag
		e.preventDefault();
		e.stopPropagation();

		window.addEventListener('pointermove', handlePointerMove);
		window.addEventListener('pointerup', handlePointerUp);
	}

	function handlePointerMove(e) {
		currentMousePos = { x: e.clientX, y: e.clientY };
		currentShiftKey = e.shiftKey;

		if (!hasMoved && !isResizing && !isRotating && !isTextResizing) {
			const dist = Math.hypot(e.clientX - startMousePos.x, e.clientY - startMousePos.y);
			if (dist > 3) {
				hasMoved = true;
				isDragging = true;
				onSelect();
				if (!animationFrameId) updatePosition();
			}
		} else if (hasMoved || isResizing || isRotating || isTextResizing) {
			isDirty = true;
			if (!animationFrameId) updatePosition();
		}
	}

	function handlePointerUp(e) {
		if (!hasMoved && !isResizing && !isRotating && !isTextResizing) {
			onSelect();
		}

		isDragging = false;
		isResizing = false;
		isRotating = false;
		isTextResizing = false;
		resizeHandle = null;
		textResizeHandle = null;

		window.removeEventListener('pointermove', handlePointerMove);
		window.removeEventListener('pointerup', handlePointerUp);
	}

	function updatePosition() {
		if (!isDragging && !isResizing && !isRotating && !isTextResizing && !isDirty) return;

		const canvas = document.querySelector('.canvas-area');
		const scale = getCanvasScale(canvas);
		const rect = getCanvasRect(canvas);

		const mouseX = (currentMousePos.x - rect.left) / scale;
		const mouseY = (currentMousePos.y - rect.top) / scale;

		if (isDragging) {
			// Unbounded Virtual Move
			let targetX = mouseX - dragStart.x;
			let targetY = mouseY - dragStart.y;

			// Virtual Update
			virtualX = targetX;
			virtualY = targetY;

			// Sync to Store (Unbounded)
			onUpdate({
				...image,
				x: virtualX,
				y: virtualY
			});

			isDirty = true;
		} else if (isResizing) {
			// Calculate delta in canvas space
			const deltaX = mouseX - resizeStart.mouseX;
			const deltaY = mouseY - resizeStart.mouseY;

			let newWidth = resizeStart.width;
			let newHeight = resizeStart.height;
			let newX = resizeStart.imageX;
			let newY = resizeStart.imageY;

			// Handle different resize handles
			if (resizeHandle.includes('e')) newWidth += deltaX;
			if (resizeHandle.includes('w')) {
				newWidth -= deltaX;
				newX += deltaX;
			}
			if (resizeHandle.includes('s')) newHeight += deltaY;
			if (resizeHandle.includes('n')) {
				newHeight -= deltaY;
				newY += deltaY;
			}

			// Enforce min size
			if (newWidth < 20) newWidth = 20;
			if (newHeight < 20) newHeight = 20;

			// Aspect Ratio Logic
			if (!currentShiftKey) {
				if (resizeHandle.length === 2) {
					newHeight = newWidth / resizeStart.aspectRatio;
					if (resizeHandle.includes('n'))
						newY = resizeStart.imageY + (resizeStart.height - newHeight);
					if (resizeHandle.includes('w'))
						newX = resizeStart.imageX + (resizeStart.width - newWidth);
				} else if (resizeHandle === 'n' || resizeHandle === 's') {
					newWidth = newHeight * resizeStart.aspectRatio;
					newX = resizeStart.imageX + (resizeStart.width - newWidth) / 2;
				} else if (resizeHandle === 'e' || resizeHandle === 'w') {
					newHeight = newWidth / resizeStart.aspectRatio;
					newY = resizeStart.imageY + (resizeStart.height - newHeight) / 2;
				}
			}

			const newScaleX = newWidth / image.width;
			const newScaleY = newHeight / image.height;

			onUpdate({
				...image,
				x: newX,
				y: newY,
				scaleX: Math.max(0.01, newScaleX),
				scaleY: Math.max(0.01, newScaleY),
				scale: Math.max(0.01, newScaleX)
			});
		} else if (isRotating) {
			const dx = mouseX - resizeStart.centerX;
			const dy = mouseY - resizeStart.centerY;
			const angleRad = Math.atan2(dy, dx);
			const angleDeg = angleRad * (180 / Math.PI);

			onUpdate({
				...image,
				rotation: angleDeg + 90
			});
		} else if (isTextResizing) {
			// Calculate vertical mouse delta
			const deltaY = (currentMousePos.y - textResizeStart.mouseY) / scale;

			// We adjust delta based on drag direction.
			// Dragging UP (-) should increase size for Top/Inner textboxes.
			// Dragging DOWN (+) should increase size for Bottom textboxes.
			let calculatedSize = textResizeStart.baseFontSize;

			if (textResizeHandle === 'inner') {
				calculatedSize -= deltaY * 0.5; // Tune down sensitivity
			} else if (textResizeHandle === 'outerTop') {
				calculatedSize -= deltaY * 0.5;
			} else if (textResizeHandle === 'outerBottom') {
				calculatedSize += deltaY * 0.5;
			}

			// Core limits
			calculatedSize = Math.max(10, Math.min(200, calculatedSize));

			// Collision Boundary Logic check (If increasing font pushes box out of bounds, stop it)
			// Wait until DOM repaints aren't feasible here sync, so we check loosely based on standard Line Heights.
			// Roughly: BoxHeight ~= FontSize * 1.5 + Padding (32px)
			const approximateHeight = calculatedSize * 1.5 + 32;

			if (textResizeHandle === 'inner') {
				if (approximateHeight > image.height * (image.scaleY || image.scale || 1)) {
					// Stop enlarging it further if the inner textbox height exceeds the image height
					calculatedSize = textResizeStart.baseFontSize; // Prevent growth
				}
			} else if (textResizeHandle === 'outerTop') {
				if (image.y - approximateHeight < 0) {
					// Stop enlarging it further if the top hits the top edge of canvas (Y = 0)
					calculatedSize = textResizeStart.baseFontSize; // Prevent growth
				}
			} else if (textResizeHandle === 'outerBottom') {
				if (
					image.y + image.height * (image.scaleY || image.scale || 1) + approximateHeight >
					1123
				) {
					// Stop enlarging it further if the bottom hits the bottom edge of canvas
					calculatedSize = textResizeStart.baseFontSize; // Prevent growth
				}
			}

			let updatePayload = { ...image };
			if (textResizeHandle === 'inner') updatePayload.innerFontSize = calculatedSize;
			if (textResizeHandle === 'outerTop') updatePayload.outerTopFontSize = calculatedSize;
			if (textResizeHandle === 'outerBottom') updatePayload.outerBottomFontSize = calculatedSize;

			onUpdate(updatePayload);
		}

		if (isDragging || isResizing || isRotating || isTextResizing || isDirty) {
			animationFrameId = requestAnimationFrame(updatePosition);
		} else {
			animationFrameId = null;
		}
	}

	function handleRotate(e) {
		e.stopPropagation();
		onUpdate({
			...image,
			rotation: ((image.rotation || 0) + 90) % 360
		});
	}

	function handleDelete(e) {
		e.stopPropagation();
		onDelete(image.id);
	}

	function handleCrop(e) {
		e.stopPropagation();
		onCropRequest(image);
	}

	function handleAddText(e) {
		e.stopPropagation();
		onUpdate({
			...image,
			hasText: !image.hasText,
			text: image.text || ''
		});
	}

	function handleAddOuterTopText(e) {
		e.stopPropagation();
		onUpdate({
			...image,
			hasOuterTop: !image.hasOuterTop,
			outerTopText: image.outerTopText || ''
		});
	}

	function handleAddOuterBottomText(e) {
		e.stopPropagation();
		onUpdate({
			...image,
			hasOuterBottom: !image.hasOuterBottom,
			outerBottomText: image.outerBottomText || ''
		});
	}

	function handleTextChange(e) {
		onUpdate({
			...image,
			text: e.target.value
		});
	}

	function handleOuterTopTextChange(e) {
		onUpdate({
			...image,
			outerTopText: e.target.value
		});
	}

	function handleOuterBottomTextChange(e) {
		onUpdate({
			...image,
			outerBottomText: e.target.value
		});
	}

	function handleTextRemove(e) {
		e.stopPropagation();
		onUpdate({
			...image,
			hasText: false,
			text: ''
		});
	}

	function handleOuterTopTextRemove(e) {
		e.stopPropagation();
		onUpdate({
			...image,
			hasOuterTop: false,
			outerTopText: ''
		});
	}

	function handleOuterBottomTextRemove(e) {
		e.stopPropagation();
		onUpdate({
			...image,
			hasOuterBottom: false,
			outerBottomText: ''
		});
	}

	const filterStyle = $derived(applyFilters(image));

	const sX = $derived(image.scaleX || image.scale || 1);
	const sY = $derived(image.scaleY || image.scale || 1);

	// Display Logic: Clamp the Virtual Coordinate
	// This creates the "Sticky/Elastic" visual at the edge while physics is free
	const dW = $derived(image.width * sX);
	const dH = $derived(image.height * sY);

	// Calculate outer text bounding offsets
	const outerTopOffset = $derived(
		image.hasOuterTop && topTextAreaRef ? topTextAreaRef.closest('.group').offsetHeight : 0
	);
	const outerBottomOffset = $derived(
		image.hasOuterBottom && bottomTextAreaRef ? bottomTextAreaRef.closest('.group').offsetHeight : 0
	);

	const minX = 0;
	// When rotating, outer bounding box math is extremely complex to clamp perfectly.
	// For simplicity and per standard CSS behavior, we clamp the core X/Y to the canvas,
	// adjusted by the top/bottom text offset assuming 0 rotation. (Rotation naturally exceeds bounds if large)
	const minY = $derived(outerTopOffset);

	const maxX = $derived(794 - dW); // A4 Width approx
	const maxY = $derived(1123 - dH - outerBottomOffset); // A4 Height approx

	const clampedX = $derived(Math.max(minX, Math.min(maxX, image.x)));
	const clampedY = $derived(Math.max(minY, Math.min(maxY, image.y)));

	// Wrapper Transform (Position & Rotation)
	const transformStringWrapper = $derived(`translate3d(${clampedX}px, ${clampedY}px, 0) rotate(${image.rotation || 0}deg)`);

	// Content Transform (No longer handles rotation)
	const transformStringContent = $derived(`none`);
</script>

<!-- Outer Wrapper: Positioning & Selection (Non-Rotating Blue Box) -->
<div
	class="image-wrapper absolute cursor-move select-none {isSelected
		? 'outline outline-2 outline-offset-2 outline-cyan-400'
		: ''} {isDragging ? 'z-[9999] scale-[1.02] shadow-2xl' : ''}"
	style="
		top: 0;
		left: 0;
        z-index: {image.zIndex};
        transform: {transformStringWrapper};
		width: {image.width * sX}px;
		height: {image.height * sY}px;
        backface-visibility: hidden;
        perspective: 1000px;
        will-change: transform;
        transition: box-shadow 0.2s ease;
		touch-action: none;
    "
	onpointerdown={handlePointerDown}
	role="button"
	tabindex="0"
>
	<!-- Controls (Side-Mounted, Upright) -->
	{#if isSelected}
		<div
			class="absolute -right-12 top-0 z-50 flex flex-col gap-1 rounded-lg border border-gray-200 bg-white/95 p-1 shadow-sm backdrop-blur"
			style="transform: rotate({-(image.rotation || 0)}deg);"
			onpointerdown={(e) => e.stopPropagation()}
			onmousedown={(e) => e.stopPropagation()}
			onclick={(e) => e.stopPropagation()}
		>
			<button
				class="mx-auto rounded p-1.5 text-cyan-700 transition-colors hover:bg-cyan-50"
				onclick={handleRotate}
				title="Rotate 90°"
			>
				<RotateCw size={14} />
			</button>
			<button
				class="mx-auto rounded p-1.5 text-cyan-700 transition-colors hover:bg-cyan-50"
				onclick={handleCrop}
				title="Crop"
			>
				<Crop size={14} />
			</button>
			<button
				class="mx-auto rounded p-1.5 text-cyan-700 transition-colors hover:bg-cyan-50 {image.hasText
					? 'bg-cyan-100'
					: ''}"
				onclick={handleAddText}
				title="Add Inner Textbox"
			>
				<Type size={14} />
			</button>
			<button
				class="mx-auto flex items-center justify-center rounded px-1 py-1 text-[10px] font-bold tracking-wider text-cyan-700 transition-colors hover:bg-cyan-50 {image.hasOuterTop
					? 'bg-cyan-100'
					: ''}"
				onclick={handleAddOuterTopText}
				title="Add Outer Top Textbox"
			>
				TOP
			</button>
			<button
				class="mx-auto flex items-center justify-center rounded px-1 py-1 text-[10px] font-bold tracking-wider text-cyan-700 transition-colors hover:bg-cyan-50 {image.hasOuterBottom
					? 'bg-cyan-100'
					: ''}"
				onclick={handleAddOuterBottomText}
				title="Add Outer Bottom Textbox"
			>
				BOT
			</button>
			<div class="mx-auto my-0.5 h-px w-4 bg-gray-200"></div>
			<button
				class="mx-auto rounded p-1.5 text-red-600 transition-colors hover:bg-red-50"
				onclick={handleDelete}
				title="Delete"
			>
				<Trash2 size={14} />
			</button>
		</div>

		<!-- Resize Handles (Axis-Aligned resizing) -->
		{#each ['nw', 'ne', 'sw', 'se'] as handle}
			<div
				class="resize-handle absolute z-40 h-3 w-3 rounded-full border border-cyan-500 bg-white shadow-sm"
				style="
                    {handle.includes('n') ? 'top: -6px;' : 'bottom: -6px;'}
                    {handle.includes('w') ? 'left: -6px;' : 'right: -6px;'}
                    cursor: {handle}-resize;
                "
				data-handle={handle}
			></div>
		{/each}
	{/if}

	<!-- Inner Content -->
	<div
		class="image-content h-full w-full"
		style="transform: {transformStringContent}; transform-origin: center center;"
	>
		<!-- Outer Top Textbox -->
		{#if image.hasOuterTop}
			<div
				class="group absolute bottom-full left-0 w-full bg-slate-900/40 p-4 backdrop-blur-sm {isSelected
					? 'pointer-events-auto'
					: 'pointer-events-none'}"
			>
				{#if isSelected}
					<div
						class="text-resize-handle absolute top-0 left-0 z-50 flex h-3 w-full cursor-ns-resize items-center justify-center bg-white/10 transition-colors hover:bg-cyan-400/30"
						data-handle="outerTop"
						title="Drag up or down to resize text"
					>
						<div class="h-1 w-8 rounded-full bg-white/50"></div>
					</div>
					<button
						class="absolute -top-3 -right-3 z-50 hidden h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-lg transition-transform group-hover:flex hover:scale-110"
						onclick={handleOuterTopTextRemove}
						onpointerdown={(e) => e.stopPropagation()}
						title="Remove Outer Top Textbox"
					>
						<X size={14} />
					</button>
				{/if}
				<textarea
					class="w-full resize-none bg-transparent text-center font-medium text-white placeholder-white/50 focus:outline-none"
					placeholder="Enter your caption here..."
					value={image.outerTopText || ''}
					oninput={handleOuterTopTextChange}
					onpointerdown={(e) => e.stopPropagation()}
					onkeydown={(e) => e.stopPropagation()}
					rows="1"
					style="font-size: {image.outerTopFontSize || 20}px; line-height: 1.5; min-height: 1.5em;"
					bind:this={topTextAreaRef}
				></textarea>
			</div>
		{/if}

		<img
			src={image.url}
			alt=""
			class="pointer-events-none block h-full w-full select-none"
			style="object-fit: contain; filter: {filterStyle};"
			draggable="false"
		/>

		<!-- Inner Textbox -->
		{#if image.hasText}
			<div
				class="group absolute bottom-0 left-0 w-full bg-slate-900/40 p-4 backdrop-blur-sm {isSelected
					? 'pointer-events-auto'
					: 'pointer-events-none'}"
			>
				{#if isSelected}
					<div
						class="text-resize-handle absolute top-0 left-0 z-50 flex h-3 w-full cursor-ns-resize items-center justify-center bg-white/10 transition-colors hover:bg-cyan-400/30"
						data-handle="inner"
						title="Drag up or down to resize text"
					>
						<div class="h-1 w-8 rounded-full bg-white/50"></div>
					</div>
					<button
						class="absolute -top-3 -right-3 z-50 hidden h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-lg transition-transform group-hover:flex hover:scale-110"
						onclick={handleTextRemove}
						onpointerdown={(e) => e.stopPropagation()}
						title="Remove Inner Textbox"
					>
						<X size={14} />
					</button>
				{/if}
				<textarea
					class="w-full resize-none bg-transparent text-center font-medium text-white placeholder-white/50 focus:outline-none"
					placeholder="Enter your caption here..."
					value={image.text || ''}
					oninput={handleTextChange}
					onpointerdown={(e) => e.stopPropagation()}
					onkeydown={(e) => e.stopPropagation()}
					rows="1"
					style="font-size: {image.innerFontSize || 20}px; line-height: 1.5; min-height: 1.5em;"
					bind:this={textAreaRef}
				></textarea>
			</div>
		{/if}

		<!-- Outer Bottom Textbox -->
		{#if image.hasOuterBottom}
			<div
				class="group absolute top-full left-0 w-full bg-slate-900/40 p-4 backdrop-blur-sm {isSelected
					? 'pointer-events-auto'
					: 'pointer-events-none'}"
			>
				{#if isSelected}
					<div
						class="text-resize-handle absolute bottom-0 left-0 z-50 flex h-3 w-full cursor-ns-resize items-center justify-center bg-white/10 transition-colors hover:bg-cyan-400/30"
						data-handle="outerBottom"
						title="Drag up or down to resize text"
					>
						<div class="h-1 w-8 rounded-full bg-white/50"></div>
					</div>
					<button
						class="absolute -top-3 -right-3 z-50 hidden h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-lg transition-transform group-hover:flex hover:scale-110"
						onclick={handleOuterBottomTextRemove}
						onpointerdown={(e) => e.stopPropagation()}
						title="Remove Outer Bottom Textbox"
					>
						<X size={14} />
					</button>
				{/if}
				<textarea
					class="w-full resize-none bg-transparent text-center font-medium text-white placeholder-white/50 focus:outline-none"
					placeholder="Enter your caption here..."
					value={image.outerBottomText || ''}
					oninput={handleOuterBottomTextChange}
					onpointerdown={(e) => e.stopPropagation()}
					onkeydown={(e) => e.stopPropagation()}
					rows="1"
					style="font-size: {image.outerBottomFontSize ||
						20}px; line-height: 1.5; min-height: 1.5em;"
					bind:this={bottomTextAreaRef}
				></textarea>
			</div>
		{/if}
	</div>

	<!-- Rotation Handle (Visual, attached to Wrapper top for now) -->
	{#if isSelected}
		<div
			class="rotation-handle group absolute -top-8 left-1/2 z-40 flex h-6 w-6 -translate-x-1/2 cursor-alias items-center justify-center"
			title="Free Rotate"
		>
			<div class="absolute top-4 left-1/2 h-4 w-0.5 -translate-x-1/2 bg-cyan-400"></div>
			<div
				class="h-3 w-3 rounded-full border-2 border-cyan-400 bg-white shadow-sm transition-transform group-hover:scale-125"
			></div>
		</div>
	{/if}
</div>
