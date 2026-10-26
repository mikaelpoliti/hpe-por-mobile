HPE POR MOBILE – COMPLETE INSTALLATION / UPDATE PACKAGE
=====================================================

Contents:
  index.html          Main application interface
  app.js              Barcode scanning, offline records, Excel download and email
  style.css           Appearance and layout
  sw.js               Offline cache (new version: excel-v4)
  manifest.webmanifest  iPhone home-screen web app metadata
  icon-192.png        App icon
  icon-512.png        App icon

UPDATE AN EXISTING INSTALLATION
-------------------------------
1. IMPORTANT: On your iPhone, open the existing HPE POR Mobile app and use
   'Create complete JSON backup'. Save the backup in Files/iCloud Drive.
   Records are stored in the iPhone's browser storage and are NOT included
   in this installation ZIP.
2. Unzip this package on your computer.
3. Open https://github.com/mikaelpoliti/hpe-por-mobile
4. Upload ALL SEVEN files into the repository ROOT (not a subfolder).
   Replace the existing files with exactly the same filenames.
5. Commit changes and wait for GitHub Pages to deploy.
6. Open https://mikaelpoliti.github.io/hpe-por-mobile/ in Safari on iPhone.
   Reload the page. Close/reopen the home-screen app to load the update.
7. Confirm that 'Download Excel (.xlsx)' is visible and test an export.

DO NOT remove the existing home-screen app or clear Safari website data
before backing up the saved returns. GitHub upload alone cannot install
files directly into an iPhone; the iPhone app is a web app (PWA).

Excel export includes return data but NOT photographs. Keep the JSON backup
for photos and full offline data. Email sharing depends on iOS share support;
if unavailable, download the Excel file and attach it manually in Mail.
