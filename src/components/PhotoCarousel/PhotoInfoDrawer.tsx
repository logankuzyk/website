'use client'

import type { Photo } from '@/payload-types'

import RichText from '@/components/RichText'
import { IconButton } from '@/components/ui/icon-button'
import { getMediaUrl } from '@/utilities/getMediaUrl'
import {
  formatAperture,
  formatCamera,
  formatDateTaken,
  formatFocalLength,
  formatIso,
  formatShutterSpeed,
} from '@/utilities/formatExif'
import { formatLocation } from '@/utilities/formatLocation'
import { ChevronDown, ChevronUp, Copy, Download } from 'lucide-react'
import React from 'react'

type PhotoInfoDrawerProps = {
  photo: Photo
  open: boolean
  onToggle: () => void
  uiVisible: boolean
  index?: number
  total?: number
  carouselEnabled?: boolean
}

export const PhotoInfoDrawer: React.FC<PhotoInfoDrawerProps> = ({
  photo,
  open,
  onToggle,
  uiVisible,
  index = 0,
  total = 1,
  carouselEnabled = true,
}) => {
  const downloadUrl = getMediaUrl(photo.url, photo.updatedAt)
  const filename = photo.filename ?? `photo-${photo.id}`

  const exif = photo.exif && typeof photo.exif === 'object' ? photo.exif : null
  const locationStr = formatLocation(photo.location)
  const hasExif = Boolean(
    exif &&
      (exif.Make ||
        exif.Model ||
        exif.FocalLength ||
        exif.ExposureTime ||
        exif.FNumber ||
        exif.ISO ||
        exif.DateTimeOriginal ||
        photo.width ||
        photo.height),
  )

  const drawerVisible = open || uiVisible

  return (
    <div
      className={`fixed bottom-0 left-1/2 z-40 flex w-full -translate-x-1/2 flex-col border text-white transition-[opacity,background-color,border-color] duration-200 md:max-w-[33vw] ${open ? 'border-border-dim bg-black/95' : 'border-transparent bg-transparent'} ${drawerVisible ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
    >
      {/* Drawer content - expands above the toggle bar when open */}
      <div
        className="grid max-h-[70vh] transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <div className="space-y-4 px-6 pb-6 pt-4">
              <PhotoInfoContent
                photo={photo}
                downloadUrl={downloadUrl}
                filename={filename}
                exif={exif}
                hasExif={hasExif}
                locationStr={locationStr}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Toggle bar - always in same spot at bottom */}
      <div
          className={`flex shrink-0 flex-col items-center gap-1 border-t py-3 transition-[border-color] duration-200 ${open ? 'border-border-dim' : 'border-transparent'}`}
        >
        {carouselEnabled && (
          <span className="text-sm text-white/70">
            {index + 1} / {total}
          </span>
        )}
        <IconButton
          onClick={onToggle}
          className="text-white/70 hover:bg-white/10 hover:text-white"
          aria-label={open ? 'Close info' : 'Open info'}
          aria-expanded={open}
        >
          {open ? <ChevronDown /> : <ChevronUp />}
        </IconButton>
      </div>
    </div>
  )
}

type PhotoInfoContentProps = {
  photo: Photo
  downloadUrl: string
  filename: string
  exif: Photo['exif'] | null
  hasExif: boolean
  locationStr: string | null
}

function PhotoInfoContent({
  photo,
  downloadUrl,
  filename,
  exif,
  hasExif,
  locationStr,
}: PhotoInfoContentProps) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(downloadUrl)
    } catch {
      // Fallback for older browsers
    }
  }

  const hasNarrative = Boolean(photo.caption)
  const hasTech = hasExif || locationStr

  return (
    <>
      {/* Zone 1: Narrative (Description + Tags) */}
      {hasNarrative && (
        <section className="space-y-4">
          {photo.caption && (
            <div>
              <h3 className="mb-2 font-mono text-xs font-medium uppercase tracking-wider text-glacier-medium">
                Description
              </h3>
              <div className="prose prose-invert max-w-none text-sm leading-relaxed text-text-snow prose-p:mb-2 prose-p:last:mb-0">
                <RichText data={photo.caption} enableGutter={false} enableProse={false} />
              </div>
            </div>
          )}
        </section>
      )}

      {/* Zone 2: Tech Grid */}
      {hasTech && (
        <section
          className={`grid grid-cols-2 gap-x-6 gap-y-4 ${hasNarrative ? 'border-t border-border-dim pt-4' : ''}`}
        >
          {locationStr && (
            <TechCell label="Location" value={locationStr} />
          )}
          {formatDateTaken(exif?.DateTimeOriginal) && (
            <TechCell label="Date taken" value={formatDateTaken(exif!.DateTimeOriginal)!} />
          )}
          {formatCamera(exif?.Make, exif?.Model) && (
            <TechCell label="Camera" value={formatCamera(exif!.Make, exif!.Model)!} />
          )}
          {photo.width && photo.height && (
            <TechCell
              label="Dimensions"
              value={`${photo.width} × ${photo.height}`}
            />
          )}
          {[formatFocalLength(exif?.FocalLength), formatAperture(exif?.FNumber), formatShutterSpeed(exif?.ExposureTime), formatIso(exif?.ISO)]
            .filter(Boolean)
            .join(' ') && (
            <div className="col-span-2">
              <TechCell
                label="Exposure"
                value={[formatFocalLength(exif?.FocalLength), formatAperture(exif?.FNumber), formatShutterSpeed(exif?.ExposureTime), formatIso(exif?.ISO)]
                  .filter(Boolean)
                  .join(' ')}
              />
            </div>
          )}
        </section>
      )}

      {/* Zone 3: Action Bar (right above toggle) */}
      <div
        className={`flex flex-wrap gap-2 ${hasNarrative || hasTech ? 'border-t border-border-dim pt-4' : ''}`}
      >
        <a
          href={downloadUrl}
          download={filename}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center border border-border-dim bg-transparent px-3 py-2 text-sm text-text-snow transition-colors hover:bg-white/10"
        >
          <Download className="mr-2 size-4 shrink-0" />
          Download
        </a>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center border border-border-dim bg-transparent px-3 py-2 text-sm text-text-snow transition-colors hover:bg-white/10"
        >
          <Copy className="mr-2 size-4 shrink-0" />
          Copy
        </button>
      </div>

      {!hasNarrative && !hasTech && (
        <p className="text-sm text-text-glacier">No additional information for this photo.</p>
      )}
    </>
  )
}

function TechCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-0.5 font-mono text-xs font-medium uppercase tracking-wider text-glacier-medium">
        {label}
      </p>
      <p className="font-mono text-sm text-text-snow">{value}</p>
    </div>
  )
}
