/**
 * Format EXIF shutter speed from decimal seconds to fraction (e.g. 0.004 → "1/250s")
 */
export function formatShutterSpeed(value: string | number | null | undefined): string {
  if (value == null || value === '') return ''
  const sec = typeof value === 'string' ? parseFloat(value) : value
  if (Number.isNaN(sec)) return String(value)

  if (sec >= 1) {
    return `${sec}s`
  }
  if (sec < 0.0001) return String(value)

  const denom = Math.round(1 / sec)
  return `1/${denom}s`
}

/**
 * Format focal length with mm unit (e.g. 55 → "55.0mm")
 */
export function formatFocalLength(value: string | number | null | undefined): string {
  if (value == null || value === '') return ''
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (Number.isNaN(num)) return String(value)
  const formatted = Number.isInteger(num) ? `${num}.0` : String(num)
  return `${formatted}mm`
}

/**
 * Format aperture with f/ prefix (e.g. 2.8 → "f/2.8")
 */
export function formatAperture(value: string | number | null | undefined): string {
  if (value == null || value === '') return ''
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (Number.isNaN(num)) return String(value)
  return `f/${num}`
}

/**
 * Format ISO (e.g. "400" → "ISO 400")
 */
export function formatIso(value: string | number | null | undefined): string {
  if (value == null || value === '') return ''
  const str = String(value).trim()
  if (!str) return ''
  return `ISO ${str}`
}

/**
 * Format date taken from EXIF DateTimeOriginal using locale date string.
 * Handles Unix timestamps (seconds), ISO strings, and other date formats.
 */
export function formatDateTaken(
  value: string | number | null | undefined,
  locale?: string | string[],
): string {
  if (value == null || value === '') return ''
  try {
    let date: Date
    const str = String(value).trim()
    const num = parseFloat(str)

    // Unix timestamp (seconds) - e.g. 1751286361
    if (/^\d{9,11}$/.test(str) && !Number.isNaN(num)) {
      date = new Date(num * 1000)
    } else {
      date = new Date(value as string)
    }

    if (Number.isNaN(date.getTime())) return str
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return String(value)
  }
}

/**
 * Format camera make and model. If model includes the make string, remove it from the model.
 */
export function formatCamera(make: string | null | undefined, model: string | null | undefined): string {
  const makeStr = (make ?? '').trim()
  let modelStr = (model ?? '').trim()
  if (makeStr && modelStr && modelStr.toLowerCase().startsWith(makeStr.toLowerCase())) {
    modelStr = modelStr.slice(makeStr.length).trim()
  }
  return [makeStr, modelStr].filter(Boolean).join(', ')
}
