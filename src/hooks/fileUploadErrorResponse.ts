import type { AfterErrorHook } from 'payload'

import { FileUploadError } from 'payload'

const MESSAGE =
  "This image couldn't be processed. If it's a HDR/10-bit or RAW export, re-save it as a " +
  'standard JPEG (or 8-bit AVIF) and try again.'

/**
 * Payload turns any `sharp` decode failure in `generateFileData` into a bare
 * `FileUploadError` — HTTP 400 with a top-level message and no `data`. `@payloadcms/ui`'s
 * BulkUpload only counts a failed form when the response carries *field-level* errors
 * (`errors[].data.errors[].path`); a message-only error yields `errorCount 0`, so the file
 * is folded into the success tally, the toast says "Successfully saved", and the drawer
 * closes even though nothing was created.
 *
 * This adapter re-shapes a `FileUploadError` into the `ValidationError` envelope the UI
 * already handles, so the upload shows a clear per-file error instead of a false success.
 * Remove if/when the upstream BulkUpload miscount is fixed.
 */
export const fileUploadErrorResponse: AfterErrorHook = ({ error }) => {
  const isFileUploadError =
    error instanceof FileUploadError || error?.name === 'FileUploadError'
  if (!isFileUploadError) return

  return {
    status: 400,
    response: {
      errors: [
        {
          name: 'ValidationError',
          data: { errors: [{ message: MESSAGE, path: 'file' }] },
          message: 'The following field is invalid: file',
        },
      ],
    },
  }
}
