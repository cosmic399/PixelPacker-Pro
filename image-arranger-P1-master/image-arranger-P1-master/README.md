# 🎨 Image Arranger - Professional Image Collage Tool

A modern, feature-rich web application for arranging multiple images with drag-and-drop functionality and export capabilities.

## ✨ Features

### 🖼️ Image Management
- **Multiple Image Upload**: Drag and drop or click to browse
- **Image Preview**: See all uploaded images in a sidebar
- **Format Support**: PNG, JPG, GIF, WebP

### 🎯 Arrangement Tools
- **Drag & Drop**: Move images anywhere on the canvas
- **Resize**: Click and drag the corner handle to resize
- **Rotate**: 90-degree rotation increments
- **Layer Management**: Click to select and bring to front
- **Zoom Controls**: Zoom in/out and reset canvas view

### 📤 Export Options
- **PNG Export**: High-quality PNG with transparency support
- **JPEG Export**: Compressed JPEG format
- **PDF Export**: Professional PDF output

### 🎨 Modern UI
- **Dark Mode**: Automatic theme detection
- **Responsive Design**: Works on desktop and tablet
- **Smooth Animations**: Polished user experience
- **Grid Background**: Visual canvas reference

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ or Bun
- Modern web browser

### Installation

```bash
# Install dependencies
bun install

# Start development server
bun run dev --open
```

The app will open at `http://localhost:5173`

## 🛠️ Tech Stack

- **Framework**: SvelteKit 5
- **Styling**: Tailwind CSS 4
- **Drag & Drop**: Custom implementation with mouse events
- **Export**: html2canvas + jsPDF
- **Icons**: Lucide Svelte
- **Runtime**: Bun

## 📖 Usage

1. **Upload Images**: Click the upload area or drag images onto it
2. **Arrange**: Click and drag images to position them
3. **Resize**: Select an image and drag the corner handle
4. **Rotate**: Click the rotate button when an image is selected
5. **Export**: Click PNG, JPG, or PDF to download your arrangement

## 🎯 Keyboard Shortcuts

- Click canvas to deselect all images
- Click image to select and bring to front

## 🔧 Customization

The app uses Tailwind CSS for styling. You can customize:
- Colors in the component files
- Canvas size in `+page.svelte`
- Export quality in `exportUtils.js`

## 📝 License

MIT

## 🙏 Credits

Built with:
- [SvelteKit](https://kit.svelte.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [html2canvas](https://html2canvas.hertzen.com/)
- [jsPDF](https://github.com/parallax/jsPDF)
- [Lucide Icons](https://lucide.dev/)
