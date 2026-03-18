// Module-level mutable draft store for the past trip creation flow.
// Persists between screen navigations without needing a Context provider.

export interface PastTripDraft {
  destination: string;
  destinationPlaceId: string | null;
  placesCoverUrl: string | null; // cover photo from Google Places

  startMonth: number | null; // 0-11
  startYear: number | null;
  endMonth: number | null; // 0-11
  endYear: number | null;
  approximateDates: boolean;

  rating: number; // 1-5, 0 = not rated
  moodTags: string[];
  note: string;

  highlights: string[];
  coverUrl: string | null; // user's final chosen cover (camera roll or places)
}

const EMPTY: PastTripDraft = {
  destination: '',
  destinationPlaceId: null,
  placesCoverUrl: null,
  startMonth: null,
  startYear: null,
  endMonth: null,
  endYear: null,
  approximateDates: false,
  rating: 0,
  moodTags: [],
  note: '',
  highlights: [],
  coverUrl: null,
};

export const pastTripDraft: PastTripDraft = { ...EMPTY, moodTags: [], highlights: [] };

export function resetPastTripDraft() {
  const fresh = { ...EMPTY, moodTags: [] as string[], highlights: [] as string[] };
  Object.assign(pastTripDraft, fresh);
}
