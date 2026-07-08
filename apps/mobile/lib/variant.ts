// Build variant. The same codebase ships as two apps:
//   customer (default) — AngkorGo, the consumer super-app
//   driver             — AngkorGo Driver, provider-only (boots into (provider))
// Selected at build/start time via EXPO_PUBLIC_APP_VARIANT=driver.
export const APP_VARIANT: 'customer' | 'driver' =
  process.env.EXPO_PUBLIC_APP_VARIANT === 'driver' ? 'driver' : 'customer';

export const IS_DRIVER_APP = APP_VARIANT === 'driver';
