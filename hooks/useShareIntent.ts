/**
 * IMPORTANT: Share intent requires a native development build.
 * This feature CANNOT be tested in Expo Go.
 *
 * To test this feature you must:
 * 1. Run: eas build --profile development --platform ios (or android)
 * 2. Install the resulting build on a physical device
 * 3. Share a TikTok/Instagram/YouTube URL to ReelRoam from the share sheet
 *
 * Any changes to app.json plugins also require a new build.
 */

import { useShareIntentContext } from 'expo-share-intent';
import { useEffect, useState } from 'react';

export type SupportedPlatform = 'tiktok' | 'instagram' | 'youtube';

export interface ShareIntentResult {
  url: string | null;
  platform: SupportedPlatform | null;
  isLoading: boolean;
  error: string | null;
}

const SUPPORTED_HOSTS: Record<string, SupportedPlatform> = {
  'tiktok.com': 'tiktok',
  'vm.tiktok.com': 'tiktok',
  'vt.tiktok.com': 'tiktok',
  'instagram.com': 'instagram',
  'www.instagram.com': 'instagram',
  'youtube.com': 'youtube',
  'www.youtube.com': 'youtube',
  'youtu.be': 'youtube',
  'm.youtube.com': 'youtube',
};

function detectPlatform(url: string): SupportedPlatform | null {
  try {
    const { hostname } = new URL(url);
    return SUPPORTED_HOSTS[hostname] ?? null;
  } catch {
    return null;
  }
}

export function useShareIntent(): ShareIntentResult {
  const { hasShareIntent, shareIntent, resetShareIntent, error } =
    useShareIntentContext();

  const [result, setResult] = useState<ShareIntentResult>({
    url: null,
    platform: null,
    isLoading: false,
    error: null,
  });

  useEffect(() => {
    if (!hasShareIntent) {
      return;
    }

    const sharedUrl = shareIntent?.webUrl ?? shareIntent?.text ?? null;

    if (!sharedUrl) {
      setResult({ url: null, platform: null, isLoading: false, error: null });
      return;
    }

    const platform = detectPlatform(sharedUrl);

    if (!platform) {
      setResult({
        url: null,
        platform: null,
        isLoading: false,
        error: 'Only TikTok, Instagram and YouTube links are supported',
      });
      resetShareIntent();
      return;
    }

    setResult({ url: sharedUrl, platform, isLoading: false, error: null });
  }, [hasShareIntent, shareIntent]);

  // Surface library-level errors
  useEffect(() => {
    if (error) {
      setResult((prev) => ({ ...prev, error: error.message ?? 'Unknown share error' }));
    }
  }, [error]);

  return result;
}
