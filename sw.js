// Network-first for everything: always fetch the latest file, fall back to cache only when offline.
// This is what stops an old app.js/styles.css from being served after a new release.
const C="stack-v18.6";
self.addEventListener("install",e=>{self.skipWaiting()});
self.addEventListener("activate",e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener("message",e=>{if(e.data==="skip")self.skipWaiting()});
self.addEventListener("fetch",e=>{
  const r=e.request;
  if(r.method!=="GET"||new URL(r.url).origin!==self.location.origin)return;
  e.respondWith(
    fetch(r,{cache:"no-cache"}).then(res=>{
      if(res&&res.ok){const copy=res.clone();caches.open(C).then(c=>c.put(r,copy))}
      return res;
    }).catch(()=>caches.match(r).then(m=>m||(r.mode==="navigate"?caches.match("index.html"):undefined)).then(m=>m||Response.error()))
  );
});
