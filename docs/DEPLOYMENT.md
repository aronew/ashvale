# Independent hosting

Ashvale is a standalone static browser game. GitHub is the source of truth. It does not require ChatGPT Sites, an OpenAI account, an API key, a database, or a proprietary build service. Optional browser-agent tool registration has been removed from the game runtime.

You can edit it with Claude Code, Codex, any editor, or by hand; run it locally; publish it on a static host you control; or move it to your own server. The original art and game files are in this repository. No license or ownership transfer is required to move your own project to a different host.

## Active public deployment

Activated on 2026-09-17 with the owner's approval. The owner made `aronew/ashvale` public; the game is live at **https://aronew.github.io/ashvale/**. GitHub Pages uses **GitHub Actions**, with repository variable `ASHVALE_PAGES_ENABLED=true`. Every push to `main` runs the tests and checks, then publishes `dist/` if they pass. Pull requests validate without publishing.

First successful public deployment: [Actions run 35184729454](https://github.com/aronew/ashvale/actions/runs/35184729454), source commit `f8c0509196ad37aae59cc643aa30c039fd4443d7`. The public game was opened and its start screen verified. No ChatGPT Sites flow is involved.

To pause future automatic releases, set `ASHVALE_PAGES_ENABLED=false`; this leaves the currently published site online. To take the site offline, use Settings → Pages → Unpublish site. Keep repository visibility and website publication as explicit owner decisions.

## Run locally

```sh
npm run dev
```

Open the printed local address. No dependency installation is necessary. Use an HTTP server, not file://, because the game loads ES modules.

## GitHub Pages: independent publishing workflow

`.github/workflows/pages.yml` runs both test suites and asset/module checks on pushes and pull requests. It produces an `ashvale-standalone` Actions artifact containing only `dist/`, suitable for another static host too.

Deployment is opt-in; the owner has now enabled it for this repository. The setup below is retained for recreating hosting in a fork or another repository:

1. Open the repository's **Settings → Pages** and select **GitHub Actions** as the publishing source.
2. Check that the Pages audience is what you intend. A private source repository does not by itself make a Pages website private; ordinary GitHub Pages sites are public.
3. Open **Actions → Check and publish Ashvale → Run workflow**, choose `main`, and check **publish**. A successful `deploy` job reports the real URL.
4. For automatic publication on later pushes to `main`, set repository Actions variable **`ASHVALE_PAGES_ENABLED`** to **`true`** under Settings → Secrets and variables → Actions → Variables. Remove it or set it to `false` to turn automatic publication off. Manual publication remains available.

The verified public address is `https://aronew.github.io/ashvale/`. For future releases, check the deployment job before claiming an update is live. No custom domain is assumed. This workflow cannot enable the repository's Pages setting or upgrade your GitHub plan.

**Private-repository eligibility:** GitHub Pages on private repositories requires a qualifying plan (such as GitHub Pro). If Settings → Pages offers an upgrade, do not make the repository public as a workaround without the owner's explicit choice. Use another static host or a server under the owner's control instead.

Official references:
- https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
- https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages

## Any other static host

Publish the **contents of `dist/`**, with `index.html` at the site's root. Build command: none. Publish/output directory: `dist`. Serve `.js` and `.mjs` as JavaScript; keep all files under `dist/data/` and the sprite atlas. Relative asset paths also support a subdirectory such as `/ashvale/`.

Run `npm test` and `npm run check` before each release. An authenticated/private host is needed if you want the game itself restricted to selected players. No host account, public audience, or paid service is assumed by this repository.

## Existing ChatGPT Sites copy

The old address, https://ashvale-hollow.aronew-shop.chatgpt.site, is a separate legacy copy retained during migration. The `chatgpt.site` domain cannot be moved to a different hosting provider. Keeping or removing that legacy copy has no effect on the independent game in this repository.

The owner requested a final transitional sync of the current GitHub game to that existing address. Its publication must be verified separately; committing this document is not proof that the sync succeeded. Future GitHub Pages or other-host releases do not use the Sites pipeline. Do not create or republish a Sites copy as part of ordinary development unless the owner requests it.

## Player saves when moving hosts

Saves use browser localStorage key `ashvale-adventure-v1` and are scoped to an origin. Moving to a new domain does not automatically transfer saves. The game still has no save-import UI. Keep the old origin available while planning validated export/import if preserving those saves matters; never promise automatic migration or reset them incidentally.

## History

The initial repository import came from Sites source snapshot `60aab471df118c0d883a9c489decbcd00a7c6223`. Claude subsequently expanded the game and rebuilt combat animation; this independent-hosting handoff starts from GitHub commit `6080b6e37fa5600470aa405a138378d05cb38b82`.
