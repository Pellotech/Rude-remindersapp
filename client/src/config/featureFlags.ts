export type FeatureAccess = 'FREE' | 'PAID_ONLY' | 'DISABLED';

export type FeatureKey = 'MEDIA_ATTACHMENTS' | 'MOTIVATIONAL_QUOTES';

const featureFlags: Record<FeatureKey, FeatureAccess> = {
  MEDIA_ATTACHMENTS: 'PAID_ONLY',
  MOTIVATIONAL_QUOTES: 'PAID_ONLY',
};

export function getFeatureAccess(key: FeatureKey): FeatureAccess {
  return featureFlags[key];
}

export function isFeatureFree(key: FeatureKey): boolean {
  return featureFlags[key] === 'FREE';
}

export function isFeaturePaidOnly(key: FeatureKey): boolean {
  return featureFlags[key] === 'PAID_ONLY';
}

export function isFeatureDisabled(key: FeatureKey): boolean {
  return featureFlags[key] === 'DISABLED';
}

export function isFeatureAvailable(key: FeatureKey, hasProAccess: boolean): boolean {
  const access = featureFlags[key];
  if (access === 'DISABLED') return false;
  if (access === 'FREE') return true;
  return hasProAccess;
}
