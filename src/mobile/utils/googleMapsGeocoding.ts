import Constants from 'expo-constants';
import type { Location } from '../components/MapView';
import type { DriverAllocationLocationOption } from '../data/driver-allocation';

type RuntimeExtra = {
  googleMapsPlacesApiKey?: string | null;
  googleMapsGeocodingApiKey?: string | null;
  googleMapsDirectionsApiKey?: string | null;
  googleMapsApiKeys?: {
    android?: string | null;
    ios?: string | null;
  };
};

type GeocodingResult = {
  formatted_address?: string;
  geometry?: {
    location?: {
      lat?: number;
      lng?: number;
    };
  };
  place_id?: string;
};

type GeocodingResponse = {
  results?: GeocodingResult[];
  status?: string;
};

type PlaceAutocompletePrediction = {
  description?: string;
  place_id?: string;
  structured_formatting?: {
    main_text?: string;
    secondary_text?: string;
  };
};

type PlaceAutocompleteResponse = {
  predictions?: PlaceAutocompletePrediction[];
  status?: string;
};

type PlaceDetailsResponse = {
  result?: GeocodingResult;
  status?: string;
};

type OpenStreetMapSearchResult = {
  lat?: string;
  lon?: string;
  display_name?: string;
  name?: string;
  osm_id?: number | string;
  place_id?: number | string;
};

type OpenStreetMapReverseResult = {
  lat?: string;
  lon?: string;
  display_name?: string;
  name?: string;
  osm_id?: number | string;
  place_id?: number | string;
};

function getRuntimeExtra() {
  return (
    Constants.expoConfig?.extra ??
    (Constants as any).manifest?.extra ??
    (Constants as any).manifest2?.extra ??
    {}
  ) as RuntimeExtra;
}

function getRuntimeGeocodingApiKey() {
  const extra = getRuntimeExtra();

  return (
    extra.googleMapsGeocodingApiKey ??
    extra.googleMapsPlacesApiKey ??
    extra.googleMapsDirectionsApiKey ??
    extra.googleMapsApiKeys?.android ??
    extra.googleMapsApiKeys?.ios ??
    null
  );
}

function getRuntimePlacesApiKey() {
  const extra = getRuntimeExtra();

  return (
    extra.googleMapsPlacesApiKey ??
    extra.googleMapsGeocodingApiKey ??
    extra.googleMapsDirectionsApiKey ??
    extra.googleMapsApiKeys?.android ??
    extra.googleMapsApiKeys?.ios ??
    null
  );
}

function createAddressParts(formattedAddress: string) {
  const parts = formattedAddress
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  return {
    label: parts.slice(0, 2).join(', ') || formattedAddress,
    hint: parts.slice(2).join(', ') || 'Google Maps result',
  };
}

function createAddressPartsFromPrediction(
  prediction: PlaceAutocompletePrediction,
  formattedAddress?: string
) {
  const mainText = prediction.structured_formatting?.main_text?.trim();
  const secondaryText = prediction.structured_formatting?.secondary_text?.trim();

  if (mainText) {
    return {
      label: mainText,
      hint:
        secondaryText ||
        (formattedAddress ? createAddressParts(formattedAddress).hint : '') ||
        'Google Maps result',
    };
  }

  if (formattedAddress) {
    return createAddressParts(formattedAddress);
  }

  return {
    label: prediction.description?.trim() || 'Google Maps result',
    hint: secondaryText || 'Google Maps result',
  };
}

function buildLocationOption(
  result: GeocodingResult
): DriverAllocationLocationOption | null {
  const latitude = result.geometry?.location?.lat;
  const longitude = result.geometry?.location?.lng;
  const formattedAddress = result.formatted_address;

  if (
    typeof latitude !== 'number' ||
    typeof longitude !== 'number' ||
    !formattedAddress
  ) {
    return null;
  }

  const addressParts = createAddressParts(formattedAddress);

  return {
    label: addressParts.label,
    value:
      result.place_id ??
      `geocode:${latitude.toFixed(6)},${longitude.toFixed(6)}`,
    hint: addressParts.hint,
    location: {
      latitude,
      longitude,
    },
  };
}

function buildLocationOptionFromPlaceDetails(
  prediction: PlaceAutocompletePrediction,
  result: GeocodingResult
): DriverAllocationLocationOption | null {
  const latitude = result.geometry?.location?.lat;
  const longitude = result.geometry?.location?.lng;
  const formattedAddress =
    result.formatted_address || prediction.description?.trim();

  if (
    typeof latitude !== 'number' ||
    typeof longitude !== 'number' ||
    !formattedAddress
  ) {
    return null;
  }

  const addressParts = createAddressPartsFromPrediction(
    prediction,
    formattedAddress
  );

  return {
    label: addressParts.label,
    value:
      result.place_id ??
      prediction.place_id ??
      `place:${latitude.toFixed(6)},${longitude.toFixed(6)}`,
    hint: addressParts.hint,
    location: {
      latitude,
      longitude,
    },
  };
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'en',
        'User-Agent': 'i-track-mobile/0.1',
      },
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  }
}

async function fetchGeocodingResults(url: string) {
  const payload = await fetchJson<GeocodingResponse>(url);

  if (payload?.status !== 'OK') {
    return [];
  }

  return (payload.results ?? [])
    .map((result) => buildLocationOption(result))
    .filter(
      (option): option is DriverAllocationLocationOption => option !== null
    );
}

