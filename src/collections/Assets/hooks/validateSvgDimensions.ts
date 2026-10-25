import type { CollectionBeforeOperationHook } from 'payload'

import { ValidationError } from 'payload'

const MESSAGE = 'SVG needs a viewBox or width/height'

// Attribute values may legitimately contain `>`, so match quoted values as a unit.
const SVG_ROOT = /<svg\b((?:[^>"']|"[^"]*"|'[^']*')*)>/i
// Unitless or an absolute unit. Font-relative (`em`, `ex`) and percentage lengths carry no size.
const ABSOLUTE_LENGTH = /^\s*(\d+(?:\.\d+)?|\.\d+)\s*(?:px|pt|pc|mm|cm|in)?\s*$/i

const readAttribute = (attributes: string, name: string): string | undefined => {
  const match = new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i').exec(attributes)
  return match ? (match[1] ?? match[2]) : undefined
}

const isPositiveLength = (value: string | undefined): boolean => {
  const match = value === undefined ? null : ABSOLUTE_LENGTH.exec(value)
  return match !== null && Number(match[1]) > 0
}

/** `min-x min-y width height`: four numbers, with a positive width and height. */
const isUsableViewBox = (value: string): boolean => {
  const parts = value.trim().split(/[\s,]+/).map(Number)
  return parts.length === 4 && parts.every(Number.isFinite) && parts[2] > 0 && parts[3] > 0
}

/**
 * An SVG used as a `object-cover` background needs an intrinsic aspect ratio, which comes from
 * either a `viewBox` or an absolute `width` *and* `height` on the root element, each with a
 * positive size. Relative lengths (`100%`, `em`) carry no ratio on their own.
 */
export const svgHasDimensions = (svg: string): boolean => {
  const stripped = svg.replace(/<!--[\s\S]*?-->/g, '').replace(/<\?[\s\S]*?\?>/g, '')
  const root = SVG_ROOT.exec(stripped.replace(/<!DOCTYPE[^>[]*(\[[\s\S]*?\])?\s*>/gi, ''))
  if (!root) return false

  const attributes = root[1]
  const viewBox = readAttribute(attributes, 'viewBox')
  if (viewBox !== undefined) return isUsableViewBox(viewBox)

  return isPositiveLength(readAttribute(attributes, 'width')) && isPositiveLength(readAttribute(attributes, 'height'))
}

/**
 * Reject SVG uploads that can't be sized. Thrown as a field-level `ValidationError` (path
 * `file`), not a `FileUploadError`: the global `afterError` hook rewrites the latter into the
 * photo-specific "HDR/RAW" message, and a field error is what BulkUpload counts as a failure.
 */
export const validateSvgDimensions: CollectionBeforeOperationHook = async ({ operation, req }) => {
  // Replacing the file of an existing asset goes through `update` and must be checked too.
  if ((operation !== 'create' && operation !== 'update') || !req.file?.data?.length) return
  if (req.file.mimetype.toLowerCase() !== 'image/svg+xml') return

  if (!svgHasDimensions(req.file.data.toString('utf8'))) {
    throw new ValidationError({ errors: [{ message: MESSAGE, path: 'file' }] })
  }
}
