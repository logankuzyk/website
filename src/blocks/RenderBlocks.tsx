import React, { Fragment } from 'react'

import type { Page } from '@/payload-types'

import { ArchiveBlock } from '@/blocks/ArchiveBlock/Component'
import { CallToActionBlock } from '@/blocks/CallToAction/Component'
import { ContentBlock } from '@/blocks/Content/Component'
import { FormBlock } from '@/blocks/Form/Component'
import { MediaBlock } from '@/blocks/MediaBlock/Component'
import { PhotoGridBlock } from '@/blocks/PhotoGridBlock/Component'
import { ProjectsGridBlock } from '@/blocks/ProjectsGridBlock/Component'
import { CareerTimelineBlock } from '@/blocks/CareerTimelineBlock/Component'

const blockComponents = {
  archive: ArchiveBlock,
  careerTimeline: CareerTimelineBlock,
  content: ContentBlock,
  cta: CallToActionBlock,
  formBlock: FormBlock,
  mediaBlock: MediaBlock,
  photoGrid: PhotoGridBlock,
  projectsGrid: ProjectsGridBlock,
}

export const RenderBlocks: React.FC<{
  blocks: NonNullable<Page['layout']>
  searchParams?: { [key: string]: string | string[] | undefined }
}> = (props) => {
  const { blocks, searchParams } = props

  const hasBlocks = blocks && Array.isArray(blocks) && blocks.length > 0

  const pageParam = searchParams?.page
  const page = typeof pageParam === 'string' ? parseInt(pageParam, 10) : 1
  const pageNumber = Number.isInteger(page) && page >= 1 ? page : 1

  if (hasBlocks) {
    return (
      <Fragment>
        {blocks.map((block, index) => {
          const { blockType } = block

          if (blockType && blockType in blockComponents) {
            const Block = blockComponents[blockType as keyof typeof blockComponents]

            if (Block) {
              const blockProps =
                blockType === 'archive'
                  ? { ...block, page: pageNumber, disableInnerContainer: true }
                  : { ...block, disableInnerContainer: true }

              return (
                <div className="my-16" key={index}>
                  {/* @ts-expect-error there may be some mismatch between the expected types here */}
                  <Block {...blockProps} />
                </div>
              )
            }
          }
          return null
        })}
      </Fragment>
    )
  }

  return null
}
