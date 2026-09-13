export type RecommendationCacheMetadata = {
  rankerVersion: string;
  profileFeatureVersion: string;
  catalogVersion: string;
  generatedAt: string;
};

type AppDataCacheSnapshot<TUser, TProject, TApplication> = {
  user: TUser | null;
  projects: TProject[];
  applications: TApplication[];
  savedProjectIds: string[];
  recommendationMetadata?: RecommendationCacheMetadata | null;
  fetchedAt: number;
};

const APP_DATA_STORAGE_KEY = "intrnd:app-data:v2";
const LEGACY_KEYS = ["intrnd:app-data:v1", "intrnd:browse-recommendations:v1", "intrnd:latest-ranking:v1"];

function readSessionValue<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeSessionValue(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Keep the in-memory snapshot when session storage is unavailable.
  }
}

function removeSessionValue(key: string) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // Storage restrictions must not prevent clearing the in-memory cache.
  }
}

let appDataCache = readSessionValue<AppDataCacheSnapshot<unknown, unknown, unknown>>(APP_DATA_STORAGE_KEY);

export function getAppDataCache<TUser, TProject, TApplication>() {
  return appDataCache as AppDataCacheSnapshot<TUser, TProject, TApplication> | null;
}

export function setAppDataCache<TUser, TProject, TApplication>(snapshot: AppDataCacheSnapshot<TUser, TProject, TApplication>) {
  appDataCache = snapshot as AppDataCacheSnapshot<unknown, unknown, unknown>;
  writeSessionValue(APP_DATA_STORAGE_KEY, appDataCache);
}

export function clearAppDataCache() {
  appDataCache = null;
  removeSessionValue(APP_DATA_STORAGE_KEY);
  LEGACY_KEYS.forEach(removeSessionValue);
}
