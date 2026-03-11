import { useCallback, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

export const FREE_TRIP_LIMIT = 3

const KEYS = {
  isPro:         '@reelroam/is_pro',
  tripsCount:    '@reelroam/trips_month_count',
  tripsMonthKey: '@reelroam/trips_month_key',
}

function getCurrentMonthKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export interface ProStatusData {
  isPro: boolean
  tripsThisMonth: number
  tripsRemaining: number
}

export interface ProStatus extends ProStatusData {
  isLoaded: boolean
  incrementTripCount: () => Promise<void>
}

export async function getProStatusAsync(): Promise<ProStatusData> {
  const [isProRaw, countRaw, storedKey] = await Promise.all([
    AsyncStorage.getItem(KEYS.isPro),
    AsyncStorage.getItem(KEYS.tripsCount),
    AsyncStorage.getItem(KEYS.tripsMonthKey),
  ])

  const isPro = isProRaw === 'true'
  const currentKey = getCurrentMonthKey()

  let tripsThisMonth = 0
  if (storedKey === currentKey) {
    tripsThisMonth = parseInt(countRaw ?? '0', 10) || 0
  } else {
    // New month — reset counter
    await AsyncStorage.setItem(KEYS.tripsCount, '0')
    await AsyncStorage.setItem(KEYS.tripsMonthKey, currentKey)
  }

  const tripsRemaining = isPro
    ? FREE_TRIP_LIMIT  // Pro users always show full (irrelevant)
    : Math.max(0, FREE_TRIP_LIMIT - tripsThisMonth)

  return { isPro, tripsThisMonth, tripsRemaining }
}

export async function incrementTripCount(): Promise<void> {
  const currentKey = getCurrentMonthKey()
  const [countRaw, storedKey] = await Promise.all([
    AsyncStorage.getItem(KEYS.tripsCount),
    AsyncStorage.getItem(KEYS.tripsMonthKey),
  ])
  const current = storedKey === currentKey ? (parseInt(countRaw ?? '0', 10) || 0) : 0
  await Promise.all([
    AsyncStorage.setItem(KEYS.tripsCount, String(current + 1)),
    AsyncStorage.setItem(KEYS.tripsMonthKey, currentKey),
  ])
}

export function useProStatus(): ProStatus {
  const [data, setData] = useState<ProStatusData>({
    isPro: false,
    tripsThisMonth: 0,
    tripsRemaining: FREE_TRIP_LIMIT,
  })
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    getProStatusAsync().then((d) => {
      setData(d)
      setIsLoaded(true)
    })
  }, [])

  const increment = useCallback(async () => {
    await incrementTripCount()
    const updated = await getProStatusAsync()
    setData(updated)
  }, [])

  return { ...data, isLoaded, incrementTripCount: increment }
}
