'use client'

import type { ListViewClientProps } from 'payload'

import {
  Button,
  DefaultListView,
  GridViewIcon,
  ListViewIcon,
  useListQuery,
  usePreferences,
} from '@payloadcms/ui'
import React, { createContext, use, useState } from 'react'

import './index.scss'

export type ListLayout = 'gallery' | 'table'

const ListLayoutContext = createContext<ListLayout>('table')

export const useListLayout = () => use(ListLayoutContext)

const baseClass = 'list-gallery-toggle'

const LayoutToggle: React.FC<{ layout: ListLayout; onChange: (layout: ListLayout) => void }> = ({
  layout,
  onChange,
}) => {
  const { isGroupingBy } = useListQuery()

  // Grouped lists render one table per group; the gallery only knows the ungrouped page.
  if (isGroupingBy) return null

  return (
    <React.Fragment>
      <Button
        aria-label="Table view"
        buttonStyle="pill"
        className={[baseClass, layout === 'table' && 'is-active'].filter(Boolean).join(' ')}
        icon={<ListViewIcon />}
        margin={false}
        onClick={() => onChange('table')}
        tooltip="Table"
      />
      <Button
        aria-label="Gallery view"
        buttonStyle="pill"
        className={[baseClass, layout === 'gallery' && 'is-active'].filter(Boolean).join(' ')}
        icon={<GridViewIcon />}
        margin={false}
        onClick={() => onChange('gallery')}
        tooltip="Gallery"
      />
    </React.Fragment>
  )
}

/**
 * Payload's default list view with a Table/Gallery switch in the search bar. The gallery
 * itself is the `ListGallery` server component in the `beforeListTable` slot, which reads the
 * layout from this component's context.
 */
export const GalleryListView: React.FC<ListViewClientProps> = (props) => {
  const { beforeActions, collectionSlug, listPreferences } = props
  const { setPreference } = usePreferences()
  const [layout, setLayout] = useState<ListLayout>(
    (listPreferences as { listLayout?: ListLayout } | undefined)?.listLayout === 'gallery'
      ? 'gallery'
      : 'table',
  )

  const changeLayout = (next: ListLayout) => {
    setLayout(next)
    // Stored alongside Payload's own list preferences (columns, sort, limit) for this
    // collection, which come back as `listPreferences` on the next render.
    void setPreference(`collection-${collectionSlug}`, { listLayout: next }, true)
  }

  return (
    <ListLayoutContext value={layout}>
      <DefaultListView
        {...props}
        beforeActions={[
          ...(beforeActions ?? []),
          <LayoutToggle key="list-layout" layout={layout} onChange={changeLayout} />,
        ]}
      />
    </ListLayoutContext>
  )
}
