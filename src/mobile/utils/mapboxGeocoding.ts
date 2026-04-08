import Constants from 'expo-constants';
import type { Location } from '../components/MapView';
import type { DriverAllocationLocationOption } from '../data/driver-allocation';

type RuntimeExtra = {
  mapboxAccessToken?: string | null;
};

type MapboxGeocodingResponse = {
  features?: MapboxFeature[];
  type?: string;
};

type MapboxFeature = {
  id?: string;
  geometry?: {
    coordinates?: [number, number];
  };
  properties?: {
    mapbox_id?: string;
    name?: string;
    full_address?: string;
    place_formatted?: string;
    coordinates?: {
      latitude?: number;
      longitude?: number;
      routable_points?: Array<{
        latitude?: number;
        longitude?: number;
      }>;
    };
  };
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

function getRuntimeMapboxAccessToken() {
  return getRuntimeExtra().mapboxAccessToken ?? null;
}

function createAddressParts(formattedAddress: string) {
  const parts = formattedAddress
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  return {
    label: parts.slice(0, 2).join(', ') || formattedAddress,
    hint: parts.slice(2).join(', ') || 'Mapbox result',
  };
}

function buildLocationOptionFromMapbox(
  feature: MapboxFeature
): DriverAllocationLocationOption | null {
  const routablePoint = feature.properties?.coordinates?.routable_points?.[0];
  const latitude =
    routablePoint?.latitude ??
    feature.properties?.coordinates?.latitude ??
    feature.geometry?.coordinates?.[1];
  const longitude =
    routablePoint?.longitude ??
    feature.properties?.coordinates?.longitude ??
    feature.geometry?.coordinates?.[0];
  const formattedAddress =
    feature.properties?.full_address?.trim() ||
    [feature.properties?.name?.trim(), feature.properties?.place_formatted?.trim()]
      .filter(Boolean)
      .join(', ')
      .trim();

  if (typeof latitude !== 'number' || typeof longitude !== 'number' || !formattedAddress) {
    return null;
  }

  const addressParts = createAddressParts(formattedAddress);

  return {
    label: feature.properties?.name?.trim() || addressParts.label,
    value:
      feature.properties?.mapbox_id ??
      feature.id ??
      `mapbox:${latitude.toFixed(6)},${longitude.toFixed(6)}`,
    hint: formattedAddress,
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

async function fetchMapboxResults(url: string) {
  const payload = await fetchJson<MapboxGeocodingResponse>(url);

  if (!Array.isArray(payload?.features)) {
    return [];
  }

  return payload.features
    .map((feature) => buildLocationOptionFromMapbox(feature))
    .filter((option): option is DriverAllocationLocationOption => option !== null);
}

function buildLocationOptionFromOpenStreetMap(
  result: OpenStreetMapSearchResult | OpenStreetMapReverseResult
): DriverAllocationLocationOption | null {
  const latitude = Number(result.lat);
  const longitude = Number(result.lon);
  const formattedAddress = result.display_name?.trim();

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    !formattedAddress
  ) {
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
    hint: formattedAddress,
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
    .filter((option): option is DriverAllocationLocationOption => option !== null)
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

export async function searchMapboxAddresses(
  query: string,
  limit = 5
): Promise<DriverAllocationLocationOption[]> {
  const accessToken = getRuntimeMapboxAccessToken();
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return [];
  }

  if (accessToken) {
    const url =
      'https://api.mapbox.com/search/geocode/v6/forward' +
      `?q=${encodeURIComponent(trimmedQuery)}` +
      '&country=PH' +
      '&language=en' +
      '&autocomplete=true' +
      '&types=address,street,neighborhood,locality,place,district,postcode' +
      `&limit=${encodeURIComponent(String(limit))}` +
      `&access_token=${encodeURIComponent(accessToken)}`;
    const results = await fetchMapboxResults(url);

    if (results.length) {
      return results.slice(0, limit);
    }
  }

  return searchOpenStreetMapAddresses(trimmedQuery, limit);
}

export async function reverseGeocodeMapboxLocation(
  location: Location
): Promise<DriverAllocationLocationOption | null> {
  const accessToken = getRuntimeMapboxAccessToken();

  if (accessToken) {
    const url =
      'https://api.mapbox.com/search/geocode/v6/reverse' +
      `?longitude=${encodeURIComponent(String(location.longitude))}` +
      `&latitude=${encodeURIComponent(String(location.latitude))}` +
      '&country=PH' +
      '&language=en' +
      '&types=address,street,neighborhood,locality,place,district,postcode' +
      '&limit=1' +
      `&access_token=${encodeURIComponent(accessToken)}`;
    const results = await fetchMapboxResults(url);

    if (results[0]) {
      return results[0];
    }
  }

  return reverseGeocodeOpenStreetMapLocation(location);
}
