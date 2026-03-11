import AsyncStorage from '@react-native-async-storage/async-storage'

const DEVICE_ID_KEY = '@reelroam/device_id'

function generateId(): string {
  return 'dev_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

let cached: string | null = null

export async function getOrCreateDeviceId(): Promise<string> {
  if (cached) return cached

  try {
    const stored = await AsyncStorage.getItem(DEVICE_ID_KEY)
    if (stored) {
      cached = stored
      return stored
    }

    const newId = generateId()
    await AsyncStorage.setItem(DEVICE_ID_KEY, newId)
    cached = newId
    return newId
  } catch {
    // If AsyncStorage fails, return a session-only ID
    if (!cached) cached = generateId()
    return cached
  }
}
