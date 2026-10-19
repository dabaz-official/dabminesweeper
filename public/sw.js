/**
 * DabMinesweeper service worker.
 *
 * Caches the app shell so the installed PWA opens offline. Hashed build output
 * under /assets/ is immutable, so it is served cache-first; everything else is
 * network-first, which keeps index.html from going stale after a deploy.
 */
const CACHE = 'dabminesweeper-v4'

const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/header-logo.png',
  '/pwa-icon-192.png',
  '/pwa-icon-512.png',
  '/pwa-icon-maskable-192.png',
  '/pwa-icon-maskable-512.png',
]

/**
 * index.html names the hashed bundle, so the precache can cover the build
 * output without a build step. Without this a freshly activated worker would
 * delete the previous cache and then have no JS to serve offline.
 */
async function precacheBundle(cache) {
  const html = await (await cache.match('/index.html')).text()
  const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map(
    (match) => match[1],
  )
  // A single missing asset must not fail the whole install.
  await Promise.all(assets.map((url) => cache.add(url).catch(() => {})))
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then(async (cache) => {
        await cache.addAll(APP_SHELL)
        await precacheBundle(cache)
      })
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  )
})

/**
 * The crossorigin module script sends an Origin header while the install-time
 * precache fetch does not, and the static server answers with `Vary: Origin`.
 * Matching on the full request would therefore never find the cached bundle, so
 * every lookup ignores Vary — this cache only ever holds one variant per URL.
 */
const MATCH = { ignoreVary: true }

async function cacheFirst(request) {
  const cached = await caches.match(request, MATCH)
  if (cached) return cached

  const response = await fetch(request)
  if (response.ok) {
    const cache = await caches.open(CACHE)
    cache.put(request, response.clone())
  }
  return response
}

async function networkFirst(request) {
  try {
    const response = await fetch(request)
    if (response.ok && response.type === 'basic') {
      const cache = await caches.open(CACHE)
      cache.put(request, response.clone())
    }
    return response
  } catch (error) {
    const cached = await caches.match(request, MATCH)
    if (cached) return cached

    if (request.mode === 'navigate') {
      const shell = await caches.match('/index.html', MATCH)
      if (shell) return shell
    }
    throw error
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  event.respondWith(
    url.pathname.startsWith('/assets/') ? cacheFirst(request) : networkFirst(request),
  )
})
