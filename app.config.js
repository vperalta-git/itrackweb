const appJson = require('./app.json');

const baseConfig = appJson.expo;
const mapboxAccessToken =
  process.env.MAPBOX_ACCESS_TOKEN ||
  process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ||
  null;
const mapboxStyleOwner =
  process.env.MAPBOX_STYLE_OWNER ||
  process.env.EXPO_PUBLIC_MAPBOX_STYLE_OWNER ||
  'mapbox';
const mapboxStyleId =
  process.env.MAPBOX_STYLE_ID ||
  process.env.EXPO_PUBLIC_MAPBOX_STYLE_ID ||
  'streets-v12';
const easProjectId =
  process.env.EXPO_PUBLIC_EAS_PROJECT_ID ||
  process.env.EAS_PROJECT_ID ||
  baseConfig.extra?.expoPushProjectId ||
  baseConfig.extra?.eas?.projectId;

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
    mapboxAccessToken,
    mapboxStyleOwner,
    mapboxStyleId,
  },
};
