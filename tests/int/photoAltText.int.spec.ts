// @vitest-environment node
import type { Payload, PayloadRequest } from 'payload'

import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import sharp from 'sharp'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Photo } from '@/payload-types'

import { generatePhotoAltText, resolveAltTextHints } from '@/collections/Photos/altText/generate'
import { loadStoredPhoto, toModelJpeg } from '@/collections/Photos/altText/image'
import { buildAltTextQuestion, cleanAltText } from '@/collections/Photos/altText/prompt'
import {
  ALT_TEXT_QUEUE,
  ALT_TEXT_TASK,
  generateAltTextTask,
} from '@/collections/Photos/altText/task'
import {
  ALT_TEXT_MODEL,
  isAltTextConfigured,
  queryImage,
  WorkersAIUnavailableError,
} from '@/collections/Photos/altText/workersAI'

const ACCOUNT = 'acct-123'
const TOKEN = 'tok-abc'
const SITE_URL = 'https://site.example.test'
const MEDIA = 'https://media.example.test/photos/abc'
const MAX_ALT_LENGTH = 200

const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>()
const logger = { error: vi.fn(), info: vi.fn(), warn: vi.fn() }

const configure = () => {
  vi.stubEnv('CLOUDFLARE_ACCOUNT_ID', ACCOUNT)
  vi.stubEnv('WORKERS_AI_API_TOKEN', TOKEN)
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

const completion = (content: null | string) => ({
  result: { choices: [{ finish_reason: 'stop', message: { content, role: 'assistant' } }] },
  success: true,
})

const modelAnswers = (answer: null | string) =>
  fetchMock.mockImplementation(async () => json(completion(answer)))

const modelFails = (status = 500, message = 'upstream exploded') =>
  fetchMock.mockImplementation(async () =>
    json({ errors: [{ code: 5000, message }], result: null, success: false }, status),
  )

type ChatPart = { image_url?: { url: string }; text?: string; type: string }

const sent = (call = 0) => {
  const [url, init] = fetchMock.mock.calls[call] ?? []
  const body = JSON.parse(String(init?.body)) as Record<string, unknown> & {
    messages?: { content: ChatPart[] }[]
  }
  const parts = body.messages?.[0]?.content ?? []
  return {
    body,
    image: parts.find((p) => p.type === 'image_url')?.image_url?.url,
    init,
    question: parts.find((p) => p.type === 'text')?.text,
    url,
  }
}

const sentImage = (call = 0) =>
  Buffer.from(String(sent(call).image).replace(/^data:image\/jpeg;base64,/, ''), 'base64')

const describeBuffer = async (image: Buffer) => {
  const { format, height, width } = await sharp(image).metadata()
  const [r, g, b] = (await sharp(image).stats()).channels.map((c) => Math.round(c.mean))
  return { b, format, g, height, r, width }
}

const solid = (width: number, height: number, background: string) =>
  sharp({ create: { width, height, background, channels: 3 } })

const words = (count: number) => Array.from({ length: count }, (_, i) => `word${i}`).join(' ')

/** A single "sentence" of exactly `length` characters, ending in a full stop. */
const sentenceOfLength = (length: number) =>
  `${words(60)
    .slice(0, length - 1)
    .replace(/\s$/, 'x')}.`

type FakePhoto = Partial<Omit<Photo, 'location' | 'tags'>> & {
  location?: unknown
  tags?: unknown
}

type LocalArgs = { context?: Record<string, unknown>; req?: PayloadRequest }

// What Payload's createLocalReq does on every Local API call: `req.context` becomes a NEW
// object, merged with the call's `context`. Anything holding the old object goes stale.
const replaceContext = ({ context, req }: LocalArgs) => {
  if (req) req.context = { ...req.context, ...context }
}

const fakePayload = ({
  photo = null,
  staticDir,
}: { photo?: FakePhoto | null; staticDir?: string } = {}) => ({
  collections: { photos: { config: { upload: { staticDir } } } },
  find: vi.fn(async (args: LocalArgs) => {
    replaceContext(args)
    return {
      docs: [
        { id: 'tag-1', name: 'Surfing' },
        { id: 'tag-2', name: 'Winter' },
      ],
    }
  }),
  findByID: vi.fn(async (args: { collection: string; id: string } & LocalArgs) => {
    replaceContext(args)
    if (args.collection === 'photos') return photo
    if (args.collection === 'locations') return { id: args.id, name: 'Tofino' }
    return null
  }),
  jobs: { queue: vi.fn(async (_args: Record<string, unknown>) => ({ id: 'job-1' })) },
  logger,
  update: vi.fn(async (args: LocalArgs) => {
    replaceContext(args)
    return {}
  }),
})

type FakePayload = ReturnType<typeof fakePayload>

const fakeReq = (payload: FakePayload = fakePayload(), extra: Record<string, unknown> = {}) =>
  ({ context: {}, payload, ...extra }) as unknown as PayloadRequest

let tmp: string
let staticDir: string
let emptyDir: string
let original: Buffer
let medium: Buffer

beforeAll(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'photo-alt-text-'))
  staticDir = path.join(tmp, 'photos')
  emptyDir = path.join(tmp, 'empty')
  await fs.mkdir(staticDir)
  await fs.mkdir(emptyDir)

  // Distinguishable by colour and by size: the original is blue, the medium rendition red.
  original = await solid(1600, 1200, '#0000ff').jpeg().toBuffer()
  medium = await solid(900, 675, '#ff0000').webp().toBuffer()
  await fs.writeFile(path.join(staticDir, 'pic.jpg'), original)
  await fs.writeFile(path.join(staticDir, 'pic-900.webp'), medium)
})

afterAll(async () => {
  await fs.rm(tmp, { force: true, recursive: true })
})

