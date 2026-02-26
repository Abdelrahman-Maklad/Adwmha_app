import * as Location from "expo-location";
import { getDb } from "../db/sqlite";

export interface PrayerTimes {
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
}

export interface DateInfo {
  hijri: {
    day: string;
    monthAr: string;
    year: string;
    weekdayAr: string;
  };
  gregorian: {
    day: string;
    month: string;
    year: string;
    weekday: string;
  };
}

export interface PrayerTimesResult {
  timings: PrayerTimes;
  date: DateInfo;
  lastThirdTime: string | null;
}

export interface HijriMonthDayCard {
  hijriDay: string;
  hijriMonthAr: string;
  hijriYear: string;
  weekdayAr: string;
  gregorianKey: string;
  gregorianDay: string;
  gregorianMonthAr: string;
  isToday: boolean;
}

const GREGORIAN_MONTH_AR: Record<string, string> = {
  January: "\u064A\u0646\u0627\u064A\u0631",
  February: "\u0641\u0628\u0631\u0627\u064A\u0631",
  March: "\u0645\u0627\u0631\u0633",
  April: "\u0623\u0628\u0631\u064A\u0644",
  May: "\u0645\u0627\u064A\u0648",
  June: "\u064A\u0648\u0646\u064A\u0648",
  July: "\u064A\u0648\u0644\u064A\u0648",
  August: "\u0623\u063A\u0633\u0637\u0633",
  September: "\u0633\u0628\u062A\u0645\u0628\u0631",
  October: "\u0623\u0643\u062A\u0648\u0628\u0631",
  November: "\u0646\u0648\u0641\u0645\u0628\u0631",
  December: "\u062F\u064A\u0633\u0645\u0628\u0631",
};

export const FALLBACK_TIMES: PrayerTimes = {
  fajr: "05:01",
  sunrise: "06:28",
  dhuhr: "12:03",
  asr: "15:24",
  maghrib: "17:56",
  isha: "19:25",
};

export const FALLBACK_LAST_THIRD = "03:30";
const CACHE_PRECISION = 3;
const CACHE_META_LAST_LAT = "last_cached_lat";
const CACHE_META_LAST_LNG = "last_cached_lng";
const CACHE_META_LAST_REFRESH_YMD = "last_refresh_ymd";
const CACHE_META_LAST_LOCATION_LABEL = "last_location_label";

function normalizePrayerTime(value: unknown): string {
  const raw = String(value ?? "").trim();
  const match = raw.match(/(\d{1,2}):(\d{2})/);
  if (!match) return raw;

  const hh = Number(match[1]);
  const mm = Number(match[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return raw;

  const clampedHh = Math.max(0, Math.min(23, hh));
  const clampedMm = Math.max(0, Math.min(59, mm));
  return `${String(clampedHh).padStart(2, "0")}:${String(clampedMm).padStart(2, "0")}`;
}

export async function requestLocationPermission(): Promise<boolean> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === "granted";
  } catch (error) {
    console.error("Error requesting location permission:", error);
    return false;
  }
}

export async function getCurrentLocation(): Promise<{
  latitude: number;
  longitude: number;
} | null> {
  try {
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Low,
    });
    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  } catch (error) {
    const message = String((error as any)?.message ?? error ?? "");
    const lowered = message.toLowerCase();
    const isExpectedSettingsFailure =
      lowered.includes("unsatisfied device settings") ||
      lowered.includes("location settings") ||
      lowered.includes("provider");

    if (isExpectedSettingsFailure) {
      console.warn("Location unavailable from current provider, trying last known location:", error);
    } else {
      console.error("Error getting current location:", error);
    }

    try {
      const lastKnown = await Location.getLastKnownPositionAsync();
      if (lastKnown?.coords) {
        return {
          latitude: lastKnown.coords.latitude,
          longitude: lastKnown.coords.longitude,
        };
      }
    } catch (lastKnownError) {
      console.warn("Failed to read last known location:", lastKnownError);
    }

    return null;
  }
}

