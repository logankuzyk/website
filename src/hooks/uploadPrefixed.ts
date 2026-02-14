// From https://payloadcms.com/community-help/discussions/file-upload-to-r2-s3-bucket-plugin-cloud-storage
import type { CollectionBeforeChangeHook } from 'payload'
import crypto from 'crypto'

export const appendPrefixToCollectionBeforeChangeHook: CollectionBeforeChangeHook = async ({
  data,
  operation,
  req,
}) => {
  if (operation !== 'create') return data

  const objectID = crypto.randomBytes(12).toString('hex')
  data.prefix = `uploads.prefix/${objectID}`

  if (req?.file?.name) {
    data.originalName = req.file.name
  }

  return data
}
