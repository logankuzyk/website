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
import { getServerSideURL } from './utilities/getURL'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

// The Photos pipeline accepts AVIF/HEIC/HEIF uploads, which requires a sharp binary built
// with libheif. Prebuilt sharp includes it, but a stripped/rebuilt binary in a container
// would silently reject every such upload — warn loudly at startup instead.
if (!sharp.format.heif?.input?.buffer) {
  console.warn(
    '[media] sharp was built without HEIF/AVIF decode support — AVIF and HEIC photo uploads will be rejected.',
  )
}

export default buildConfig({
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
