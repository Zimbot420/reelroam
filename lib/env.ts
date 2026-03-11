function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}\n` +
      `Make sure it is set in your .env file.`
    );
  }
  return value;
}

// Public — safe to expose in the app bundle
export const SUPABASE_URL = requireEnv('EXPO_PUBLIC_SUPABASE_URL');
export const SUPABASE_ANON_KEY = requireEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY');
export const GOOGLE_MAPS_API_KEY = requireEnv('EXPO_PUBLIC_GOOGLE_MAPS_API_KEY');
export const REVENUECAT_IOS_KEY = requireEnv('EXPO_PUBLIC_REVENUECAT_IOS_KEY');
export const REVENUECAT_ANDROID_KEY = requireEnv('EXPO_PUBLIC_REVENUECAT_ANDROID_KEY');

// Server-side only — never include in client bundles
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
export const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? '';
