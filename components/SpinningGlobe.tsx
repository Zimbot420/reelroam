import { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import LottieView from 'lottie-react-native';

const LOTTIE_SIZE = 290;
const TEAL = '#0D9488';
const TEAL_BRIGHT = '#2DD4BF';

export default function SpinningGlobe() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.88)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 900,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 7,
        tension: 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={{ width: '100%', height: 300, alignItems: 'center', justifyContent: 'center' }}>
      {/* Equatorial orbit ring */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: LOTTIE_SIZE + 48,
          height: LOTTIE_SIZE + 48,
          borderRadius: (LOTTIE_SIZE + 48) / 2,
          borderWidth: 1,
          borderColor: `${TEAL}1A`,
          transform: [{ scaleY: 0.31 }],
        }}
      />

      {/* Lottie globe — fade + scale-spring entrance */}
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
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
