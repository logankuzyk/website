import { unstable_cache } from 'next/cache'
import config from '@payload-config'
import { createLlmsFullTxtRouteHandler } from 'payload-plugin-llms-txt/next'
import { llmsTxtOptions } from '@/plugins/llmsTxt'

const handler = createLlmsFullTxtRouteHandler(config, llmsTxtOptions)

const getLlmsFullTxt = unstable_cache(
  async () => {
    const response = await handler()
    return response.text()
  },
  ['llms-full-txt'],
  {
    tags: ['llms-full-txt'],
  },
)

export async function GET() {
  const text = await getLlmsFullTxt()

  return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
