import React from 'react';
import { Platform, View } from 'react-native';
import { adsConfigured, resolveBannerUnitId } from '../lib/ads';

// Metro provides `require` at runtime; declared locally so TS accepts the lazy load.
declare const require: (id: string) => any;

let cachedModule: any | undefined; // undefined = not tried yet, null = unavailable
function loadAdsModule(): any {
  if (cachedModule !== undefined) return cachedModule;
  try {
    cachedModule = require('react-native-google-mobile-ads');
  } catch {
    cachedModule = null; // native module unavailable (e.g. Expo Go) — banner stays hidden
  }
  return cachedModule;
}

/**
 * AdMob banner — used ONLY on the Home screen.
 *
 * Renders nothing when:
 * - ads are not configured for this platform yet (no AdMob App ID — see src/lib/ads.ts),
 * - the native ads module is unavailable (e.g. Expo Go), or
 * - an ad fails to load (so the layout never shows a broken empty box).
 */
export function AdBanner() {
  const [failed, setFailed] = React.useState(false);
  if (!adsConfigured(Platform.OS) || failed) return null;
  const adsModule = loadAdsModule();
  if (!adsModule) return null;
  const { BannerAd, BannerAdSize } = adsModule;
  if (!BannerAd || !BannerAdSize) return null;

  return (
    <View style={{ alignItems: 'center', paddingTop: 8 }}>
      <BannerAd
        unitId={resolveBannerUnitId(Platform.OS, __DEV__)}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
        onAdFailedToLoad={() => setFailed(true)}
      />
    </View>
  );
}
