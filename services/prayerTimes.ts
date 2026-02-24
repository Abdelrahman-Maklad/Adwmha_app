import * as Location from "expo-location";

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
    console.error("Error getting current location:", error);
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

      if (city && country) return `${city}، ${country}`;
      if (country) return country;

      const displayName = String(osm?.display_name ?? "").trim();
      if (displayName) return displayName.split(",").join("،");
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

    if (city && countryArabic) return `${city}، ${countryArabic}`;
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

    return {
      timings: {
        fajr: data.timings.Fajr,
        sunrise: data.timings.Sunrise,
        dhuhr: data.timings.Dhuhr,
        asr: data.timings.Asr,
        maghrib: data.timings.Maghrib,
        isha: data.timings.Isha,
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
  try {
    const [year, month, day] = gregorianKey.split("-");
    if (!year || !month || !day) return null;
    const dateParam = `${day}-${month}-${year}`;
    const url =
      `https://api.aladhan.com/v1/timings/${dateParam}` +
      `?latitude=${lat}&longitude=${lng}&method=${method}`;

    const response = await fetch(url);
    if (!response.ok) return null;

    const json = await response.json();
    const data = json?.data;
    const timings = data?.timings;
    if (!timings) return null;

    return {
      fajr: String(timings.Fajr),
      sunrise: String(timings.Sunrise),
      dhuhr: String(timings.Dhuhr),
      asr: String(timings.Asr),
      maghrib: String(timings.Maghrib),
      isha: String(timings.Isha),
    };
  } catch (error) {
    console.error("Error fetching prayer times for date:", error);
    return null;
  }
}

function toGregorianKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

export async function initializePrayerTimes(): Promise<{
  times: PrayerTimes;
  lastThirdTime: string;
  date: DateInfo | null;
  locationLabel: string;
  location: { latitude: number; longitude: number } | null;
}> {
  const hasPermission = await requestLocationPermission();

  if (!hasPermission) {
    return {
      times: FALLBACK_TIMES,
      lastThirdTime: FALLBACK_LAST_THIRD,
      date: null,
      locationLabel: "الموقع غير متاح",
      location: null,
    };
  }

  const location = await getCurrentLocation();

  if (!location) {
    return {
      times: FALLBACK_TIMES,
      lastThirdTime: FALLBACK_LAST_THIRD,
      date: null,
      locationLabel: "الموقع غير متاح",
      location: null,
    };
  }

  const locationLabel =
    (await getLocationLabel(location.latitude, location.longitude)) ?? "الموقع غير متاح";

  const result = await fetchPrayerTimes(location.latitude, location.longitude);

  if (!result) {
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

