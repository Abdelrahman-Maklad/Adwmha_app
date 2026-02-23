// services/prayerTimes.ts
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
}

// Fallback times (used when location/API fails)
export const FALLBACK_TIMES: PrayerTimes = {
  fajr: "05:01",
  sunrise: "06:28",
  dhuhr: "12:03",
  asr: "15:24",
  maghrib: "17:56",
  isha: "19:25",
};

// Fallback last third of night time
export const FALLBACK_LAST_THIRD = "03:30";

/**
 * Request location permission from the user
 */
export async function requestLocationPermission(): Promise<boolean> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === "granted";
  } catch (error) {
    console.error("Error requesting location permission:", error);
    return false;
  }
}

/**
 * Get the user's current location coordinates
 */
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

/**
 * Fetch prayer times from Aladhan API
 * @param lat - Latitude
 * @param lng - Longitude
 * @param method - Calculation method (5 = Egyptian General Authority of Survey)
 */
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
    };
  } catch (error) {
    console.error("Error fetching prayer times:", error);
    return null;
  }
}

/**
 * Initialize prayer times - request permission, get location, fetch times
 * Returns prayer times and date info, or fallback if anything fails
 */
export async function initializePrayerTimes(): Promise<{
  times: PrayerTimes;
  lastThirdTime: string;
  date: DateInfo | null;
}> {
  // Try to get location permission
  const hasPermission = await requestLocationPermission();

  if (!hasPermission) {
    console.log("Location permission denied, using fallback times");
    return {
      times: FALLBACK_TIMES,
      lastThirdTime: FALLBACK_LAST_THIRD,
      date: null,
    };
  }

  // Try to get current location
  const location = await getCurrentLocation();

  if (!location) {
    console.log("Could not get location, using fallback times");
    return {
      times: FALLBACK_TIMES,
      lastThirdTime: FALLBACK_LAST_THIRD,
      date: null,
    };
  }

  // Try to fetch prayer times from API
  const result = await fetchPrayerTimes(location.latitude, location.longitude);

  if (!result) {
    console.log("Could not fetch prayer times, using fallback times");
    return {
      times: FALLBACK_TIMES,
      lastThirdTime: FALLBACK_LAST_THIRD,
      date: null,
    };
  }

  // Calculate last third of night time (roughly 1/3 of time between Isha and Fajr)
  const lastThirdTime = calculateLastThird(
    result.timings.isha,
    result.timings.fajr
  );

  return {
    times: result.timings,
    lastThirdTime,
    date: result.date,
  };
}

/**
 * Calculate the last third of the night
 * (approximately 1/3 of the time between Isha and Fajr, before Fajr)
 */
function calculateLastThird(isha: string, fajr: string): string {
  try {
    const ishaMinutes = timeToMinutes(isha);
    const fajrMinutes = timeToMinutes(fajr);

    // Handle day crossover (Isha after midnight, Fajr next day)
    const nightDuration =
      fajrMinutes > ishaMinutes
        ? fajrMinutes - ishaMinutes
        : 24 * 60 - ishaMinutes + fajrMinutes;

    // Last third starts 2/3 into the night
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