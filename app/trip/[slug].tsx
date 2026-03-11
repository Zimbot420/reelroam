import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// Placeholder — full trip detail screen will be built in a future prompt.
export default function TripDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-white items-center justify-center px-6">
      <View
        className="w-16 h-16 rounded-2xl items-center justify-center mb-4"
        style={{ backgroundColor: '#0D9488' }}
      >
        <Ionicons name="map" size={30} color="white" />
      </View>
      <Text className="text-2xl font-bold text-gray-900 text-center">Trip Ready!</Text>
      <Text className="text-gray-500 text-sm mt-2 text-center">
        Trip detail screen coming soon.{'\n'}Slug: {slug}
      </Text>
      <TouchableOpacity
        onPress={() => router.replace('/')}
        className="mt-6 px-6 py-3 rounded-2xl"
        style={{ backgroundColor: '#0D9488' }}
      >
        <Text className="text-white font-semibold">Go Home</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
