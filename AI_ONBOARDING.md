# 🤖 AI Onboarding Guide — Image Arranger

> **For a new AI taking over this project:** Read this entire file before touching any code.

---

## 📌 What Is This Project?

**Image Arranger** is a browser-based web app that lets users:
1. Upload multiple images (PNG, JPG, GIF, WebP)
2. Drag, resize, and rotate them on a virtual **A4 canvas** (794 × 1123 px at 96 DPI)
3. Apply CSS filters (brightness, contrast, saturation, grayscale, invert)
4. Crop individual images via a full-screen crop modal
5. Export the arrangement as **PNG**, **JPEG**, or **PDF**

---

## 🛠️ Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Framework** | SvelteKit `^2.49.1` | |
| **UI** | Svelte `^5.45.6` | Uses **Svelte 5 Runes** — `$state`, `$derived`, `$effect`, `$props` |
| **Styling** | Tailwind CSS `^4.1.17` | TW v4 — no config file, uses `@tailwindcss/vite` plugin |
| **Build** | Vite `^7.2.6` | |
| **Package Manager** | Bun | Use `bun install`, `bun run dev` |
| **Icons** | lucide-svelte `^0.561.0` | |
| **PDF Export** | jsPDF `^3.0.4` | |
| **Installed but NOT used** | `html2canvas`, `svelte-dnd-action`, `sortablejs` | Abandoned in favour of custom implementations |

> ⚠️ **Always use Svelte 5 Runes.** Never use `writable()` stores or `export let` reactivity.

---

## 📁 File Structure

```
src/
├── routes/
│   └── +page.svelte          ← MAIN STATE OWNER & canvas
└── lib/
    ├── components/
    │   ├── ImageUpload.svelte  ← drag-and-drop upload zone
    │   ├── ImageItem.svelte    ← per-image drag/resize/rotate
    │   ├── ImageFilters.svelte ← filter sliders (sidebar)
    │   └── CropModal.svelte    ← full-screen crop UI
    └── utils/
        ├── imageUtils.js       ← loadImage(), applyFilters(), cropImage()
        └── exportUtils.js      ← exportAsPNG(), exportAsJPEG(), exportAsPDF()
```

---

## 🧠 Architecture

### State (in `+page.svelte`)
- `images` — array of all image objects
- `selectedImageId` — currently focused image
- `canvasScale` — zoom level (0.25–2.0)
- `cropModalOpen`, `cropImageData` — crop modal control

All child components receive data as **props** and emit changes via **callback props** (`onUpdate`, `onDelete`, `onSelect`). No Svelte stores anywhere.

### The Image Object
```js
{
  id, file, url, originalUrl,   // identity + blob URLs
  width, height,                // intrinsic px dimensions
  x, y,                         // canvas position (top-left)
  scale, scaleX, scaleY,        // scale factors
  rotation,                     // degrees 0–360
  zIndex,                       // layer order
  filters: { invert, grayscale, sepia, brightness, contrast, saturate }
}
```

### Drag / Resize / Rotate (`ImageItem.svelte`)
- Uses **Pointer Events** + `setPointerCapture` (not mouse events)
- Position updates batched via `requestAnimationFrame`
- **Dual coordinate system:** `virtualX/Y` (unbounded physics) → `clampedX/Y` (display, stays on canvas)
- Two DOM layers: outer wrapper = position + selection outline; inner div = rotation only
- Hold **Shift** while resizing to break aspect ratio lock

### Export (`exportUtils.js`)
Does **not** screenshot the DOM. Instead:
1. Creates an off-screen `<canvas>` at **2× resolution**
2. Re-draws all images sorted by `zIndex`
3. Applies transforms (`ctx.translate` + `ctx.rotate`) and filters (`ctx.filter`)
4. PDF uses JPEG at 0.7 quality for small file size

---

## 📝 What Was Built

