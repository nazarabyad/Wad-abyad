const C='haj-v1',F=['./','index.html','manifest.json','firebase-config.js'];
self.addEventListener('install',e=>e.waitUntil(caches.open(C).then(c=>c.addAll(F))));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||!e.request.url.startsWith(self.location.origin))return;
e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)))});