export async function getLocationLabel(
  latitude: number,
  longitude: number
): Promise<string | null> {
  try {
    const osmUrl =
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2` +
      `&lat=${latitude}&lon=${longitude}` +
      `&accept-language=ar&addressdetails=1&namedetails=1`;

    const osmRes = await fetch(osmUrl, {
      headers: {
        "Accept-Language": "ar",
        "User-Agent": "rn-steps/1.0 (mobile-app)",
      },
    });

    if (osmRes.ok) {
      const osm = await osmRes.json();
      const addr = osm?.address ?? {};
      const namedetails = osm?.namedetails ?? {};

      const city =
        namedetails["name:ar"] ||
        addr.city ||
        addr.town ||
        addr.village ||
        addr.municipality ||
        addr.suburb ||
        addr.state;

      const country = addr.country || namedetails["country:ar"];

      if (city && country) return `${city}\u060C ${country}`;
      if (country) return country;

      const displayName = String(osm?.display_name ?? "").trim();
      if (displayName) return displayName.split(",").join("\u060C");
    }

    const places = await Location.reverseGeocodeAsync({ latitude, longitude });
    const place = places?.[0];
    if (!place) return null;

    const city = place.city || place.region || place.subregion;
    const countryCode = place.isoCountryCode;

    let countryArabic = place.country;
    if (countryCode) {
      try {
        countryArabic =
          new Intl.DisplayNames(["ar"], { type: "region" }).of(countryCode) ?? place.country;
      } catch {
        countryArabic = place.country;
      }
    }

    if (city && countryArabic) return `${city}\u060C ${countryArabic}`;
    if (countryArabic) return countryArabic;
    return city ?? null;
  } catch (error) {
    console.error("Error reverse geocoding location:", error);
    return null;
  }
}

export async function fetchPrayerTimes(
  lat: number,
  lng: number,
  method: number = 5
): Promise<PrayerTimesResult | null> {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const url = `https://api.aladhan.com/v1/timings/${timestamp}?latitude=${lat}&longitude=${lng}&method=${method}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const json = await response.json();
    const data = json.data;

    const result: PrayerTimesResult = {
      timings: {
        fajr: normalizePrayerTime(data.timings.Fajr),
        sunrise: normalizePrayerTime(data.timings.Sunrise),
        dhuhr: normalizePrayerTime(data.timings.Dhuhr),
        asr: normalizePrayerTime(data.timings.Asr),
        maghrib: normalizePrayerTime(data.timings.Maghrib),
        isha: normalizePrayerTime(data.timings.Isha),
      },
      date: {
        hijri: {
          day: data.date.hijri.day,
          monthAr: data.date.hijri.month.ar,
          year: data.date.hijri.year,
          weekdayAr: data.date.hijri.weekday.ar,
        },
        gregorian: {
          day: data.date.gregorian.day,
          month: data.date.gregorian.month.en,
          year: data.date.gregorian.year,
          weekday: data.date.gregorian.weekday.en,
        },
      },
      lastThirdTime:
        data.timings.Lastthird ?? data.timings.LastThird ?? data.timings.lastthird ?? null,
    };

    const dateKey = gregorianKeyFromDateInfo(result.date);
    if (dateKey) {
      await upsertCachedPrayerTimes({
        dateKey,
        lat,
        lng,
        method,
        times: result.timings,
        dateInfo: result.date,
        hijriMonthNumber: String(data?.date?.hijri?.month?.number ?? ""),
      });
    }

    await setLastCachedLocation(lat, lng);
    return result;
  } catch (error) {
    console.error("Error fetching prayer times:", error);
    return null;
  }
}

export async function fetchPrayerTimesForDate(
  lat: number,
  lng: number,
  gregorianKey: string,
  method: number = 5
): Promise<PrayerTimes | null> {
  const getFallbackCachedTimes = async () => {
    const direct = await getCachedPrayerTimesForDate(gregorianKey, lat, lng, method);
    if (direct) return direct;

    const lastLocation = await getLastCachedLocation();
    if (!lastLocation) return null;
    return getCachedPrayerTimesForDate(gregorianKey, lastLocation.lat, lastLocation.lng, method);
  };

  try {
    const [year, month, day] = gregorianKey.split("-");
    if (!year || !month || !day) return null;
    const dateParam = `${day}-${month}-${year}`;
    const url =
      `https://api.aladhan.com/v1/timings/${dateParam}` +
      `?latitude=${lat}&longitude=${lng}&method=${method}`;

    const response = await fetch(url);
    if (!response.ok) {
      return getFallbackCachedTimes();
    }

    const json = await response.json();
    const data = json?.data;
    const timings = data?.timings;
    if (!timings) {
      return getFallbackCachedTimes();
    }

    const prayerTimes: PrayerTimes = {
      fajr: normalizePrayerTime(timings.Fajr),
      sunrise: normalizePrayerTime(timings.Sunrise),
      dhuhr: normalizePrayerTime(timings.Dhuhr),
      asr: normalizePrayerTime(timings.Asr),
      maghrib: normalizePrayerTime(timings.Maghrib),
      isha: normalizePrayerTime(timings.Isha),
    };
    const dateInfo = dateInfoFromCalendarDay(data);
    await upsertCachedPrayerTimes({
      dateKey: gregorianKey,
      lat,
      lng,
      method,
      times: prayerTimes,
      dateInfo,
      hijriMonthNumber: String(data?.date?.hijri?.month?.number ?? ""),
    });
    await setLastCachedLocation(lat, lng);
    return prayerTimes;
  } catch (error) {
    console.warn("Network fetch failed for selected day; using cached prayer times fallback.", error);
  }

  return getFallbackCachedTimes();
}

function toGregorianKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function roundCoord(value: number): number {
  const factor = 10 ** CACHE_PRECISION;
  return Math.round(value * factor) / factor;
}

function buildCacheKey(dateKey: string, lat: number, lng: number, method: number): string {
  return `${dateKey}|${roundCoord(lat)}|${roundCoord(lng)}|${method}`;
}

function todayYmd(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toDateKeyFromCalendarDay(day: any): string | null {
  const g = day?.date?.gregorian;
  if (!g) return null;

  const year = String(g.year ?? "").trim();
  const monthRaw = g.month?.number ?? "";
  const dayRaw = g.day ?? "";

  const month = String(monthRaw).padStart(2, "0");
  const dateDay = String(dayRaw).padStart(2, "0");
  if (!year || !month || !dateDay) return null;
  return `${year}-${month}-${dateDay}`;
}

function monthRangeAround(date: Date): Date[] {
  const base = new Date(date);
  const prev = new Date(date);
  const next = new Date(date);
  prev.setMonth(prev.getMonth() - 1);
  next.setMonth(next.getMonth() + 1);
  return [prev, base, next];
}

function dateInfoFromCalendarDay(day: any): DateInfo | null {
  const h = day?.date?.hijri;
  const g = day?.date?.gregorian;
  if (!h || !g) return null;

  return {
    hijri: {
      day: String(h.day ?? ""),
      monthAr: String(h.month?.ar ?? ""),
      year: String(h.year ?? ""),
      weekdayAr: String(h.weekday?.ar ?? ""),
    },
    gregorian: {
      day: String(g.day ?? ""),
      month: String(g.month?.en ?? ""),
      year: String(g.year ?? ""),
      weekday: String(g.weekday?.en ?? ""),
    },
  };
}

function gregorianKeyFromDateInfo(date: DateInfo): string | null {
  const year = String(date.gregorian.year ?? "").trim();
  const monthText = String(date.gregorian.month ?? "").trim();
  const day = String(date.gregorian.day ?? "").padStart(2, "0");
  if (!year || !day) return null;

  const monthNumber = new Date(`${monthText} 1, ${year}`).getMonth() + 1;
  if (!Number.isFinite(monthNumber) || monthNumber < 1 || monthNumber > 12) return null;
  return `${year}-${String(monthNumber).padStart(2, "0")}-${day}`;
}

async function setCacheMeta(key: string, value: string) {
  const db = await getDb();
  await db.runAsync(
    "INSERT OR REPLACE INTO prayer_times_cache_meta (key, value) VALUES (?, ?);",
    [key, value]
  );
}

async function setLastCachedLocation(lat: number, lng: number) {
  await Promise.all([
    setCacheMeta(CACHE_META_LAST_LAT, String(roundCoord(lat))),
    setCacheMeta(CACHE_META_LAST_LNG, String(roundCoord(lng))),
  ]);
}

export async function getLastCachedLocationLabel(): Promise<string | null> {
  const value = await getCacheMeta(CACHE_META_LAST_LOCATION_LABEL);
  return value ? String(value) : null;
}

async function setLastCachedLocationLabel(label: string) {
  const trimmed = String(label || "").trim();
  if (!trimmed) return;
  await setCacheMeta(CACHE_META_LAST_LOCATION_LABEL, trimmed);
}

async function getCacheMeta(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM prayer_times_cache_meta WHERE key = ?;",
    [key]
  );
  return row?.value ?? null;
}

