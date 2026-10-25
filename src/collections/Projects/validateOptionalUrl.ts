import type { TextFieldSingleValidation } from 'payload'

/** Optional field that, when filled, must be an absolute http(s) URL. */
export const validateOptionalUrl: TextFieldSingleValidation = (value) => {
  if (!value) return true

  try {
    const { protocol } = new URL(value)
    if (protocol === 'http:' || protocol === 'https:') return true
  } catch {
    // fall through
  }
  return 'Enter a full URL starting with http:// or https://'
}
