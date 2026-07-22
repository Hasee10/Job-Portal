import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  async headers() {
    return [
      {
        // Apply these headers to all routes
        source: '/:path*',
        headers: [
          {
            key: 'X-Robots-Tag',
            value:
              'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
          },
          // Prevent the site from being framed by another origin (clickjacking).
          { key: 'X-Frame-Options', value: 'DENY' },
          // Stop browsers from MIME-sniffing a response away from its declared Content-Type.
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Only send the origin (not full URL/path) on cross-origin navigations/requests.
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Force HTTPS for a year, including subdomains, once first seen over HTTPS.
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          // Disable browser features this site never needs.
          {
            key: 'Permissions-Policy',
            value:
              'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
          },
          // Baseline CSP: blocks framing, restricts script/style/connect origins
          // to self plus the Umami analytics endpoint, disallows plugins/objects.
          // img-src stays broad (https:) since job data comes from many external
          // sources with arbitrary logo/OG-image hosts. 'unsafe-eval' is added
          // only in dev - Next's webpack/HMR runtime loads modules via eval()
          // in development, which a strict CSP otherwise silently blocks (no
          // client JS runs at all, but no visible error without checking the
          // console). Production builds don't eval(), so prod stays strict.
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              `script-src 'self' 'unsafe-inline'${
                process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''
              }`,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "connect-src 'self'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
      {
        // Apply specific headers to image files
        source: '/:path*.jpg',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'index, max-image-preview:large',
          },
        ],
      },
      {
        // Apply specific headers to image files
        source: '/:path*.jpeg',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'index, max-image-preview:large',
          },
        ],
      },
      {
        // Apply specific headers to image files
        source: '/:path*.png',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'index, max-image-preview:large',
          },
        ],
      },
      {
        // Apply specific headers to image files
        source: '/:path*.svg',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'index, max-image-preview:large',
          },
        ],
      },
      {
        // Apply specific headers to PDF files
        source: '/:path*.pdf',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'index, nosnippet',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
