# 📑 Multi-Page Implementation Roadmap — Image Arranger

This document outlines the transition from a single-canvas tool to a multi-page document editor. It adheres to **Svelte 5 Runes** and the **Dual-Coordinate** rendering system.

---

## 🏗️ 1. State Refactoring (Data Layer)
* **Convert Image Storage:** Migrate the flat `images` array in `+page.svelte` into a `pages` array of objects.
* **Initialize Global State:** Define `$state` for `pages` (each containing a unique `id` and an `images` array) and `activePageIndex` (defaulting to 0).
* **Implement Page Logic:** Create an `addPage` function that pushes a new page object and updates `activePageIndex` to the new index.
* **Memory Management:** Ensure `URL.revokeObjectURL()` is called for all images within a page when it is deleted to prevent memory leaks.

## 🎮 2. Navigation UI (Interaction Layer)
* **Page Number Input:** Implement a `[Current / Total]` box where the "Current" field is a bound input.
* **Input Validation:** Add a listener for the "Enter" key that validates if the input number is within the `pages.length` bounds before updating the index.
* **Directional Controls:** Add "Forward" and "Backward" arrow buttons to increment or decrement `activePageIndex`.
* **Conditional Disabling:** Use `$derived` states to disable the "Backward" button at index 0 and the "Forward" button at the final index.
* **Add Page Button:** Design a rectangular, curved-edge button with a plus icon and a hover-triggered "Add Page" tooltip.

## 🖼️ 3. Canvas Componentization (View Layer)
* **Extract Canvas Logic:** Move the A4 canvas DOM and scaling logic into a standalone `Canvas.svelte` component.
* **Prop Pass-through:** Pass the `images` array of the *currently active page* as a prop to this component.
* **Coordinate Accuracy:** Ensure `getCanvasScale()` continues to read the CSS matrix correctly for accurate drag/resize math across pages.

## 📄 4. Export Pipeline Update (Output Layer)
* **Iterative Rendering:** Modify `exportUtils.js` to loop through the `pages` array.
* **Canvas Rehydration:** For every page, clear the off-screen 2× canvas and "replay" transforms (`ctx.translate`, `ctx.rotate`) for that page's specific images.
* **PDF Sequencing:** Utilize `jsPDF` commands (`pdf.addPage()`) for every page after the first index.
* **Optimized Compression:** Maintain JPEG 0.7 compression to keep the multi-page PDF file size manageable.

---

## ✅ Quick Feature Checklist
- [ ] `pages` state supports multiple independent image arrays.
- [ ] `[1/1]` navigation box updates on "Enter".
- [ ] Arrow buttons disable at start/end of document.
- [ ] "Add Page" button creates a blank A4 canvas.
- [ ] Export PDF generates a single file with all pages included.

*Last Updated: March 2026*