beforeEach(() => {
  vi.clearAllMocks()
  fetchMock.mockReset()
  fetchMock.mockRejectedValue(new Error('unexpected fetch'))
  vi.stubGlobal('fetch', fetchMock)
  // `.env` is loaded by the setup file, so start every test unconfigured.
  vi.stubEnv('CLOUDFLARE_ACCOUNT_ID', '')
  vi.stubEnv('WORKERS_AI_API_TOKEN', '')
  vi.stubEnv('NEXT_PUBLIC_SERVER_URL', SITE_URL)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('cleanAltText', () => {
  it('collapses whitespace', () => {
    expect(cleanAltText('  A dog\n runs\t across   a beach. \n')).toBe('A dog runs across a beach.')
    expect(cleanAltText('A dog on a beach.\n\nThe dog is brown.')).toBe(
      'A dog on a beach. The dog is brown.',
    )
  })

  it.each([
    '"A dog on a beach."',
    "'A dog on a beach.'",
    '“A dog on a beach.”',
    '‘A dog on a beach.’',
    ' "A dog on a beach." ',
  ])('strips wrapping quotes: %s', (raw) => {
    expect(cleanAltText(raw)).toBe('A dog on a beach.')
  })

  it.each([
    'A neon sign that reads "Open"',
    '"Open" sign hanging in a shop window',
    'A sign reading "Open" hangs on a door.',
    "A dog's bowl beside the neighbours'",
  ])('keeps quotes and apostrophes that belong to the sentence: %s', (raw) => {
    expect(cleanAltText(raw)).toBe(raw)
  })

  it('does not strip a leading and trailing quote that are not a pair', () => {
    const raw = '"Open" sign next to one reading "Closed"'
    expect(cleanAltText(raw)).toBe(raw)
  })

  it.each([
    'Alt text: A dog on a beach.',
    'ALT TEXT:A dog on a beach.',
    'alt text : A dog on a beach.',
    'Alternative text: A dog on a beach.',
    'Alt text: "A dog on a beach."',
    '"Alt text: A dog on a beach."',
    '**Alt text:** A dog on a beach.',
    'Alt-text: A dog on a beach.',
    'Alt: A dog on a beach.',
  ])('strips the label: %s', (raw) => {
    expect(cleanAltText(raw)).toBe('A dog on a beach.')
  })

  it.each([
    'A photo of a dog on a beach.',
    'Photo of a dog on a beach.',
    'An image of a dog on a beach.',
    'This image shows a dog on a beach.',
    'The picture depicts a dog on a beach.',
    'The photograph captures a dog on a beach.',
    'THIS IMAGE SHOWS a dog on a beach.',
    'This is a photo of a dog on a beach.',
    'The image is of a dog on a beach.',
    'Alt text: "A photo of a dog on a beach."',
  ])('strips the lead-in and re-capitalises: %s', (raw) => {
    expect(cleanAltText(raw)).toBe('A dog on a beach.')
  })

  it('capitalises the first letter only', () => {
    expect(cleanAltText('a dog chases a Frisbee near Tofino.')).toBe(
      'A dog chases a Frisbee near Tofino.',
    )
  })

  it.each([
    'A photographer on a ridge at dawn.',
    'Photographs of birds hang in a gallery.',
    'Picture frames cover a hallway wall.',
    'The photo booth at a county fair.',
    'An imageless grey wall.',
    'Two hikers picture the summit ahead of them.',
    'Alto saxophone: a player on a street corner.',
  ])('leaves an ordinary sentence alone: %s', (raw) => {
    expect(cleanAltText(raw)).toBe(raw)
  })

  it('keeps text at the length limit as it is', () => {
    const raw = sentenceOfLength(MAX_ALT_LENGTH)
    expect(raw).toHaveLength(MAX_ALT_LENGTH)
    expect(cleanAltText(raw).toLowerCase()).toBe(raw)
  })

  it('cuts over-long text back to whole sentences', () => {
    const first = `A hiker crosses ${words(10)}.`
    const second = `Behind them ${words(10)}!`
    const third = `Clouds gather ${words(10)}.`
    const raw = `${first} ${second} ${third}`
    expect(raw.length).toBeGreaterThan(MAX_ALT_LENGTH)

    expect(cleanAltText(raw)).toBe(`${first} ${second}`)
  })

  it('keeps a sentence that ends exactly at the limit', () => {
    const first = sentenceOfLength(MAX_ALT_LENGTH)
    expect(cleanAltText(`${first} More words follow here.`).toLowerCase()).toBe(first)
  })

  it('cuts over-long text without a sentence break at a word boundary', () => {
    const raw = words(60)
    const alt = cleanAltText(raw)
    const kept = alt.slice(0, -1)

    expect(alt.endsWith('…')).toBe(true)
    expect(alt.length).toBeLessThanOrEqual(MAX_ALT_LENGTH)
    expect(kept.length).toBeGreaterThan(MAX_ALT_LENGTH - 20)
    expect(kept).toBe(kept.trimEnd())
    // Whole words only: the cut is followed by a space in the source text.
    expect(raw.toLowerCase().startsWith(`${kept.toLowerCase()} `)).toBe(true)
  })

  it.each([
    ['a 201-character sentence', sentenceOfLength(MAX_ALT_LENGTH + 1)],
    [
      'a sentence ending on character 201, then more',
      `${sentenceOfLength(MAX_ALT_LENGTH + 1)} More words follow here.`,
    ],
  ])('never returns more than 200 characters: %s', (_name, raw) => {
    expect(cleanAltText(raw).length).toBeLessThanOrEqual(MAX_ALT_LENGTH)
  })

  it('never returns more than 200 characters: one unbroken token', () => {
    expect(cleanAltText('x'.repeat(250)).length).toBeLessThanOrEqual(MAX_ALT_LENGTH)
  })

  it('does not cut an over-long answer down to a leading abbreviation', () => {
    const alt = cleanAltText(`Mt. Rainier rises above ${words(40)}`)
    expect(alt.startsWith('Mt. Rainier rises above')).toBe(true)
  })

  it.each(['', '   ', '\n\t', '""', "''", '“”', '" "', 'Alt text:', 'Alt text: ""'])(
    'returns an empty string when nothing usable is left: %j',
    (raw) => {
      expect(cleanAltText(raw)).toBe('')
    },
  )

  it.each([
    "I'm sorry, but I can't describe this image.",
    'I’m sorry, I cannot help with that.',
    'Sorry, I am unable to view images.',
    'I cannot describe people in images.',
    "I can't see an image.",
  ])('returns an empty string for a refusal: %s', (raw) => {
    expect(cleanAltText(raw)).toBe('')
  })

  it('keeps a description that merely starts with "I"', () => {
    expect(cleanAltText('Icy peaks above a frozen lake.')).toBe('Icy peaks above a frozen lake.')
  })

  it.each(['"', '”', "'", '...', '**'])('returns an empty string for a lone quote: %j', (raw) => {
    expect(cleanAltText(raw)).toBe('')
  })
})

describe('buildAltTextQuestion', () => {
  it('includes the location and tags as context', () => {
    const question = buildAltTextQuestion({ location: 'Tofino', tags: ['surfing', 'winter'] })

    expect(question).toContain('Known context')
    expect(question).toContain('Tofino')
    expect(question).toContain('surfing')
    expect(question).toContain('winter')
  })

  it('includes whichever hint is present', () => {
    const onlyLocation = buildAltTextQuestion({ location: 'Tofino', tags: [] })
    expect(onlyLocation).toContain('Known context')
    expect(onlyLocation).toContain('Tofino')
    expect(onlyLocation).not.toContain('Tags')

    const onlyTags = buildAltTextQuestion({ location: null, tags: ['surfing'] })
    expect(onlyTags).toContain('Known context')
    expect(onlyTags).toContain('surfing')
    expect(onlyTags).not.toContain('Location')
  })

  it.each([
    ['no argument', undefined],
    ['an empty object', {}],
    ['null location and no tags', { location: null, tags: [] }],
    ['an empty location', { location: '', tags: [] }],
  ])('omits the context sentence for %s', (_name, hints) => {
    const question = buildAltTextQuestion(hints)

    expect(question).toContain('alt text')
    expect(question).not.toContain('Known context')
    expect(question).not.toContain('Location')
    expect(question).not.toContain('Tags')
    // Nothing falsy leaked out of the `&&` chains.
    expect(question).not.toMatch(/\b(?:0|false|null|undefined)\b/)
    expect(question).toBe(question.trim())
  })
})

describe('isAltTextConfigured', () => {
  it('needs both the account id and the token', () => {
    expect(isAltTextConfigured()).toBe(false)

    vi.stubEnv('CLOUDFLARE_ACCOUNT_ID', ACCOUNT)
    expect(isAltTextConfigured()).toBe(false)

    vi.stubEnv('CLOUDFLARE_ACCOUNT_ID', '')
    vi.stubEnv('WORKERS_AI_API_TOKEN', TOKEN)
    expect(isAltTextConfigured()).toBe(false)

    configure()
    expect(isAltTextConfigured()).toBe(true)
  })
})

describe('queryImage', () => {
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4])

  it('posts the image and question to the Workers AI REST endpoint', async () => {
    configure()
    modelAnswers('A dog on a beach.')

    await queryImage({ jpeg, question: 'What is this?' })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const { body, init, url } = sent()
    expect(url).toBe(
      `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/ai/run/${ALT_TEXT_MODEL}`,
    )
    expect(ALT_TEXT_MODEL).toMatch(/^@cf\/google\/gemma-/)
    expect(init?.method).toBe('POST')

    const headers = new Headers(init?.headers)
    expect(headers.get('Authorization')).toBe(`Bearer ${TOKEN}`)
    expect(headers.get('Content-Type')).toBe('application/json')

    expect(body).toMatchObject({
      chat_template_kwargs: { enable_thinking: false },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'What is this?' },
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${jpeg.toString('base64')}` },
            },
          ],
        },
      ],
    })
    // Not the (billed) streaming/Moondream shape.
    expect(body).not.toHaveProperty('stream')
    // A hung request must not hang the upload it is part of.
    expect(init?.signal).toBeInstanceOf(AbortSignal)
  })

  it('returns the trimmed answer', async () => {
    configure()
    modelAnswers('  \n A dog on a beach. \n')

    await expect(queryImage({ jpeg, question: 'q' })).resolves.toBe('A dog on a beach.')
  })

  it.each([401, 429, 500])('throws on HTTP %i', async (status) => {
    configure()
    fetchMock.mockImplementation(async () => json(completion('ignored'), status))

    await expect(queryImage({ jpeg, question: 'q' })).rejects.toThrow(String(status))
  })

  it('throws on a non-JSON error response', async () => {
    configure()
    fetchMock.mockImplementation(
      async () => new Response('<html>Bad gateway</html>', { status: 502 }),
    )

    await expect(queryImage({ jpeg, question: 'q' })).rejects.toThrow('502')
  })

  it('throws on a 2xx response that is not JSON', async () => {
    configure()
    fetchMock.mockImplementation(async () => new Response('ok', { status: 200 }))

    await expect(queryImage({ jpeg, question: 'q' })).rejects.toThrow()
  })

  it('throws with the API error messages on success: false', async () => {
    configure()
    fetchMock.mockImplementation(async () =>
      json({
        errors: [
          { code: 7003, message: 'No route for that URI' },
          { code: 10000, message: 'Authentication error' },
        ],
        success: false,
      }),
    )

    const failure = queryImage({ jpeg, question: 'q' })
    await expect(failure).rejects.toThrow('No route for that URI')
    await expect(failure).rejects.toThrow('Authentication error')
  })

  it.each([
    ['an empty answer', completion('')],
    ['a whitespace answer', completion(' \n ')],
    ['a null answer', completion(null)],
    [
      'a reasoning-only answer cut off by max_tokens',
      {
        result: {
          choices: [
            { finish_reason: 'length', message: { content: '', reasoning_content: 'hmm' } },
          ],
        },
        success: true,
      },
    ],
    [
      'an empty result (what a non-streaming Moondream call returns)',
      { result: {}, success: true },
    ],
    ['a missing result', { success: true }],
  ])('throws on %s', async (_name, body) => {
    configure()
    fetchMock.mockImplementation(async () => json(body))

    await expect(queryImage({ jpeg, question: 'q' })).rejects.toThrow(/no answer/i)
  })

  it('propagates a network failure', async () => {
    configure()
    fetchMock.mockRejectedValue(new TypeError('fetch failed'))

    await expect(queryImage({ jpeg, question: 'q' })).rejects.toThrow(
      'Workers AI request failed: TypeError',
    )
  })

  it.each([
    [400, false],
    [401, false],
    [403, false],
    [429, true],
    [500, true],
    [503, true],
  ])('HTTP %i counts as the service being unavailable: %s', async (status, unavailable) => {
    configure()
    modelFails(status)

    const error = await queryImage({ jpeg, question: 'q' }).catch((err: Error) => err)
    expect(error).toBeInstanceOf(Error)
    expect(error instanceof WorkersAIUnavailableError).toBe(unavailable)
  })

  it('counts a network failure as the service being unavailable', async () => {
    configure()
    fetchMock.mockRejectedValue(new TypeError('fetch failed'))

    await expect(queryImage({ jpeg, question: 'q' })).rejects.toBeInstanceOf(
      WorkersAIUnavailableError,
    )
  })

  it('never repeats a fetch error message, which can contain the Authorization header', async () => {
    configure()
    fetchMock.mockRejectedValue(
      new TypeError('Headers.append: "Bearer secret-token\n" is an invalid header value.'),
    )

    const error = await queryImage({ jpeg, question: 'q' }).catch((err: Error) => err)
    expect(String(error)).not.toContain('secret-token')
  })

  it.each([
    ['nothing', '', ''],
    ['only the account id', ACCOUNT, ''],
    ['only the token', '', TOKEN],
  ])('throws without calling fetch when %s is configured', async (_name, account, token) => {
    vi.stubEnv('CLOUDFLARE_ACCOUNT_ID', account)
    vi.stubEnv('WORKERS_AI_API_TOKEN', token)

    await expect(queryImage({ jpeg, question: 'q' })).rejects.toThrow(/not configured/i)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('toModelJpeg', () => {
  it('bounds a large image to 1024px on its longest side', async () => {
    const landscape = await toModelJpeg(await solid(3000, 2000, '#336699').jpeg().toBuffer())
    expect(await describeBuffer(landscape)).toMatchObject({
      format: 'jpeg',
      height: 683,
      width: 1024,
    })

    const portrait = await toModelJpeg(await solid(2000, 3000, '#336699').jpeg().toBuffer())
    expect(await describeBuffer(portrait)).toMatchObject({
      format: 'jpeg',
      height: 1024,
      width: 683,
    })
  })

  it('does not enlarge a small image', async () => {
    const jpeg = await toModelJpeg(await solid(320, 200, '#336699').png().toBuffer())
    expect(await describeBuffer(jpeg)).toMatchObject({ format: 'jpeg', height: 200, width: 320 })
  })

  it('converts a WebP rendition', async () => {
    expect(await describeBuffer(await toModelJpeg(medium))).toMatchObject({
      format: 'jpeg',
      height: 675,
      width: 900,
    })
  })

  it('converts a PNG with alpha, flattening transparency onto white', async () => {
    const png = await sharp({
      create: { width: 64, height: 48, background: { alpha: 0, b: 0, g: 0, r: 0 }, channels: 4 },
    })
      .png()
      .toBuffer()

    const jpeg = await toModelJpeg(png)
    const { b, format, g, r } = await describeBuffer(jpeg)
    expect(format).toBe('jpeg')
    expect((await sharp(jpeg).metadata()).channels).toBe(3)
    expect(Math.min(r ?? 0, g ?? 0, b ?? 0)).toBeGreaterThan(250)
  })

  it('applies EXIF orientation before measuring', async () => {
    const rotated = await solid(2000, 1000, '#336699')
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer()

    expect(await describeBuffer(await toModelJpeg(rotated))).toMatchObject({
      height: 1024,
      width: 512,
    })
  })

  it('rejects bytes that are not an image', async () => {
    await expect(toModelJpeg(Buffer.from('not an image'))).rejects.toThrow()
  })
})

describe('loadStoredPhoto', () => {
  const stored = (overrides: FakePhoto = {}) =>
    ({
      id: 'p1',
      filename: 'pic.jpg',
      sizes: {
        medium: { filename: 'pic-900.webp', url: `${MEDIA}/pic-900.webp` },
        thumbnail: { filename: 'pic-300.webp', url: `${MEDIA}/pic-300.webp` },
      },
      url: `${MEDIA}/pic.jpg`,
      ...overrides,
    }) as Photo

  const load = (dir: string | undefined, photo: Photo) =>
    loadStoredPhoto(fakePayload({ staticDir: dir }) as unknown as Payload, photo)

  it('reads the medium rendition from disk when it is there', async () => {
    const buffer = await load(staticDir, stored())

    expect(buffer.equals(medium)).toBe(true)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('reads the original from disk when there are no usable renditions', async () => {
    const photo = stored({ sizes: { medium: { filename: null, url: null } }, url: null })

    expect((await load(staticDir, photo)).equals(original)).toBe(true)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('falls back to HTTP, medium rendition first, when the file is not on disk', async () => {
    fetchMock.mockImplementation(async () => new Response(new Uint8Array(medium)))

    const buffer = await load(emptyDir, stored())

    expect(buffer.equals(medium)).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${MEDIA}/pic-900.webp`)
    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal)
  })

  it('uses HTTP when the collection has no static dir', async () => {
    fetchMock.mockImplementation(async () => new Response(new Uint8Array(medium)))

    expect((await load(undefined, stored())).equals(medium)).toBe(true)
    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${MEDIA}/pic-900.webp`)
  })

  it('resolves a relative URL against the server URL', async () => {
    vi.stubEnv('NEXT_PUBLIC_SERVER_URL', `${SITE_URL}/`)
    fetchMock.mockImplementation(async () => new Response(new Uint8Array(original)))
    const photo = stored({ sizes: {}, url: '/api/photos/file/pic.jpg' })

    expect((await load(emptyDir, photo)).equals(original)).toBe(true)
    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${SITE_URL}/api/photos/file/pic.jpg`)
  })

  it('moves on to the next rendition when one cannot be fetched', async () => {
    fetchMock.mockImplementation(async (url) =>
      url.endsWith('pic-900.webp')
        ? new Response('gone', { status: 404 })
        : new Response(new Uint8Array(original)),
    )
    const photo = stored({
      sizes: {
        large: { filename: 'pic-1400.webp', url: `${MEDIA}/pic-1400.webp` },
        medium: { filename: 'pic-900.webp', url: `${MEDIA}/pic-900.webp` },
      },
    })

    expect((await load(emptyDir, photo)).equals(original)).toBe(true)
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      `${MEDIA}/pic-900.webp`,
      `${MEDIA}/pic-1400.webp`,
    ])
  })

  it('throws an error naming the photo and every failed request', async () => {
    fetchMock.mockImplementation(async (url) => {
      if (url.endsWith('pic.jpg')) throw new Error('socket hang up')
      return new Response('forbidden', { status: 403 })
    })

    const failure = load(emptyDir, stored())

    await expect(failure).rejects.toThrow(/photo p1\b/)
    await expect(failure).rejects.toThrow(`${MEDIA}/pic-900.webp -> 403`)
    await expect(failure).rejects.toThrow(`${MEDIA}/pic.jpg -> socket hang up`)
  })

  it('throws when the photo has no file at all', async () => {
    const photo = stored({ filename: null, sizes: {}, url: null })

    await expect(load(emptyDir, photo)).rejects.toThrow(/photo p1\b.*no readable file/)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('resolveAltTextHints', () => {
  it('looks up tag and location ids, passing req along', async () => {
    const payload = fakePayload()
    const req = fakeReq(payload)

    const hints = await resolveAltTextHints(
      payload as unknown as Payload,
      { location: 'loc-1', tags: ['tag-1', 'tag-2'] },
      req,
    )

    expect(hints.location).toBe('Tofino')
    expect(hints.tags?.sort()).toEqual(['Surfing', 'Winter'])
    expect(payload.find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'photo-tags',
        req,
        where: { id: { in: ['tag-1', 'tag-2'] } },
      }),
    )
    expect(payload.findByID).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'loc-1', collection: 'locations', req }),
    )
  })

  it('uses populated docs without any lookup', async () => {
    const payload = fakePayload()

    const hints = await resolveAltTextHints(payload as unknown as Payload, {
      location: { id: 'loc-1', name: 'Ucluelet' },
      tags: [{ id: 'tag-9', name: 'Storm' }, null],
    })

    expect(hints).toEqual({ location: 'Ucluelet', tags: ['Storm'] })
    expect(payload.find).not.toHaveBeenCalled()
    expect(payload.findByID).not.toHaveBeenCalled()
  })

  it('returns no hints for a photo without tags or location', async () => {
    const payload = fakePayload()

    const hints = await resolveAltTextHints(payload as unknown as Payload, {
      location: null,
      tags: null,
    })

    expect(hints.location ?? null).toBeNull()
    expect(hints.tags ?? []).toEqual([])
    expect(payload.find).not.toHaveBeenCalled()
  })

  it('drops the hints instead of throwing when a lookup fails', async () => {
    const payload = fakePayload()
    payload.find.mockRejectedValue(new Error('db down'))

    const hints = await resolveAltTextHints(payload as unknown as Payload, {
      location: 'loc-1',
      tags: ['tag-1'],
    })

    expect(buildAltTextQuestion(hints)).not.toContain('Known context')
    expect(logger.warn).toHaveBeenCalled()
  })
})

