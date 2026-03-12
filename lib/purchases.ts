import { Platform } from 'react-native'
import Purchases, { LOG_LEVEL, PurchasesPackage } from 'react-native-purchases'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { REVENUECAT_IOS_KEY, REVENUECAT_ANDROID_KEY } from './env'

const ENTITLEMENT_ID = 'pro'
const PRO_STORAGE_KEY = '@reelroam/is_pro'

export function initializePurchases(): void {
  const apiKey = Platform.OS === 'ios' ? REVENUECAT_IOS_KEY : REVENUECAT_ANDROID_KEY
  if (!apiKey) return
  Purchases.setLogLevel(LOG_LEVEL.ERROR)
  Purchases.configure({ apiKey })
}

export async function getProStatus(): Promise<boolean> {
  try {
    const customerInfo = await Purchases.getCustomerInfo()
    const isPro = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined
    await AsyncStorage.setItem(PRO_STORAGE_KEY, isPro ? 'true' : 'false')
    return isPro
  } catch {
    // Fall back to cached value if RevenueCat is unreachable
    const cached = await AsyncStorage.getItem(PRO_STORAGE_KEY)
    return cached === 'true'
  }
}

export async function purchasePro(): Promise<{ success: boolean; error?: string }> {
  try {
    const offerings = await Purchases.getOfferings()
    const current = offerings.current
    if (!current) {
      return { success: false, error: 'No offerings available' }
    }

    const pkg: PurchasesPackage | null =
      current.monthly ?? current.availablePackages[0] ?? null

    if (!pkg) {
      return { success: false, error: 'No packages available' }
    }

    const { customerInfo } = await Purchases.purchasePackage(pkg)
    const isPro = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined
    await AsyncStorage.setItem(PRO_STORAGE_KEY, isPro ? 'true' : 'false')
    return { success: isPro }
  } catch (e: any) {
    if (e?.userCancelled) {
      return { success: false, error: 'cancelled' }
    }
    return { success: false, error: e?.message ?? 'Purchase failed' }
  }
}

export async function restorePurchases(): Promise<{ success: boolean; isPro: boolean }> {
  try {
    const customerInfo = await Purchases.restorePurchases()
    const isPro = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined
    await AsyncStorage.setItem(PRO_STORAGE_KEY, isPro ? 'true' : 'false')
    return { success: true, isPro }
  } catch {
    return { success: false, isPro: false }
  }
}
