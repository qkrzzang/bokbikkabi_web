const CACHE_NAME = 'bokbikkabi-v1'
const STATIC_ASSETS = [
  '/',
  '/images/bokbikkabi_icon.png',
]

// 설치 시 기본 에셋 캐싱
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS)
    })
  )
  self.skipWaiting()
})

// 활성화 시 이전 캐시 삭제
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    })
  )
  self.clients.claim()
})

// 네트워크 우선, 실패 시 캐시 폴백
self.addEventListener('fetch', (event) => {
  // API 요청이나 POST 등은 캐싱하지 않음
  if (
    event.request.method !== 'GET' ||
    event.request.url.includes('/rest/v1/') ||
    event.request.url.includes('/auth/') ||
    event.request.url.includes('/rpc/')
  ) {
    return
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // 정상 응답이면 캐시에 저장
        if (response.status === 200) {
          const responseClone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone)
          })
        }
        return response
      })
      .catch(() => {
        // 네트워크 실패 시 캐시에서 반환
        return caches.match(event.request)
      })
  )
})