async function getLatestCachedLocationFromRows(): Promise<{ lat: number; lng: number } | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ lat: number; lng: number }>(
    `SELECT lat, lng
     FROM prayer_times_cache
     ORDER BY updated_at DESC
     LIMIT 1;`
  );
  if (!row) return null;
  const lat = Number(row.lat);
  const lng = Number(row.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

async function hasCacheRowsForLocation(lat: number, lng: number): Promise<boolean> {
  const db = await getDb();
  const latRounded = roundCoord(lat);
  const lngRounded = roundCoord(lng);
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count
     FROM prayer_times_cache
     WHERE lat = ? AND lng = ?;`,
    [latRounded, lngRounded]
  );
  return Number(row?.count ?? 0) > 0;
}

async function upsertCachedPrayerTimes(params: {
  dateKey: string;
  lat: number;
  lng: number;
  method: number;
  times: PrayerTimes;
  dateInfo?: DateInfo | null;
  hijriMonthNumber?: string | null;
}) {
  const db = await getDb();
  const latRounded = roundCoord(params.lat);
  const lngRounded = roundCoord(params.lng);
  const cacheKey = buildCacheKey(params.dateKey, latRounded, lngRounded, params.method);

  await db.runAsync(
    `INSERT OR REPLACE INTO prayer_times_cache
      (
        cache_key, date_key, lat, lng, method, fajr, sunrise, dhuhr, asr, maghrib, isha,
        hijri_day, hijri_month_ar, hijri_year, hijri_weekday_ar, hijri_month_number,
        gregorian_day, gregorian_month_en, gregorian_weekday_en, updated_at
      )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      cacheKey,
      params.dateKey,
      latRounded,
      lngRounded,
      params.method,
      normalizePrayerTime(params.times.fajr),
      normalizePrayerTime(params.times.sunrise),
      normalizePrayerTime(params.times.dhuhr),
      normalizePrayerTime(params.times.asr),
      normalizePrayerTime(params.times.maghrib),
      normalizePrayerTime(params.times.isha),
      params.dateInfo?.hijri.day ?? null,
      params.dateInfo?.hijri.monthAr ?? null,
      params.dateInfo?.hijri.year ?? null,
      params.dateInfo?.hijri.weekdayAr ?? null,
      params.hijriMonthNumber ?? null,
      params.dateInfo?.gregorian.day ?? null,
      params.dateInfo?.gregorian.month ?? null,
      params.dateInfo?.gregorian.weekday ?? null,
      Date.now(),
    ]
  );
}

export async function shouldRefreshThreeMonthCacheToday(): Promise<boolean> {
  const lastRefresh = await getCacheMeta(CACHE_META_LAST_REFRESH_YMD);
  return lastRefresh !== todayYmd();
}

export async function getLastCachedLocation(): Promise<{ lat: number; lng: number } | null> {
  const [latText, lngText] = await Promise.all([
    getCacheMeta(CACHE_META_LAST_LAT),
    getCacheMeta(CACHE_META_LAST_LNG),
  ]);

  const lat = Number(latText);
  const lng = Number(lngText);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    const hasRows = await hasCacheRowsForLocation(lat, lng);
    if (hasRows) {
      return { lat, lng };
    }
  }

  const recoveredLocation = await getLatestCachedLocationFromRows();
  if (recoveredLocation) {
    await setLastCachedLocation(recoveredLocation.lat, recoveredLocation.lng);
  }
  return recoveredLocation;
}

export async function getCachedPrayerTimesForDate(
  dateKey: string,
  lat: number,
  lng: number,
  method: number = 5
): Promise<PrayerTimes | null> {
  const db = await getDb();
  const cacheKey = buildCacheKey(dateKey, lat, lng, method);
  const row = await db.getFirstAsync<{
    fajr: string;
    sunrise: string;
    dhuhr: string;
    asr: string;
    maghrib: string;
    isha: string;
  }>(
    `SELECT fajr, sunrise, dhuhr, asr, maghrib, isha
     FROM prayer_times_cache
     WHERE cache_key = ?;`,
    [cacheKey]
  );

  if (!row) return null;
  return {
    fajr: normalizePrayerTime(row.fajr),
    sunrise: normalizePrayerTime(row.sunrise),
    dhuhr: normalizePrayerTime(row.dhuhr),
    asr: normalizePrayerTime(row.asr),
    maghrib: normalizePrayerTime(row.maghrib),
    isha: normalizePrayerTime(row.isha),
  };
}

