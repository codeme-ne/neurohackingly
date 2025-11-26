// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import { promises as fs } from 'node:fs';
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
      themes: {
        light: 'github-light',
        dark: 'github-dark-dimmed',
      },
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
          server.middlewares.use(async (req, res, next) => {
            if (!req.url?.startsWith('/pagefind/')) {
              next();
              return;
            }

            // Use .vercel/output/static for consistency with production deployment
            // This ensures dev and prod use the same Pagefind index
            const pagefindPath = path.join(__dirname, '.vercel/output/static', req.url);
            const contentTypes = {
              '.js': 'application/javascript',
              '.json': 'application/json',
              '.css': 'text/css',
              '.pf_meta': 'application/octet-stream',
              '.pf_index': 'application/octet-stream',
              '.pf_fragment': 'application/octet-stream'
            };

            try {
              await fs.access(pagefindPath);
              res.setHeader('Content-Type', contentTypes[path.extname(pagefindPath)] || 'application/octet-stream');
              const fileContents = await fs.readFile(pagefindPath);
              res.end(fileContents);
              return;
            } catch (error) {
              const isNotFound =
                typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';
              if (!isNotFound) {
                console.warn(`pagefind-dev-server: unable to serve ${pagefindPath}`, error);
              }
            }

            next();
          });
        }
      }
    ]
  }
});
