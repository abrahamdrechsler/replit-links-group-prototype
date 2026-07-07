# Deployment Configuration

## Fixed Deployment Issues

The deployment issue has been resolved by creating a custom build script that properly organizes files for static deployment.

### Problem
- Vite was building to `dist/public` directory
- Deployment expected `index.html` directly in `dist` directory
- This caused deployment failures due to mismatched directory structure

### Solution
Created `build.sh` script that:
1. Builds frontend with Vite (outputs to `dist/public`)
2. Builds backend with esbuild (outputs to `dist`)
3. Moves all files from `dist/public/*` to `dist/`
4. Removes the now-empty `dist/public` directory

### Usage

For deployment, use the build script:
```bash
./build.sh
```

This ensures:
- ✅ `index.html` is in the root of the `dist` directory
- ✅ Assets are properly organized in `dist/assets/`
- ✅ Backend server file is at `dist/index.js`
- ✅ Directory structure matches deployment requirements

### File Structure After Build
```
dist/
├── index.html          # Frontend entry point
├── index.js           # Backend server
└── assets/           # Frontend assets (CSS, JS, etc.)
    ├── index-*.css
    └── index-*.js
```

The deployment should now work correctly with the standard Replit deployment process.