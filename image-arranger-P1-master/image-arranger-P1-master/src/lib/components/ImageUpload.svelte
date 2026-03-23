<script>
	import { Upload, X, Image as ImageIcon } from 'lucide-svelte';
	import { loadImage, isValidImageFile, formatFileSize } from '../utils/imageUtils.js';

	let { onImagesAdded = () => {} } = $props();

	let isDragging = $state(false);
	let fileInput = $state(null);

	function handleDragOver(e) {
		e.preventDefault();
		e.stopPropagation();
		isDragging = true;
	}

	function handleDragLeave(e) {
		e.preventDefault();
		e.stopPropagation();
		isDragging = false;
	}

	function handleDrop(e) {
		e.preventDefault();
		e.stopPropagation();
		isDragging = false;

		const files = Array.from(e.dataTransfer.files).filter(isValidImageFile);
		processFiles(files);
	}

	function handleFileSelect(e) {
		const files = Array.from(e.target.files).filter(isValidImageFile);
		processFiles(files);
		e.target.value = ''; // Reset input
	}

	async function processFiles(files) {
		if (files.length === 0) return;

		try {
			const imagePromises = files.map(loadImage);
			const images = await Promise.all(imagePromises);
			onImagesAdded(images);
		} catch (error) {
			if (error.message === 'File format not supported') {
				alert('File format not supported.');
			} else {
				alert('Error loading images. Please try again.');
			}
		}
	}

	function openFileDialog() {
		fileInput?.click();
	}
</script>

<div
	class="relative rounded-xl border-2 border-dashed p-6 transition-all duration-500 {isDragging
		? 'border-cyan-400/60 bg-cyan-500/10 backdrop-blur-xl'
		: 'border-white/20 bg-white/5 backdrop-blur-xl hover:border-white/40 hover:bg-white/10'}"
	ondragover={handleDragOver}
	ondragleave={handleDragLeave}
	ondrop={handleDrop}
	role="button"
	tabindex="0"
	onclick={openFileDialog}
	onkeydown={(e) => e.key === 'Enter' && openFileDialog()}
>
	<input
		bind:this={fileInput}
		type="file"
		accept="image/*"
		multiple
		class="hidden"
		onchange={handleFileSelect}
	/>

	<div class="flex flex-col items-center justify-center space-y-3 text-center">
		<div
			class="rounded-xl border border-white/20 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 p-3"
		>
			<Upload class="h-6 w-6 text-white/80" />
		</div>
		<div>
			<p class="text-sm font-light text-white/80">Drop or click to upload</p>
			<p class="mt-1 text-xs font-light text-white/50">PNG, JPG, GIF, WebP</p>
		</div>
	</div>
</div>
