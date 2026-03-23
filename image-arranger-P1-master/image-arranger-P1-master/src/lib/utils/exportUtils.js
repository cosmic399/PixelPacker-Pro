import { jsPDF } from 'jspdf';
import { applyFilters } from './imageUtils.js';

// A4 Dimensions (matching +page.svelte)
const A4_WIDTH = 794;
const A4_HEIGHT = 1123;

/**
 * Helper to load an image source for Canvas
 */
function loadImageForCanvas(url) {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.crossOrigin = 'anonymous';
		img.onload = () => resolve(img);
		img.onerror = reject;
		img.src = url;
	});
}

/**
 * Re-render the scene onto a high-res canvas (WYSIWYG)
 */
async function renderSceneToCanvas(images, scaleFactor = 2) {
	const canvas = document.createElement('canvas');
	canvas.width = A4_WIDTH * scaleFactor;
	canvas.height = A4_HEIGHT * scaleFactor;
	const ctx = canvas.getContext('2d');

	// Scale context to match resolution
	ctx.scale(scaleFactor, scaleFactor);

	// White background
	ctx.fillStyle = '#ffffff';
	ctx.fillRect(0, 0, A4_WIDTH, A4_HEIGHT);

	// Sort by zIndex (lowest first)
	const sortedImages = [...images].sort((a, b) => a.zIndex - b.zIndex);

	for (const imgData of sortedImages) {
		try {
			const imgValues = await loadImageForCanvas(imgData.url);

			// Support non-uniform scaling (fallback to .scale if X/Y not present for backward compat)
			const sX = imgData.scaleX ?? imgData.scale;
			const sY = imgData.scaleY ?? imgData.scale;

			const width = imgData.width * sX;
			const height = imgData.height * sY;

			// Center coordinates for rotation
			const centerX = imgData.x + width / 2;
			const centerY = imgData.y + height / 2;

			ctx.save();

			// Apply Transforms
			ctx.translate(centerX, centerY);
			ctx.rotate((imgData.rotation * Math.PI) / 180);
			// Draw centered
			ctx.translate(-width / 2, -height / 2);

			// Apply Filters
			// Note: ctx.filter expects standard CSS filter string
			ctx.filter = applyFilters(imgData);

			// Draw the actual image
			ctx.drawImage(imgValues, 0, 0, width, height);

			// --- HELPER FUNCTION FOR TEXT RENDERING ---
			const renderTextBox = (textStr, isPlaceholder, positionY, isTopOuter, baseFontSize = 20) => {
				const text = textStr || 'Enter your caption here...';
				ctx.filter = 'none';
				const fontSize = baseFontSize * scaleFactor;
				ctx.font = `500 ${fontSize}px sans-serif`;
				ctx.textAlign = 'center';
				ctx.textBaseline = 'top';

				const maxWidth = width - (32 * scaleFactor);
				const words = text.split(' ');
				const lines = [];
				let currentLine = '';

				for (let i = 0; i < words.length; i++) {
					const word = words[i];
					const testLine = currentLine + word + ' ';
					const metrics = ctx.measureText(testLine);
					const testWidth = metrics.width;
					if (testWidth > maxWidth && i > 0) {
						lines.push(currentLine);
						currentLine = word + ' ';
					} else {
						currentLine = testLine;
					}
				}
				lines.push(currentLine);

				const lineHeight = fontSize * 1.5;
				const paddingY = 16 * scaleFactor;
				const boxHeight = (lines.length * lineHeight) + (paddingY * 2);

				// Adjust Y based on if it's top outer (draw upwards from 0) 
				// or normal (draw downwards from positionY)
				let boxY = positionY;
				if (isTopOuter) {
					boxY = positionY - boxHeight;
				}

				ctx.fillStyle = 'rgba(15, 23, 42, 0.4)';
				ctx.fillRect(0, boxY, width, boxHeight);

				ctx.fillStyle = !isPlaceholder ? '#ffffff' : 'rgba(255, 255, 255, 0.5)';

				let textY = boxY + paddingY;
				for (const line of lines) {
					ctx.fillText(line.trim(), width / 2, textY);
					textY += lineHeight;
				}
			};

			// Render Outer Top Textbox
			if (imgData.hasOuterTop) {
				renderTextBox(imgData.outerTopText, !imgData.outerTopText, 0, true, imgData.outerTopFontSize || 20);
			}

			// Render Inner Textbox
			if (imgData.hasText) {
				// We need to calculate the height first to position it at the bottom inside.
				// This is slightly repetitive with the helper, but since inner text box positions *upwards* from height,
				// we calculate its height.
				const baseFontSize = imgData.innerFontSize || 20;
				const fontSize = baseFontSize * scaleFactor;
				ctx.font = `500 ${fontSize}px sans-serif`;
				const text = imgData.text || 'Enter your caption here...';
				const maxWidth = width - (32 * scaleFactor);
				const words = text.split(' ');
				const lines = [];
				let currentLine = '';

				for (let i = 0; i < words.length; i++) {
					const word = words[i];
					const testLine = currentLine + word + ' ';
					if (ctx.measureText(testLine).width > maxWidth && i > 0) {
						lines.push(currentLine);
						currentLine = word + ' ';
					} else {
						currentLine = testLine;
					}
				}
				lines.push(currentLine);

				const lineHeight = fontSize * 1.5;
				const paddingY = 16 * scaleFactor;
				const boxHeight = (lines.length * lineHeight) + (paddingY * 2);
				const boxY = height - boxHeight;

				renderTextBox(text, !imgData.text, boxY, false, baseFontSize);
			}

			// Render Outer Bottom Textbox
			if (imgData.hasOuterBottom) {
				renderTextBox(imgData.outerBottomText, !imgData.outerBottomText, height, false, imgData.outerBottomFontSize || 20);
			}

			ctx.restore();
		} catch (err) {
			console.error(`Failed to render image ${imgData.id}`, err);
		}
	}

	return canvas;
}

