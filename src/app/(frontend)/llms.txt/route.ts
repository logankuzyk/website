import { unstable_cache } from 'next/cache'
import config from '@payload-config'
import { createLlmsTxtRouteHandler } from 'payload-plugin-llms-txt/next'
import { llmsTxtOptions } from '@/plugins/llmsTxt'

const handler = createLlmsTxtRouteHandler(config, llmsTxtOptions)

const getLlmsTxt = unstable_cache(
  async () => {
    const response = await handler()
    return response.text()
  },
  ['llms-txt'],
  {
    tags: ['llms-txt'],
  },
)

export async function GET() {
  const text = await getLlmsTxt()

  return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
