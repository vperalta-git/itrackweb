import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import type { Location } from '@/src/mobile/components/MapView';
import {
  Button,
  Card,
  Input,
  MapViewComponent,
  Select,
  SegmentedControl,
  StandaloneFormLayout,
} from '@/src/mobile/components';
import { theme } from '@/src/mobile/constants/theme';
import {
  DRIVER_ALLOCATION_LOCATION_OPTIONS,
  type DriverAllocationLocationOption,
  findDriverAllocationDriver,
  findDriverAllocationLocation,
  findDriverAllocationRecord,
  findDriverAllocationUnit,
  formatDriverAllocationStatusLabel,
  getSelectableDriverOptions,
  getSelectableUnitOptions,
  loadDriverAllocations,
  registerDriverAllocationLocationOptions,
  saveDriverAllocation,
} from '@/src/mobile/data/driver-allocation';
import {
  reverseGeocodeMapboxLocation,
  searchMapboxAddresses,
} from '@/src/mobile/utils/mapboxGeocoding';

type FormErrors = {
  unitId?: string;
  driverId?: string;
  pickupId?: string;
  destinationId?: string;
};

type DriverAllocationFormValues = {
  unitId: string | null;
  driverId: string | null;
  pickupId: string | null;
  destinationId: string | null;
};

type RouteSelectionMode = 'pickup' | 'destination';

type CuratedLocationPreset = {
  key: string;
  label: string;
  address: string;
  queries: string[];
};

const DEFAULT_FORM_VALUES: DriverAllocationFormValues = {
  unitId: null,
  driverId: null,
  pickupId: null,
  destinationId: null,
};

const DEFAULT_ROUTE_REGION = {
  latitude: 14.5995,
  longitude: 120.9842,
  latitudeDelta: 0.18,
  longitudeDelta: 0.18,
};

const CURATED_LOCATION_PRESETS: CuratedLocationPreset[] = [
  {
    key: 'laguna-stockyard',
    label: 'Laguna Stockyard',
    address:
      '114 Technology Avenue, Phase 2, Laguna Technopark, Biñan, Laguna 4024',
    queries: [
      'Laguna Stockyard 114 Technology Avenue Phase 2 Laguna Technopark Binan Laguna 4024',
      'Isuzu Philippines Corporation 114 Technology Avenue Phase 2 Laguna Technopark Binan Laguna 4024',
      '114 Technology Avenue Phase 2 Laguna Technopark Binan Laguna 4024',
    ],
  },
  {
    key: 'isuzu-pasig',
    label: 'Isuzu Pasig',
    address:
      'E. Rodriguez Jr. Avenue, Corner Calle Industria, Brgy. Bagumbayan, Quezon City 1110',
    queries: [
      'Isuzu Pasig E. Rodriguez Jr. Avenue Corner Calle Industria Bagumbayan Quezon City 1110',
      'E. Rodriguez Jr. Avenue Corner Calle Industria Bagumbayan Quezon City 1110',
      'Isuzu Pasig Quezon City',
    ],
  },
];

function normalizeSearchValue(value: string | null | undefined) {
  return value?.replace(/\s+/g, ' ').trim().toLowerCase() ?? '';
}

function mergeLocationOptions(
  ...groups: DriverAllocationLocationOption[][]
): DriverAllocationLocationOption[] {
  const mergedLocations = new Map<string, DriverAllocationLocationOption>();

  groups.flat().forEach((location) => {
    mergedLocations.set(location.value, location);
  });

  return Array.from(mergedLocations.values());
}

function findLocationOption(
  locations: DriverAllocationLocationOption[],
  locationId: string | null
) {
  if (!locationId) {
    return null;
  }

  return locations.find((location) => location.value === locationId) ?? null;
}

function getFallbackLocationMatches(query: string, limit = 5) {
  const normalizedQuery = normalizeSearchValue(query);

  if (!normalizedQuery) {
    return [];
  }

  return DRIVER_ALLOCATION_LOCATION_OPTIONS.filter(
    (location) =>
      normalizeSearchValue(location.label).includes(normalizedQuery) ||
      normalizeSearchValue(location.hint).includes(normalizedQuery) ||
      normalizeSearchValue(formatLocationDisplay(location)).includes(normalizedQuery)
  ).slice(0, limit);
}

function formatLocationDisplay(
  location: DriverAllocationLocationOption | null | undefined
) {
  if (!location) {
    return '';
  }

  const normalizedLabel = normalizeSearchValue(location.label);
  const normalizedHint = normalizeSearchValue(location.hint);

  if (!location.hint || normalizedHint === normalizedLabel) {
    return location.label;
  }

  if (normalizedHint.startsWith(normalizedLabel)) {
    return location.hint;
  }

  return `${location.label}, ${location.hint}`;
}

function getSearchResultTitle(
  location: DriverAllocationLocationOption,
  query: string
) {
  const normalizedQuery = normalizeSearchValue(query);
  const normalizedLabel = normalizeSearchValue(location.label);
  const fullDisplay = formatLocationDisplay(location);
  const normalizedDisplay = normalizeSearchValue(fullDisplay);

  if (
    normalizedQuery.includes(' ') &&
    !normalizedLabel.includes(normalizedQuery) &&
    normalizedDisplay.includes(normalizedQuery)
  ) {
    return fullDisplay;
  }

  return location.label;
}

