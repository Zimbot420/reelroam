import { useEffect, useRef } from 'react';
import { Animated, Text, View } from 'react-native';
import { getFlagEmoji, getCountryName } from '../lib/countryUtils';

interface CountryToastProps {
  isoCode: string | null;
  adding: boolean; // true = added, false = removed
  onDone: () => void;
}

export default function CountryToast({ isoCode, adding, onDone }: CountryToastProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    if (!isoCode) return;

    opacity.setValue(0);
    translateY.setValue(8);

    Animated.sequence([
      // Fade + slide in
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 14, stiffness: 200 }),
      ]),
      // Hold
      Animated.delay(1200),
      // Fade out
      Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => onDone());
  }, [isoCode]);

  if (!isoCode) return null;

  const flag = getFlagEmoji(isoCode);
  const name = getCountryName(isoCode);
  const label = adding ? `${flag} ${name} added!` : `${flag} ${name} removed`;

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 8,
        alignSelf: 'center',
        opacity,
        transform: [{ translateY }],
        zIndex: 99,
      }}
    >
      <View
        style={{
          backgroundColor: adding ? 'rgba(13,148,136,0.95)' : 'rgba(239,68,68,0.9)',
          paddingHorizontal: 14,
          paddingVertical: 7,
          borderRadius: 20,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        <Text style={{ color: 'white', fontSize: 13, fontWeight: '600' }}>{label}</Text>
      </View>
    </Animated.View>
  );
}
