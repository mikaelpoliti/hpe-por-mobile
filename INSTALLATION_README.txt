HPE POR Mobile v6 - Auto-update fix

1. Back up your saved returns in the existing iPhone app first.
2. Extract this ZIP on your computer.
3. Upload index.html, app.js, sw.js, style.css, manifest.webmanifest, icon-192.png and icon-512.png to the ROOT of github.com/mikaelpoliti/hpe-por-mobile (main).
4. Commit changes. Wait for successful Pages deployment.
5. Open https://mikaelpoliti.github.io/hpe-por-mobile/ online in Safari and refresh once or twice to allow old service worker to be replaced.
6. Thereafter new online visits prefer network files, with offline fallback.

Do not delete the iPhone app or clear website data; returns are stored locally.
