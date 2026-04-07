const appJson = require('./app.json');

const baseConfig = appJson.expo;
const androidGoogleMapsApiKey =
  process.env.GOOGLE_MAPS_API_KEY_ANDROID ||
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_ANDROID;
const iosGoogleMapsApiKey =
  process.env.GOOGLE_MAPS_API_KEY_IOS ||
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_IOS;
const directionsGoogleMapsApiKey =
  process.env.GOOGLE_MAPS_DIRECTIONS_API_KEY ||
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_DIRECTIONS_API_KEY ||
  androidGoogleMapsApiKey ||
  iosGoogleMapsApiKey;
const easProjectId =
  process.env.EXPO_PUBLIC_EAS_PROJECT_ID ||
  process.env.EAS_PROJECT_ID ||
  baseConfig.extra?.expoPushProjectId ||
  baseConfig.extra?.eas?.projectId;
const geocodingGoogleMapsApiKey =
  process.env.GOOGLE_MAPS_GEOCODING_API_KEY ||
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_GEOCODING_API_KEY ||
  directionsGoogleMapsApiKey ||
  androidGoogleMapsApiKey ||
  iosGoogleMapsApiKey;
const placesGoogleMapsApiKey =
  process.env.GOOGLE_MAPS_PLACES_API_KEY ||
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_PLACES_API_KEY ||
  geocodingGoogleMapsApiKey ||
  directionsGoogleMapsApiKey ||
  androidGoogleMapsApiKey ||
  iosGoogleMapsApiKey;

module.exports = {
  ...baseConfig,
  extra: {
    ...(baseConfig.extra ?? {}),
    expoPushProjectId: easProjectId ?? null,
    eas: {
      ...((baseConfig.extra ?? {}).eas ?? {}),
      ...(easProjectId
        ? {
            projectId: easProjectId,
          }
        : {}),
    },
    googleMapsPlacesApiKey: placesGoogleMapsApiKey ?? null,
    googleMapsGeocodingApiKey: geocodingGoogleMapsApiKey ?? null,
    googleMapsDirectionsApiKey: directionsGoogleMapsApiKey ?? null,
    googleMapsApiKeys: {
      android: androidGoogleMapsApiKey ?? null,
      ios: iosGoogleMapsApiKey ?? null,
    },
  },
  android: {
    ...baseConfig.android,
    config: {
      ...(baseConfig.android?.config ?? {}),
      ...(androidGoogleMapsApiKey
        ? {
            googleMaps: {
              ...((baseConfig.android?.config || {}).googleMaps ?? {}),
              apiKey: androidGoogleMapsApiKey,
            },
          }
        : {}),
    },
  },
  ios: {
    ...baseConfig.ios,
    config: {
      ...(baseConfig.ios?.config ?? {}),
      ...(iosGoogleMapsApiKey
        ? {
            googleMapsApiKey: iosGoogleMapsApiKey,
          }
        : {}),
    },
  },
};
