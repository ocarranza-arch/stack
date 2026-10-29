const C="stack-v13";
self.addEventListener("install",e=>{self.skipWaiting()});
self.addEventListener("activate",e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener("fetch",e=>{
  const r=e.request;
  if(r.method!=="GET")return;
  if(r.mode==="navigate"){
    e.respondWith(fetch(r).then(res=>{caches.open(C).then(c=>c.put(r,res.clone()));return res}).catch(()=>caches.match(r).then(m=>m||caches.match("index.html"))));
    return;
  }
  e.respondWith(caches.match(r).then(m=>m||fetch(r).then(res=>{caches.open(C).then(c=>c.put(r,res.clone()));return res})));
});
