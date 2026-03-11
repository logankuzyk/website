import type { Post, ArchiveBlock as ArchiveBlockProps } from '@/payload-types'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'
import RichText from '@/components/RichText'

import { CollectionArchive } from '@/components/CollectionArchive'
import { PageRange } from '@/components/PageRange'
import { Pagination } from '@/components/Pagination'

export const ArchiveBlock: React.FC<
  ArchiveBlockProps & {
    id?: string
    page?: number
  }
> = async (props) => {
  const { id, categories, introContent, limit: limitFromProps, populateBy, selectedDocs, page = 1 } = props

  const limit = limitFromProps || 12

  let posts: Post[] = []
  let totalDocs = 0
  let totalPages = 1
  let currentPage = 1

  if (populateBy === 'collection') {
    const payload = await getPayload({ config: configPromise })

    const flattenedCategories = categories?.map((category) => {
      if (typeof category === 'object') return category.id
      else return category
    })

    const where: { categories?: { in: string[] } } =
      flattenedCategories && flattenedCategories.length > 0
        ? { categories: { in: flattenedCategories } }
        : {}

    const fetchedPosts = await payload.find({
      collection: 'posts',
      depth: 1,
      limit,
      page,
      overrideAccess: false,
      ...(Object.keys(where).length > 0 && { where }),
    })

    posts = fetchedPosts.docs as Post[]
    totalDocs = fetchedPosts.totalDocs ?? 0
    totalPages = fetchedPosts.totalPages ?? 1
    currentPage = fetchedPosts.page ?? 1
  } else {
    if (selectedDocs?.length) {
      const filteredSelectedPosts = selectedDocs
        .map((post) => (typeof post.value === 'object' ? post.value : null))
        .filter(Boolean) as Post[]
      posts = filteredSelectedPosts
    }
  }

  const showPagination = populateBy === 'collection' && totalPages > 1

  return (
    <div className="my-16" id={id ? `block-${id}` : undefined}>
      {introContent && (
        <div className="container mb-16">
          <RichText className="ms-0 max-w-[48rem]" data={introContent} enableGutter={false} />
        </div>
      )}
      {populateBy === 'collection' && (
        <div className="container mb-8">
          <PageRange
            collection="posts"
            currentPage={currentPage}
            limit={limit}
            totalDocs={totalDocs}
          />
        </div>
      )}
      <CollectionArchive posts={posts} />
      {showPagination && (
        <div className="container mt-8">
          <Pagination page={currentPage} totalPages={totalPages} />
        </div>
      )}
    </div>
  )
}
