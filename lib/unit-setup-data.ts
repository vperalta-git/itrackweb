'use client'

export type UnitSetupVariation = {
  name: string
  bodyColors: string[]
  transmission?: string
  drivetrain?: string
  bodyType?: string
}

export type UnitSetupRecord = {
  unitName: string
  variations: UnitSetupVariation[]
}

const UNIT_SETUP_STORAGE_KEY = 'itrack-unit-setup'
const UNIT_SETUP_UPDATED_EVENT = 'itrack:unit-setup-updated'

const legacyVehicleData = {
  'Isuzu D-Max': {
    bodyColors: [
      'Valencia Orange',
      'Red Spinel',
      'Mercury Silver',
      'Galena Gray',
      'Onyx Black',
      'Splash White',
    ],
    unitVariations: [
      'Cab and Chassis',
      'CC Utility Van Dual AC',
      '4x2 LT MT',
      '4x4 LT MT',
      '4x2 LS-A MT',
      '4x2 LS-A MT Plus',
      '4x2 LS-A AT',
      '4x2 LS-A AT Plus',
      '4x4 LS-A MT',
      '4x4 LS-A MT Plus',
      '4x2 LS-E AT',
      '4x4 LS-E AT',
      '4x4 Single Cab MT',
    ],
  },
  'Isuzu MU-X': {
    bodyColors: [
      'Onyx Black',
      'Satin White Pearl',
      'Splash White',
      'Mercury Silver',
      'Eiger Grey',
    ],
    unitVariations: [
      '1.9L MU-X 4x2 LS AT',
      '3.0L MU-X 4x2 LS-A AT',
      '3.0L MU-X 4x2 LS-E AT',
      '3.0L MU-X 4x4 LS-E AT',
    ],
  },
  'Isuzu Traviz': {
    bodyColors: ['White'],
    unitVariations: [
      'SWB 2.5L 4W 9FT Cab & Chassis',
      'SWB 2.5L 4W 9FT Utility Van Dual AC',
      'LWB 2.5L 4W 10FT Cab & Chassis',
      'LWB 2.5L 4W 10FT Utility Van Dual AC',
      'LWB 2.5L 4W 10FT Aluminum Van',
      'LWB 2.5L 4W 10FT Aluminum Van w/ Single AC',
      'LWB 2.5L 4W 10FT Dropside Body',
      'LWB 2.5L 4W 10FT Dropside Body w/ Single AC',
    ],
  },
  'Isuzu QLR Series': {
    bodyColors: ['White'],
    unitVariations: [
      'QLR77 E Tilt 3.0L 4W 10ft 60A Cab & Chassis',
      'QLR77 E Tilt Utility Van w/o AC',
      'QLR77 E Non-Tilt 3.0L 4W 10ft 60A Cab & Chassis',
      'QLR77 E Non-Tilt Utility Van w/o AC',
      'QLR77 E Non-Tilt Utility Van Dual AC',
    ],
  },
  'Isuzu NLR Series': {
    bodyColors: ['White'],
    unitVariations: [
      'NLR77 H Tilt 3.0L 4W 14ft 60A',
      'NLR77 H Jeepney Chassis (135A)',
      'NLR85 Tilt 3.0L 4W 10ft 90A',
      'NLR85E Smoother',
    ],
  },
  'Isuzu NMR Series': {
    bodyColors: ['White'],
    unitVariations: [
      'NMR85H Smoother',
      'NMR85 H Tilt 3.0L 6W 14ft 80A Non-AC',
    ],
  },
  'Isuzu NPR Series': {
    bodyColors: ['White'],
    unitVariations: [
      'NPR85 Tilt 3.0L 6W 16ft 90A',
      'NPR85 Cabless for Armored',
    ],
  },
  'Isuzu NPS Series': {
    bodyColors: ['White'],
    unitVariations: ['NPS75 H 3.0L 6W 16ft 90A'],
  },
  'Isuzu NQR Series': {
    bodyColors: ['White'],
    unitVariations: [
      'NQR75L Smoother',
      'NQR75 Tilt 5.2L 6W 18ft 90A',
    ],
  },
  'Isuzu FRR Series': {
    bodyColors: ['White'],
    unitVariations: [
      'FRR90M 6W 20ft 5.2L',
      'FRR90M Smoother',
    ],
  },
  'Isuzu FTR Series': {
    bodyColors: ['White'],
    unitVariations: ['FTR90M 6W 19ft 5.2L'],
  },
  'Isuzu FVR Series': {
    bodyColors: ['White'],
    unitVariations: [
      'FVR34Q Smoother',
      'FVR 34Q 6W 24ft 7.8L w/ ABS',
    ],
  },
  'Isuzu FTS Series': {
    bodyColors: ['White'],
    unitVariations: ['FTS34 J', 'FTS34L'],
  },
  'Isuzu FVM Series': {
    bodyColors: ['White'],
    unitVariations: [
      'FVM34T 10W 26ft 7.8L w/ ABS',
      'FVM34W 10W 32ft 7.8L w/ ABS',
    ],
  },
  'Isuzu FXM Series': {
    bodyColors: ['White'],
    unitVariations: ['FXM60W'],
  },
  'Isuzu GXZ Series': {
    bodyColors: ['White'],
    unitVariations: ['GXZ60N'],
  },
  'Isuzu EXR Series': {
    bodyColors: ['White'],
    unitVariations: ['EXR77H 380PS 6W Tractor Head'],
  },
} as const

