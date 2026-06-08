const CACHE_NAME = 'blog-cache-v3'
const RUNTIME_CACHE = 'blog-runtime-v3'

// 静态资源缓存策略
const STATIC_CACHE_URLS = ['/', '/favicon.svg']

// 需要缓存的资源类型
const CACHEABLE_EXTENSIONS = [
  '.css',
  '.js',
  '.woff2',
  '.woff',
  '.ttf',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.svg',
  '.gif',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_CACHE_URLS).catch((err) => {
        console.log('Cache addAll error:', err)
      })
    }),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            return caches.delete(cacheName)
          }
        }),
      )
    }),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // 只处理同源请求
  if (url.origin !== location.origin) {
    return
  }

  // 判断是否是静态资源
  const isStaticAsset = CACHEABLE_EXTENSIONS.some((ext) =>
    url.pathname.endsWith(ext),
  )

  if (isStaticAsset) {
    // 静态资源：缓存优先策略 (Cache First)
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse
        }
        return fetch(request).then((response) => {
          // 只缓存成功的响应
          if (response && response.status === 200) {
            const responseToCache = response.clone()
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseToCache)
            })
          }
          return response
        })
      }),
    )
  } else {
    // HTML 页面：网络优先策略 (Network First)
    event.respondWith(
      fetch(request)
        .then((response) => {
          // 缓存 HTML 页面
          if (response && response.status === 200 && request.method === 'GET') {
            const responseToCache = response.clone()
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseToCache)
            })
          }
          return response
        })
        .catch(() => {
          // 网络失败时返回缓存
          return caches.match(request)
        }),
    )
  }
})
