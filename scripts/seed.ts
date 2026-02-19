/**
 * Standalone seed script - runs outside Next.js to avoid MongoNotConnectedError
 * when Next.js HMR/compilation disrupts the MongoDB connection during long-running seed.
 *
 * Usage: npm run seed
 */
import 'dotenv/config'
import { createLocalReq, getPayload } from 'payload'
import config from '../src/payload.config'
import { seed } from '../src/endpoints/seed/index.js'

async function main() {
  const payload = await getPayload({ config })

  // Create admin user for the seed request context
  const { docs } = await payload.find({
    collection: 'users',
    limit: 1,
    overrideAccess: true,
  })

  const user =
    docs[0] ??
    (await payload.create({
      collection: 'users',
      data: {
        email: 'admin@example.com',
        password: 'password',
        name: 'Admin',
      },
      overrideAccess: true,
    }))

  const req = await createLocalReq({ user }, payload)

  await seed({ payload, req })
  console.log('Seeded database successfully!')
  process.exit(0)
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
