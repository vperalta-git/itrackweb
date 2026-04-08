'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'

const bodyColorSwatches: Record<string, string> = {
  'Valencia Orange': '#d86c1f',
  'Red Spinel': '#9c2338',
  'Mercury Silver': '#b0b5bb',
  'Galena Gray': '#6b7077',
  'Onyx Black': '#1f2124',
  'Splash White': '#f7f7f2',
  'Satin White Pearl': '#f4f2eb',
  'Eiger Grey': '#7d8086',
  White: '#ffffff',
}

export function getBodyColorSwatch(bodyColor: string) {
  const trimmed = bodyColor.trim()
  if (!trimmed) return '#cbd5e1'

  const exactMatch =
    bodyColorSwatches[trimmed] ??
    Object.entries(bodyColorSwatches).find(
      ([key]) => key.toLowerCase() === trimmed.toLowerCase()
    )?.[1]

  if (exactMatch) return exactMatch

  if (/^#([\da-f]{3}|[\da-f]{6})$/i.test(trimmed)) {
    return trimmed
  }

  if (/^(rgb|rgba|hsl|hsla)\(/i.test(trimmed)) {
    return trimmed
  }

  if (typeof CSS !== 'undefined') {
    const directCandidate = trimmed.toLowerCase()
    if (CSS.supports('color', directCandidate)) {
      return directCandidate
    }

    const condensedCandidate = trimmed.toLowerCase().replace(/[\s-]+/g, '')
    if (CSS.supports('color', condensedCandidate)) {
      return condensedCandidate
    }
  }

  return '#cbd5e1'
}

export function BodyColorChip({
  bodyColor,
  className,
  swatchClassName,
  textClassName,
}: {
  bodyColor: string
  className?: string
  swatchClassName?: string
  textClassName?: string
}) {
  const swatchColor = getBodyColorSwatch(bodyColor)

  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span
        className={cn('size-3 rounded-full border border-black/10 shadow-sm', swatchClassName)}
        style={{ backgroundColor: swatchColor }}
        aria-hidden="true"
      />
      <span className={cn('truncate', textClassName)}>{bodyColor}</span>
    </span>
  )
}
