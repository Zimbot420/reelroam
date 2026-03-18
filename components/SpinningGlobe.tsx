import { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import LottieView from 'lottie-react-native';

const LOTTIE_SIZE = 290;
const TEAL = '#0D9488';
const TEAL_BRIGHT = '#2DD4BF';

/**
 * IMPORTANT: No `transform` styles allowed here. Reanimated 4.1.6's native
 * Fabric hook processes ALL views' transforms through its buggy CSS matrix
 * engine, causing SIGABRT on startup. Using opacity-only entrance instead.
 */
export default function SpinningGlobe() {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <View style={{ width: '100%', height: 300, alignItems: 'center', justifyContent: 'center' }}>
      {/* Equatorial orbit ring — rendered as a flat ellipse via height instead of transform scaleY */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: LOTTIE_SIZE + 48,
          height: Math.round((LOTTIE_SIZE + 48) * 0.31),
          borderRadius: (LOTTIE_SIZE + 48) / 2,
          borderWidth: 1,
          borderColor: `${TEAL}1A`,
        }}
      />

      {/* Lottie globe — fade entrance (no scale transform) */}
      <Animated.View
        style={{
          opacity: fadeAnim,
          shadowColor: TEAL_BRIGHT,
          shadowOpacity: 0.18,
          shadowRadius: 32,
          elevation: 12,
        }}
      >
        <LottieView
          source={require('../assets/animations/globe.json')}
          autoPlay
          loop
          style={{ width: LOTTIE_SIZE, height: LOTTIE_SIZE }}
        />
      </Animated.View>
    </View>
  );
}
