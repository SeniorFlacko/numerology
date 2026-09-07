/* GG33 · service worker — app shell offline */
const V='gg33-v2';
const SHELL=['./','./index.html','./manifest.webmanifest',
  './icons/icon-192.png','./icons/icon-512.png','./icons/icon-maskable-512.png','./icons/icon-180.png'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys()
    .then(ks=>Promise.all(ks.filter(k=>k!==V&&k!=='gg33-fonts').map(k=>caches.delete(k))))
    .then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);

  // navegación: red primero, cae al shell cacheado si no hay internet
  if(req.mode==='navigate'){
    e.respondWith(fetch(req).then(r=>{
      const cp=r.clone();caches.open(V).then(c=>c.put('./index.html',cp));return r;
    }).catch(()=>caches.match('./index.html')));
    return;
  }
  // tipografías de Google: cache en uso (stale-while-revalidate)
  if(url.hostname.endsWith('googleapis.com')||url.hostname.endsWith('gstatic.com')){
    e.respondWith(caches.open('gg33-fonts').then(async c=>{
      const hit=await c.match(req);
      const net=fetch(req).then(r=>{c.put(req,r.clone());return r}).catch(()=>hit);
      return hit||net;
    }));
    return;
  }
  // resto del shell: cache primero
  if(url.origin===location.origin){
    e.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(r=>{
      const cp=r.clone();caches.open(V).then(c=>c.put(req,cp));return r;
    }).catch(()=>hit)));
  }
});
