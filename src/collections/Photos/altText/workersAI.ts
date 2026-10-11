// Workers AI over REST: the site runs in Docker, not on Workers, so there is no `env.AI` binding.
// https://developers.cloudflare.com/workers-ai/models/moondream3.1-9B-A2B/
export const ALT_TEXT_MODEL = '@cf/moondream/moondream3.1-9B-A2B'

const REQUEST_TIMEOUT_MS = 20_000

type WorkersAIResponse = {
  errors?: { code?: number; message?: string }[]
  result?: { answer?: string | null; finish_reason?: string }
  success?: boolean
}

/** The service is down, timing out or rate limiting, as opposed to rejecting one request. */
export class WorkersAIUnavailableError extends Error {}

/** Alt text generation is opt-in: without both vars every entry point is a no-op. */
export const isAltTextConfigured = (): boolean =>
  Boolean(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.WORKERS_AI_API_TOKEN)

/** Ask the vision model one question about a JPEG. Returns the raw answer; throws on any failure. */
export async function queryImage({
  jpeg,
  question,
}: {
  jpeg: Buffer
  question: string
}): Promise<string> {
  if (!isAltTextConfigured()) {
    throw new Error('Workers AI is not configured (CLOUDFLARE_ACCOUNT_ID, WORKERS_AI_API_TOKEN)')
  }

  let res: Response
  try {
    res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/run/${ALT_TEXT_MODEL}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.WORKERS_AI_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          task: 'query',
          image: `data:image/jpeg;base64,${jpeg.toString('base64')}`,
          question,
          // The reasoning trace defaults to on; it costs output tokens and latency we don't need.
          reasoning: false,
          temperature: 0.2,
          max_tokens: 120,
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      },
    )
  } catch (err) {
    // Network failure or timeout. Report the error's name and code, never its message: a
    // malformed token makes fetch throw with the whole Authorization header in the message.
    const reason =
      err instanceof Error
        ? [err.name, (err.cause as { code?: string } | undefined)?.code].filter(Boolean).join(' ')
        : 'unknown error'
    throw new WorkersAIUnavailableError(`Workers AI request failed: ${reason}`)
  }

  const body = (await res.json().catch(() => null)) as WorkersAIResponse | null
  if (!res.ok || !body?.success) {
    const detail = body?.errors
      ?.map((e) => e.message)
      .filter(Boolean)
      .join('; ')
    const message = `Workers AI request failed (HTTP ${res.status})${detail ? `: ${detail}` : ''}`
    // A 4xx is about this request (bad token, rejected image), not an outage.
    throw res.status === 429 || res.status >= 500
      ? new WorkersAIUnavailableError(message)
      : new Error(message)
  }

  const answer = body.result?.answer?.trim()
  if (!answer) throw new Error('Workers AI returned no answer')
  return answer
}
