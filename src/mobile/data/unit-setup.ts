export type UnitSetupVariation = {
  name: string;
  bodyColors: string[];
  transmission?: string;
  drivetrain?: string;
  bodyType?: string;
};

export type UnitSetupRecord = {
  unitName: string;
  variations: UnitSetupVariation[];
};

export type UnitSetupCategory =
  | 'pickup_suv'
  | 'light_duty'
  | 'heavy_duty';

type UnitSetupPreset = {
  unitName: string;
  variations: string[];
  bodyColors: string[];
};

const DEFAULT_UNIT_SETUP_PRESETS: UnitSetupPreset[] = [
  {
    unitName: 'Isuzu D-Max',
    variations: [
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
    bodyColors: [
      'Valencia Orange',
      'Red Spinel',
      'Mercury Silver',
      'Galena Gray',
      'Onyx Black',
      'Splash White',
    ],
  },
  {
    unitName: 'Isuzu MU-X',
    variations: [
      '1.9L MU-X 4x2 LS AT',
      '3.0L MU-X 4x2 LS-A AT',
      '3.0L MU-X 4x2 LS-E AT',
      '3.0L MU-X 4x4 LS-E AT',
    ],
    bodyColors: [
      'Onyx Black',
      'Satin White Pearl',
      'Splash White',
      'Mercury Silver',
      'Eiger Grey',
    ],
  },
  {
    unitName: 'Isuzu Traviz',
    variations: [
      'SWB 2.5L 4W 9FT Cab & Chassis',
      'SWB 2.5L 4W 9FT Utility Van Dual AC',
      'LWB 2.5L 4W 10FT Cab & Chassis',
      'LWB 2.5L 4W 10FT Utility Van Dual AC',
      'LWB 2.5L 4W 10FT Aluminum Van',
      'LWB 2.5L 4W 10FT Aluminum Van w/ Single AC',
      'LWB 2.5L 4W 10FT Dropside Body',
      'LWB 2.5L 4W 10FT Dropside Body w/ Single AC',
    ],
    bodyColors: ['White'],
  },
  {
    unitName: 'Isuzu QLR Series',
    variations: [
      'QLR77 E Tilt 3.0L 4W 10ft 60A Cab & Chassis',
      'QLR77 E Tilt Utility Van w/o AC',
      'QLR77 E Non-Tilt 3.0L 4W 10ft 60A Cab & Chassis',
      'QLR77 E Non-Tilt Utility Van w/o AC',
      'QLR77 E Non-Tilt Utility Van Dual AC',
    ],
    bodyColors: ['White'],
  },
  {
    unitName: 'Isuzu NLR Series',
    variations: [
      'NLR77 H Tilt 3.0L 4W 14ft 60A',
      'NLR77 H Jeepney Chassis (135A)',
      'NLR85 Tilt 3.0L 4W 10ft 90A',
      'NLR85E Smoother',
    ],
    bodyColors: ['White'],
  },
  {
    unitName: 'Isuzu NMR Series',
    variations: [
      'NMR85H Smoother',
      'NMR85 H Tilt 3.0L 6W 14ft 80A Non-AC',
    ],
    bodyColors: ['White'],
  },
  {
    unitName: 'Isuzu NPR Series',
    variations: [
      'NPR85 Tilt 3.0L 6W 16ft 90A',
      'NPR85 Cabless for Armored',
    ],
    bodyColors: ['White'],
  },
  {
    unitName: 'Isuzu NPS Series',
    variations: ['NPS75 H 3.0L 6W 16ft 90A'],
    bodyColors: ['White'],
  },
  {
    unitName: 'Isuzu NQR Series',
    variations: ['NQR75L Smoother', 'NQR75 Tilt 5.2L 6W 18ft 90A'],
    bodyColors: ['White'],
  },
  {
    unitName: 'Isuzu FRR Series',
    variations: ['FRR90M 6W 20ft 5.2L', 'FRR90M Smoother'],
    bodyColors: ['White'],
  },
  {
    unitName: 'Isuzu FTR Series',
    variations: ['FTR90M 6W 19ft 5.2L'],
    bodyColors: ['White'],
  },
  {
    unitName: 'Isuzu FVR Series',
    variations: ['FVR34Q Smoother', 'FVR 34Q 6W 24ft 7.8L w/ ABS'],
    bodyColors: ['White'],
  },
  {
    unitName: 'Isuzu FTS Series',
    variations: ['FTS34 J', 'FTS34L'],
    bodyColors: ['White'],
  },
  {
    unitName: 'Isuzu FVM Series',
    variations: [
      'FVM34T 10W 26ft 7.8L w/ ABS',
      'FVM34W 10W 32ft 7.8L w/ ABS',
    ],
    bodyColors: ['White'],
  },
  {
    unitName: 'Isuzu FXM Series',
    variations: ['FXM60W'],
    bodyColors: ['White'],
  },
  {
    unitName: 'Isuzu GXZ Series',
    variations: ['GXZ60N'],
    bodyColors: ['White'],
  },
  {
    unitName: 'Isuzu EXR Series',
    variations: ['EXR77H 380PS 6W Tractor Head'],
    bodyColors: ['White'],
  },
];

const buildDefaultUnitSetupConfig = (): UnitSetupRecord[] =>
  DEFAULT_UNIT_SETUP_PRESETS.map((preset) => ({
    unitName: preset.unitName,
    variations: preset.variations.map((name) => ({
      name,
      bodyColors: [...preset.bodyColors],
    })),
  }));

let unitSetupRecords: UnitSetupRecord[] = buildDefaultUnitSetupConfig();

function normalizeValue(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function dedupeValues(values: string[]) {
  const seen = new Set<string>();

  return values.filter((value) => {
    const normalized = normalizeUnitSetupValue(value);

    if (!normalized || seen.has(normalized)) {
      return false;
    }

    seen.add(normalized);
    return true;
  });
}

export function normalizeUnitSetupValue(value: string) {
  return normalizeValue(value).toLowerCase();
}

export function getUnitSetupCategory(unitName: string): UnitSetupCategory {
  const normalizedName = normalizeUnitSetupValue(unitName);

  if (normalizedName.includes('d-max') || normalizedName.includes('mu-x')) {
    return 'pickup_suv';
  }

  if (
    normalizedName.includes('traviz') ||
    normalizedName.includes('qlr') ||
    normalizedName.includes('nlr') ||
    normalizedName.includes('nmr') ||
    normalizedName.includes('npr') ||
    normalizedName.includes('nps')
  ) {
    return 'light_duty';
  }

  return 'heavy_duty';
}

export function getUnitSetupCategoryLabel(category: UnitSetupCategory) {
  switch (category) {
    case 'pickup_suv':
      return 'Pickup & SUV';
    case 'light_duty':
      return 'Light Duty';
    case 'heavy_duty':
      return 'Heavy Duty';
    default:
      return 'All Units';
  }
}

export function getUnitSetupRecords() {
  return [...unitSetupRecords].sort((left, right) =>
    left.unitName.localeCompare(right.unitName)
  );
}

export function findUnitSetupRecordByName(unitName: string) {
  return (
    getUnitSetupRecords().find(
      (record) =>
        normalizeUnitSetupValue(record.unitName) ===
        normalizeUnitSetupValue(unitName)
    ) ?? null
  );
}

export function upsertUnitSetupRecord(
  record: UnitSetupRecord,
  originalUnitName?: string | null
) {
  const normalizedUnitName = normalizeValue(record.unitName);
  const variations = dedupeValues(
    record.variations.map((variation) => normalizeValue(variation.name))
  )
    .map((variationName) => {
      const matchingVariation = record.variations.find(
        (variation) =>
          normalizeUnitSetupValue(variation.name) ===
          normalizeUnitSetupValue(variationName)
      );

      return {
        name: variationName,
        bodyColors: dedupeValues(
          (matchingVariation?.bodyColors ?? [])
            .map((bodyColor) => normalizeValue(bodyColor))
            .filter(Boolean)
        ),
        transmission: normalizeValue(matchingVariation?.transmission ?? ''),
        drivetrain: normalizeValue(matchingVariation?.drivetrain ?? ''),
        bodyType: normalizeValue(matchingVariation?.bodyType ?? ''),
      };
    })
    .filter((variation) => variation.name && variation.bodyColors.length > 0);

  const nextRecord = {
    unitName: normalizedUnitName,
    variations,
  };

  const normalizedOriginalUnitName = originalUnitName
    ? normalizeUnitSetupValue(originalUnitName)
    : null;
  const existingIndex = unitSetupRecords.findIndex(
    (item) =>
      normalizeUnitSetupValue(item.unitName) ===
      normalizeUnitSetupValue(normalizedUnitName)
  );

  if (existingIndex >= 0) {
    const existingRecord = unitSetupRecords[existingIndex];
    const shouldReplaceExisting =
      normalizedOriginalUnitName === null ||
      normalizeUnitSetupValue(existingRecord.unitName) ===
        normalizedOriginalUnitName;

    if (shouldReplaceExisting) {
      unitSetupRecords = unitSetupRecords.map((item, index) =>
        index === existingIndex ? nextRecord : item
      );
      return getUnitSetupRecords();
    }
  }

  if (normalizedOriginalUnitName) {
    unitSetupRecords = unitSetupRecords.map((item) =>
      normalizeUnitSetupValue(item.unitName) === normalizedOriginalUnitName
        ? nextRecord
        : item
    );
  } else {
    unitSetupRecords = [...unitSetupRecords, nextRecord];
  }

  return getUnitSetupRecords();
}

export function deleteUnitSetupRecord(unitName: string) {
  unitSetupRecords = unitSetupRecords.filter(
    (item) =>
      normalizeUnitSetupValue(item.unitName) !== normalizeUnitSetupValue(unitName)
  );

  return getUnitSetupRecords();
}
