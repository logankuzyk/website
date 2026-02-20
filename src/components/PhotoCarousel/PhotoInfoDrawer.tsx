'use client'

import type { Media } from '@/payload-types'

import RichText from '@/components/RichText'
import { IconButton } from '@/components/ui/icon-button'
import { getMediaUrl } from '@/utilities/getMediaUrl'
import { ChevronDown, Download } from 'lucide-react'
import React from 'react'

type PhotoInfoDrawerProps = {
  photo: Media
  open: boolean
  onToggle: () => void
  uiVisible: boolean
}

const EXIF_LABELS: Record<string, string> = {
  Make: 'Camera',
  Model: 'Model',
  FocalLength: 'Focal Length',
  ExposureTime: 'Shutter Speed',
  FNumber: 'Aperture',
  ISO: 'ISO',
  DateTimeOriginal: 'Date Taken',
  ExposureCompensation: 'Exposure Comp',
}

export const PhotoInfoDrawer: React.FC<PhotoInfoDrawerProps> = ({
  photo,
  open,
  onToggle,
  uiVisible,
}) => {
  const downloadUrl = getMediaUrl(photo.url, photo.updatedAt)
  const filename = photo.filename ?? `photo-${photo.id}`

  const tags = Array.isArray(photo.tags)
    ? photo.tags
        .map((t) => (typeof t === 'object' && t && 'name' in t ? t.name : null))
        .filter(Boolean)
    : []

  const exifEntries =
    photo.exif && typeof photo.exif === 'object'
      ? Object.entries(photo.exif).filter(
          ([key, value]) => value != null && value !== '' && EXIF_LABELS[key],
        )
      : []

  const drawerVisible = open || uiVisible

  return (
    <div
      className={`fixed bottom-0 left-1/2 z-40 w-full -translate-x-1/2 bg-black/95 text-white shadow-2xl transition-opacity duration-200 md:max-w-[33vw] ${drawerVisible ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
    >
      {/* Drawer panel - slides up over chevron + index when open */}
      <div
        className="grid max-h-[70vh] transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
      >
        <div className="min-h-0 overflow-hidden">
          {/* Header with close chevron */}
          <div className="flex justify-center py-3">
            <IconButton
              onClick={onToggle}
              className="text-white/70 hover:bg-white/10 hover:text-white"
              aria-label="Close info"
              aria-expanded={open}
            >
              <ChevronDown />
            </IconButton>
          </div>
          {/* Content */}
          <div className="overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <div className="space-y-6 px-6 pb-8 pt-2">
              <PhotoInfoContent
                photo={photo}
                downloadUrl={downloadUrl}
                filename={filename}
                tags={tags}
                exifEntries={exifEntries}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

type PhotoInfoContentProps = {
  photo: Media
  downloadUrl: string
  filename: string
  tags: (string | null)[]
  exifEntries: [string, unknown][]
}

function PhotoInfoContent({
  photo,
  downloadUrl,
  filename,
  tags,
  exifEntries,
}: PhotoInfoContentProps) {
  return (
    <>
      <div className="mb-6">
        <a
          href={downloadUrl}
          download={filename}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-full items-center rounded-md border border-white/20 px-3 py-2 text-sm text-white transition-colors hover:bg-white/10 sm:w-auto"
        >
          <Download className="mr-2 size-4" />
          Download
        </a>
      </div>

      {photo.caption && (
        <section className="mb-6">
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-white/50">Description</h3>
          <div className="prose prose-invert max-w-none text-sm leading-relaxed prose-p:mb-2 prose-p:last:mb-0">
            <RichText data={photo.caption} enableGutter={false} enableProse={false} />
          </div>
        </section>
      )}

      {tags.length > 0 && (
        <section className="mb-6">
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-white/50">Tags</h3>
          <div className="flex flex-wrap gap-2">
            {tags.map((name) => (
              <span
                key={String(name)}
                className="rounded-md bg-white/15 px-2.5 py-1 text-sm text-white/90"
              >
                {name}
              </span>
            ))}
          </div>
        </section>
      )}

      {exifEntries.length > 0 && (
        <section className="mb-6">
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-white/50">Camera & EXIF</h3>
          <dl className="space-y-2.5 text-sm">
            {exifEntries.map(([key, value]) => (
              <div key={key} className="flex justify-between gap-4 border-b border-white/10 pb-2 last:border-0">
                <dt className="text-white/50">{EXIF_LABELS[key] ?? key}</dt>
                <dd className="text-right font-medium text-white/90">{String(value)}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {!photo.caption && tags.length === 0 && exifEntries.length === 0 && (
        <p className="text-sm text-white/40">No additional information for this photo.</p>
      )}
    </>
  )
}
