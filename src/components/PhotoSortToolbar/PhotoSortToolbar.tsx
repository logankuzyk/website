'use client'

import { useSafeQueryReplace } from '@/utilities/useSafeQueryReplace'
import { useSearchParams } from 'next/navigation'
import React, { useCallback } from 'react'

const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Created At' },
  { value: 'dateTaken', label: 'Date Taken' },
  { value: 'filename', label: 'Filename' },
] as const

type SortValue = (typeof SORT_OPTIONS)[number]['value']
type OrderValue = 'asc' | 'desc'

type PhotoSortToolbarProps = {
  defaultSort?: SortValue
  defaultOrder?: OrderValue
}

export function PhotoSortToolbar({ defaultSort = 'dateTaken', defaultOrder = 'desc' }: PhotoSortToolbarProps = {}) {
  const searchParams = useSearchParams()
  const safeQueryReplace = useSafeQueryReplace()

  const sort = (searchParams.get('sort') as SortValue) || defaultSort
  const order = (searchParams.get('order') as OrderValue) || defaultOrder

  const setSort = useCallback(
    (value: SortValue) => {
      safeQueryReplace((sp) => {
        sp.set('sort', value)
      })
    },
    [safeQueryReplace],
  )

  const setOrder = useCallback(
    (value: OrderValue) => {
      safeQueryReplace((sp) => {
        sp.set('order', value)
      })
    },
    [safeQueryReplace],
  )

  const toggleOrder = useCallback(() => {
    setOrder(order === 'asc' ? 'desc' : 'asc')
  }, [order, setOrder])

  return (
    <div className="flex items-baseline justify-end gap-6">
      <div className="flex items-baseline gap-2">
        <span className="font-sans text-[11px] font-bold uppercase tracking-wide text-text-glacier">
          SORT BY:
        </span>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortValue)}
          className="font-mono text-xs text-foreground bg-transparent border-none cursor-pointer appearance-none focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent-frost rounded-none hover:opacity-80 [&>option]:bg-background [&>option]:text-foreground"
          aria-label="Sort by"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="font-sans text-[11px] font-bold uppercase tracking-wide text-text-glacier">
          ORDER:
        </span>
        <button
          type="button"
          onClick={toggleOrder}
          className="font-mono text-xs text-foreground bg-transparent border-none cursor-pointer p-0 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent-frost rounded-none hover:opacity-80"
          aria-label={`Sort order: ${order === 'asc' ? 'ascending' : 'descending'}`}
        >
          {order === 'asc' ? '↑' : '↓'}
        </button>
      </div>
    </div>
  )
}
