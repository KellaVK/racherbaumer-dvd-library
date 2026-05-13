import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // This ensures assets are linked correctly at racherbaumer.kellakruebbe.com
  base: '/', 

  build: {
    outDir: 'dist',
    // Optional: This ensures the build is clean every time
    emptyOutDir: true,
  },
})