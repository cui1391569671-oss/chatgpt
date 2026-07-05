
self.addEventListener('install', e=>{
  e.waitUntil(
    caches.open('news-cache').then(c=>{
      return c.addAll([
        './',
        './index.html',
        './style.css',
        './app.js',
        './config.js'
      ]);
    })
  );
});

self.addEventListener('fetch', e=>{
  e.respondWith(
    caches.match(e.request).then(r=>r||fetch(e.request))
  );
});
