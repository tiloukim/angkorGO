// Dynamic Expo config: injects the native Google Maps key from the environment
// (.env locally, EAS secrets in CI) so no key is committed to the repo, and
// selects the build VARIANT (customer super-app vs driver-only app) from
// EXPO_PUBLIC_APP_VARIANT so one codebase ships as two distinct store apps.
import appJson from './app.json';

const MAPS_KEY =
  process.env.GOOGLE_MAPS_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

const isDriver = process.env.EXPO_PUBLIC_APP_VARIANT === 'driver';

export default () => {
  const cfg = appJson.expo;
  return {
    ...cfg,
    name: isDriver ? 'AngkorGo Driver' : cfg.name,
    slug: isDriver ? 'angkorgo-driver' : cfg.slug,
    scheme: isDriver ? 'angkorgodriver' : cfg.scheme,
    ios: {
      ...cfg.ios,
      bundleIdentifier: isDriver ? 'ai.angkorgo.driver' : cfg.ios.bundleIdentifier,
      config: { ...cfg.ios.config, googleMapsApiKey: MAPS_KEY },
    },
    android: {
      ...cfg.android,
      package: isDriver ? 'ai.angkorgo.driver' : cfg.android.package,
      config: { ...cfg.android.config, googleMaps: { apiKey: MAPS_KEY } },
    },
    extra: { ...cfg.extra, appVariant: isDriver ? 'driver' : 'customer' },
  };
};
