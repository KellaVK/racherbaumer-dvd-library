import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // This ensures assets are linked correctly at racherbaumer.kellakruebbe.com
  base: '/', 

  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          firebase: ['firebase/app', 'firebase/firestore', 'firebase/auth'],
          vendor: ['react', 'react-dom', 'react-router-dom', 'fuse.js'],
        },
      },
    },
  },
})