# Astro Starter Kit: Minimal

```sh
npm create astro@latest -- --template minimal
```

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
├── src/
│   └── pages/
│       └── index.astro
└── package.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).

## Newsletter (Kit) setup

- API routes require non-static output. This repo uses `output: 'hybrid'` in `astro.config.mjs` so `/api/subscribe` runs on Vercel as a serverless function.
- Create `.env.local` and set:

```
# Prefer this on the server
KIT_API_SECRET=your_convertkit_api_secret

# Or use API key if you don't have the secret
# KIT_API_KEY=your_convertkit_api_key

# Subscribe target
KIT_FORM_ID=your_convertkit_form_id
# Or, alternatively:
# KIT_TAG_ID=your_convertkit_tag_id
```

- Production: set the same variables in Vercel → Project Settings → Environment Variables.
- The endpoint at `src/pages/api/subscribe.ts` supports both Form-based and Tag-based subscription and includes a honeypot + simple rate limiting. Forms on the homepage and newsletter page add a hidden `source` field for basic attribution.
