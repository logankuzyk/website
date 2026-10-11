/** What we already know about a photo that the model can't see in the pixels. */
export type AltTextHints = {
  location?: string | null
  tags?: string[]
}

const MAX_ALT_LENGTH = 200

export const buildAltTextQuestion = ({ location, tags }: AltTextHints = {}): string => {
  const hints = [
    location && `Location: ${location}.`,
    tags?.length && `Tags: ${tags.join(', ')}.`,
  ].filter(Boolean)

  return [
    'Write alt text for this photograph for a screen reader user.',
    'Describe the main subject and setting in one plain sentence of at most 25 words.',
    'Do not start with "Image of" or "Photo of". Do not mention the camera or photographer.',
    hints.length && `Known context, use it only if it matches what is visible: ${hints.join(' ')}`,
  ]
    .filter(Boolean)
    .join(' ')
}

// "A photo of", "This image shows", "The picture depicts" … screen readers already announce
// "image", so the lead-in is noise.
const LEAD_IN =
  /^(?:this is\s+)?(?:(?:this|the|an?)\s+)?(?:image|photo|photograph|picture)\s+(?:is\s+)?(?:of|shows|showing|depicts|depicting|features|featuring|captures|capturing)\s+/i

// Only a quote pair around the whole answer. Double quotes inside mean the outer two are not a
// pair (`"Open" sign next to one reading "Closed"`).
const unquote = (text: string) =>
  text
    .replace(/^["“]([^"“”]*)["”]$/, '$1')
    .replace(/^['‘](.*)['’]$/, '$1')
    .trim()

// "I'm sorry, but I can't describe this image." is an answer, but not a description.
const REFUSAL =
  /^(?:i['’]?m sorry|i am sorry|sorry[,.]|i (?:cannot|can['’]?t|am unable|am not able)\b)/i

// "Alt text:", "Alt-text:", "**Alt:**" …
const LABEL = /^\**\s*alt(?:ernative)?(?:[\s-]*text)?\s*:\**\s*/i

// A sentence cut shorter than this is more likely an abbreviation ("Mt.") than a description.
const MIN_SENTENCE_CUT = 60

const truncate = (text: string): string => {
  if (text.length <= MAX_ALT_LENGTH) return text

  // Prefer whole sentences: the last sentence end inside the limit that is followed by a space.
  const head = text.slice(0, MAX_ALT_LENGTH)
  let cut = -1
  for (const match of head.matchAll(/[.!?](?=\s)/g)) cut = match.index + 1
  if (text[MAX_ALT_LENGTH] === ' ' && /[.!?]$/.test(head)) cut = MAX_ALT_LENGTH
  if (cut >= MIN_SENTENCE_CUT) return text.slice(0, cut)

  // Otherwise a word boundary, leaving room for the ellipsis.
  return `${text.slice(0, MAX_ALT_LENGTH - 1).replace(/\s+\S*$/, '')}…`
}

/** Normalise a raw model answer into alt text. Returns '' when nothing usable is left. */
export const cleanAltText = (raw: string): string => {
  let text = unquote(raw.replace(/\s+/g, ' ').trim())
  // The label can sit inside or outside the quotes, so unquote on both sides of removing it.
  text = unquote(text.replace(LABEL, ''))
  text = text.replace(LEAD_IN, '')
  // Stray punctuation or quotes are not a description.
  if (!/[\p{L}\p{N}]/u.test(text) || REFUSAL.test(text)) return ''

  text = truncate(text)
  return text.charAt(0).toUpperCase() + text.slice(1)
}
