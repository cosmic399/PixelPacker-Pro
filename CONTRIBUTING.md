# 🛠 Contributing to Image Arranger

Welcome to the team. We are building the most efficient Image Arranger for professional A4 layouts. If you're here to help, follow these rules. If you break the build, your PR will be closed immediately.

## 🚀 How to Get Started

1. **Find an Issue:** Check our [Issues](https://github.com/cosmic399/image-arranger-P1/issues) for tags like `good first issue` or `help wanted`.
2. **Fork the Repo:** Click the 'Fork' button at the top right.
3. **Clone & Install:**
```bash
git clone https://github.com/YOUR_USERNAME/image-arranger-P1.git
cd image-arranger-P1
bun install
```

4. **Create a Branch:** `git checkout -b feat/your-feature-name`

## 🏗 Coding Standards (Read Carefully)

* **Stack:** This is a **SvelteKit 5** project using **Tailwind CSS 4**.
* **State:** Use Svelte 5 `$state` and `$derived` runes. Do not use old Svelte 4 stores unless absolutely necessary.
* **Package Manager:** We use **Bun**. Do **NOT** commit `package-lock.json` or `yarn.lock`. Only `bun.lock`.
* **The "Export" Rule:** Every UI change must be tested against the `Export PNG/PDF` functionality. If the exported image doesn't match the canvas, the code is broken.

## 📥 Submitting Changes

1. **Push to your fork:** `git push origin feat/your-feature-name`
2. **Open a Pull Request:** Point your branch to our `main` branch.
3. **The Review:** The maintainer (@cosmic399) will review your code. Be prepared for direct feedback.
