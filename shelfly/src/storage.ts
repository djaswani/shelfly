import AsyncStorage from '@react-native-async-storage/async-storage';

// Read a saved value, moving it over from the key it had before the Larder → Shelfly rename.
export async function getWithOldKey(key: string, oldKey: string): Promise<string | null> {
  const v = await AsyncStorage.getItem(key);
  if (v != null) return v;
  const old = await AsyncStorage.getItem(oldKey);
  if (old != null) {
    await AsyncStorage.setItem(key, old);
    await AsyncStorage.removeItem(oldKey);
  }
  return old;
}
