// AdMob configuration for DocVault.
//
// The banner AD UNIT ID below was provided by the app owner. AdMob also issues a
// separate APP ID per app (AdMob console → App settings → App ID, format
// "ca-app-pub-XXXX~YYYY" — note the "~", an ad unit ID uses "/"). Android requires
// the App ID in the app manifest before the ads SDK can run at all, so the banner
// stays dormant (renders nothing) until ADMOB_ANDROID_APP_ID is filled in AND the
// react-native-google-mobile-ads config plugin is added to app.json with that ID
// (see README → "Ads (AdMob)"). This is deliberate: shipping the banner without
// the App ID would crash or break ad loading in release builds.
//
// Development builds always use Google's official test ad units, so no invalid
// traffic is ever sent to the owner's real ad unit while testing.

export const ADMOB_ANDROID_APP_ID = '';
export const ADMOB_IOS_APP_ID = '';

export const ADMOB_ANDROID_BANNER_UNIT_ID = 'ca-app-pub-5906273058714323/5756219436';
export const ADMOB_IOS_BANNER_UNIT_ID = '';

// Google's official public test banner units (safe for development/testing).
export const TEST_BANNER_UNIT_ID_ANDROID = 'ca-app-pub-3940256099942544/6300978111';
export const TEST_BANNER_UNIT_ID_IOS = 'ca-app-pub-3940256099942544/2934735716';

export type AdsPlatform = 'android' | 'ios' | string;

/** True only when BOTH the App ID and a banner unit ID exist for the platform. */
export function adsConfigured(platform: AdsPlatform): boolean {
  if (platform === 'android') return Boolean(ADMOB_ANDROID_APP_ID && ADMOB_ANDROID_BANNER_UNIT_ID);
  if (platform === 'ios') return Boolean(ADMOB_IOS_APP_ID && ADMOB_IOS_BANNER_UNIT_ID);
  return false;
}

/** The unit ID the banner should load: Google's test unit in dev, the real unit in release. */
export function resolveBannerUnitId(platform: AdsPlatform, isDev: boolean): string {
  if (isDev) return platform === 'ios' ? TEST_BANNER_UNIT_ID_IOS : TEST_BANNER_UNIT_ID_ANDROID;
  return platform === 'ios' ? ADMOB_IOS_BANNER_UNIT_ID : ADMOB_ANDROID_BANNER_UNIT_ID;
}
