import type { CollectionConfig } from 'payload'

type ListComponents = NonNullable<NonNullable<CollectionConfig['admin']>['components']>

/**
 * `admin.components` for a collection whose list view can switch between Table and Gallery.
 * `imageField` names the top-level upload field to preview; omit it on an upload collection,
 * where the document itself is the image. `gallery` swaps in a wrapper around `ListGallery`.
 */
export const listGallery = (
  imageField?: string,
  gallery = '@/components/ListGallery#ListGallery',
): ListComponents => ({
  beforeListTable: [{ path: gallery, serverProps: { imageField } }],
  views: {
    list: { Component: '@/components/ListGallery/ListView#GalleryListView' },
  },
})
