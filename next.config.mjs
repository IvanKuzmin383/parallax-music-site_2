/** @type {import('next').NextConfig} */
// Libvips (Sharp): без лимита параллельные /_next/image + обложки забивают все ядра cgroup → сайт «висит».
// Задаём до старта сервера; переопределить можно в панели хостинга (VIPS_CONCURRENCY).
if (typeof process !== "undefined") {
  process.env.VIPS_CONCURRENCY ??= "1"
  process.env.LIBVIPS_CONCURRENCY ??= "1"
}

// CSP: allow Yandex Metrica + Mail.Ru + Cloudflare Turnstile (loads Google closure / bubble_compiled).
// trusted-types * allow-duplicates - Metrika registers a random policy name; Turnstile needs goog#html.
// If the host (e.g. Cloudflare) adds a second CSP header with its own trusted-types, relax it there too
// or only one combined policy applies per directive depending on the proxy.
const cspDirectives = [
  "default-src 'self'",
  [
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
    'https://challenges.cloudflare.com',
    'https://mc.yandex.ru',
    'https://mc.yandex.com',
    'https://yastatic.net',
    'https://top-fwz1.mail.ru',
    'https://www.google.com',
    'https://www.gstatic.com',
  ].join(' '),
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https: https://mc.yandex.ru",
  "font-src 'self' data:",
  [
    "connect-src 'self'",
    'https://mc.yandex.ru',
    'https://mc.yandex.com',
    'https://yandex.ru',
    'wss://mc.yandex.ru',
    'wss://mc.yandex.com',
    'https://challenges.cloudflare.com',
    'https://top-fwz1.mail.ru',
  ].join(' '),
  [
    "frame-src 'self'",
    'https://challenges.cloudflare.com',
    'https://mc.yandex.ru',
    'https://mc.yandex.com',
    'https://webvisor.com',
    'https://*.webvisor.com',
    'https://www.google.com',
    'https://www.gstatic.com',
  ].join(' '),
  "worker-src 'self' blob: https://challenges.cloudflare.com",
  "frame-ancestors 'self' https://metrika.yandex.ru https://metrika.yandex.by https://metrica.yandex.com https://metrica.yandex.com.tr https://webvisor.com https://*.webvisor.com",
  'trusted-types * allow-duplicates',
].join('; ')

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: cspDirectives,
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    // Turnstile / challenge iframes may probe WebXR; allow all origins for this feature only.
    value: 'camera=(), microphone=(), geolocation=(), xr-spatial-tracking=*',
  },
]

const nextConfig = {
  // Удалено ignoreBuildErrors для безопасности типов
  reactStrictMode: true,
  experimental: {
    proxyClientMaxBodySize: '80mb',
  },
  compress: true,
  poweredByHeader: false,
  images: {
    formats: ['image/avif', 'image/webp'],
    // Меньше вариантов ширины → меньше холодных прогонов Sharp на /_next/image (CPU + диск).
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/svg logo partners/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400',
          },
        ],
      },
    ]
  },
}

export default nextConfig