async function fetchPlaceDetails(
  prediction: PlaceAutocompletePrediction,
  apiKey: string
) {
  if (!prediction.place_id) {
    return null;
  }

  const url =
    'https://maps.googleapis.com/maps/api/place/details/json' +
    `?place_id=${encodeURIComponent(prediction.place_id)}` +
    '&fields=formatted_address,geometry,place_id' +
    `&key=${encodeURIComponent(apiKey)}`;

  const payload = await fetchJson<PlaceDetailsResponse>(url);

  if (payload?.status !== 'OK' || !payload.result) {
    return null;
  }

  return buildLocationOptionFromPlaceDetails(prediction, payload.result);
}

async function searchGooglePlacesAddresses(
  query: string,
  limit: number
): Promise<DriverAllocationLocationOption[]> {
  const apiKey = getRuntimePlacesApiKey();

  if (!apiKey) {
    return [];
  }

  const autocompleteUrl =
    'https://maps.googleapis.com/maps/api/place/autocomplete/json' +
    `?input=${encodeURIComponent(query)}` +
    '&types=geocode' +
    '&language=en' +
    '&region=ph' +
    `&key=${encodeURIComponent(apiKey)}`;

  const autocompletePayload =
    await fetchJson<PlaceAutocompleteResponse>(autocompleteUrl);

  if (autocompletePayload?.status !== 'OK') {
    return [];
  }

  const predictions = (autocompletePayload.predictions ?? []).slice(0, limit);
  const resolvedPredictions = await Promise.all(
    predictions.map((prediction) => fetchPlaceDetails(prediction, apiKey))
  );

  return resolvedPredictions.filter(
    (option): option is DriverAllocationLocationOption => option !== null
  );
}

function buildLocationOptionFromOpenStreetMap(
  result: OpenStreetMapSearchResult | OpenStreetMapReverseResult
): DriverAllocationLocationOption | null {
  const latitude = Number(result.lat);
  const longitude = Number(result.lon);
  const formattedAddress = result.display_name?.trim();

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !formattedAddress) {
    return null;
  }

  const addressParts = createAddressParts(formattedAddress);

  return {
    label: result.name?.trim() || addressParts.label,
    value:
      result.place_id != null
        ? `osm:${String(result.place_id)}`
        : result.osm_id != null
          ? `osm:${String(result.osm_id)}`
          : `osm:${latitude.toFixed(6)},${longitude.toFixed(6)}`,
    hint: addressParts.hint || 'OpenStreetMap result',
    location: {
      latitude,
      longitude,
    },
  };
}

async function searchOpenStreetMapAddresses(
  query: string,
  limit: number
): Promise<DriverAllocationLocationOption[]> {
  const url =
    'https://nominatim.openstreetmap.org/search' +
    `?q=${encodeURIComponent(query)}` +
    '&format=jsonv2' +
    '&addressdetails=1' +
    '&countrycodes=ph' +
    `&limit=${encodeURIComponent(String(limit))}`;

  const payload = await fetchJson<OpenStreetMapSearchResult[]>(url);

  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .map((result) => buildLocationOptionFromOpenStreetMap(result))
    .filter(
      (option): option is DriverAllocationLocationOption => option !== null
    )
    .slice(0, limit);
}

async function reverseGeocodeOpenStreetMapLocation(
  location: Location
): Promise<DriverAllocationLocationOption | null> {
  const url =
    'https://nominatim.openstreetmap.org/reverse' +
    `?lat=${encodeURIComponent(String(location.latitude))}` +
    `&lon=${encodeURIComponent(String(location.longitude))}` +
    '&format=jsonv2' +
    '&addressdetails=1' +
    '&zoom=18';

  const payload = await fetchJson<OpenStreetMapReverseResult>(url);

  if (!payload) {
    return null;
  }

  return buildLocationOptionFromOpenStreetMap(payload);
}

export async function searchGoogleMapsAddresses(
  query: string,
  limit = 5
): Promise<DriverAllocationLocationOption[]> {
  const apiKey = getRuntimeGeocodingApiKey();
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return [];
  }

  if (apiKey) {
    const placeResults = await searchGooglePlacesAddresses(trimmedQuery, limit);

    if (placeResults.length) {
      return placeResults.slice(0, limit);
    }

    const url =
      'https://maps.googleapis.com/maps/api/geocode/json' +
      `?address=${encodeURIComponent(trimmedQuery)}` +
      '&region=ph' +
      `&key=${encodeURIComponent(apiKey)}`;

    const results = await fetchGeocodingResults(url);

    if (results.length) {
      return results.slice(0, limit);
    }
  }

  return searchOpenStreetMapAddresses(trimmedQuery, limit);
}

export async function reverseGeocodeGoogleMapsLocation(
  location: Location
): Promise<DriverAllocationLocationOption | null> {
  const apiKey = getRuntimeGeocodingApiKey();

  if (apiKey) {
    const url =
      'https://maps.googleapis.com/maps/api/geocode/json' +
      `?latlng=${encodeURIComponent(
        `${location.latitude},${location.longitude}`
      )}` +
      '&result_type=street_address|premise|route|plus_code|locality' +
      '&region=ph' +
      `&key=${encodeURIComponent(apiKey)}`;

    const results = await fetchGeocodingResults(url);

    if (results[0]) {
      return results[0];
    }
  }

  return reverseGeocodeOpenStreetMapLocation(location);
}
