# ReelRoam — Project Context

## What This App Does
ReelRoam lets users share a TikTok, Instagram, or YouTube URL directly to the app via the native iOS/Android share sheet. The AI (Claude) extracts all mentioned locations from the video and generates a day-by-day travel itinerary with an interactive map — without the user ever leaving the social media app.

**Core UX flow:**
1. User sees a travel video on TikTok/Instagram/YouTube
2. Taps the native Share button → selects ReelRoam
3. App extracts locations and builds an itinerary automatically
4. User views interactive map + day-by-day plan
5. User can save, share, or export the trip

## Tech Stack
| Tool | Version | Purpose |
|---|---|---|
| Expo | ~54.0.0 | Build framework |
| Expo Router | ~6.0.23 | File-based navigation |
| TypeScript | ~5.9.2 | Type safety |
| NativeWind | ^4.2.2 | Tailwind CSS styling |
| Tailwind CSS | ^3.4.x | Utility classes (v3, not v4) |
| Supabase | ^2.x | Database + auth |
| Claude API | claude-sonnet-4-20250514 | AI extraction + itinerary |
| React Native Maps | ^1.x | Interactive map display |
| RevenueCat | ^9.x | Subscription management |
| AsyncStorage | 2.2.0 | Local persistence |

## Monetization
| Tier | Price | Features |
|---|---|---|
| Free | $0 | 3 trips/month, text-based extraction |
| Pro | $9/month | Unlimited trips, vision analysis (Claude reads video frames) |

## Folder Structure
```
reelroam/
├── app/                      # Screens (Expo Router file-based routing)
│   ├── _layout.tsx           # Root layout, imports global.css
│   └── index.tsx             # Home screen
├── components/               # Reusable UI components
├── lib/                      # Utilities and clients
│   ├── api/                  # All API call functions (Claude, etc.)
│   ├── env.ts                # Typed env variable exports
│   └── supabase.ts           # Supabase client (singleton)
├── types/
│   └── index.ts              # Trip, Location, Activity, Day, UserTier
├── hooks/                    # Custom React hooks
├── assets/                   # Images, icons, fonts
├── supabase/
│   ├── schema.sql            # Database schema (run in Supabase dashboard)
│   └── functions/            # Supabase edge functions
├── global.css                # Tailwind base directives
├── tailwind.config.js        # Content paths + nativewind preset
├── babel.config.js           # NativeWind babel plugin
├── metro.config.js           # withNativeWind metro config
├── eas.json                  # EAS build profiles
└── app.json                  # Expo config (owner: zimbot420, projectId set)
```

## Database Schema
### trips
| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| created_at | timestamptz | Auto |
| source_url | text | The shared video URL |
| platform | text | tiktok / instagram / youtube |
| title | text | AI-generated trip title |
| locations | jsonb | Array of Location objects |
| itinerary | jsonb | Array of Day objects |
| share_slug | text | Unique, for shareable links |
| extraction_method | text | text / vision |
| is_pro | boolean | Whether vision was used |
| device_id | text | Anonymous device identifier |

### trip_views
| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| trip_id | uuid | FK → trips(id) ON DELETE CASCADE |
| viewed_at | timestamptz | Auto |

## TypeScript Types (types/index.ts)
- `UserTier` — `'free' | 'pro'`
- `Location` — name, address, lat/lng, description, category
- `Activity` — time, title, description, location, duration, cost
- `Day` — day number, date, title, activities[]
- `Trip` — matches the trips database table exactly

## Environment Variables
| Variable | Used In | Purpose |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Client | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Client | Supabase public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Supabase admin key — never in client bundle |
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | Client | Google Maps for react-native-maps |
| `ANTHROPIC_API_KEY` | Server only | Claude API — never in client bundle |
| `EXPO_PUBLIC_REVENUECAT_IOS_KEY` | Client | RevenueCat iOS SDK key |
| `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` | Client | RevenueCat Android SDK key |

`EXPO_PUBLIC_` prefix = safe to bundle in the app.
No prefix = server/edge function only.

## EAS Build Profiles
| Profile | Command | Use For |
|---|---|---|
| development | `eas build --profile development` | Daily testing with native features (share extension) |
| preview | `eas build --profile preview` | TestFlight / internal APK testing |
| production | `eas build --profile production` | App Store + Play Store submission |