export async function getCachedDateInfoForDate(
  dateKey: string,
  lat: number,
  lng: number,
  method: number = 5
): Promise<DateInfo | null> {
  const db = await getDb();
  const cacheKey = buildCacheKey(dateKey, lat, lng, method);
  const row = await db.getFirstAsync<{
    hijri_day: string | null;
    hijri_month_ar: string | null;
    hijri_year: string | null;
    hijri_weekday_ar: string | null;
    gregorian_day: string | null;
    gregorian_month_en: string | null;
    gregorian_weekday_en: string | null;
    date_key: string;
  }>(
    `SELECT
       hijri_day, hijri_month_ar, hijri_year, hijri_weekday_ar,
       gregorian_day, gregorian_month_en, gregorian_weekday_en, date_key
     FROM prayer_times_cache
     WHERE cache_key = ?;`,
    [cacheKey]
  );

  if (!row?.hijri_day || !row.hijri_month_ar || !row.hijri_year || !row.hijri_weekday_ar) {
    return null;
  }

  const [year, month, day] = String(row.date_key).split("-");
  return {
    hijri: {
      day: String(row.hijri_day),
      monthAr: String(row.hijri_month_ar),
      year: String(row.hijri_year),
      weekdayAr: String(row.hijri_weekday_ar),
    },
    gregorian: {
      day: String(row.gregorian_day ?? day ?? ""),
      month: String(row.gregorian_month_en ?? ""),
      year: String(year ?? ""),
      weekday: String(row.gregorian_weekday_en ?? ""),
    },
  };
}

export async function getPrayerTimesWithoutLocation(
  dateKey: string,
  method: number = 5
): Promise<PrayerTimes | null> {
  const lastLocation = await getLastCachedLocation();
  if (!lastLocation) return null;
  return getCachedPrayerTimesForDate(dateKey, lastLocation.lat, lastLocation.lng, method);
}

export async function getDateInfoWithoutLocation(
  dateKey: string,
  method: number = 5
): Promise<DateInfo | null> {
  const lastLocation = await getLastCachedLocation();
  if (!lastLocation) return null;
  return getCachedDateInfoForDate(dateKey, lastLocation.lat, lastLocation.lng, method);
}

export async function fetchAndStoreThreeMonthPrayerCache(
  lat: number,
  lng: number,
  method: number = 5
): Promise<void> {
  const fetchGregorianMonth = async (year: number, month: number) => {
    const url =
      `https://api.aladhan.com/v1/calendar/${year}/${month}` +
      `?latitude=${lat}&longitude=${lng}&method=${method}`;
    const response = await fetch(url);
    if (!response.ok) return [];
    const json = await response.json();
    return Array.isArray(json?.data) ? json.data : [];
  };

  const [prev, base, next] = monthRangeAround(new Date());
  const [prevDays, baseDays, nextDays] = await Promise.all([
    fetchGregorianMonth(prev.getFullYear(), prev.getMonth() + 1),
    fetchGregorianMonth(base.getFullYear(), base.getMonth() + 1),
    fetchGregorianMonth(next.getFullYear(), next.getMonth() + 1),
  ]);

  const rows = [...prevDays, ...baseDays, ...nextDays];
  for (const day of rows) {
    const dateKey = toDateKeyFromCalendarDay(day);
    const timings = day?.timings;
    const dateInfo = dateInfoFromCalendarDay(day);
    if (!dateKey || !timings) continue;

    await upsertCachedPrayerTimes({
      dateKey,
      lat,
      lng,
      method,
      times: {
        fajr: normalizePrayerTime(timings.Fajr),
        sunrise: normalizePrayerTime(timings.Sunrise),
        dhuhr: normalizePrayerTime(timings.Dhuhr),
        asr: normalizePrayerTime(timings.Asr),
        maghrib: normalizePrayerTime(timings.Maghrib),
        isha: normalizePrayerTime(timings.Isha),
      },
      dateInfo,
      hijriMonthNumber: String(day?.date?.hijri?.month?.number ?? ""),
    });
  }

  await Promise.all([
    setLastCachedLocation(lat, lng),
    setCacheMeta(CACHE_META_LAST_REFRESH_YMD, todayYmd()),
  ]);
}

