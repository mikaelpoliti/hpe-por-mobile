const CACHE='hpe-por-mobile-v3';
const ASSETS=['./','./index.html','./style.css','./app.js','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('hpe-por-mobile-')&&key!==CACHE).map(key=>caches.delete(key)))),self.clients.claim()])));
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const url=new URL(event.request.url);
 const sameOrigin=url.origin===self.location.origin;
 const scannerLibrary=url.href==='https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js';
 if(!sameOrigin&&!scannerLibrary)return;
 event.respondWith(caches.match(event.request,{ignoreSearch:sameOrigin}).then(cached=>cached||fetch(event.request).then(response=>{
   if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy)).catch(()=>{});}
   return response;
 })));
});
