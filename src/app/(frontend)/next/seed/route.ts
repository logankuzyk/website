import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { headers } from 'next/headers'
import { spawn } from 'child_process'

export const maxDuration = 60 // This function can run for a maximum of 60 seconds
export const dynamic = 'force-dynamic'

export async function POST(): Promise<Response> {
  const payload = await getPayload({ config: configPromise })
  const requestHeaders = await headers()

  // Authenticate by passing request headers
  let { user } = await payload.auth({ headers: requestHeaders })

  // Dev-only: when DB has no users, create admin and allow seed
  if (!user && process.env.NODE_ENV === 'development') {
    const { docs } = await payload.find({
      collection: 'users',
      limit: 1,
      overrideAccess: true,
    })
    if (docs.length === 0) {
      user = await payload.create({
        collection: 'users',
        data: {
          email: 'admin@example.com',
          password: 'password',
          name: 'Admin',
        },
        overrideAccess: true,
      })
    }
  }

  if (!user) {
    return new Response('Action forbidden.', { status: 403 })
  }

  // Run seed in a separate process to avoid MongoNotConnectedError when Next.js
  // HMR compiles during the long-running request (compilation drops the connection)
  try {
    const result = await new Promise<{ success: boolean; error?: string }>((resolve) => {
      const projectRoot = process.cwd()
      const child = spawn('npm', ['run', 'seed'], {
        cwd: projectRoot,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, NODE_ENV: process.env.NODE_ENV || 'development' },
      })

      let stderr = ''
      child.stderr?.on('data', (d) => { stderr += d.toString() })
      child.on('close', (code) => {
        resolve(code === 0 ? { success: true } : { success: false, error: stderr })
      })
      child.on('error', (err) => {
        resolve({ success: false, error: err.message })
      })
    })

    if (result.success) {
      return Response.json({ success: true })
    }
    payload.logger.error({ err: result.error, message: 'Error seeding data' })
    return new Response('Error seeding data.', { status: 500 })
  } catch (e) {
    payload.logger.error({ err: e, message: 'Error seeding data' })
    return new Response('Error seeding data.', { status: 500 })
  }
}
