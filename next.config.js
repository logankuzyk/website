import { withPayload } from '@payloadcms/next/withPayload'

import redirects from './redirects.js'

// Base URL for the app. Must match NEXT_PUBLIC_SERVER_URL in production so Image remotePatterns allow the same host.
const serverUrl =
  process.env.NEXT_PUBLIC_SERVER_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : undefined) ||
  process.env.__NEXT_PRIVATE_ORIGIN ||
  'http://localhost:3000'

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '25mb',
    },
  },
  images: {
    remotePatterns: [
      ...[serverUrl].filter(Boolean).map((item) => {
        const url = new URL(item)

        return {
          hostname: url.hostname,
          protocol: url.protocol.replace(':', ''),
        }
      }),
      // Allow R2/CDN URLs for admin panel photo previews when using cloud storage
      ...(process.env.STORAGE_URL
        ? [
            {
              hostname: new URL(process.env.STORAGE_URL).hostname,
              protocol: new URL(process.env.STORAGE_URL).protocol.replace(':', ''),
              // '' when no explicit port (real CDN); set for a local mock on e.g. :9000
              port: new URL(process.env.STORAGE_URL).port,
            },
          ]
        : []),
    ],
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
  output: 'standalone',
  reactStrictMode: true,
  redirects,
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
