import type { CollectionConfig } from 'payload'

import {
  FixedToolbarFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'
import path from 'path'
import { fileURLToPath } from 'url'

import { anyone } from '../access/anyone'
import { authenticated } from '../access/authenticated'
import { appendPrefixToCollectionBeforeChangeHook } from '../hooks/uploadPrefixed'
import { revalidateDelete, revalidatePhoto } from './Photos/hooks/revalidatePhoto'
import { transcodeHeicUpload } from './Photos/hooks/transcodeHeicUpload'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export const Photos: CollectionConfig = {
  slug: 'photos',
  admin: {
    useAsTitle: 'filename',
    defaultColumns: ['filename', 'alt', 'tags', 'updatedAt'],
  },
  folders: true,
  hooks: {
    beforeOperation: [transcodeHeicUpload],
    beforeChange: [appendPrefixToCollectionBeforeChangeHook('photos')],
    afterChange: [revalidatePhoto],
    afterDelete: [revalidateDelete],
  },
  access: {
    create: authenticated,
    delete: authenticated,
    read: anyone,
    update: authenticated,
  },
  fields: [
    {
      name: 'tags',
      type: 'relationship',
      relationTo: 'photo-tags',
      hasMany: true,
      admin: {
        description: 'Tags for filtering in photo galleries',
      },
    },
    {
      name: 'location',
      type: 'relationship',
      relationTo: 'locations',
      admin: {
        description: 'Location where the photo was taken. Used for filtering in collections.',
      },
    },
    {
      name: 'alt',
      type: 'text',
      //required: true,
    },
    {
      name: 'caption',
      type: 'richText',
      editor: lexicalEditor({
        features: ({ rootFeatures }) => {
          return [...rootFeatures, FixedToolbarFeature(), InlineToolbarFeature()]
        },
      }),
    },
    {
      name: 'showInNewTab',
      type: 'checkbox',
      defaultValue: false,
      index: true,
      admin: {
        position: 'sidebar',
        description: 'Include in the browser new tab rotation',
      },
    },
  ],
  upload: {
    // Upload to the public/photos directory in Next.js making them publicly accessible even outside of Payload
    staticDir: path.resolve(dirname, '../../public/photos'),
    // Accept any raster photo format. Decode relies on the *system* libvips in the Docker
    // image (see Dockerfile) — the npm-bundled sharp binary can't decode 10-bit/HDR AVIF
    // (no high-bit-depth AV1) or HEVC HEIC (no libde265). HEIC/HEIF is transcoded to JPEG on
    // ingest by the `transcodeHeicUpload` beforeOperation hook so it gets renditions. SVG is
    // intentionally excluded (rasterizing untrusted SVG is a security risk). Payload still
    // sniffs magic bytes, so a spoofed extension is rejected.
    mimeTypes: [
      'image/jpeg',
      'image/pjpeg',
      'image/png',
      'image/webp',
      'image/avif',
      'image/gif',
      'image/tiff',
      'image/heic',
      'image/heif',
    ],
    // The max upload size is set globally via `config.upload.limits.fileSize` in payload.config.ts.
    // The pristine upload is stored untouched (no top-level formatOptions) so the original
    // format/quality is preserved for archival and the separate "download other formats" task.
    // Only the generated `imageSizes` below are converted to an optimized web format.
    // Payload calls sharp().rotate() internally, so EXIF orientation is already normalized.
    // Use a function when R2 is enabled: string adminThumbnail causes Payload to fall back to /api/...
    // URLs which don't work with disablePayloadAccessControl. See payloadcms/payload#12659
    adminThumbnail:
      process.env.R2_BUCKET && process.env.STORAGE_URL
        ? ({ doc }) => {
            const sizes = doc?.sizes as Record<string, { url?: string; filename?: string }> | undefined
            const thumbnail = sizes?.thumbnail
            if (thumbnail?.url) return thumbnail.url
            if (thumbnail?.filename) {
              const baseUrl = process.env.STORAGE_URL!.replace(/\/$/, '')
              return [baseUrl, 'photos', encodeURIComponent(thumbnail.filename)].join('/')
            }
            return false
          }
        : 'thumbnail',
    focalPoint: true,
    // NOTE: do not set a top-level `resizeOptions` here. It applies to the *original*, not to
    // the `imageSizes` ladder, and its mere presence makes Payload run the pristine upload
    // through sharp — re-encoding it at sharp's default quality and stripping EXIF. Sparse
    // sizes ("skip a rendition when the source is smaller in both dimensions") are already
    // Payload's default per-size behaviour, so the frontend must tolerate missing entries in
    // `sizes` regardless (see buildImageSrcSet).
    // Every generated size is re-encoded to WebP for delivery. WebP is chosen over AVIF for
    // the conversion step because encode is ~10x faster (matters for bulk photo uploads and
    // the backfill), while still ~25-35% smaller than JPEG at equivalent quality. Serving AVIF
    // as an additional <picture> source is a tracked follow-up. `quality` climbs with size
    // since compression artifacts are more visible on larger renders.
    imageSizes: [
      {
        name: 'thumbnail',
        width: 300,
        formatOptions: { format: 'webp', options: { quality: 70 } },
      },
      {
        name: 'square',
        width: 500,
        height: 500,
        formatOptions: { format: 'webp', options: { quality: 72 } },
      },
      {
        name: 'small',
        width: 600,
        formatOptions: { format: 'webp', options: { quality: 74 } },
      },
      {
        name: 'medium',
        width: 900,
        formatOptions: { format: 'webp', options: { quality: 78 } },
      },
      {
        name: 'large',
        width: 1400,
        formatOptions: { format: 'webp', options: { quality: 80 } },
      },
      {
        name: 'xlarge',
        width: 1920,
        formatOptions: { format: 'webp', options: { quality: 82 } },
      },
      {
        // Social/OG card. Kept as JPEG: some link-unfurlers (iMessage, older crawlers) still
        // choke on WebP/AVIF, and the source here may itself be AVIF/HEIC.
        name: 'og',
        width: 1200,
        height: 630,
        crop: 'center',
        formatOptions: { format: 'jpeg', options: { quality: 82, progressive: true } },
      },
    ],
  },
}
