import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_KEYS = {
  ONBOARDING_COMPLETE: 'hasCompletedOnboarding',
  USER_ID: 'userId',
  EMAIL: 'email',
  ACTIVE_JOURNEY: 'activeJourney',
} as const;

export async function getItem(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key);
  } catch (error) {
    console.error(`Error getting item ${key}:`, error);
    return null;
  }
}

export async function setItem(key: string, value: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key, value);
  } catch (error) {
    console.error(`Error setting item ${key}:`, error);
  }
}

export async function removeItem(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error(`Error removing item ${key}:`, error);
  }
}

export async function clear(): Promise<void> {
  try {
    await AsyncStorage.clear();
  } catch (error) {
    console.error('Error clearing storage:', error);
  }
}

// Type-safe helpers
export async function getOnboardingComplete(): Promise<boolean> {
  const value = await getItem(STORAGE_KEYS.ONBOARDING_COMPLETE);
  return value === 'true';
}

export async function setOnboardingComplete(complete: boolean): Promise<void> {
  await setItem(STORAGE_KEYS.ONBOARDING_COMPLETE, complete.toString());
}

export async function getUserId(): Promise<string | null> {
  return await getItem(STORAGE_KEYS.USER_ID);
}

export async function setUserId(userId: string): Promise<void> {
  await setItem(STORAGE_KEYS.USER_ID, userId);
}

export async function getEmail(): Promise<string | null> {
  return await getItem(STORAGE_KEYS.EMAIL);
}

export async function setEmail(email: string): Promise<void> {
  await setItem(STORAGE_KEYS.EMAIL, email);
}

export async function getActiveJourney(): Promise<string | null> {
  return await getItem(STORAGE_KEYS.ACTIVE_JOURNEY);
}

export async function setActiveJourney(journey: string): Promise<void> {
  await setItem(STORAGE_KEYS.ACTIVE_JOURNEY, journey);
}

export async function removeActiveJourney(): Promise<void> {
  await removeItem(STORAGE_KEYS.ACTIVE_JOURNEY);
}
