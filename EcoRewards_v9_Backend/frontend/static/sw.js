/* Cache only application shell files. Data, logins, and uploaded photos always come from server. */
const CACHE='ecorewards-shell-organized-v5';
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(['/static/style.css','/static/app.js','/static/icon-192.png']))));
self.addEventListener('fetch',event=>{const u=new URL(event.request.url);if(u.pathname.startsWith('/static/')&&event.request.method==='GET'){event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request)));}});
