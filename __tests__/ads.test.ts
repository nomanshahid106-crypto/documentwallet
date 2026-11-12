import {
  adsConfigured,
  resolveBannerUnitId,
  ADMOB_ANDROID_BANNER_UNIT_ID,
  TEST_BANNER_UNIT_ID_ANDROID,
  TEST_BANNER_UNIT_ID_IOS,
} from '../src/lib/ads';

describe('ads config', () => {
  it('keeps the owner banner unit ID on record', () => {
    expect(ADMOB_ANDROID_BANNER_UNIT_ID).toBe('ca-app-pub-5906273058714323/5756219436');
  });

  it('is not configured until an AdMob App ID is provided', () => {
    // The banner unit ID alone is not enough — Android needs the App ID in the
    // manifest, so ads must stay dormant (and the app crash-free) until then.
    expect(adsConfigured('android')).toBe(false);
    expect(adsConfigured('ios')).toBe(false);
    expect(adsConfigured('web')).toBe(false);
  });

  it('always uses Google test units in development builds', () => {
    expect(resolveBannerUnitId('android', true)).toBe(TEST_BANNER_UNIT_ID_ANDROID);
    expect(resolveBannerUnitId('ios', true)).toBe(TEST_BANNER_UNIT_ID_IOS);
  });

  it('uses the owner unit ID in release builds', () => {
    expect(resolveBannerUnitId('android', false)).toBe(ADMOB_ANDROID_BANNER_UNIT_ID);
  });
});
