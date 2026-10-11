'use client'

import type { CollectionSlug } from 'payload'

import {
  Link,
  SelectRow,
  useConfig,
  useListDrawerContext,
  useListQuery,
  useSelection,
} from '@payloadcms/ui'
import { formatAdminURL } from 'payload/shared'
import React from 'react'

import { useListLayout } from './ListView'
import './index.scss'

export type GalleryItem = {
  alt: string
  id: number | string
  /** Square preview URL, or null when the document has no image. */
  src: null | string
  title: string
}

type Props = {
  collectionSlug: CollectionSlug
  items: GalleryItem[]
}

type RowData = React.ComponentProps<typeof SelectRow>['rowData']

const baseClass = 'list-gallery'

export const ListGalleryClient: React.FC<Props> = ({ collectionSlug, items }) => {
  const layout = useListLayout()
  const { data, isGroupingBy } = useListQuery()
  const { selected } = useSelection()
  const { drawerSlug, onSelect } = useListDrawerContext()
  const {
    config: {
      routes: { admin: adminRoute },
    },
  } = useConfig()

  // Grouped lists render one table per group; the gallery only knows the ungrouped page.
  if (layout !== 'gallery' || isGroupingBy || items.length === 0) return null

  const docs = new Map<number | string, RowData>((data?.docs ?? []).map((doc) => [doc.id, doc]))
  // The full list view always has row selection. A drawer only does for some fields, and
  // doesn't expose which, so cards there just pick the document.
  const enableRowSelections = !drawerSlug

  return (
    <ul className={baseClass}>
      {items.map((item) => {
        const doc = docs.get(item.id)
        const card = (
          <React.Fragment>
            <span className={`${baseClass}__preview`}>
              {item.src && (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt={item.alt} loading="lazy" src={item.src} />
              )}
            </span>
            <span className={`${baseClass}__title`}>{item.title}</span>
          </React.Fragment>
        )

        return (
          <li
            className={[`${baseClass}__card`, selected.get(item.id) && 'is-selected']
              .filter(Boolean)
              .join(' ')}
            key={item.id}
          >
            {/* In a drawer (e.g. an upload field's "choose from existing") a card picks the
                document, like the table's linked cell does, instead of navigating to it. */}
            {drawerSlug ? (
              <button
                className={`${baseClass}__link`}
                onClick={() => {
                  if (doc) onSelect?.({ collectionSlug, doc, docID: String(item.id) })
                }}
                type="button"
              >
                {card}
              </button>
            ) : (
              <Link
                className={`${baseClass}__link`}
                href={formatAdminURL({
                  adminRoute,
                  path: `/collections/${collectionSlug}/${encodeURIComponent(item.id)}`,
                })}
                prefetch={false}
              >
                {card}
              </Link>
            )}
            {enableRowSelections && doc && (
              <div className={`${baseClass}__select`}>
                <SelectRow rowData={doc} />
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
