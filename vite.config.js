import { defineConfig } from 'vite'
import { resolve } from 'path'
import { readdirSync, existsSync, copyFileSync, mkdirSync } from 'fs'

// Plugin to copy raw sketch files to dist (they use global mode, not ES modules)
function copySketchesPlugin() {
  return {
    name: 'copy-sketches',
    writeBundle() {
      const sketchesDir = resolve(__dirname, 'src/sketches')
      const outDir = resolve(__dirname, 'dist/sketches')

      if (!existsSync(sketchesDir)) return

      const folders = readdirSync(sketchesDir, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name)

      for (const folder of folders) {
        const srcPath = resolve(sketchesDir, folder, 'sketch.js')
        if (existsSync(srcPath)) {
          const destDir = resolve(outDir, folder)
          mkdirSync(destDir, { recursive: true })
          copyFileSync(srcPath, resolve(destDir, 'sketch.js'))
        }
      }
    }
  }
}

export default defineConfig({
  server: {
    allowedHosts: ['host.docker.internal', 'localhost']
  },
  plugins: [copySketchesPlugin()]
})
