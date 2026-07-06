// Dynamic Expo config: injects the native Google Maps key from the environment
// (.env locally, EAS secrets in CI) so no key is committed to the repo.
import appJson from './app.json';

const MAPS_KEY =
  process.env.GOOGLE_MAPS_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

export default () => {
  const cfg = appJson.expo;
  return {
    ...cfg,
    ios: {
      ...cfg.ios,
      config: { ...cfg.ios.config, googleMapsApiKey: MAPS_KEY },
    },
    android: {
      ...cfg.android,
      config: { ...cfg.android.config, googleMaps: { apiKey: MAPS_KEY } },
    },
  };
};