/**
 * Export canvas area as PNG (Optimized with Blob)
 */
export async function exportAsPNG(pages, filename = 'image-arrangement.png') {
	try {
		let successCount = 0;
		for (let i = 0; i < pages.length; i++) {
			const pageImages = pages[i].images;
			if (pageImages.length === 0 && pages.length > 1) continue;

			const canvas = await renderSceneToCanvas(pageImages, 2); // 2x resolution

			await new Promise((resolve) => {
				canvas.toBlob((blob) => {
					if (!blob) { resolve(); return; }
					const url = URL.createObjectURL(blob);
					const link = document.createElement('a');
					const name = pages.length > 1 ? filename.replace('.png', `-page-${i+1}.png`) : filename;
					link.download = name;
					link.href = url;
					link.click();
					setTimeout(() => URL.revokeObjectURL(url), 100);
					resolve();
				}, 'image/png');
			});
			successCount++;
		}
		return { success: successCount > 0, error: successCount === 0 ? 'No images to export' : null };
	} catch (error) {
		console.error('PNG Export Error:', error);
		return { success: false, error: error.message };
	}
}

/**
 * Export canvas area as JPEG (Optimized with Blob & Compression)
 */
export async function exportAsJPEG(pages, filename = 'image-arrangement.jpg', quality = 0.7) {
	try {
		let successCount = 0;
		for (let i = 0; i < pages.length; i++) {
			const pageImages = pages[i].images;
			if (pageImages.length === 0 && pages.length > 1) continue;

			const canvas = await renderSceneToCanvas(pageImages, 2); // 2x resolution

			await new Promise((resolve) => {
				canvas.toBlob((blob) => {
					if (!blob) { resolve(); return; }
					const url = URL.createObjectURL(blob);
					const link = document.createElement('a');
					const name = pages.length > 1 ? filename.replace('.jpg', `-page-${i+1}.jpg`) : filename;
					link.download = name;
					link.href = url;
					link.click();
					setTimeout(() => URL.revokeObjectURL(url), 100);
					resolve();
				}, 'image/jpeg', quality);
			});
			successCount++;
		}
		return { success: successCount > 0, error: successCount === 0 ? 'No images to export' : null };
	} catch (error) {
		console.error('JPEG Export Error:', error);
		return { success: false, error: error.message };
	}
}

/**
 * Export canvas area as PDF (Optimized size)
 */
export async function exportAsPDF(pages, filename = 'image-arrangement.pdf', format = 'a4') {
	try {
		const pdf = new jsPDF({
			orientation: 'portrait',
			unit: 'pt',
			format: 'a4'
		});

		const pdfWidth = pdf.internal.pageSize.getWidth();
		const pdfHeight = pdf.internal.pageSize.getHeight();

		let addedFirst = false;

		for (let i = 0; i < pages.length; i++) {
			const pageImages = pages[i].images;
			// Skip empty pages unless it's the only page
			if (pageImages.length === 0 && pages.length > 1) continue;

			// Use 2x scale for sharpness (1588px width), then compress
			const canvas = await renderSceneToCanvas(pageImages, 2);
			const imgData = canvas.toDataURL('image/jpeg', 0.7);

			if (addedFirst) {
				pdf.addPage();
			}
			pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
			addedFirst = true;
		}

		if (addedFirst) {
			pdf.save(filename);
			return { success: true };
		} else {
			return { success: false, error: 'No images to export' };
		}
	} catch (error) {
		console.error('PDF Export Error:', error);
		return { success: false, error: error.message };
	}
}