function isCuratedLocationSelected(
  location: DriverAllocationLocationOption | null,
  preset: CuratedLocationPreset
) {
  if (!location) {
    return false;
  }

  return (
    normalizeSearchValue(location.label) === normalizeSearchValue(preset.label) &&
    normalizeSearchValue(location.hint) === normalizeSearchValue(preset.address)
  );
}

function buildCuratedLocationOption(
  preset: CuratedLocationPreset,
  location: Location
): DriverAllocationLocationOption {
  return {
    label: preset.label,
    value: `curated:${preset.key}`,
    hint: preset.address,
    location,
  };
}

function getMatchingCuratedLocationPresets(query: string, limit = 2) {
  const normalizedQuery = normalizeSearchValue(query);

  if (!normalizedQuery) {
    return [];
  }

  return CURATED_LOCATION_PRESETS.filter((preset) =>
    [preset.label, preset.address, ...preset.queries].some((value) =>
      normalizeSearchValue(value).includes(normalizedQuery)
    )
  ).slice(0, limit);
}

function buildPinnedLocationOption(
  location: Location
): DriverAllocationLocationOption {
  const coordinateLabel = `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`;

  return {
    label: 'Pinned Map Location',
    value: `pin:${location.latitude.toFixed(6)},${location.longitude.toFixed(6)}`,
    hint: coordinateLabel,
    location,
  };
}

function getRouteInitialRegion(
  pickup: DriverAllocationLocationOption | null,
  destination: DriverAllocationLocationOption | null
) {
  if (!pickup && !destination) {
    return DEFAULT_ROUTE_REGION;
  }

  if (pickup && !destination) {
    return {
      latitude: pickup.location.latitude,
      longitude: pickup.location.longitude,
      latitudeDelta: 0.08,
      longitudeDelta: 0.08,
    };
  }

  if (!pickup && destination) {
    return {
      latitude: destination.location.latitude,
      longitude: destination.location.longitude,
      latitudeDelta: 0.08,
      longitudeDelta: 0.08,
    };
  }

  return {
    latitude: (pickup!.location.latitude + destination!.location.latitude) / 2,
    longitude:
      (pickup!.location.longitude + destination!.location.longitude) / 2,
    latitudeDelta: Math.max(
      Math.abs(pickup!.location.latitude - destination!.location.latitude) *
        1.8,
      0.08
    ),
    longitudeDelta: Math.max(
      Math.abs(pickup!.location.longitude - destination!.location.longitude) *
        1.8,
      0.08
    ),
  };
}

