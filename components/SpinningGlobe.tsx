import { useEffect, useRef, useState } from 'react';
import { Animated, View } from 'react-native';
import { WebView } from 'react-native-webview';

const GLOBE_HTML = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: transparent; overflow: hidden; }
  spline-viewer { width: 100vw; height: 100vh; }
</style>
</head>
<body>
<script type="module" src="https://unpkg.com/@splinetool/viewer@1.0.0/build/spline-viewer.js"></script>
<spline-viewer url="https://my.spline.design/untitled-RjdTLFYqlpFGmL92FltfkAuB/" background="transparent"></spline-viewer>
</body>
</html>`;

export default function SpinningGlobe() {
  const [loaded, setLoaded] = useState(false);
  const placeholderOpacity = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.6, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  function handleLoadEnd() {
    setLoaded(true);
    Animated.timing(placeholderOpacity, { toValue: 0, duration: 600, useNativeDriver: true }).start();
  }

  return (
    <View style={{ width: '100%', height: 380 }} pointerEvents="none">
      {/* Actual Spline WebView */}
      <WebView
        originWhitelist={['*']}
        source={{ html: GLOBE_HTML }}
        style={{ width: '100%', height: 380, backgroundColor: 'transparent' }}
        backgroundColor="transparent"
        scrollEnabled={false}
        bounces={false}
        javaScriptEnabled
        domStorageEnabled
        onLoadEnd={handleLoadEnd}
      />

      {/* Pulsing placeholder while loading */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: placeholderOpacity,
        }}
      >
        <Animated.View
          style={{
            width: 300,
            height: 300,
            borderRadius: 150,
            backgroundColor: '#0D9488',
            opacity: pulseAnim,
          }}
        />
      </Animated.View>
    </View>
  );
}