export async function fetchHijriMonthCalendar(
  gregorianDate: Date,
  lat: number,
  lng: number,
  method: number = 5
): Promise<HijriMonthDayCard[]> {
  try {
    const todayKey = toGregorianKey(gregorianDate);

    const fetchGregorianMonth = async (year: number, month: number) => {
      const url =
        `https://api.aladhan.com/v1/calendar/${year}/${month}` +
        `?latitude=${lat}&longitude=${lng}&method=${method}`;
      const response = await fetch(url);
      if (!response.ok) return [];
      const json = await response.json();
      return Array.isArray(json?.data) ? json.data : [];
    };

    const base = new Date(gregorianDate);
    const prev = new Date(gregorianDate);
    const next = new Date(gregorianDate);
    prev.setMonth(prev.getMonth() - 1);
    next.setMonth(next.getMonth() + 1);

    const [prevDays, baseDays, nextDays] = await Promise.all([
      fetchGregorianMonth(prev.getFullYear(), prev.getMonth() + 1),
      fetchGregorianMonth(base.getFullYear(), base.getMonth() + 1),
      fetchGregorianMonth(next.getFullYear(), next.getMonth() + 1),
    ]);

    const dedup = new Map<string, any>();
    [...prevDays, ...baseDays, ...nextDays].forEach((d: any) => {
      const g = d?.date?.gregorian;
      if (!g) return;
      const key = `${g.year}-${String(g.month?.number).padStart(2, "0")}-${String(g.day).padStart(
        2,
        "0"
      )}`;
      dedup.set(key, d);
    });

    const days = Array.from(dedup.values());
    if (days.length === 0) return [];

    const todayEntry =
      days.find((d: any) => {
        const g = d?.date?.gregorian;
        if (!g) return false;
        const k = `${g.year}-${String(g.month?.number).padStart(2, "0")}-${String(g.day).padStart(
          2,
          "0"
        )}`;
        return k === todayKey;
      }) ?? days[0];

    const targetHijriMonth = String(todayEntry?.date?.hijri?.month?.number ?? "");
    const targetHijriYear = String(todayEntry?.date?.hijri?.year ?? "");
    await setLastCachedLocation(lat, lng);

    for (const day of days) {
      const dateKey = toDateKeyFromCalendarDay(day);
      const timings = day?.timings;
      if (!dateKey || !timings) continue;
      await upsertCachedPrayerTimes({
        dateKey,
        lat,
        lng,
        method,
        times: {
          fajr: normalizePrayerTime(timings.Fajr),
          sunrise: normalizePrayerTime(timings.Sunrise),
          dhuhr: normalizePrayerTime(timings.Dhuhr),
          asr: normalizePrayerTime(timings.Asr),
          maghrib: normalizePrayerTime(timings.Maghrib),
          isha: normalizePrayerTime(timings.Isha),
        },
        dateInfo: dateInfoFromCalendarDay(day),
        hijriMonthNumber: String(day?.date?.hijri?.month?.number ?? ""),
      });
    }

    return days
      .sort((a: any, b: any) => {
        const ga = a.date.gregorian;
        const gb = b.date.gregorian;
        const ka = `${ga.year}-${String(ga.month.number).padStart(2, "0")}-${String(ga.day).padStart(
          2,
          "0"
        )}`;
        const kb = `${gb.year}-${String(gb.month.number).padStart(2, "0")}-${String(gb.day).padStart(
          2,
          "0"
        )}`;
        return ka.localeCompare(kb);
      })
      .filter((d: any) => {
        const h = d?.date?.hijri;
        return (
          String(h?.month?.number ?? "") === targetHijriMonth &&
          String(h?.year ?? "") === targetHijriYear
        );
      })
      .map((d: any) => {
        const g = d.date.gregorian;
        const h = d.date.hijri;
        const gregorianKey = `${g.year}-${String(g.month.number).padStart(2, "0")}-${String(
          g.day
        ).padStart(2, "0")}`;

        return {
          hijriDay: String(h.day),
          hijriMonthAr: String(h.month.ar),
          hijriYear: String(h.year),
          weekdayAr: String(h.weekday.ar),
          gregorianKey,
          gregorianDay: String(g.day),
          gregorianMonthAr: GREGORIAN_MONTH_AR[String(g.month.en)] ?? String(g.month.en),
          isToday: gregorianKey === todayKey,
        };
      });
  } catch (error) {
    console.error("Error fetching Hijri month calendar:", error);
    return [];
  }
}