export default function DriverAllocationFormScreen() {
  const navigation = useNavigation();
  const { mode, allocationId } = useLocalSearchParams<{
    mode?: string | string[];
    allocationId?: string | string[];
  }>();
  const resolvedMode = Array.isArray(mode) ? mode[0] : mode;
  const resolvedAllocationId = Array.isArray(allocationId)
    ? allocationId[0]
    : allocationId;
  const isEditMode = resolvedMode === 'edit';
  const allowImmediateDismissRef = useRef(false);
  const [editableAllocation, setEditableAllocation] = useState(() =>
    isEditMode && resolvedAllocationId
      ? findDriverAllocationRecord(resolvedAllocationId)
      : null
  );
  const [optionsVersion, setOptionsVersion] = useState(0);
  const initialFormValues = useMemo<DriverAllocationFormValues>(
    () => ({
      unitId: editableAllocation?.unitId ?? DEFAULT_FORM_VALUES.unitId,
      driverId: editableAllocation?.driverId ?? DEFAULT_FORM_VALUES.driverId,
      pickupId: editableAllocation?.pickupId ?? DEFAULT_FORM_VALUES.pickupId,
      destinationId:
        editableAllocation?.destinationId ?? DEFAULT_FORM_VALUES.destinationId,
    }),
    [editableAllocation]
  );

  const [unitId, setUnitId] = useState<string | null>(null);
  const [driverId, setDriverId] = useState<string | null>(null);
  const [pickupId, setPickupId] = useState<string | null>(null);
  const [destinationId, setDestinationId] = useState<string | null>(null);
  const [locationOptions, setLocationOptions] = useState<
    DriverAllocationLocationOption[]
  >(DRIVER_ALLOCATION_LOCATION_OPTIONS);
  const [pickupSearchValue, setPickupSearchValue] = useState('');
  const [destinationSearchValue, setDestinationSearchValue] = useState('');
  const [pickupSearchResults, setPickupSearchResults] = useState<
    DriverAllocationLocationOption[]
  >([]);
  const [destinationSearchResults, setDestinationSearchResults] = useState<
    DriverAllocationLocationOption[]
  >([]);
  const [isPickupSearchLoading, setIsPickupSearchLoading] = useState(false);
  const [isDestinationSearchLoading, setIsDestinationSearchLoading] =
    useState(false);
  const [isResolvingMapLocation, setIsResolvingMapLocation] = useState(false);
  const [resolvingPresetKey, setResolvingPresetKey] = useState<string | null>(
    null
  );
  const [mapSelectionMode, setMapSelectionMode] =
    useState<RouteSelectionMode>('pickup');
  const [errors, setErrors] = useState<FormErrors>({});
  const pickupSearchRequestRef = useRef(0);
  const destinationSearchRequestRef = useRef(0);
  const mapSelectionRequestRef = useRef(0);
  const presetSelectionRequestRef = useRef(0);

  useEffect(() => {
    let isActive = true;
    const syncAllocationData = async () => {
      try {
        await loadDriverAllocations();
      } catch {
        // Keep the latest cached records when refresh fails.
      }

      if (isActive) {
        const nextEditableAllocation =
          isEditMode && resolvedAllocationId
            ? findDriverAllocationRecord(resolvedAllocationId)
            : null;

        setEditableAllocation(nextEditableAllocation);
        setLocationOptions(DRIVER_ALLOCATION_LOCATION_OPTIONS);
        setOptionsVersion((current) => current + 1);
      }
    };

    syncAllocationData().catch(() => undefined);

    const unsubscribe = navigation.addListener('focus', () => {
      syncAllocationData().catch(() => undefined);
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [isEditMode, navigation, resolvedAllocationId]);

  useEffect(() => {
    pickupSearchRequestRef.current += 1;
    destinationSearchRequestRef.current += 1;
    mapSelectionRequestRef.current += 1;
    presetSelectionRequestRef.current += 1;
    setUnitId(initialFormValues.unitId);
    setDriverId(initialFormValues.driverId);
    setPickupId(initialFormValues.pickupId);
    setDestinationId(initialFormValues.destinationId);
    setLocationOptions(DRIVER_ALLOCATION_LOCATION_OPTIONS);
    setPickupSearchValue(
      formatLocationDisplay(
        findDriverAllocationLocation(initialFormValues.pickupId)
      )
    );
    setDestinationSearchValue(
      formatLocationDisplay(
        findDriverAllocationLocation(initialFormValues.destinationId)
      )
    );
    setPickupSearchResults([]);
    setDestinationSearchResults([]);
    setIsPickupSearchLoading(false);
    setIsDestinationSearchLoading(false);
    setIsResolvingMapLocation(false);
    setResolvingPresetKey(null);
    setMapSelectionMode(
      initialFormValues.pickupId && !initialFormValues.destinationId
        ? 'destination'
        : 'pickup'
    );
    setErrors({});
  }, [initialFormValues]);

  const selectableUnits = useMemo(
    () => getSelectableUnitOptions(initialFormValues.unitId),
    [initialFormValues.unitId, optionsVersion]
  );
  const selectableDrivers = useMemo(
    () => getSelectableDriverOptions(initialFormValues.driverId),
    [initialFormValues.driverId, optionsVersion]
  );
  const selectedUnit = useMemo(() => findDriverAllocationUnit(unitId), [unitId]);
  const selectedDriver = useMemo(
    () => findDriverAllocationDriver(driverId),
    [driverId]
  );
  const selectedPickup = useMemo(
    () => findLocationOption(locationOptions, pickupId),
    [locationOptions, pickupId]
  );
  const selectedDestination = useMemo(
    () => findLocationOption(locationOptions, destinationId),
    [destinationId, locationOptions]
  );
  const routeMarkerLocations = useMemo(
    () =>
      mergeLocationOptions(
        selectedPickup ? [selectedPickup] : [],
        selectedDestination ? [selectedDestination] : [],
        pickupSearchResults,
        destinationSearchResults
      ),
    [
      destinationSearchResults,
      pickupSearchResults,
      selectedDestination,
      selectedPickup,
    ]
  );
  const routeMarkers = useMemo(
    () =>
      routeMarkerLocations.map((location) => {
        const isPickup = location.value === pickupId;
        const isDestination = location.value === destinationId;

        return {
          id: location.value,
          location: location.location,
          title: location.label,
          description: isPickup
            ? `Pickup address: ${location.hint}`
            : isDestination
              ? `Destination address: ${location.hint}`
              : location.hint,
          type: isPickup
            ? ('checkpoint' as const)
            : isDestination
              ? ('destination' as const)
              : ('custom' as const),
        };
      }),
    [destinationId, pickupId, routeMarkerLocations]
  );
  const routePreview = useMemo(
    () =>
      selectedPickup && selectedDestination
        ? [[selectedPickup.location, selectedDestination.location]]
        : [],
    [selectedDestination, selectedPickup]
  );
  const initialRegion = useMemo(
    () => getRouteInitialRegion(selectedPickup, selectedDestination),
    [selectedDestination, selectedPickup]
  );
  const hasUnsavedChanges = useMemo(
    () =>
      unitId !== initialFormValues.unitId ||
      driverId !== initialFormValues.driverId ||
      pickupId !== initialFormValues.pickupId ||
      destinationId !== initialFormValues.destinationId,
    [destinationId, driverId, initialFormValues, pickupId, unitId]
  );
  const showPickupSearchResults =
    pickupSearchValue.trim().length > 0 &&
    normalizeSearchValue(pickupSearchValue) !==
      normalizeSearchValue(formatLocationDisplay(selectedPickup));
  const showDestinationSearchResults =
    destinationSearchValue.trim().length > 0 &&
    normalizeSearchValue(destinationSearchValue) !==
      normalizeSearchValue(formatLocationDisplay(selectedDestination));

  useEffect(() => {
    const trimmedQuery = pickupSearchValue.trim();
    const requestId = pickupSearchRequestRef.current + 1;
    pickupSearchRequestRef.current = requestId;

    if (
      !trimmedQuery ||
      normalizeSearchValue(trimmedQuery) ===
        normalizeSearchValue(formatLocationDisplay(selectedPickup))
    ) {
      setPickupSearchResults([]);
      setIsPickupSearchLoading(false);
      return;
    }

    setIsPickupSearchLoading(true);

    const timeoutId = setTimeout(async () => {
      const curatedResults = (
        await Promise.all(
          getMatchingCuratedLocationPresets(trimmedQuery).map((preset) =>
            resolveCuratedLocationPreset(preset)
          )
        )
      ).filter(
        (location): location is DriverAllocationLocationOption => location !== null
      );
      const liveResults = await searchMapboxAddresses(trimmedQuery, 5);

      if (pickupSearchRequestRef.current !== requestId) {
        return;
      }

      setPickupSearchResults(
        mergeLocationOptions(
          curatedResults,
          liveResults,
          getFallbackLocationMatches(trimmedQuery, 5)
        ).slice(0, 5)
      );
      setIsPickupSearchLoading(false);
    }, 350);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [pickupSearchValue, selectedPickup]);

  useEffect(() => {
    const trimmedQuery = destinationSearchValue.trim();
    const requestId = destinationSearchRequestRef.current + 1;
    destinationSearchRequestRef.current = requestId;

    if (
      !trimmedQuery ||
      normalizeSearchValue(trimmedQuery) ===
        normalizeSearchValue(formatLocationDisplay(selectedDestination))
    ) {
      setDestinationSearchResults([]);
      setIsDestinationSearchLoading(false);
      return;
    }

    setIsDestinationSearchLoading(true);

    const timeoutId = setTimeout(async () => {
      const curatedResults = (
        await Promise.all(
          getMatchingCuratedLocationPresets(trimmedQuery).map((preset) =>
            resolveCuratedLocationPreset(preset)
          )
        )
      ).filter(
        (location): location is DriverAllocationLocationOption => location !== null
      );
      const liveResults = await searchMapboxAddresses(trimmedQuery, 5);

      if (destinationSearchRequestRef.current !== requestId) {
        return;
      }

      setDestinationSearchResults(
        mergeLocationOptions(
          curatedResults,
          liveResults,
          getFallbackLocationMatches(trimmedQuery, 5)
        ).slice(0, 5)
      );
      setIsDestinationSearchLoading(false);
    }, 350);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [destinationSearchValue, selectedDestination]);

  const handlePickupSelection = (
    nextPickup: DriverAllocationLocationOption
  ) => {
    registerDriverAllocationLocationOptions([nextPickup]);
    setLocationOptions((current) => mergeLocationOptions(current, [nextPickup]));
    setPickupId(nextPickup.value);
    setPickupSearchValue(formatLocationDisplay(nextPickup));
    setPickupSearchResults([]);
    setMapSelectionMode('destination');

    if (destinationId === nextPickup.value) {
      setDestinationId(null);
      setDestinationSearchValue('');
      setDestinationSearchResults([]);
    }

    setErrors((current) => ({
      ...current,
      pickupId: undefined,
      destinationId:
        destinationId === nextPickup.value ||
        current.destinationId?.includes('Pickup and destination')
          ? undefined
          : current.destinationId,
    }));
  };

  const handleDestinationSelection = (
    nextDestination: DriverAllocationLocationOption
  ) => {
    if (pickupId && pickupId === nextDestination.value) {
      setDestinationId(null);
      setDestinationSearchValue(formatLocationDisplay(nextDestination));
      setDestinationSearchResults([]);
      setErrors((current) => ({
        ...current,
        destinationId: 'Pickup and destination must be different locations.',
      }));
      return;
    }

    registerDriverAllocationLocationOptions([nextDestination]);
    setLocationOptions((current) =>
      mergeLocationOptions(current, [nextDestination])
    );
    setDestinationId(nextDestination.value);
    setDestinationSearchValue(formatLocationDisplay(nextDestination));
    setDestinationSearchResults([]);
    setErrors((current) => ({
      ...current,
      destinationId: undefined,
    }));
  };

  const resolveCuratedLocationPreset = async (
    preset: CuratedLocationPreset
  ) => {
    for (const query of preset.queries) {
      const [result] = await searchMapboxAddresses(query, 1);

      if (result) {
        return buildCuratedLocationOption(preset, result.location);
      }
    }

    return null;
  };

  const handleCuratedLocationSelection = async (
    mode: RouteSelectionMode,
    preset: CuratedLocationPreset
  ) => {
    const requestId = presetSelectionRequestRef.current + 1;
    presetSelectionRequestRef.current = requestId;
    setMapSelectionMode(mode);
    setResolvingPresetKey(`${mode}:${preset.key}`);

    const resolvedLocation = await resolveCuratedLocationPreset(preset);

    if (presetSelectionRequestRef.current !== requestId) {
      return;
    }

    setResolvingPresetKey(null);

    if (!resolvedLocation) {
      Alert.alert(
        'Address lookup unavailable',
        `The app could not resolve ${preset.label} right now. Try searching the full address or tap the map.`
      );
      return;
    }

    if (mode === 'pickup') {
      handlePickupSelection(resolvedLocation);
      return;
    }

    handleDestinationSelection(resolvedLocation);
  };

  const handleMapLocationSelection = (
    locationOption: DriverAllocationLocationOption
  ) => {
    if (mapSelectionMode === 'pickup') {
      handlePickupSelection(locationOption);
      return;
    }

    handleDestinationSelection(locationOption);
  };

  const handleMapPress = async (location: Location) => {
    const requestId = mapSelectionRequestRef.current + 1;
    mapSelectionRequestRef.current = requestId;
    setIsResolvingMapLocation(true);

    const resolvedLocation = await reverseGeocodeMapboxLocation(location);

    if (mapSelectionRequestRef.current !== requestId) {
      return;
    }

    setIsResolvingMapLocation(false);
    handleMapLocationSelection(
      resolvedLocation ?? buildPinnedLocationOption(location)
    );
  };

  const dismissWithoutConfirmation = () => {
    allowImmediateDismissRef.current = true;
    router.dismiss();
  };

  const confirmDiscardChanges = (onConfirm: () => void) => {
    Alert.alert(
      isEditMode ? 'Discard changes?' : 'Discard driver allocation?',
      isEditMode
        ? 'You have unsaved changes. Are you sure you want to leave this edit screen?'
        : 'You have unsaved changes. Are you sure you want to leave this add allocation screen?',
      [
        {
          text: 'Keep Editing',
          style: 'cancel',
        },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: onConfirm,
        },
      ]
    );
  };

  const handleBackPress = () => {
    if (!hasUnsavedChanges) {
      dismissWithoutConfirmation();
      return;
    }

    confirmDiscardChanges(dismissWithoutConfirmation);
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      if (!hasUnsavedChanges || allowImmediateDismissRef.current) {
        return;
      }

      event.preventDefault();
      confirmDiscardChanges(() => {
        allowImmediateDismissRef.current = true;
        navigation.dispatch(event.data.action);
      });
    });

    return unsubscribe;
  }, [hasUnsavedChanges, isEditMode, navigation]);

  const validate = () => {
    const nextErrors: FormErrors = {};

    if (!unitId) {
      nextErrors.unitId = 'Select an in-stockyard unit.';
    }

    if (!driverId) {
      nextErrors.driverId = 'Select an available driver.';
    }

    if (!pickupId) {
      nextErrors.pickupId = 'Select the pickup address.';
    }

    if (!destinationId) {
      nextErrors.destinationId = 'Select the destination address.';
    } else if (pickupId && pickupId === destinationId) {
      nextErrors.destinationId =
        'Pickup and destination must be different locations.';
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmitAllocation = async () => {
    if (isEditMode && !editableAllocation) {
      Alert.alert(
        'Allocation not found',
        'The selected driver allocation could not be loaded.'
      );
      return;
    }

    if (!validate()) {
      return;
    }

    try {
      const savedAllocation = await saveDriverAllocation({
        id: editableAllocation?.id,
        unitId: unitId ?? '',
        driverId: driverId ?? '',
        pickupId: pickupId ?? '',
        destinationId: destinationId ?? '',
      });

      Alert.alert(
        isEditMode ? 'Allocation Updated' : 'Allocation Added',
        isEditMode
          ? `${savedAllocation.unitName} has been updated for ${savedAllocation.driverName}. Current status: ${formatDriverAllocationStatusLabel(savedAllocation.status)}.`
          : `${savedAllocation.unitName} has been assigned to ${savedAllocation.driverName} with Pending status until the driver accepts the booking.`,
        [
          {
            text: 'OK',
            onPress: dismissWithoutConfirmation,
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        'Unable to save allocation',
        error instanceof Error
          ? error.message
          : 'Please review the dispatch details and try again.'
      );
    }
  };

  return (
    <StandaloneFormLayout
        title={isEditMode ? 'Edit Driver Allocation' : 'Add Driver Allocation'}
        subtitle={
          isEditMode
            ? 'Update the assigned unit, driver, and route'
            : 'Create a new driver dispatch allocation'
        }
        onBackPress={handleBackPress}
        contentContainerStyle={styles.content}
      >
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          <Text style={styles.sectionSubtitle}>
            Choose a unit currently tagged as In Stockyard and assign it to one
            available driver. New driver allocations are saved as Pending until
            the driver accepts the booking and starts the trip.
          </Text>

          <Select
            label="Select Unit"
            placeholder="Select in-stockyard unit"
            value={unitId}
            options={selectableUnits.map((unit) => ({
              label: unit.label,
              value: unit.value,
            }))}
            onValueChange={(value) => {
              setUnitId(String(value));
              setErrors((current) => ({
                ...current,
                unitId: undefined,
              }));
            }}
            searchPlaceholder="Search unit"
            error={errors.unitId}
          />

          <Text style={styles.fieldHint}>
            Only units with an In Stockyard status and no active driver
            allocation can be selected here.
          </Text>

          <Select
            label="Select Driver"
            placeholder="Select available driver"
            value={driverId}
            options={selectableDrivers.map((driver) => ({
              label: driver.label,
              value: driver.value,
            }))}
            onValueChange={(value) => {
              setDriverId(String(value));
              setErrors((current) => ({
                ...current,
                driverId: undefined,
              }));
            }}
            searchPlaceholder="Search driver"
            error={errors.driverId}
          />

          <Text style={styles.fieldHint}>
            A driver can only have one active booking at a time.
          </Text>

          {selectedUnit || selectedDriver ? (
            <View style={styles.selectionSummary}>
              {selectedUnit ? (
                <View style={styles.selectionSummaryRow}>
                  <Text style={styles.selectionSummaryLabel}>Conduction No.</Text>
                  <Text style={styles.selectionSummaryValue}>
                    {selectedUnit.conductionNumber}
                  </Text>
                </View>
              ) : null}

              {selectedDriver ? (
                <View style={styles.selectionSummaryRow}>
                  <Text style={styles.selectionSummaryLabel}>Driver Contact</Text>
                  <Text style={styles.selectionSummaryValue}>
                    {selectedDriver.phone}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Route Selection</Text>
          <Text style={styles.sectionSubtitle}>
            Search real map addresses for pickup and destination, or tap
            anywhere on the map to fetch the closest address automatically.
          </Text>

          <Input
            label="Select Pickup"
            placeholder="Search pickup place or full address"
            value={pickupSearchValue}
            onChangeText={(value) => {
              setPickupSearchValue(value);
              setMapSelectionMode('pickup');
              if (
                normalizeSearchValue(value) !==
                normalizeSearchValue(formatLocationDisplay(selectedPickup))
              ) {
                setPickupId(null);
              }
              setErrors((current) => ({
                ...current,
                pickupId: undefined,
              }));
            }}
            icon={
              <Ionicons
                name="search-outline"
                size={18}
                color={theme.colors.textSubtle}
              />
            }
            rightIcon={
              pickupSearchValue ? (
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={theme.colors.textSubtle}
                />
              ) : undefined
            }
            onRightIconPress={() => {
              setPickupId(null);
              setPickupSearchValue('');
              setPickupSearchResults([]);
              setMapSelectionMode('pickup');
              setErrors((current) => ({
                ...current,
                pickupId: undefined,
              }));
            }}
            error={errors.pickupId}
          />

          <View style={styles.quickPickBlock}>
            <Text style={styles.quickPickLabel}>Quick Picks</Text>
            <View style={styles.quickPickRow}>
              {CURATED_LOCATION_PRESETS.map((preset) => {
                const isActive = isCuratedLocationSelected(
                  selectedPickup,
                  preset
                );
                const isResolving =
                  resolvingPresetKey === `pickup:${preset.key}`;

                return (
                  <TouchableOpacity
                    key={`pickup-preset-${preset.key}`}
                    style={[
                      styles.quickPickChip,
                      isActive && styles.quickPickChipActive,
                    ]}
                    activeOpacity={0.85}
                    disabled={isResolving}
                    onPress={() => {
                      void handleCuratedLocationSelection('pickup', preset);
                    }}
                  >
                    <Ionicons
                      name={isResolving ? 'time-outline' : 'business-outline'}
                      size={14}
                      color={
                        isActive
                          ? theme.colors.primaryDark
                          : theme.colors.textSubtle
                      }
                    />
                    <Text
                      style={[
                        styles.quickPickChipText,
                        isActive && styles.quickPickChipTextActive,
                      ]}
                    >
                      {preset.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {showPickupSearchResults ? (
            <View style={styles.searchResults}>
              {isPickupSearchLoading ? (
                <View style={styles.searchResultsEmpty}>
                  <Text style={styles.searchResultsEmptyText}>
                    Looking up pickup addresses on the map...
                  </Text>
                </View>
              ) : pickupSearchResults.length ? (
                pickupSearchResults.map((location) => (
                  <TouchableOpacity
                    key={`pickup-search-${location.value}`}
                    style={[
                      styles.searchResultItem,
                        pickupId === location.value && styles.searchResultItemActive,
                    ]}
                    activeOpacity={0.85}
                    onPress={() => handlePickupSelection(location)}
                  >
                    <View style={styles.searchResultCopy}>
                      <Text style={styles.searchResultTitle}>
                        {getSearchResultTitle(location, pickupSearchValue)}
                      </Text>
                      <Text style={styles.searchResultSubtitle}>{location.hint}</Text>
                    </View>
                    <Ionicons
                      name={
                        pickupId === location.value
                          ? 'checkmark-circle'
                          : 'navigate-circle-outline'
                      }
                      size={18}
                      color={
                        pickupId === location.value
                          ? theme.colors.primary
                          : theme.colors.textSubtle
                      }
                    />
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.searchResultsEmpty}>
                  <Text style={styles.searchResultsEmptyText}>
                    No pickup addresses matched. Try a fuller address or tap
                    the map.
                  </Text>
                </View>
              )}
            </View>
          ) : null}

          <Input
            label="Select Destination"
            placeholder="Search destination place or full address"
            value={destinationSearchValue}
            onChangeText={(value) => {
              setDestinationSearchValue(value);
              setMapSelectionMode('destination');
              if (
                normalizeSearchValue(value) !==
                normalizeSearchValue(
                  formatLocationDisplay(selectedDestination)
                )
              ) {
                setDestinationId(null);
              }
              setErrors((current) => ({
                ...current,
                destinationId: undefined,
              }));
            }}
            icon={
              <Ionicons
                name="search-outline"
                size={18}
                color={theme.colors.textSubtle}
              />
            }
            rightIcon={
              destinationSearchValue ? (
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={theme.colors.textSubtle}
                />
              ) : undefined
            }
            onRightIconPress={() => {
              setDestinationId(null);
              setDestinationSearchValue('');
              setDestinationSearchResults([]);
              setMapSelectionMode('destination');
              setErrors((current) => ({
                ...current,
                destinationId: undefined,
              }));
            }}
            error={errors.destinationId}
          />

          <View style={styles.quickPickBlock}>
            <Text style={styles.quickPickLabel}>Quick Picks</Text>
            <View style={styles.quickPickRow}>
              {CURATED_LOCATION_PRESETS.map((preset) => {
                const isActive = isCuratedLocationSelected(
                  selectedDestination,
                  preset
                );
                const isResolving =
                  resolvingPresetKey === `destination:${preset.key}`;

                return (
                  <TouchableOpacity
                    key={`destination-preset-${preset.key}`}
                    style={[
                      styles.quickPickChip,
                      isActive && styles.quickPickChipActive,
                    ]}
                    activeOpacity={0.85}
                    disabled={isResolving}
                    onPress={() => {
                      void handleCuratedLocationSelection(
                        'destination',
                        preset
                      );
                    }}
                  >
                    <Ionicons
                      name={isResolving ? 'time-outline' : 'business-outline'}
                      size={14}
                      color={
                        isActive
                          ? theme.colors.primaryDark
                          : theme.colors.textSubtle
                      }
                    />
                    <Text
                      style={[
                        styles.quickPickChipText,
                        isActive && styles.quickPickChipTextActive,
                      ]}
                    >
                      {preset.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {showDestinationSearchResults ? (
            <View style={styles.searchResults}>
              {isDestinationSearchLoading ? (
                <View style={styles.searchResultsEmpty}>
                  <Text style={styles.searchResultsEmptyText}>
                    Looking up destination addresses on the map...
                  </Text>
                </View>
              ) : destinationSearchResults.length ? (
                destinationSearchResults.map((location) => (
                  <TouchableOpacity
                    key={`destination-search-${location.value}`}
                    style={[
                      styles.searchResultItem,
                      destinationId === location.value &&
                        styles.searchResultItemActive,
                    ]}
                    activeOpacity={0.85}
                    onPress={() => handleDestinationSelection(location)}
                  >
                    <View style={styles.searchResultCopy}>
                      <Text style={styles.searchResultTitle}>
                        {getSearchResultTitle(location, destinationSearchValue)}
                      </Text>
                      <Text style={styles.searchResultSubtitle}>{location.hint}</Text>
                    </View>
                    <Ionicons
                      name={
                        destinationId === location.value
                          ? 'checkmark-circle'
                          : 'flag-outline'
                      }
                      size={18}
                      color={
                        destinationId === location.value
                          ? theme.colors.primary
                          : theme.colors.textSubtle
                      }
                    />
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.searchResultsEmpty}>
                  <Text style={styles.searchResultsEmptyText}>
                    No destination addresses matched. Try a fuller address or
                    tap the map.
                  </Text>
                </View>
              )}
            </View>
          ) : null}

          <View style={styles.routePreviewBlock}>
            <View style={styles.routePreviewHeader}>
              <Text style={styles.routePreviewTitle}>Route Preview</Text>
              <Text style={styles.routePreviewSubtitle}>
                {selectedPickup && selectedDestination
                  ? `${formatLocationDisplay(selectedPickup)} to ${formatLocationDisplay(selectedDestination)}`
                  : mapSelectionMode === 'pickup'
                    ? 'Search or tap the map to set Point A / Pickup'
                    : 'Search or tap the map to set Point B / Destination'}
              </Text>
            </View>

            <SegmentedControl
              options={[
                {
                  label: 'Pickup (A)',
                  value: 'pickup',
                },
                {
                  label: 'Destination (B)',
                  value: 'destination',
                },
              ]}
              value={mapSelectionMode}
              onChange={(value) =>
                setMapSelectionMode(value as RouteSelectionMode)
              }
              style={styles.routeModeTabs}
            />

            <View style={styles.mapHelper}>
              <Ionicons
                name="information-circle-outline"
                size={16}
                color={theme.colors.info}
              />
              <Text style={styles.mapHelperText}>
                Search any address, tap a result marker, or tap anywhere on the
                map to fetch a real address for the active point.
              </Text>
            </View>

            {isResolvingMapLocation ? (
              <Text style={styles.mapStatusText}>
                Fetching the tapped map address...
              </Text>
            ) : null}

            {resolvingPresetKey ? (
              <Text style={styles.mapStatusText}>
                Resolving the selected quick-pick address on the map...
              </Text>
            ) : null}

            <MapViewComponent
              key={`allocation-route-map-${pickupId ?? 'none'}-${destinationId ?? 'none'}-${mapSelectionMode}`}
              markers={routeMarkers}
              routes={routePreview}
              initialRegion={initialRegion}
              style={styles.map}
              mapChipLabel="Map Search"
              onMarkerPress={(marker) => {
                const selectedMarkerLocation =
                  routeMarkerLocations.find(
                    (location) => location.value === marker.id
                  ) ?? null;

                if (!selectedMarkerLocation) {
                  return;
                }

                handleMapLocationSelection(selectedMarkerLocation);
              }}
              onMapPress={handleMapPress}
            />

            <View style={styles.routePointSummary}>
              <View style={styles.routePointPill}>
                <Text style={styles.routePointLabel}>Point A</Text>
                <Text style={styles.routePointValue}>
                  {formatLocationDisplay(selectedPickup) || 'Not selected'}
                </Text>
              </View>
              <View style={styles.routePointPill}>
                <Text style={styles.routePointLabel}>Point B</Text>
                <Text style={styles.routePointValue}>
                  {formatLocationDisplay(selectedDestination) || 'Not selected'}
                </Text>
              </View>
            </View>
          </View>
        </Card>

        <View style={styles.actions}>
          <Button
            title={isEditMode ? 'Save Changes' : 'Add Allocation'}
            onPress={handleSubmitAllocation}
            fullWidth
            icon={
              !isEditMode ? (
                <Ionicons
                  name="add-outline"
                  size={18}
                  color={theme.colors.white}
                />
              ) : undefined
            }
            style={isEditMode ? styles.editSubmitButton : undefined}
          />
        </View>
    </StandaloneFormLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: theme.spacing['2xl'],
  },
  card: {
    marginBottom: theme.spacing.base,
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.borderStrong,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
    fontFamily: theme.fonts.family.sans,
  },
  sectionSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.base,
    fontFamily: theme.fonts.family.sans,
  },
  fieldHint: {
    marginTop: -8,
    marginBottom: theme.spacing.base,
    fontSize: 12,
    color: theme.colors.textSubtle,
    fontFamily: theme.fonts.family.sans,
  },
  selectionSummary: {
    marginTop: theme.spacing.xs,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  selectionSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.base,
  },
  selectionSummaryLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSubtle,
    fontFamily: theme.fonts.family.sans,
  },
  selectionSummaryValue: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'right',
    fontFamily: theme.fonts.family.sans,
  },
  routePreviewBlock: {
    marginTop: theme.spacing.sm,
  },
  routePreviewHeader: {
    marginBottom: theme.spacing.sm,
  },
  quickPickBlock: {
    marginTop: -8,
    marginBottom: theme.spacing.base,
  },
  quickPickLabel: {
    marginBottom: theme.spacing.xs,
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSubtle,
    fontFamily: theme.fonts.family.sans,
  },
  quickPickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  quickPickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  quickPickChipActive: {
    borderColor: theme.colors.primarySurfaceStrong,
    backgroundColor: theme.colors.primarySurface,
  },
  quickPickChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.text,
    fontFamily: theme.fonts.family.sans,
  },
  quickPickChipTextActive: {
    color: theme.colors.primaryDark,
  },
  searchResults: {
    marginTop: -8,
    marginBottom: theme.spacing.base,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    overflow: 'hidden',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.base,
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  searchResultItemActive: {
    backgroundColor: theme.colors.primarySurface,
  },
  searchResultCopy: {
    flex: 1,
  },
  searchResultTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
    fontFamily: theme.fonts.family.sans,
  },
  searchResultSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.family.sans,
  },
  searchResultsEmpty: {
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.base,
  },
  searchResultsEmptyText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.family.sans,
  },
  routePreviewTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
    fontFamily: theme.fonts.family.sans,
  },
  routePreviewSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.family.sans,
  },
  routeModeTabs: {
    marginBottom: theme.spacing.sm,
  },
  mapHelper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.info + '26',
    backgroundColor: theme.colors.info + '12',
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.sm,
  },
  mapHelperText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.family.sans,
  },
  mapStatusText: {
    marginBottom: theme.spacing.sm,
    fontSize: 12,
    color: theme.colors.info,
    fontFamily: theme.fonts.family.sans,
  },
  map: {
    height: 280,
  },
  routePointSummary: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  routePointPill: {
    flex: 1,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.sm,
  },
  routePointLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: theme.colors.textSubtle,
    marginBottom: 4,
    fontFamily: theme.fonts.family.sans,
  },
  routePointValue: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.text,
    fontFamily: theme.fonts.family.sans,
  },
  routePreviewEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 180,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: theme.spacing.lg,
  },
  routePreviewEmptyTitle: {
    marginTop: theme.spacing.sm,
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
    fontFamily: theme.fonts.family.sans,
  },
  routePreviewEmptyText: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.textMuted,
    textAlign: 'center',
    fontFamily: theme.fonts.family.sans,
  },
  actions: {
    marginTop: theme.spacing.xs,
  },
  editSubmitButton: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
});
