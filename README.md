# RCAT Complaint Form

Static frontend for complaint submission, deployed on GitHub Pages, with Google Apps Script as backend API.

## Project structure

```text
.
|- index.html
|- config.example.js
|- public/
|  |- css/styles.css
|  |- js/script.js
|  `- assets/rcat-logo.jpg
`- .github/workflows/deploy-pages.yml
```

## How runtime config works

This project uses `window.APP_CONFIG` from `config.js`.

- `index.html` loads `config.js` before `public/js/script.js`
- `public/js/script.js` reads `window.APP_CONFIG.API_URL`
- `config.js` is generated during GitHub Actions deploy from repository secret `GAS_API_URL`

Note: the URL is removed from git source code, but it is still visible in the deployed frontend.

## One-time GitHub setup

1. Open your repo on GitHub.
2. Go to `Settings` -> `Secrets and variables` -> `Actions`.
3. Click `New repository secret`.
4. Add this secret:
   - Name: `GAS_API_URL`
   - Value: your Apps Script Web App URL ending with `/exec`
   - Example value:
     `https://script.google.com/macros/s/AKfycbxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx/exec`
5. Go to `Settings` -> `Pages`.
6. In `Build and deployment` -> `Source`, choose `GitHub Actions`.

Important:
- Use `/exec`, not `/dev`.
- Paste only the URL, no quotes.

## Deploy flow

Push to `main` branch.

Workflow `.github/workflows/deploy-pages.yml` will:
1. Validate that `GAS_API_URL` exists.
2. Generate `config.js` from that secret.
3. Build deploy artifact (`dist`).
4. Deploy to GitHub Pages.

## Verify deployment

1. Open `Actions` tab and confirm workflow is green.
2. Open deployed Pages URL.
3. Submit test form once.
4. If form shows `Missing API_URL in config.js`, check that:
   - `GAS_API_URL` secret exists
   - Pages source is set to `GitHub Actions`
   - workflow ran after adding the secret

## Local development

1. Copy `config.example.js` to `config.js`.
2. Put your `/exec` URL in local `config.js`.
3. Run with a static server (for example VS Code Live Server).

`config.js` is ignored by git (`.gitignore`) so local values are not committed.
