# 🎨 PixelPacker Pro

A professional-grade image collage and arrangement tool built with **SvelteKit 5** and powerhouse **Constraint Programming (OR-Tools)** for smart layouts.

## ✨ Core Capabilities

### 🚀 Smart Auto-Arrange (The "Over-Engineered" Feature)
Stop manually moving images. Our **Python-based CP-SAT solver** calculates the mathematically optimal layout for your images on an A4 canvas:
- **Zero Overlap**: Guaranteed non-overlapping placement.
- **Density Optimization**: Automatically minimizes wasted space.
- **Rotation Intelligence**: Optionally rotates images by 90° to fit more content.

### 🎨 Dual-Theme Professional Engine
- **Doraemon Sky (Default)**: A refreshing, premium blue-and-gold professional light theme.
- **Ultimate Electric (Dark)**: A high-contrast "Pure Black & Lime" theme for power users.
- **Glassmorphism UI**: Modern, frosted-glass panels with smooth micro-animations.

### 📄 Multi-Page A4 Workflow
- **Infinite Pages**: Add, delete, and navigate between multiple A4 canvases.
- **High-Res Export**: Download your work as professional **Multi-page PDF**, PNG, or JPEG.
- **Precise Control**: Drag, scale (aspect-ratio locked with `Shift`), and rotate images with sub-pixel precision.

---

## 🚀 Quick Start

### 1. Start the Python Backend (Solver)
```bash
# Install dependencies
pip install fastapi uvicorn ortools watchfiles

# Run the server
python -m uvicorn api.arrange:app --reload --port 8000
```

### 2. Start the Frontend (SvelteKit)
```bash
# Install dependencies
npm install  # or bun install

# Run dev server
npm run dev
```

The app will be live at `http://localhost:5173`. (Vite will proxy `/api` calls to the solver).

---

## 🛠 Tech Stack

- **Frontend**: SvelteKit 5 (Runes), Tailwind CSS 4, Lucide Icons.
- **Backend**: FastAPI, Google OR-Tools (Constraint Programming).
- **Export**: jsPDF, html2canvas.

---

## 📝 Usage Tips
- **Snap-to-Fit**: Use the "Auto-Arrange" button to instantly pack all images.
- **Precision Scaling**: Grab any corner handle to resize; hold `Shift` for proportional scaling.
- **Selection**: Click any image to focus it and bring it to the front of the stack.
