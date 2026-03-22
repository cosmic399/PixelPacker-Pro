/**
 * Image utility functions
 */

/**
 * Load image from file and return as object URL
 */
export function loadImage(file) {
	return new Promise((resolve, reject) => {
		const url = URL.createObjectURL(file);
		const img = new Image();

		img.onload = () => {
			resolve({
				id: Date.now() + Math.random(),
				file,
				url: url, // Use the Object URL
				originalUrl: url,
				width: img.width,
				height: img.height,
				x: 100,
				y: 100,
				scale: 1,
				scaleX: 1,
				scaleY: 1,
				rotation: 0,
				zIndex: 0,
				filters: {
					invert: false,
					grayscale: false,
					sepia: false,
					brightness: 100,
					contrast: 100,
					saturate: 100
				}
			});
		};

		img.onerror = () => {
			URL.revokeObjectURL(url); // Clean up if load fails
			reject(new Error("File format not supported"));
		};

		img.src = url;
	});
}

/**
 * Apply CSS filters to image
 */
export function applyFilters(image) {
	const filters = image.filters || {};
	const filterString = [
		filters.invert ? 'invert(1)' : '',
		filters.grayscale ? 'grayscale(1)' : '',
		filters.sepia ? 'sepia(1)' : '',
		`brightness(${filters.brightness}%)`,
		`contrast(${filters.contrast}%)`,
		`saturate(${filters.saturate}%)`
	]
		.filter(Boolean)
		.join(' ');

	return filterString || 'none';
}

/**
 * Validate image file
 */
export function isValidImageFile(file) {
	return file.type.startsWith('image/');
}

/**
 * Get file size in readable format
 */
export function formatFileSize(bytes) {
	if (bytes === 0) return '0 Bytes';
	const k = 1024;
	const sizes = ['Bytes', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Crop image using canvas
 */
export function cropImage(imageUrl, cropX, cropY, cropWidth, cropHeight) {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.crossOrigin = 'anonymous';
		img.onload = () => {
			const canvas = document.createElement('canvas');
			canvas.width = cropWidth;
			canvas.height = cropHeight;
			const ctx = canvas.getContext('2d');

			ctx.drawImage(
				img,
				cropX, cropY, cropWidth, cropHeight,
				0, 0, cropWidth, cropHeight
			);

			const croppedDataUrl = canvas.toDataURL('image/png');
			resolve(croppedDataUrl);
		};
		img.onerror = reject;
		img.src = imageUrl;
	});
}

