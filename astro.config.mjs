// @ts-check
import { defineConfig } from 'astro/config'

import yaml from '@rollup/plugin-yaml'
import expressiveCode from 'astro-expressive-code'
import UnoCSS from 'unocss/astro'

import mdx from '@astrojs/mdx'

import sitemap from '@astrojs/sitemap'

import partytown from '@astrojs/partytown'

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [yaml()],
    build: {
      assetsDir: 'assets',
      cssCodeSplit: true,
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
        },
      },
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['lodash', 'luxon'],
          },
          assetFileNames: 'assets/[name].[hash][extname]',
          chunkFileNames: 'chunks/[name].[hash].js',
          entryFileNames: 'entry/[name].[hash].js',
        },
      },
    },
  },
  compressHTML: true,
  devToolbar: {
    enabled: false,
  },
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport',
  },
  site: 'https://blantonbourbon.github.io',
  scopedStyleStrategy: 'class',
  // trailingSlash: 'always',
  build: {
    format: 'directory',
    inlineStylesheets: 'auto',
    assets: '_astro',
  },
  markdown: {
    shikiConfig: {
      theme: 'everforest-dark',
    },
    syntaxHighlight: 'shiki',
    remarkRehype: {
      footnoteLabel: ' ',
    },
  },

  integrations: [
    UnoCSS({
      injectReset: false,
    }),
    expressiveCode({
      themeCssSelector: (theme) => {
        return '.' + theme.type
      },
      styleOverrides: {
        borderRadius: '0.5rem',
        codeFontFamily:
          '"Google Sans Code", "Fira Code", "JetBrains Mono", Consolas, "Courier New", monospace',
      },
    }),
    mdx(),
    sitemap(),
    partytown({
      config: {
        forward: ['dataLayer.push'],
      },
    }),
  ],
  output: 'static',
})
