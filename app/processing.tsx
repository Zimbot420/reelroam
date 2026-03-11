import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

export default function ProcessingScreen() {
  const { url, platform } = useLocalSearchParams<{ url: string; platform: string }>();

  return (
    <View className="flex-1 items-center justify-center bg-white px-6">
      <Text className="text-2xl font-bold text-gray-900">Processing...</Text>
      <Text className="mt-2 text-sm text-gray-500 text-center" numberOfLines={2}>
        {url}
      </Text>
      <Text className="mt-1 text-xs text-blue-500 uppercase tracking-widest">
        {platform}
      </Text>
    </View>
  );
}
