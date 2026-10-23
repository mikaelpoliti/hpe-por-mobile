HPE POR MOBILE - VERSION 1

INSTALLATION
1. Lagg alla filer i samma mapp pa en IT-godkand HTTPS-webbserver. Appen kan inte installeras som offline-PWA direkt fran en ZIP eller file:// pa iPhone.
2. Oppna HTTPS-adressen i Safari pa iPhone medan du har internet.
3. Tryck Dela > Lagg till pa hemskarmen. Starta appen en gang online.
4. Registrera en retur, lagg till bilder, valfritt GPS och spara offline.
5. Klicka Email all saved returns. Om iOS erbjuder delning av ZIP-filen valjer du Mail eller Outlook och anger mikael.politi@hemmersbach.com. Om delning av filer inte erbjuds laddar appen ned ZIP och oppnar ett mejlutkast; bifoga ZIP-filen manuellt.

VIKTIGT
- Appen skickar INTE mejl automatiskt. Anvandaren granskar och skickar sjalv.
- Befintlig HPE POR pa kontoret importerar bara CSV-kolumn A och B. Den kan alltsa importera POR_Import.csv, men kommer INTE automatiskt att importera bilder, GPS, plats eller ovriga falt. Detta kraver en separat kontorsuppdatering.
- Streckkodslasning anvander webblasaren BarcodeDetector API. Stod varierar mellan iOS/Safari-versioner. Om den inte finns maste koden skrivas in manuellt.
- Offlinefoton sparas i IndexedDB. Ta regelbundna exporter. iOS kan rensa webbplatsdata; radering av app/webbplatsdata kan radera sparade poster.
- HTTPS kravs for kamera, GPS och offlineinstallation.
- Anvand endast efter godkannande enligt arbetsgivarens IT- och informationssakerhetspolicy. Personliga e-postkonton och publik oskyddad hosting ar inte lampliga for foretagsdata.
- For synkning med kontorets register maste en behorig person importera filen i kontorsappen. E-post i sig synkroniserar inte databasen.