| Phase | Features |
|-------|---------|
| **1 — Foundation** | SvelteKit scaffold, upload zone, blob URL image loading |
| **2 — Manipulation** | Pointer-event drag, corner resize handles, 90° snap rotate, free rotate handle, z-index layer management |
| **3 — Canvas UX** | Smart auto-scale on import, center-on-canvas, multi-image offset, zoom slider |
| **4 — Filters** | Brightness/contrast/saturation sliders, grayscale/invert toggles, sidebar panel |
| **5 — Export** | Custom canvas renderer (2×), PNG/JPEG/PDF export |
| **6 — Crop** | Full-screen modal, pan+zoom, SVG mask overlay, aspect ratio presets, pixel-accurate coordinate mapping |
| **7 — Polish** | Glassmorphism dark UI, animated background blobs, selection highlight, export spinner |

---

## 🐛 Bugs Made & Fixed

### 1. Jumpy drag
**Problem:** Fast mouse movement lost tracking.  
**Fix:** Switched to Pointer Events + `setPointerCapture`. Added `requestAnimationFrame` batching.

### 2. Resize handles triggered drag
**Problem:** Clicking a corner handle started a full drag.  
**Fix:** In `handlePointerDown`, check `e.target.closest('.resize-handle')` and `.rotation-handle` first before falling through to drag logic.

### 3. Toolbar buttons triggered drag
**Problem:** Clicking rotate/delete/crop buttons dragged the image.  
**Fix:** `onpointerdown={(e) => e.stopPropagation()}` on the controls `<div>`.

### 4. Zoom broke drag coordinates
**Problem:** At 50% zoom, images moved at half speed.  
**Fix:** `getCanvasScale()` reads the actual CSS matrix. All position math divides by this scale.

### 5. Export captured the zoomed view
**Problem:** `html2canvas` screenshot the DOM at whatever zoom was active.  
**Fix:** Replaced with custom off-screen Canvas renderer — always renders at 1:1 A4 size.

### 6. Rotation broke resize handle axis
**Problem:** After rotating 45°, resize handles moved in wrong directions.  
**Fix:** Two-layer DOM — outer wrapper handles position (no rotation), inner div handles rotation. Handles are always axis-aligned.

### 7. Images dragged fully off canvas
**Problem:** No boundary enforcement.  
**Fix:** Virtual/clamped dual system — physics is unbounded, display is clamped to A4 bounds.

### 8. Re-cropping lost quality
**Problem:** Cropping a cropped image degraded quality each time.  
**Fix:** `originalUrl` always preserved. Crop modal reads from `originalUrl`, not current `url`.

### 9. PDF was huge
**Problem:** PNG-encoded PDF was 10–20 MB.  
**Fix:** `canvas.toDataURL('image/jpeg', 0.7)` — typically 5–10× smaller.

---

## ✅ Rules for a New AI

**DO:**
- Use `$state`, `$derived`, `$effect`, `$props` (Svelte 5 Runes)
- Keep state in `+page.svelte`; use props + callbacks everywhere else
- Use `bun` as the package manager
- Use Pointer Events + `setPointerCapture` for any new drag UI
- Test exports after any change to image transform logic
- Call `URL.revokeObjectURL()` when deleting images

**DON'T:**
- Use `writable()` or Svelte stores
- Use `html2canvas` (abandoned)
- Use `mouseX/Y offsetX/offsetY` inside transformed containers (wrong coordinates)
- Apply rotation to the outermost wrapper div (breaks resize math)
- Add clamping to `image.x/y` in state — use the virtual/clamped display system

---

## 🧪 Quick Test Checklist

1. Upload 2+ images (JPG + PNG)
2. Drag at 100% zoom then at 50% zoom — should be smooth and accurate
3. Resize corner handle (aspect locked) + Shift resize (free)
4. Free rotate handle + 90° snap button
5. Apply filters (brightness 150%, grayscale)
6. Crop modal — drag box, handle resize, aspect ratio presets
7. Export PNG — file matches canvas
8. Export PDF — correct A4 size

---

*Last updated: March 2026.*
