import * as Application from "expo-application";
import Constants from "expo-constants";
import { Platform } from "react-native";

export type UpdateServerResponse = {
  appName?: string;
  platform?: string;
  latestVersion?: string;
  versionCode?: number;
  mandatory?: boolean;
  downloadUrl?: string;
  releaseNotes?: string[];
  minSupportedVersion?: string;
  updatedAt?: string;
};

export type UpdateCheckResult = {
  isUpdateAvailable: boolean;
  isMandatory: boolean;
  latestVersion: string | null;
  downloadUrl: string | null;
  releaseNotes: string[];
  currentVersion: string;
  currentVersionCode: number | null;
};

const UPDATE_REQUEST_TIMEOUT_MS = 8000;

function parseVersionCode(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.floor(value);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return null;
  return Math.floor(parsed);
}

function normalizeVersionPart(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0;
}

// Semantic compare fallback when versionCode/buildCode is unavailable.
function compareSemanticVersion(a: string, b: string): number {
  const aParts = String(a ?? "")
    .split(".")
    .map((part) => normalizeVersionPart(part));
  const bParts = String(b ?? "")
    .split(".")
    .map((part) => normalizeVersionPart(part));
  const length = Math.max(aParts.length, bParts.length, 3);

  for (let i = 0; i < length; i += 1) {
    const left = aParts[i] ?? 0;
    const right = bParts[i] ?? 0;
    if (left < right) return -1;
    if (left > right) return 1;
  }
  return 0;
}

function sanitizeReleaseNotes(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item ?? "").trim())
    .filter((item) => item.length > 0);
}

function getUpdateEndpointUrl(): string | null {
  // Change your update endpoint in app.json -> expo.extra.updateCheckUrl.
  const configured = Constants.expoConfig?.extra?.updateCheckUrl;
  if (typeof configured !== "string") return null;
  const trimmed = configured.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getCurrentVersionInfo(): { currentVersion: string; currentVersionCode: number | null } {
  const fallbackVersion = Constants.expoConfig?.version;
  const currentVersion = Application.nativeApplicationVersion ?? fallbackVersion ?? "0.0.0";

  const nativeBuildCode = parseVersionCode(Application.nativeBuildVersion);
  if (nativeBuildCode !== null) {
    return { currentVersion, currentVersionCode: nativeBuildCode };
  }

  const configBuildCode =
    Platform.OS === "android"
      ? parseVersionCode(Constants.expoConfig?.android?.versionCode)
      : parseVersionCode(Constants.expoConfig?.ios?.buildNumber);

  return { currentVersion, currentVersionCode: configBuildCode };
}

function isPlatformCompatible(platform: unknown): boolean {
  if (typeof platform !== "string") return true;
  const normalized = platform.trim().toLowerCase();
  if (!normalized) return true;
  if (normalized === "all" || normalized === "both" || normalized === "any") return true;
  return normalized === Platform.OS;
}

function parseServerPayload(payload: unknown): UpdateServerResponse | null {
  if (!payload || typeof payload !== "object") return null;
  const raw = payload as Record<string, unknown>;

  const latestVersion =
    typeof raw.latestVersion === "string" ? raw.latestVersion.trim() : undefined;
  const downloadUrl = typeof raw.downloadUrl === "string" ? raw.downloadUrl.trim() : undefined;

  if (!latestVersion || !downloadUrl) return null;

  return {
    appName: typeof raw.appName === "string" ? raw.appName.trim() : undefined,
    platform: typeof raw.platform === "string" ? raw.platform.trim() : undefined,
    latestVersion,
    versionCode: parseVersionCode(raw.versionCode) ?? undefined,
    mandatory: Boolean(raw.mandatory),
    downloadUrl,
    releaseNotes: sanitizeReleaseNotes(raw.releaseNotes),
    minSupportedVersion:
      typeof raw.minSupportedVersion === "string" ? raw.minSupportedVersion.trim() : undefined,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : undefined,
  };
}

async function fetchUpdatePayload(endpoint: string): Promise<UpdateServerResponse | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPDATE_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const json = (await response.json()) as unknown;
    return parseServerPayload(json);
  } catch (error) {
    console.warn("[update-check] request failed", error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function checkForAppUpdate(): Promise<UpdateCheckResult> {
  const { currentVersion, currentVersionCode } = getCurrentVersionInfo();
  const defaultResult: UpdateCheckResult = {
    isUpdateAvailable: false,
    isMandatory: false,
    latestVersion: null,
    downloadUrl: null,
    releaseNotes: [],
    currentVersion,
    currentVersionCode,
  };

  const endpoint = getUpdateEndpointUrl();
  if (!endpoint) return defaultResult;

  const payload = await fetchUpdatePayload(endpoint);
  if (!payload) return defaultResult;
  if (!isPlatformCompatible(payload.platform)) return defaultResult;

  const latestVersion = payload.latestVersion ?? null;
  const downloadUrl = payload.downloadUrl ?? null;
  const releaseNotes = payload.releaseNotes ?? [];

  let isUpdateAvailable = false;

  // Prefer semantic latestVersion for update decision.
  if (latestVersion) {
    isUpdateAvailable = compareSemanticVersion(currentVersion, latestVersion) < 0;
  } else if (currentVersionCode !== null && payload.versionCode !== undefined) {
    isUpdateAvailable = currentVersionCode < payload.versionCode;
  }

  const belowMinSupported =
    Boolean(payload.minSupportedVersion) &&
    compareSemanticVersion(currentVersion, payload.minSupportedVersion as string) < 0;

  const isMandatory = Boolean(payload.mandatory) || belowMinSupported;

  return {
    isUpdateAvailable: isUpdateAvailable || belowMinSupported,
    isMandatory,
    latestVersion,
    downloadUrl,
    releaseNotes,
    currentVersion,
    currentVersionCode,
  };
}
