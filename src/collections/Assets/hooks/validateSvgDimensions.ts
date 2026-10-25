import type { CollectionBeforeOperationHook } from 'payload'

import { ValidationError } from 'payload'

const MESSAGE = 'SVG needs a viewBox or width/height'

// Attribute values may legitimately contain `>`, so match quoted values as a unit.
const SVG_ROOT = /<svg\b((?:[^>"']|"[^"]*"|'[^']*')*)>/i
const ABSOLUTE_LENGTH = /^\s*\d+(\.\d+)?\s*(px|pt|pc|mm|cm|in|em|rem|ex)?\s*$/i

const readAttribute = (attributes: string, name: string): string | undefined => {
  const match = new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i').exec(attributes)
  return match ? (match[1] ?? match[2]) : undefined
}

/**
 * An SVG used as a `object-cover` background needs an intrinsic aspect ratio, which comes from
 * either a `viewBox` or an absolute `width` *and* `height` on the root element. Relative
 * lengths (`100%`) carry no ratio on their own.
 */
export const svgHasDimensions = (svg: string): boolean => {
  const stripped = svg.replace(/<!--[\s\S]*?-->/g, '').replace(/<\?[\s\S]*?\?>/g, '')
  const root = SVG_ROOT.exec(stripped.replace(/<!DOCTYPE[^>[]*(\[[\s\S]*?\])?\s*>/gi, ''))
  if (!root) return false

  const attributes = root[1]
  if (readAttribute(attributes, 'viewBox')?.trim()) return true

  const width = readAttribute(attributes, 'width')
  const height = readAttribute(attributes, 'height')
  return Boolean(width && height && ABSOLUTE_LENGTH.test(width) && ABSOLUTE_LENGTH.test(height))
}

/**
 * Reject SVG uploads that can't be sized. Thrown as a field-level `ValidationError` (path
 * `file`), not a `FileUploadError`: the global `afterError` hook rewrites the latter into the
 * photo-specific "HDR/RAW" message, and a field error is what BulkUpload counts as a failure.
 */
export const validateSvgDimensions: CollectionBeforeOperationHook = async ({ operation, req }) => {
  if (operation !== 'create' || !req.file?.data?.length) return
  if (req.file.mimetype.toLowerCase() !== 'image/svg+xml') return

  if (!svgHasDimensions(req.file.data.toString('utf8'))) {
    throw new ValidationError({ errors: [{ message: MESSAGE, path: 'file' }] })
  }
}
