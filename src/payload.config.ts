import { mongooseAdapter } from '@payloadcms/db-mongodb'
import sharp from 'sharp'
import path from 'path'
import { buildConfig, PayloadRequest } from 'payload'
import { fileURLToPath } from 'url'

import { Career } from './collections/Career'
import { Categories } from './collections/Categories'
import { Locations } from './collections/Locations'
import { Photos } from './collections/Photos'
import { PhotoCollections } from './collections/PhotoCollections'
import { Tags } from './collections/Tags'
import { Pages } from './collections/Pages'
import { Posts } from './collections/Posts'
import { Projects } from './collections/Projects'
import { Users } from './collections/Users'
import { Footer } from './Footer/config'
import { Header } from './Header/config'
import { Site } from './globals/Site/config'
import { plugins } from './plugins'
import { defaultLexical } from '@/fields/defaultLexical'
import { fileUploadErrorResponse } from './hooks/fileUploadErrorResponse'
import { probeImageDecoders } from './utilities/imageDecodeProbe'
import { getServerSideURL } from './utilities/getURL'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

// musl (Alpine) has a small stack; run the system libvips without the operation cache to
// stay clear of stack-overflow edge cases. Photo processing here is one-shot per image, so
// the cache buys little anyway.
sharp.cache(false)

export default buildConfig({
  // Re-shape sharp's bare `FileUploadError` so the admin BulkUpload drawer counts an
  // undecodable image as a failed file instead of a silent success.
  hooks: {
    afterError: [fileUploadErrorResponse],
  },
  // Verify at boot that the runtime can actually decode the formats the Photos pipeline
  // accepts. `sharp.format.heif.input` being truthy only means "accepts a HEIF container";
  // it does not prove a high-bit-depth AV1 or HEVC decoder is present.
  onInit: async (payload) => {
    for (const result of await probeImageDecoders()) {
      if (!result.ok) {
        payload.logger.error(
          `[media] cannot decode ${result.format} — image likely built without system libvips ` +
            `(see Dockerfile); such uploads will fail. ${result.error}`,
        )
      }
    }
  },
  admin: {
    components: {
      // The `BeforeLogin` component renders a message that you see while logging into your admin panel.
      // Feel free to delete this at any time. Simply remove the line below.
      beforeLogin: ['@/components/BeforeLogin'],
      // The `BeforeDashboard` component renders the 'welcome' block that you see after logging into your admin panel.
      // Feel free to delete this at any time. Simply remove the line below.
      beforeDashboard: ['@/components/BeforeDashboard'],
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
    user: Users.slug,
    livePreview: {
      breakpoints: [
        {
          label: 'Mobile',
          name: 'mobile',
          width: 375,
          height: 667,
        },
        {
          label: 'Tablet',
          name: 'tablet',
          width: 768,
          height: 1024,
        },
        {
          label: 'Desktop',
          name: 'desktop',
          width: 1440,
          height: 900,
        },
      ],
    },
  },
  // This config helps us configure global or default features that the other editors can inherit
  editor: defaultLexical,
  db: mongooseAdapter({
    url: process.env.DATABASE_URL || '',
  }),
  collections: [Pages, Posts, Photos, Categories, Users, Projects, Career, Tags, Locations, PhotoCollections],
  cors: [getServerSideURL()].filter(Boolean),
  globals: [Header, Footer, Site],
  plugins,
  secret: process.env.PAYLOAD_SECRET,
  sharp,
  // Multipart parser limit for uploads (Photos accepts high-res originals + phone HEIC/AVIF).
  // Uploads are buffered in memory; fine for single-user admin use. If bulk uploads ever
  // pressure RAM, add `useTempFiles: true` with an explicit writable `tempFileDir`.
  // NOTE: a reverse proxy in front of the app (infra Nginx) needs a matching body limit.
  upload: {
    limits: {
      fileSize: 75 * 1024 * 1024, // 75 MB
    },
  },
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  jobs: {
    access: {
      run: ({ req }: { req: PayloadRequest }): boolean => {
        // Allow logged in users to execute this endpoint (default)
        if (req.user) return true

        const secret = process.env.CRON_SECRET
        if (!secret) return false

        // If there is no logged in user, then check
        // for the Vercel Cron secret to be present as an
        // Authorization header:
        const authHeader = req.headers.get('authorization')
        return authHeader === `Bearer ${secret}`
      },
    },
    tasks: [],
  },
})
