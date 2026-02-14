# RCAT Complaint Form (React)

React + Vite frontend for complaint submission, deployed to GitHub Pages from a `gh-pages` branch (no GitHub Actions).

## Project structure

```text
.
|- index.html
|- package.json
|- vite.config.js
|- src/
|  |- App.jsx
|  |- main.jsx
|  `- index.css
`- public/
   |- assets/rcat-logo.jpg
   `- config.example.js
```

## API config

This app reads API URL from either:

1. `VITE_API_URL` (build-time env), or
2. `window.APP_CONFIG.API_URL` from `public/config.js`

Recommended for this repo:

1. Copy `public/config.example.js` to `public/config.js`
2. Put your Google Apps Script `/exec` URL in `public/config.js`

`public/config.js` is ignored by git, so your local value is not committed.

## Local development

1. Install dependencies:
   - `npm install`
2. Create runtime config:
   - `Copy-Item public/config.example.js public/config.js`
3. Start dev server:
   - `npm run dev`

## Deploy to GitHub Pages (branch, no Actions)

1. First-time GitHub Pages setting:
   - Go to `Settings` -> `Pages`
   - In `Build and deployment` -> `Source`, choose `Deploy from a branch`
   - Branch: `gh-pages`
   - Folder: `/ (root)`
2. Deploy from local machine:
   - `npm run deploy`

`npm run deploy` will:
1. Build with Vite (`dist/`)
2. Push `dist/` content to branch `gh-pages`

## Notes

- Use `/exec`, not `/dev`, for Apps Script URL.
- Like any frontend config, API URL is visible in deployed client code.
