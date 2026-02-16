import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  build: {
    // Code splitting configuration
    rollupOptions: {
      output: {
        // Manual chunks for better control over bundle splitting
        manualChunks: {
          // Vendor libraries
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['recharts', 'lucide-react', 'react-window'],
          'vendor-socket': ['socket.io-client'],
          
          // Feature-based chunks
          'pages-reports': [
            './src/pages/ReportsPage.jsx',
            './src/pages/ScheduledReportsPage.jsx',
          ],
          'pages-bugs': [
            './src/pages/BugsPage.jsx',
            './src/pages/BugDetailsPage.jsx',
            './src/pages/BugCreationForm.jsx',
          ],
          'pages-tests': [
            './src/pages/TestSuitesPage.jsx',
            './src/pages/TestSuiteCreatePage.jsx',
            './src/pages/TestSuiteDetailPage.jsx',
            './src/pages/SuiteRunDetailPage.jsx',
          ],
        },
      },
    },
    // Chunk size warnings threshold
    chunkSizeWarningLimit: 1000,
    // Minify configuration for smaller bundle
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
});

