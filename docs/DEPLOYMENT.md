# Deployment and source ownership

This repository is the portable game source. Production files are the contents of `dist/`. A static host must serve `.mjs` and `.js` as JavaScript and preserve the relative asset paths.

## Existing live game

URL: https://ashvale-hollow.aronew-shop.chatgpt.site

The live game was published through ChatGPT Sites and is currently owner-private. That service has its own source repository, site identity, versioning, and publishing flow. This GitHub import does not replace that identity or alter its audience.

**A GitHub commit does not automatically update the live game.** No deployment workflow or GitHub Pages integration is configured by this import.

To update the existing Site, use its established Sites workflow: open the existing Site, sync the selected reviewed source, validate, save/publish using the existing project identity, and verify the terminal deployment status. Do not create a duplicate Site just because this repository lacks hosting metadata. The original `.openai/hosting.json` is intentionally not included in this portable import; deployment ownership should be resolved through the existing Site, not guessed.

For a separately authorized host, deploy `dist/` using that provider's instructions. A different origin will not have access to the original browser-local save. Plan a save export/import feature before promising automatic progress transfer.

## Provenance

Imported from the Chapter II Sites source snapshot `60aab471df118c0d883a9c489decbcd00a7c6223`. The four production code files and sprite atlas are copied without gameplay changes. Repository tooling and documentation are added here; the migration test is made self-contained using a frozen legacy fixture.

No source credentials, session uploads, reference video, temporary packaging archives, or player saves belong in the repository.
