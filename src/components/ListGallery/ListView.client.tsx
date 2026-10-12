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

import type { ListLayout } from './layout'

import { listLayoutPreferenceKey } from './layout'
import './index.scss'

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
export const GalleryListViewClient: React.FC<
  { initialLayout: ListLayout } & ListViewClientProps
> = ({ initialLayout, ...props }) => {
  const { beforeActions, collectionSlug } = props
  const { setPreference } = usePreferences()
  const [layout, setLayout] = useState<ListLayout>(initialLayout)

  const changeLayout = (next: ListLayout) => {
    setLayout(next)
    // Its own key, written whole: see `listLayoutPreferenceKey`. The server component in
    // `./ListView` reads it back as `initialLayout` on the next render.
    void setPreference(listLayoutPreferenceKey(collectionSlug), next)
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