export async function getCachedHijriMonthCalendar(
  gregorianDate: Date,
  lat: number,
  lng: number,
  method: number = 5
): Promise<HijriMonthDayCard[]> {
  const db = await getDb();
  const [prev, base, next] = monthRangeAround(gregorianDate);
  const monthKeys = [prev, base, next].map(
    (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
  );
  const dateKey = toGregorianKey(gregorianDate);
  const latRounded = roundCoord(lat);
  const lngRounded = roundCoord(lng);

  const rows = await db.getAllAsync<{
    date_key: string;
    hijri_day: string | null;
    hijri_month_ar: string | null;
    hijri_year: string | null;
    hijri_weekday_ar: string | null;
    hijri_month_number: string | null;
    gregorian_day: string | null;
    gregorian_month_en: string | null;
  }>(
    `SELECT
       date_key, hijri_day, hijri_month_ar, hijri_year, hijri_weekday_ar,
       hijri_month_number, gregorian_day, gregorian_month_en
     FROM prayer_times_cache
     WHERE lat = ? AND lng = ? AND method = ?
       AND substr(date_key, 1, 7) IN (?, ?, ?)
     ORDER BY date_key ASC;`,
    [latRounded, lngRounded, method, monthKeys[0], monthKeys[1], monthKeys[2]]
  );

  if (!rows.length) return [];

  const todayEntry = rows.find((row) => row.date_key === dateKey) ?? rows[0];
  const targetMonthNumber = String(todayEntry.hijri_month_number ?? "").trim();
  const targetYear = String(todayEntry.hijri_year ?? "").trim();
  const targetMonthAr = String(todayEntry.hijri_month_ar ?? "").trim();

  return rows
    .filter((row) => {
      const monthNumber = String(row.hijri_month_number ?? "").trim();
      const year = String(row.hijri_year ?? "").trim();
      const monthAr = String(row.hijri_month_ar ?? "").trim();
      if (targetMonthNumber && targetYear) {
        return monthNumber === targetMonthNumber && year === targetYear;
      }
      if (targetMonthAr && targetYear) {
        return monthAr === targetMonthAr && year === targetYear;
      }
      return false;
    })
    .map((row) => {
      const [, , gDay] = row.date_key.split("-");
      return {
        hijriDay: String(row.hijri_day ?? ""),
        hijriMonthAr: String(row.hijri_month_ar ?? ""),
        hijriYear: String(row.hijri_year ?? ""),
        weekdayAr: String(row.hijri_weekday_ar ?? ""),
        gregorianKey: String(row.date_key),
        gregorianDay: String(row.gregorian_day ?? gDay ?? ""),
        gregorianMonthAr:
          GREGORIAN_MONTH_AR[String(row.gregorian_month_en ?? "")] ??
          String(row.gregorian_month_en ?? ""),
        isToday: row.date_key === dateKey,
      };
    });
}

export async function getCachedHijriMonthCalendarWithoutLocation(
  gregorianDate: Date,
  method: number = 5
): Promise<HijriMonthDayCard[]> {
  const lastLocation = await getLastCachedLocation();
  if (!lastLocation) return [];
  return getCachedHijriMonthCalendar(gregorianDate, lastLocation.lat, lastLocation.lng, method);
}

export async function initializePrayerTimes(): Promise<{
  times: PrayerTimes;
  lastThirdTime: string;
  date: DateInfo | null;
  locationLabel: string;
  location: { latitude: number; longitude: number } | null;
}> {
  const currentDateKey = toGregorianKey(new Date());
  const getCachedForCurrentDayWithFallbackLocation = async (
    lat?: number,
    lng?: number
  ): Promise<{ times: PrayerTimes | null; date: DateInfo | null }> => {
    if (typeof lat === "number" && typeof lng === "number") {
      const [timesAtCurrent, dateAtCurrent] = await Promise.all([
        getCachedPrayerTimesForDate(currentDateKey, lat, lng),
        getCachedDateInfoForDate(currentDateKey, lat, lng),
      ]);
      if (timesAtCurrent) {
        return { times: timesAtCurrent, date: dateAtCurrent };
      }
    }

    const [timesAtLast, dateAtLast] = await Promise.all([
      getPrayerTimesWithoutLocation(currentDateKey),
      getDateInfoWithoutLocation(currentDateKey),
    ]);
    return { times: timesAtLast, date: dateAtLast };
  };

  const cachedLocationLabel = await getLastCachedLocationLabel();
  const genericLocationLabel = "\u0627\u0644\u0645\u0648\u0642\u0639 \u063A\u064A\u0631 \u0645\u062A\u0627\u062D";
  const hasPermission = await requestLocationPermission();

  if (!hasPermission) {
    const [cached, cachedDate, cachedLocation] = await Promise.all([
      getPrayerTimesWithoutLocation(currentDateKey),
      getDateInfoWithoutLocation(currentDateKey),
      getLastCachedLocation(),
    ]);
    if (cached) {
      return {
        times: cached,
        lastThirdTime: calculateLastThird(cached.isha, cached.fajr),
        date: cachedDate,
        locationLabel: cachedLocationLabel ?? genericLocationLabel,
        location: cachedLocation
          ? { latitude: cachedLocation.lat, longitude: cachedLocation.lng }
          : null,
      };
    }

    return {
      times: FALLBACK_TIMES,
      lastThirdTime: FALLBACK_LAST_THIRD,
      date: null,
      locationLabel: cachedLocationLabel ?? genericLocationLabel,
      location: cachedLocation
        ? { latitude: cachedLocation.lat, longitude: cachedLocation.lng }
        : null,
    };
  }

  const location = await getCurrentLocation();

  if (!location) {
    const [cached, cachedDate, cachedLocation] = await Promise.all([
      getPrayerTimesWithoutLocation(currentDateKey),
      getDateInfoWithoutLocation(currentDateKey),
      getLastCachedLocation(),
    ]);
    if (cached) {
      return {
        times: cached,
        lastThirdTime: calculateLastThird(cached.isha, cached.fajr),
        date: cachedDate,
        locationLabel: cachedLocationLabel ?? genericLocationLabel,
        location: cachedLocation
          ? { latitude: cachedLocation.lat, longitude: cachedLocation.lng }
          : null,
      };
    }

    return {
      times: FALLBACK_TIMES,
      lastThirdTime: FALLBACK_LAST_THIRD,
      date: null,
      locationLabel: cachedLocationLabel ?? genericLocationLabel,
      location: cachedLocation
        ? { latitude: cachedLocation.lat, longitude: cachedLocation.lng }
        : null,
    };
  }

  const resolvedLocationLabel = await getLocationLabel(location.latitude, location.longitude);
  const locationLabel = resolvedLocationLabel ?? cachedLocationLabel ?? genericLocationLabel;
  if (resolvedLocationLabel) {
    await setLastCachedLocationLabel(resolvedLocationLabel);
  }

  void (async () => {
    try {
      const shouldRefresh = await shouldRefreshThreeMonthCacheToday();
      if (!shouldRefresh) return;
      await fetchAndStoreThreeMonthPrayerCache(location.latitude, location.longitude);
    } catch (error) {
      console.error("Failed to refresh prayer cache:", error);
    }
  })();

  const result = await fetchPrayerTimes(location.latitude, location.longitude);

  if (!result) {
    const { times: cached, date: cachedDate } = await getCachedForCurrentDayWithFallbackLocation(
      location.latitude,
      location.longitude
    );
    if (cached) {
      return {
        times: cached,
        lastThirdTime: calculateLastThird(cached.isha, cached.fajr),
        date: cachedDate,
        locationLabel,
        location,
      };
    }

    return {
      times: FALLBACK_TIMES,
      lastThirdTime: FALLBACK_LAST_THIRD,
      date: null,
      locationLabel,
      location,
    };
  }

  const lastThirdTime =
    result.lastThirdTime ?? calculateLastThird(result.timings.isha, result.timings.fajr);

  return {
    times: result.timings,
    lastThirdTime,
    date: result.date,
    locationLabel,
    location,
  };
}

function calculateLastThird(isha: string, fajr: string): string {
  try {
    const ishaMinutes = timeToMinutes(isha);
    const fajrMinutes = timeToMinutes(fajr);

    const nightDuration =
      fajrMinutes > ishaMinutes
        ? fajrMinutes - ishaMinutes
        : 24 * 60 - ishaMinutes + fajrMinutes;

    const lastThirdStart = ishaMinutes + (2 * nightDuration) / 3;
    const lastThirdMinutes = lastThirdStart % (24 * 60);

    return minutesToTime(lastThirdMinutes);
  } catch {
    return FALLBACK_LAST_THIRD;
  }
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60) % 24;
  const mins = Math.floor(minutes % 60);
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}


