import { Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-2xl font-bold text-blue-600">ReelRoam</Text>
      <Text className="mt-2 text-base text-gray-500">NativeWind is working!</Text>
    </View>
  );
}
