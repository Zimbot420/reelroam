import { useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';

/**
 * Animates from the previous value to `target` over `duration` ms.
 * Returns the current display value as a rounded number.
 *
 * Usage:
 *   const displayed = useAnimatedNumber(visitedCodes.length, 600);
 */
export function useAnimatedNumber(target: number, duration = 600): number {
  const anim = useRef(new Animated.Value(target)).current;
  const [display, setDisplay] = useState(target);

  useEffect(() => {
    Animated.timing(anim, {
      toValue: target,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // must be false for JS-driven listener
    }).start();

    const id = anim.addListener(({ value }) => {
      setDisplay(Math.round(value));
    });
    return () => anim.removeListener(id);
  }, [target]);

  return display;
}

/**
 * Same as useAnimatedNumber but formats as a percentage with one decimal place.
 * e.g. 12.3
 */
export function useAnimatedPercentage(target: number, duration = 600): string {
  const anim = useRef(new Animated.Value(target)).current;
  const [display, setDisplay] = useState(target.toFixed(1));

  useEffect(() => {
    Animated.timing(anim, {
      toValue: target,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    const id = anim.addListener(({ value }) => {
      setDisplay(value.toFixed(1));
    });
    return () => anim.removeListener(id);
  }, [target]);

  return display;
}