export const defaultUnitSetupConfig: UnitSetupRecord[] = Object.entries(legacyVehicleData).map(
  ([unitName, config]) => ({
    unitName,
    variations: config.unitVariations.map((variationName) => ({
      name: variationName,
      bodyColors: [...config.bodyColors],
    })),
  })
)

function normalizeValue(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}

function dedupeStrings(values: string[]) {
  const seen = new Set<string>()

  return values.reduce<string[]>((accumulator, value) => {
    const normalized = normalizeValue(value)
    const key = normalized.toLowerCase()

    if (!normalized || seen.has(key)) return accumulator

    seen.add(key)
    accumulator.push(normalized)
    return accumulator
  }, [])
}

function sanitizeVariation(variation: UnitSetupVariation): UnitSetupVariation | null {
  const name = normalizeValue(variation.name)
  if (!name) return null

  const bodyColors = dedupeStrings(variation.bodyColors)

  return {
    name,
    bodyColors,
    transmission: normalizeValue(variation.transmission ?? '') || undefined,
    drivetrain: normalizeValue(variation.drivetrain ?? '') || undefined,
    bodyType: normalizeValue(variation.bodyType ?? '') || undefined,
  }
}

export function sanitizeUnitSetupConfig(config: UnitSetupRecord[]): UnitSetupRecord[] {
  const seenUnits = new Set<string>()

  return config.reduce<UnitSetupRecord[]>((accumulator, unit) => {
    const unitName = normalizeValue(unit.unitName)
    const unitKey = unitName.toLowerCase()

    if (!unitName || seenUnits.has(unitKey)) return accumulator

    const seenVariations = new Set<string>()
    const variations = unit.variations.reduce<UnitSetupVariation[]>((variationList, variation) => {
      const sanitizedVariation = sanitizeVariation(variation)
      if (!sanitizedVariation) return variationList

      const variationKey = sanitizedVariation.name.toLowerCase()
      if (seenVariations.has(variationKey)) return variationList

      seenVariations.add(variationKey)
      variationList.push(sanitizedVariation)
      return variationList
    }, [])

    seenUnits.add(unitKey)
    accumulator.push({
      unitName,
      variations,
    })
    return accumulator
  }, [])
}

function getFallbackConfig() {
  return sanitizeUnitSetupConfig(defaultUnitSetupConfig)
}

export function loadUnitSetupConfig() {
  if (typeof window === 'undefined') {
    return getFallbackConfig()
  }

  const raw = window.localStorage.getItem(UNIT_SETUP_STORAGE_KEY)
  if (!raw) return getFallbackConfig()

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return getFallbackConfig()

    return sanitizeUnitSetupConfig(parsed as UnitSetupRecord[])
  } catch {
    return getFallbackConfig()
  }
}

export function saveUnitSetupConfig(config: UnitSetupRecord[]) {
  const sanitized = sanitizeUnitSetupConfig(config)

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(UNIT_SETUP_STORAGE_KEY, JSON.stringify(sanitized))
    window.dispatchEvent(new CustomEvent(UNIT_SETUP_UPDATED_EVENT, { detail: sanitized }))
  }

  return sanitized
}

export function subscribeToUnitSetup(onChange: (config: UnitSetupRecord[]) => void) {
  if (typeof window === 'undefined') {
    return () => undefined
  }

  const handleUpdate = () => {
    onChange(loadUnitSetupConfig())
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === UNIT_SETUP_STORAGE_KEY) {
      handleUpdate()
    }
  }

  window.addEventListener(UNIT_SETUP_UPDATED_EVENT, handleUpdate)
  window.addEventListener('storage', handleStorage)

  return () => {
    window.removeEventListener(UNIT_SETUP_UPDATED_EVENT, handleUpdate)
    window.removeEventListener('storage', handleStorage)
  }
}

export function normalizeUnitSetupValue(value: string) {
  return normalizeValue(value).toLowerCase()
}
