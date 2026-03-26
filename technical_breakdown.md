# PixelPacker Pro - Technical Breakdown

## 1. Rendering Architecture
**Concept:** Dual-Coordinate Rendering System
The application renders an A4 canvas (794x1123px at 96dpi) using a **Split-Transport Strategy** to decouple positioning from rotation.
-   **Global State (Svelte Store):** The "Source of Truth" is the Svelte state (`scaleX`, `scaleY`, `rotation`), which is purely mathematical.
-   **DOM Implementation:** We do NOT apply a single complex CSS matrix to one element. Instead, we split the transform:
    -   **Outer Wrapper (`.image-wrapper`):** Handles **Translation (X/Y)** only. It utilizes `translate3d(x,y,0)` for hardware acceleration.
    -   **Inner Content (`.image-content`):** Handles **Rotation** only. It utilizes `rotate(deg)`.
**Why?** This prevents "Gimbal Lock" issues in the UI and allows child elements (like resize handles) to inherit position without inheriting rotation, keeping controls upright.

## 2. Transformation Logic
**Concept:** Centroid-Based Affine Transformations
-   **Rotation:** We calculate the arctangent (`Math.atan2(dy, dx)`) of the mouse pointer relative to the image's center point. This provides a continuous -180 to 180-degree value, normalized to 0-360 for CSS.
-   **Non-Uniform Scaling:** Unlike standard `scale()` which stretches content uniformly, we track `scaleX` and `scaleY` independently.
    -   **Aspect Ratio Locking:** When `Shift` is held, we solve for one dimension: `width = height * aspectRatio`.
    -   **Normalization:** We enforce a `min-scale` of 0.01 to prevent matrix inversion singularities (images disappearing or flipping if scaled to 0).

## 3. Interaction Engine (Sticky Corners)
**Concept:** Virtual Coordinate Proxy Pattern
We solved the "Sticky Corner" edge-case (where dragging a rotated image into a wall makes it get stuck) by separating **Physics** from **Display**.
-   **Virtual Coordinates (Physics):** The `virtualX/Y` variables track the raw, unbounded mouse movement. If the user drags the mouse 500px off-screen, `virtualX` technically goes to `-500`.
-   **Clamped Coordinates (Display):** The render loop applies a clamping function: `x = max(0, min(A4_Width - Image_Width, virtualX))`.
-   **The Result:** Visually, the image stops at the edge. Mathematically, it keeps moving. When the user drags backward, the image immediately responds because the "Virtual Spring" releases instantly, rather than waiting for the mouse to re-enter the canvas boundary.
-   **Render Loop:** We use `requestAnimationFrame` to sync these updates to the monitor's refresh rate, decoupling input frequency (high) from render frequency (60hz).

## 4. UI Overlay Logic
**Concept:** Inverse Transform Inheritance
The Control Bar (Delete, Crop, Rotate) is anchored to the image but refuses to rotate with it.
-   **Implementation:** The UI controls are children of the **Outer Wrapper** (Translation layer), NOT the **Inner Content** (Rotation layer).
-   **Effect:** They move with the image (X/Y) but exist in a coordinate space where `rotation = 0`. This ensures buttons are always upright and accessible, regardless of whether the image is upside down or sideways.

## 5. Export Pipeline
**Concept:** High-Fidelity Canvas Rehydration
We do not screen-capture the DOM (which is low-res). We **rehydrate** the scene onto a hidden, high-resolution Canvas 2D context.
-   **Upscaling:** The export canvas is initialized at 2x scale (Retina quality) to ensure crisp text and sharp edges.
-   **Matrix Replay:** We iterate through the Svelte state and "replay" every transform (`ctx.translate`, `ctx.rotate`, `ctx.scale`) onto the canvas context in Z-Index order.
-   **PDF Flattening:** Instead of fighting with PDF vector libraries, we flatten the high-res canvas into a JPEG (0.7 compression) and inject it into a `jsPDF` container. This ensures 100% visual parity between what the user sees and what they print.
