import AsyncStorage from "@react-native-async-storage/async-storage";

/** Persistance de session (cross-plateforme : web via localStorage, natif via AsyncStorage). */
const ACCESS = "laundry.accessToken";
const REFRESH = "laundry.refreshToken";

export const sessionStore = {
  async save(accessToken: string, refreshToken: string): Promise<void> {
    await AsyncStorage.multiSet([
      [ACCESS, accessToken],
      [REFRESH, refreshToken],
    ]);
  },
  async load(): Promise<{ accessToken: string | null; refreshToken: string | null }> {
    const [[, accessToken], [, refreshToken]] = await AsyncStorage.multiGet([
      ACCESS,
      REFRESH,
    ]);
    return { accessToken, refreshToken };
  },
  async clear(): Promise<void> {
    await AsyncStorage.multiRemove([ACCESS, REFRESH]);
  },
};