describe('generateAltTextOnUpload', () => {
  // The inline cooldown is module state, so every test gets a fresh copy of the module.
  const loadHook = async () => {
    vi.resetModules()
    const { generateAltTextOnUpload } = await import('@/collections/Photos/altText/hooks')

    return async ({
      context = {},
      data,
      operation = 'create',
      originalDoc,
      req = uploadReq(),
    }: {
      context?: Record<string, unknown>
      data: Record<string, unknown>
      operation?: 'create' | 'update'
      originalDoc?: FakePhoto
      req?: PayloadRequest
    }) => {
      // Payload hands hooks `req.context`, and afterChange hooks see whatever it is by then.
      req.context = context
      const result = await generateAltTextOnUpload({
        collection: {},
        context,
        data,
        operation,
        originalDoc,
        req,
      } as never)
      return { context: req.context, data: result as Record<string, unknown> }
    }
  }

  const uploadReq = (payload: FakePayload = fakePayload(), extra: Record<string, unknown> = {}) =>
    fakeReq(payload, {
      file: { name: 'pic.jpg', data: original, mimetype: 'image/jpeg', size: original.length },
      payloadUploadSizes: { medium },
      ...extra,
    })

  it('leaves a write flagged altTextGenerated untouched', async () => {
    configure()
    const run = await loadHook()
    const input = { alt: 'A red barn in a field.', altSource: 'ai' }

    for (const operation of ['create', 'update'] as const) {
      const { context, data } = await run({
        context: { altTextGenerated: true },
        data: input,
        operation,
        originalDoc: { alt: 'Hand-written', altSource: 'manual' },
      })

      expect(data).toBe(input)
      expect(data).toEqual({ alt: 'A red barn in a field.', altSource: 'ai' })
      expect(context.altTextPending).toBeUndefined()
    }
    expect(fetchMock).not.toHaveBeenCalled()
  })

  describe('on update', () => {
    it.each([
      {
        name: 'changes the alt',
        alt: 'New words',
        expected: 'manual',
        originalDoc: { alt: 'Old words', altSource: 'ai' },
      },
      {
        name: 'writes an alt where there was none',
        alt: 'New words',
        expected: 'manual',
        originalDoc: { alt: null, altSource: null },
      },
      {
        name: 'blanks the alt',
        alt: '',
        expected: null,
        originalDoc: { alt: 'Old words', altSource: 'ai' },
      },
      {
        name: 'blanks the alt with whitespace',
        alt: '   ',
        expected: null,
        originalDoc: { alt: 'Old words', altSource: 'manual' },
      },
      {
        name: 'nulls the alt',
        alt: null,
        expected: null,
        originalDoc: { alt: 'Old words', altSource: 'manual' },
      },
    ] as const)(
      'sets altSource to $expected when it $name',
      async ({ alt, expected, originalDoc }) => {
        const run = await loadHook()

        const { data } = await run({ data: { alt }, operation: 'update', originalDoc })

        expect(data.altSource).toBe(expected)
        expect(data.alt).toBe(alt)
      },
    )

    it.each([
      { name: 'does not include alt', data: { focalX: 10 } },
      { name: 'sends the same alt', data: { alt: 'Old words' } },
      { name: 'sends the same alt with extra whitespace', data: { alt: '  Old words \n' } },
    ])('leaves altSource alone when the update $name', async ({ data: input }) => {
      const run = await loadHook()

      const { data } = await run({
        data: { ...input },
        operation: 'update',
        originalDoc: { alt: ' Old words', altSource: 'ai' },
      })

      expect(data).toEqual(input)
      expect('altSource' in data).toBe(false)
    })

    it('leaves altSource alone when a blank alt stays blank', async () => {
      const run = await loadHook()

      const { data } = await run({
        data: { alt: '' },
        operation: 'update',
        originalDoc: { alt: null, altSource: null },
      })

      expect('altSource' in data).toBe(false)
    })

    it('never asks the model or queues a retry, even when the alt is blanked', async () => {
      configure()
      modelAnswers('A red barn in a field.')
      const run = await loadHook()

      const { context, data } = await run({
        data: { alt: '' },
        operation: 'update',
        originalDoc: { alt: 'Old words', altSource: 'manual' },
      })

      expect(data.alt).toBe('')
      expect(fetchMock).not.toHaveBeenCalled()
      expect(context.altTextPending).toBeUndefined()
    })
  })

  describe('on create', () => {
    it('marks a supplied alt as hand-written without asking the model', async () => {
      configure()
      modelAnswers('A red barn in a field.')
      const run = await loadHook()

      // `altSource` is hook-owned: whatever the client sent is replaced.
      const { context, data } = await run({ data: { alt: 'My own words', altSource: 'ai' } })

      expect(data).toMatchObject({ alt: 'My own words', altSource: 'manual' })
      expect(fetchMock).not.toHaveBeenCalled()
      expect(context.altTextPending).toBeUndefined()
    })

    it.each([{ alt: '' }, { alt: '   ' }, { alt: null }, {}])(
      'does nothing for a blank alt (%j) when Workers AI is not configured',
      async (input) => {
        const run = await loadHook()

        const { context, data } = await run({ data: { ...input } })

        expect(data.altSource).toBeNull()
        expect(data.alt?.toString().trim() ?? '').toBe('')
        expect(fetchMock).not.toHaveBeenCalled()
        expect(context.altTextPending).toBeUndefined()
      },
    )

    it('fills a blank alt with the cleaned model answer', async () => {
      configure()
      modelAnswers('  "A photo of a red barn\n in a field."  ')
      const run = await loadHook()

      const { context, data } = await run({ data: { alt: '' } })

      expect(data).toMatchObject({ alt: 'A red barn in a field.', altSource: 'ai' })
      expect(context.altTextPending).toBeUndefined()
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it.each([{ alt: '   ' }, { alt: null }, {}])('treats %j as a blank alt', async (input) => {
      configure()
      modelAnswers('A red barn in a field.')
      const run = await loadHook()

      const { data } = await run({ data: { ...input } })

      expect(data).toMatchObject({ alt: 'A red barn in a field.', altSource: 'ai' })
    })

    it('describes the medium rendition rather than the original upload', async () => {
      configure()
      modelAnswers('A red barn in a field.')
      const run = await loadHook()

      await run({ data: {} })

      const image = await describeBuffer(sentImage())
      expect(image).toMatchObject({ format: 'jpeg', height: 675, width: 900 })
      expect(image.r).toBeGreaterThan(200)
      expect(image.b).toBeLessThan(60)
    })

    it('falls back to the uploaded file when no rendition was generated', async () => {
      configure()
      modelAnswers('A blue lake.')
      const run = await loadHook()

      const { data } = await run({
        data: {},
        req: uploadReq(fakePayload(), { payloadUploadSizes: undefined }),
      })

      expect(data.alt).toBe('A blue lake.')
      const image = await describeBuffer(sentImage())
      expect(image).toMatchObject({ format: 'jpeg', height: 768, width: 1024 })
      expect(image.b).toBeGreaterThan(200)
      expect(image.r).toBeLessThan(60)
    })

    it('gives the model the names behind the tag and location ids', async () => {
      configure()
      modelAnswers('A surfer on a winter wave.')
      const payload = fakePayload()
      const req = uploadReq(payload)
      const run = await loadHook()

      await run({ data: { location: 'loc-1', tags: ['tag-1', 'tag-2'] }, req })

      const question = String(sent().question)
      expect(question).toContain('Tofino')
      expect(question).toContain('Surfing')
      expect(question).toContain('Winter')
      // Lookups made inside a hook must stay in the request's transaction.
      expect(payload.find).toHaveBeenCalledWith(expect.objectContaining({ req }))
      expect(payload.findByID).toHaveBeenCalledWith(expect.objectContaining({ req }))
    })

    it('still generates when the hint lookup fails', async () => {
      configure()
      modelAnswers('A red barn in a field.')
      const payload = fakePayload()
      payload.find.mockRejectedValue(new Error('db down'))
      const run = await loadHook()

      const { data } = await run({ data: { tags: ['tag-1'] }, req: uploadReq(payload) })

      expect(data).toMatchObject({ alt: 'A red barn in a field.', altSource: 'ai' })
    })

    it('marks the photo pending when there are no bytes to describe', async () => {
      configure()
      modelAnswers('A red barn in a field.')
      const run = await loadHook()

      const { context, data } = await run({
        data: { alt: '' },
        req: fakeReq(fakePayload(), { file: { name: 'pic.jpg', data: Buffer.alloc(0) } }),
      })

      expect(data).toMatchObject({ alt: '', altSource: null })
      expect(context.altTextPending).toBe(true)
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it.each([
      ['an HTTP error', () => modelFails(500)],
      ['a network error', () => fetchMock.mockRejectedValue(new TypeError('fetch failed'))],
      ['an empty answer', () => modelAnswers('')],
      ['an answer that cleans to nothing', () => modelAnswers('""')],
    ])('does not throw on %s: the photo is saved blank and marked pending', async (_name, fail) => {
      configure()
      fail()
      const run = await loadHook()

      const { context, data } = await run({ data: { alt: '' } })

      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(data).toMatchObject({ alt: '', altSource: null })
      expect(context.altTextPending).toBe(true)
      expect(logger.warn).toHaveBeenCalled()
    })

    it('does not throw when the upload cannot be decoded', async () => {
      configure()
      modelAnswers('A red barn in a field.')
      const run = await loadHook()

      const { context, data } = await run({
        data: {},
        req: uploadReq(fakePayload(), { payloadUploadSizes: { medium: Buffer.from('junk') } }),
      })

      expect(data.altSource).toBeNull()
      expect(context.altTextPending).toBe(true)
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('skips the model during the cooldown after a failure, then tries again', async () => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date('2026-10-11T12:00:00.000Z'))
      configure()
      modelFails(500)
      const run = await loadHook()

      const failed = await run({ data: { alt: '' } })
      expect(failed.context.altTextPending).toBe(true)
      expect(fetchMock).toHaveBeenCalledTimes(1)

      // The service is back, but the next uploads go straight to the retry queue.
      modelAnswers('A red barn in a field.')
      vi.setSystemTime(new Date('2026-10-11T12:01:00.000Z'))
      const cooling = await run({ data: { alt: '' } })

      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(cooling.data).toMatchObject({ alt: '', altSource: null })
      expect(cooling.context.altTextPending).toBe(true)

      // A hand-written alt is unaffected by the cooldown.
      const manual = await run({ data: { alt: 'My own words' } })
      expect(manual.data.altSource).toBe('manual')
      expect(manual.context.altTextPending).toBeUndefined()

      vi.setSystemTime(new Date('2026-10-11T12:02:00.001Z'))
      const recovered = await run({ data: { alt: '' } })

      expect(fetchMock).toHaveBeenCalledTimes(2)
      expect(recovered.data).toMatchObject({ alt: 'A red barn in a field.', altSource: 'ai' })
      expect(recovered.context.altTextPending).toBeUndefined()
    })

    it('still marks the photo pending when hints were looked up before the failure', async () => {
      // Looking up tag and location names replaces `req.context`; the flag must land on the
      // object the afterChange hook will be given, not on the one this hook started with.
      configure()
      modelFails(500)
      const req = uploadReq()
      const started = req.context
      const run = await loadHook()

      await run({ context: started, data: { alt: '', location: 'loc-1', tags: ['tag-1'] }, req })

      expect(req.context).not.toBe(started)
      expect(req.context.altTextPending).toBe(true)
    })

    it('does not start a cooldown for a rejected request (4xx)', async () => {
      configure()
      modelFails(401)
      const run = await loadHook()

      const rejected = await run({ data: { alt: '' } })
      expect(rejected.context.altTextPending).toBe(true)

      await run({ data: { alt: '' } })
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    it.each([
      { name: 'a copied AI description stays AI', alt: 'A red barn.', source: 'ai', want: 'ai' },
      {
        name: 'a copied hand-written one stays manual',
        alt: 'A red barn.',
        source: 'manual',
        want: 'manual',
      },
      { name: 'a copied legacy one stays unset', alt: 'A red barn.', source: null, want: null },
      {
        name: 'text changed while duplicating is manual',
        alt: 'My barn.',
        source: 'ai',
        want: 'manual',
      },
    ])('duplicate: $name', async ({ alt, source, want }) => {
      configure()
      const run = await loadHook()

      const { data } = await run({
        data: { alt },
        originalDoc: { alt: 'A red barn.', altSource: source as FakePhoto['altSource'] },
      })

      expect(data.altSource).toBe(want)
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('does not start a cooldown when the service answered, just not usefully', async () => {
      configure()
      modelAnswers('""')
      const run = await loadHook()

      const unusable = await run({ data: { alt: '' } })
      expect(unusable.context.altTextPending).toBe(true)

      modelAnswers('A red barn in a field.')
      const next = await run({ data: { alt: '' } })

      expect(fetchMock).toHaveBeenCalledTimes(2)
      expect(next.data).toMatchObject({ alt: 'A red barn in a field.', altSource: 'ai' })
    })

    it('starts without a cooldown in a freshly loaded module', async () => {
      configure()
      modelFails(500)
      await (
        await loadHook()
      )({ data: {} })
      expect(fetchMock).toHaveBeenCalledTimes(1)

      await (
        await loadHook()
      )({ data: {} })
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })
  })
})

describe('queueAltTextRetry', () => {
  const loadHook = async () => {
    vi.resetModules()
    const { queueAltTextRetry } = await import('@/collections/Photos/altText/hooks')

    return ({
      context = {},
      operation = 'create',
      req,
    }: {
      context?: Record<string, unknown>
      operation?: 'create' | 'update'
      req: PayloadRequest
    }) => {
      req.context = context
      return queueAltTextRetry({
        collection: {},
        context,
        data: {},
        doc,
        operation,
        previousDoc: {},
        req,
      } as never)
    }
  }

  const doc = { id: 'p1', alt: '', filename: 'pic.jpg' } as Photo

  it('queues once: a req reused for the next create does not queue again', async () => {
    const payload = fakePayload()
    const req = fakeReq(payload)
    const run = await loadHook()

    await run({ context: { altTextPending: true }, req })
    expect(req.context.altTextPending).toBeUndefined()

    await run({ context: req.context, req })
    expect(payload.jobs.queue).toHaveBeenCalledTimes(1)
  })

  it('queues the alt text task for a create that was left pending', async () => {
    const payload = fakePayload()
    const req = fakeReq(payload)
    const run = await loadHook()
    const before = Date.now()

    const result = await run({ context: { altTextPending: true }, req })

    expect(result).toBe(doc)
    expect(payload.jobs.queue).toHaveBeenCalledTimes(1)
    const args = payload.jobs.queue.mock.calls[0]?.[0] as {
      input: unknown
      queue: string
      req: unknown
      task: string
      waitUntil: Date
    }
    expect(args.task).toBe('generateAltText')
    expect(args.queue).toBe('alt-text')
    expect(args.input).toEqual({ photoId: 'p1' })
    expect(args.req).toBe(req)
    expect(args.waitUntil).toBeInstanceOf(Date)
    expect(args.waitUntil.getTime()).toBeGreaterThan(before)
  })

  it.each([
    { name: 'a create that is not pending', context: {}, operation: 'create' },
    {
      name: 'an update, even with the flag set',
      context: { altTextPending: true },
      operation: 'update',
    },
  ] as const)('does nothing for $name', async ({ context, operation }) => {
    const payload = fakePayload()
    const run = await loadHook()

    const result = await run({ context, operation, req: fakeReq(payload) })

    expect(result).toBe(doc)
    expect(payload.jobs.queue).not.toHaveBeenCalled()
  })

  // A throw here would skip the R2 upload hook that runs after this one.
  it.each([
    ['rejects', () => Promise.reject(new Error('db down'))],
    [
      'throws synchronously',
      () => {
        throw new Error('no such task')
      },
    ],
  ])('swallows a jobs.queue that %s and still returns the doc', async (_name, fail) => {
    const payload = fakePayload()
    payload.jobs.queue.mockImplementation(fail)
    const run = await loadHook()

    await expect(run({ context: { altTextPending: true }, req: fakeReq(payload) })).resolves.toBe(
      doc,
    )
    expect(payload.jobs.queue).toHaveBeenCalledTimes(1)
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('p1'))
  })
})

describe('generatePhotoAltText', () => {
  const storedPhoto = (overrides: FakePhoto = {}): FakePhoto => ({
    id: 'p1',
    alt: null,
    altSource: null,
    filename: 'pic.jpg',
    sizes: { medium: { filename: 'pic-900.webp', url: '/api/photos/file/pic-900.webp' } },
    url: '/api/photos/file/pic.jpg',
    ...overrides,
  })

  const setup = (photo: FakePhoto | null) => {
    const payload = fakePayload({ photo, staticDir })
    return { payload, req: fakeReq(payload) }
  }

  it.each([
    { alt: null, altSource: null, generated: true, overwrite: 'empty' },
    { alt: '', altSource: null, generated: true, overwrite: 'empty' },
    { alt: '   ', altSource: 'manual', generated: true, overwrite: 'empty' },
    { alt: 'Old AI text', altSource: 'ai', generated: false, overwrite: 'empty' },
    { alt: 'Hand-written', altSource: 'manual', generated: false, overwrite: 'empty' },
    { alt: 'Legacy text', altSource: null, generated: false, overwrite: 'empty' },
    { alt: null, altSource: null, generated: true, overwrite: 'ai' },
    { alt: 'Old AI text', altSource: 'ai', generated: true, overwrite: 'ai' },
    { alt: 'Hand-written', altSource: 'manual', generated: false, overwrite: 'ai' },
    { alt: 'Legacy text', altSource: null, generated: false, overwrite: 'ai' },
    { alt: null, altSource: null, generated: true, overwrite: 'always' },
    { alt: 'Old AI text', altSource: 'ai', generated: true, overwrite: 'always' },
    { alt: 'Hand-written', altSource: 'manual', generated: true, overwrite: 'always' },
    { alt: 'Legacy text', altSource: null, generated: true, overwrite: 'always' },
  ] as const)(
    "overwrite '$overwrite' with alt $alt / altSource $altSource → generated: $generated",
    async ({ alt, altSource, generated, overwrite }) => {
      configure()
      modelAnswers('A red barn in a field.')
      const { payload, req } = setup(storedPhoto({ alt, altSource }))

      const result = await generatePhotoAltText({ id: 'p1', overwrite, req })

      if (generated) {
        expect(result).toEqual({ alt: 'A red barn in a field.', status: 'generated' })
        expect(payload.update).toHaveBeenCalledTimes(1)
      } else {
        expect(result).toEqual({ reason: 'has-alt', status: 'skipped' })
        expect(payload.update).not.toHaveBeenCalled()
        expect(fetchMock).not.toHaveBeenCalled()
      }
    },
  )

  it('reports a missing photo without asking the model', async () => {
    configure()
    modelAnswers('A red barn in a field.')
    const { payload, req } = setup(null)

    const result = await generatePhotoAltText({ id: 'gone', overwrite: 'always', req })

    expect(result).toEqual({ reason: 'not-found', status: 'skipped' })
    expect(payload.findByID).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'gone', collection: 'photos', req }),
    )
    expect(fetchMock).not.toHaveBeenCalled()
    expect(payload.update).not.toHaveBeenCalled()
  })

  it('saves the cleaned answer as AI-written, flagged so the hook leaves it alone', async () => {
    configure()
    modelAnswers('"This image shows a red barn in a field."')
    const { payload, req } = setup(storedPhoto())

    const result = await generatePhotoAltText({
      id: 'p1',
      context: { disableRevalidate: true },
      overwrite: 'empty',
      req,
    })

    expect(result).toEqual({ alt: 'A red barn in a field.', status: 'generated' })
    expect(payload.update).toHaveBeenCalledTimes(1)
    const args = payload.update.mock.calls[0]?.[0] as Record<string, unknown>
    expect(args).toMatchObject({
      id: 'p1',
      collection: 'photos',
      data: { alt: 'A red barn in a field.', altSource: 'ai' },
    })
    expect(args.context).toEqual({ altTextGenerated: true, disableRevalidate: true })
    // Written through a req with its own `context`, so the flag never touches the shared one.
    expect(args.req).not.toBe(req)
    expect((args.req as PayloadRequest).payload).toBe(payload)
    expect(req.context.altTextGenerated).toBeUndefined()
  })

  it('does not replace text saved while the model was answering', async () => {
    configure()
    modelAnswers('A red barn in a field.')
    const { payload, req } = setup(storedPhoto())

    for (const overwrite of ['empty', 'ai'] as const) {
      payload.findByID
        .mockResolvedValueOnce(storedPhoto())
        .mockResolvedValueOnce({ id: 'p1', alt: 'Typed meanwhile', altSource: 'manual' })
      expect(await generatePhotoAltText({ id: 'p1', overwrite, req })).toEqual({
        reason: 'has-alt',
        status: 'skipped',
      })
    }
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(payload.update).not.toHaveBeenCalled()
  })

  it('reports a photo deleted while the model was answering', async () => {
    configure()
    modelAnswers('A red barn in a field.')
    const { payload, req } = setup(storedPhoto())
    payload.findByID.mockResolvedValueOnce(storedPhoto()).mockResolvedValueOnce(null)

    expect(await generatePhotoAltText({ id: 'p1', overwrite: 'always', req })).toEqual({
      reason: 'not-found',
      status: 'skipped',
    })
    expect(payload.update).not.toHaveBeenCalled()
  })

  it('does not let caller context switch the altTextGenerated flag off', async () => {
    configure()
    modelAnswers('A red barn in a field.')
    const { payload, req } = setup(storedPhoto())

    await generatePhotoAltText({
      id: 'p1',
      context: { altTextGenerated: false },
      overwrite: 'empty',
      req,
    })

    const args = payload.update.mock.calls[0]?.[0] as Record<string, unknown>
    expect(args.context).toEqual({ altTextGenerated: true })
  })

  it('does not leave altTextGenerated on the shared req after the write', async () => {
    configure()
    modelAnswers('A red barn in a field.')
    const { payload, req } = setup(storedPhoto())

    await generatePhotoAltText({ id: 'p1', overwrite: 'empty', req })
    expect(req.context.altTextGenerated).toBeUndefined()

    payload.update.mockImplementationOnce(async (args) => {
      if (args.req) args.req.context = { ...args.req.context, ...args.context }
      throw new Error('write failed')
    })
    await expect(generatePhotoAltText({ id: 'p1', overwrite: 'empty', req })).rejects.toThrow(
      'write failed',
    )
    expect(req.context.altTextGenerated).toBeUndefined()
  })

  it('describes the stored medium rendition, read from disk', async () => {
    configure()
    modelAnswers('A red barn in a field.')
    const { req } = setup(storedPhoto())

    await generatePhotoAltText({ id: 'p1', overwrite: 'empty', req })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(sent().url).toContain('api.cloudflare.com')
    const image = await describeBuffer(sentImage())
    expect(image).toMatchObject({ format: 'jpeg', height: 675, width: 900 })
    expect(image.r).toBeGreaterThan(200)
  })

  it('passes the populated tag and location names to the model', async () => {
    configure()
    modelAnswers('A surfer on a winter wave.')
    const { payload, req } = setup(
      storedPhoto({
        location: { id: 'loc-1', name: 'Ucluelet' },
        tags: [{ id: 'tag-9', name: 'Storm' }],
      }),
    )

    await generatePhotoAltText({ id: 'p1', overwrite: 'empty', req })

    const question = String(sent().question)
    expect(question).toContain('Ucluelet')
    expect(question).toContain('Storm')
    expect(payload.find).not.toHaveBeenCalled()
  })

  it.each([
    ['the model call fails', () => modelFails(500), /500/],
    ['the model answer is unusable', () => modelAnswers('""'), /not usable/],
  ])('throws and writes nothing when %s', async (_name, fail, message) => {
    configure()
    fail()
    const { payload, req } = setup(storedPhoto())

    await expect(generatePhotoAltText({ id: 'p1', overwrite: 'always', req })).rejects.toThrow(
      message,
    )
    expect(payload.update).not.toHaveBeenCalled()
  })

  it('throws and writes nothing when Workers AI is not configured', async () => {
    const { payload, req } = setup(storedPhoto())

    await expect(generatePhotoAltText({ id: 'p1', overwrite: 'empty', req })).rejects.toThrow(
      /not configured/i,
    )
    expect(fetchMock).not.toHaveBeenCalled()
    expect(payload.update).not.toHaveBeenCalled()
  })

  it('throws and writes nothing when the stored file cannot be read', async () => {
    configure()
    fetchMock.mockImplementation(async () => new Response('gone', { status: 404 }))
    const payload = fakePayload({ photo: storedPhoto(), staticDir: emptyDir })

    await expect(
      generatePhotoAltText({ id: 'p1', overwrite: 'empty', req: fakeReq(payload) }),
    ).rejects.toThrow(/could not read photo p1/)
    expect(payload.update).not.toHaveBeenCalled()
  })
})

describe('generateAltTextTask', () => {
  const handler = generateAltTextTask.handler as unknown as (args: {
    input: { photoId: string }
    req: PayloadRequest
  }) => Promise<{ output: { status: string } }>

  const photo = (alt: null | string): FakePhoto => ({
    id: 'p1',
    alt,
    altSource: alt ? 'ai' : null,
    filename: 'pic.jpg',
  })

  it('uses the slug and queue the retry hook queues to', () => {
    expect(generateAltTextTask.slug).toBe(ALT_TEXT_TASK)
    expect(ALT_TEXT_TASK).toBe('generateAltText')
    expect(ALT_TEXT_QUEUE).toBe('alt-text')
  })

  it('fills a blank alt', async () => {
    configure()
    modelAnswers('A blue lake.')
    const payload = fakePayload({ photo: photo(null), staticDir })

    const result = await handler({ input: { photoId: 'p1' }, req: fakeReq(payload) })

    expect(result).toEqual({ output: { status: 'generated' } })
    expect(payload.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { alt: 'A blue lake.', altSource: 'ai' } }),
    )
  })

  it('never replaces text written since the job was queued, not even AI text', async () => {
    configure()
    modelAnswers('A blue lake.')
    const payload = fakePayload({ photo: photo('Written in the meantime'), staticDir })

    const result = await handler({ input: { photoId: 'p1' }, req: fakeReq(payload) })

    expect(result).toEqual({ output: { status: 'skipped' } })
    expect(payload.update).not.toHaveBeenCalled()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('throws on a model failure so the job is retried', async () => {
    configure()
    modelFails(500)
    const payload = fakePayload({ photo: photo(null), staticDir })

    await expect(handler({ input: { photoId: 'p1' }, req: fakeReq(payload) })).rejects.toThrow()
  })
})