## OTA Updates (expo-updates) — USE THIS INSTEAD OF REBUILDING

`expo-updates` is installed and configured. For any **JavaScript/TypeScript-only change**, push an OTA update instead of triggering a full EAS build.

### When to use OTA update (fast, ~2 min)
- Bug fixes in `.tsx` / `.ts` files
- UI changes, new screens, component changes
- API call changes, logic changes
- Any change that does NOT touch native code

### When a full rebuild is required (slow, ~15-20 min)
- Installing a new npm package that has native code
- Changes to `app.json` (permissions, bundle ID, etc.)
- Changes to `/ios` or `/android` folders
- Bumping `version` in `app.json` (required after native changes)

### OTA update commands

Push to test users (preview build / TestFlight):
```bash
eas update --branch preview --message "describe what changed"
```

Push to production (App Store / Play Store):
```bash
eas update --branch production --message "describe what changed"
```

Push to development builds:
```bash
eas update --branch development --message "describe what changed"
```

### How it works
- Each build profile has a `channel` in `eas.json` (development / preview / production)
- `eas update --branch <channel>` pushes a new JS bundle to that channel
- Users receive the update **automatically on next app launch** (no action required from them)
- `runtimeVersion` policy is `appVersion` — OTA bundles are only delivered to builds with a matching `version` in `app.json`

### IMPORTANT: Bumping version after native changes
If you install a native package and do a new build, bump `version` in `app.json` first (e.g. `"1.0.0"` → `"1.1.0"`). This prevents old builds from receiving a JS bundle that depends on native code they don't have.

## UI/UX Design Skill

A **UI/UX Pro Max** skill is installed at `~/.claude/skills/ui-ux-pro-max/SKILL.md`.

Before working on **ANY** task that involves:
- Building or modifying screens or components
- Designing layouts, cards, buttons, or any visual elements
- Improving the look and feel of any part of the app
- Creating new UI from scratch

You **MUST** invoke the skill via the Skill tool (`skill: "ui-ux-pro-max"`) and follow its guidelines. Apply its principles to produce premium, polished, production-quality UI. **Do not skip this step.**

This app uses **React Native** — use the skill's React Native stack rules and always pair design decisions with NativeWind `className` utility classes (never `StyleSheet.create`).

## Coding Rules
1. **Always use NativeWind `className`** for styling — never `StyleSheet.create`
2. **All API logic** (Claude calls, external HTTP) goes in `/lib/api/`
3. **All Supabase calls** go through `lib/supabase.ts` — import the singleton `supabase` client
4. **Never expose server-side keys** client-side — `ANTHROPIC_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are server/edge function only
5. **Commit to GitHub** after each working feature: `git add`, `git commit`, `git push`
6. **Install packages** with `--legacy-peer-deps` due to known react-dom peer dep conflict in Expo 54
8. **Installing native packages** — If a feature clearly benefits from a native npm package, go ahead and install it. Inform the user that it requires a full EAS rebuild (not an OTA update), and that they are willing to do the rebuild. Do not skip a useful native package just to avoid the rebuild.
7. **Tailwind must stay at v3** — NativeWind v4 is incompatible with Tailwind v4

## Expo / EAS Config
- **Expo account:** zimbot420
- **EAS project ID:** 2716a19d-fb0f-4b7b-a300-69c99b9fbf61
- **Project URL:** https://expo.dev/accounts/zimbot420/projects/reelroam
- **GitHub repo:** https://github.com/Zimbot420/reelroam

## Supabase Config
- **Project URL:** https://gxtukagbyjvxkuanqoxx.supabase.co
- **Dashboard:** https://supabase.com/dashboard/project/gxtukagbyjvxkuanqoxx

## Current Build Status
- [x] Project created (Expo + TypeScript)
- [x] Git initialized and pushed to GitHub
- [x] All dependencies installed
- [x] NativeWind v4 + Tailwind v3 configured
- [x] Environment variables set up
- [x] Supabase client configured
- [x] Database schema created and applied
- [x] EAS configured (3 build profiles)
- [x] Folder structure set up
- [x] TypeScript types defined
- [ ] Screens to build next
