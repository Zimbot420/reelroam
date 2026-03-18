/**
 * Premium dark map style for Google Maps (react-native-maps PROVIDER_GOOGLE).
 * Theme: deep navy base, muted roads, teal highways, minimal labels.
 * Applied only on Android (PROVIDER_GOOGLE); iOS uses default Apple Maps.
 */
export const DARK_MAP_STYLE = [
  // ── Base ──────────────────────────────────────────────────────────────────
  { elementType: 'geometry', stylers: [{ color: '#0f0f1a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#d4d4e0' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0f0f1a' }] },

  // ── Administrative ────────────────────────────────────────────────────────
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
  { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: '#8888aa' }] },
  { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#ccccdd' }] },
  { featureType: 'administrative.neighborhood', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.province', elementType: 'labels.text.fill', stylers: [{ color: '#9999bb' }] },

  // ── Points of Interest (hidden — we render custom POI pins) ───────────────
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#0d1a12' }] },
  { featureType: 'poi.park', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.sports_complex', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.medical', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.school', stylers: [{ visibility: 'off' }] },

  // ── Roads ─────────────────────────────────────────────────────────────────
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1e1e32' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#13131f' }] },
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#666680' }] },
  { featureType: 'road', elementType: 'labels.text.stroke', stylers: [{ color: '#0f0f1a' }] },

  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#242438' }] },
  { featureType: 'road.arterial', elementType: 'labels.text.fill', stylers: [{ color: '#777790' }] },

  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#0D9488' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#0a7068' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#e0fffe' }] },
  { featureType: 'road.highway', elementType: 'labels.text.stroke', stylers: [{ color: '#063535' }] },
  { featureType: 'road.highway.controlled_access', elementType: 'geometry', stylers: [{ color: '#0f9e90' }] },

  { featureType: 'road.local', elementType: 'geometry', stylers: [{ color: '#18182a' }] },
  { featureType: 'road.local', elementType: 'labels', stylers: [{ visibility: 'off' }] },

  // ── Transit ───────────────────────────────────────────────────────────────
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit.line', elementType: 'geometry', stylers: [{ color: '#1a1a38' }] },
  { featureType: 'transit.station', elementType: 'geometry', stylers: [{ color: '#1e1e32' }] },
  { featureType: 'transit.station', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },

  // ── Water ─────────────────────────────────────────────────────────────────
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#3a5570' }] },
  { featureType: 'water', elementType: 'labels.text.stroke', stylers: [{ color: '#0f0f1a' }] },

  // ── Landscape ─────────────────────────────────────────────────────────────
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#0f0f1a' }] },
  { featureType: 'landscape.man_made', elementType: 'geometry', stylers: [{ color: '#14141f' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#0d0d18' }] },
  { featureType: 'landscape.natural.terrain', elementType: 'geometry', stylers: [{ color: '#0e0e1a' }] },
]
