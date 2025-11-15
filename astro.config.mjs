// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://astro.build/config
export default defineConfig({
  site: 'https://neurohackingly.com',
  output: 'server',
  adapter: vercel({
    webAnalytics: {
      enabled: true
    }
  }),
  integrations: [mdx(), sitemap()],
  markdown: {
    shikiConfig: {
      theme: 'github-dark-dimmed',
      wrap: true
    }
  },
  vite: {
    build: {
      rollupOptions: {
        external: ['/pagefind/pagefind.js']
      }
    },
    server: {
      fs: {
        // Allow serving files from project root and dist directory
        allow: [__dirname]
      }
    },
    plugins: [
      {
        name: 'pagefind-dev-server',
        resolveId(id) {
          // Tell Vite to treat /pagefind/pagefind.js as external
          if (id === '/pagefind/pagefind.js' || id.startsWith('/pagefind/')) {
            return { id, external: 'absolute' };
          }
        },
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url?.startsWith('/pagefind/')) {
              const pagefindPath = path.join(__dirname, 'dist', req.url);
              if (fs.existsSync(pagefindPath)) {
                const ext = path.extname(pagefindPath);
                const contentTypes = {
                  '.js': 'application/javascript',
                  '.json': 'application/json',
                  '.css': 'text/css',
                  '.pf_meta': 'application/octet-stream',
                  '.pf_index': 'application/octet-stream',
                  '.pf_fragment': 'application/octet-stream'
                };
                res.setHeader('Content-Type', contentTypes[ext] || 'application/octet-stream');
                res.end(fs.readFileSync(pagefindPath));
                return;
              }
            }
            next();
          });
        }
      }
    ]
  }
});
