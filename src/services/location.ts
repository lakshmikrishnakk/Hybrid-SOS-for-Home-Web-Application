/**
 * src/services/location.ts
 *
 * Real GPS Geolocation Service for Hybrid SOS.
 * Powered by expo-location (Expo SDK 57 compatible).
 *
 * Handles native Android and Web foreground permissions, real device GPS polling,
 * timeouts, permission denial, and strict separation between real GPS and demo coordinates.
 */

import * as Location from "expo-location";
import { Platform } from "react-native";
import { LocationCoords } from "@/types/emergency";

/**
 * Standard Demo / Academic Simulation coordinates.
 * NEVER labeled or transmitted as real GPS.
 */
export const DEMO_FALLBACK_COORDS = {
  latitude: 12.9716,
  longitude: 77.5946,
  accuracy: 15,
};

/**
 * Formats latitude and longitude with correct directional hemisphere letters (N/S, E/W).
 */
export function formatCoordinates(lat: number, lng: number): string {
  const latDir = lat >= 0 ? "N" : "S";
  const lngDir = lng >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lng).toFixed(4)}° ${lngDir}`;
}

/**
 * Generates an authentic, clickable Google Maps link.
 * Only call this for real or explicitly requested coordinates.
 */
export function generateGoogleMapsUrl(lat: number, lng: number): string {
  return `https://maps.google.com/?q=${lat.toFixed(5)},${lng.toFixed(5)}`;
}

/**
 * Checks whether device location hardware services (GPS toggle) are active.
 */
export async function isDeviceLocationEnabled(): Promise<boolean> {
  if (Platform.OS === "web") {
    return typeof navigator !== "undefined" && !!navigator.geolocation;
  }
  try {
    return await Location.hasServicesEnabledAsync();
  } catch {
    return true; // Default to true if check is unsupported
  }
}

/**
 * Requests foreground location permission from the device OS.
 */
export async function requestLocationPermissions(): Promise<Location.LocationPermissionResponse> {
  try {
    const current = await Location.getForegroundPermissionsAsync();
    if (current.status === "granted") {
      return current;
    }
    return await Location.requestForegroundPermissionsAsync();
  } catch (err: any) {
    return {
      status: Location.PermissionStatus.DENIED,
      granted: false,
      canAskAgain: false,
      expires: "never",
    };
  }
}

export interface FetchLocationResult {
  coords: LocationCoords;
  isRealGps: boolean;
  error?: string | null;
}

/**
 * Retrieves the genuine device GPS location.
 *
 * Safety guarantees:
 * - Never claims demo coordinates are real GPS.
 * - Produces a googleMapsUrl ONLY when genuine GPS coordinates are obtained.
 * - Safely handles permission denial, disabled GPS, and location timeouts.
 */
export async function fetchDeviceLocation(timeoutMs: number = 8000): Promise<FetchLocationResult> {
  const timestamp = Date.now();

  // 1. Check if device location hardware toggle is turned on
  const isEnabled = await isDeviceLocationEnabled();
  if (!isEnabled) {
    return {
      coords: {
        latitude: DEMO_FALLBACK_COORDS.latitude,
        longitude: DEMO_FALLBACK_COORDS.longitude,
        accuracy: DEMO_FALLBACK_COORDS.accuracy,
        address: `${formatCoordinates(DEMO_FALLBACK_COORDS.latitude, DEMO_FALLBACK_COORDS.longitude)} (Simulation Fallback - GPS Disabled)`,
        isSimulated: true,
        source: "DEMO_FALLBACK",
        timestamp,
        error: "Location services are turned off on this device. Please turn on GPS in device settings.",
        permissionStatus: "undetermined",
      },
      isRealGps: false,
      error: "Device GPS is disabled.",
    };
  }

  // 2. Request / verify foreground location permissions
  const permResponse = await requestLocationPermissions();
  if (permResponse.status !== "granted") {
    return {
      coords: {
        latitude: DEMO_FALLBACK_COORDS.latitude,
        longitude: DEMO_FALLBACK_COORDS.longitude,
        accuracy: DEMO_FALLBACK_COORDS.accuracy,
        address: `${formatCoordinates(DEMO_FALLBACK_COORDS.latitude, DEMO_FALLBACK_COORDS.longitude)} (Simulation Fallback - Permission Denied)`,
        isSimulated: true,
        source: "DEMO_FALLBACK",
        timestamp,
        error: "Location permission denied. Please allow location access in your device settings.",
        permissionStatus: "denied",
      },
      isRealGps: false,
      error: "Location permission was denied by user.",
    };
  }

  // 3. Acquire real hardware GPS fix with timeout protection
  try {
    const positionPromise = Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Location request timed out after " + timeoutMs / 1000 + "s")), timeoutMs)
    );

    // Race against timeout
    const position = await Promise.race([positionPromise, timeoutPromise]);

    const { latitude, longitude, accuracy, altitude, heading, speed } = position.coords;
    const cleanLat = Number(latitude.toFixed(5));
    const cleanLng = Number(longitude.toFixed(5));
    const cleanAccuracy = accuracy ? Math.round(accuracy) : 10;
    const formattedCoords = formatCoordinates(cleanLat, cleanLng);

    // Attempt reverse geocoding for a user-friendly street address if possible
    let addressTag = `${formattedCoords} (Live Device GPS)`;
    try {
      const reverse = await Location.reverseGeocodeAsync({
        latitude: cleanLat,
        longitude: cleanLng,
      });

      if (reverse && reverse.length > 0) {
        const place = reverse[0];
        const parts = [
          place.name || place.street,
          place.district || place.subregion,
          place.city,
          place.region,
        ].filter(Boolean);

        if (parts.length > 0) {
          addressTag = `${parts.join(", ")} (${formattedCoords})`;
        }
      }
    } catch {
      // If reverse geocoding is unavailable or offline, keep formatted coordinates
    }

    const realGpsCoords: LocationCoords = {
      latitude: cleanLat,
      longitude: cleanLng,
      accuracy: cleanAccuracy,
      altitude: typeof altitude === "number" ? Number(altitude.toFixed(1)) : null,
      heading: typeof heading === "number" ? Number(heading.toFixed(1)) : null,
      speed: typeof speed === "number" ? Number(speed.toFixed(1)) : null,
      address: addressTag,
      isSimulated: false,
      source: Platform.OS === "web" ? "WEB_GEOLOCATION" : "REAL_GPS",
      googleMapsUrl: generateGoogleMapsUrl(cleanLat, cleanLng),
      timestamp: position.timestamp || timestamp,
      error: null,
      permissionStatus: "granted",
    };

    return {
      coords: realGpsCoords,
      isRealGps: true,
      error: null,
    };
  } catch (err: any) {
    // If real GPS times out or fails, try to retrieve last known position as an alternative real fix
    try {
      const lastKnown = await Location.getLastKnownPositionAsync({});
      if (lastKnown) {
        const { latitude, longitude, accuracy } = lastKnown.coords;
        const cleanLat = Number(latitude.toFixed(5));
        const cleanLng = Number(longitude.toFixed(5));
        const formattedCoords = formatCoordinates(cleanLat, cleanLng);

        return {
          coords: {
            latitude: cleanLat,
            longitude: cleanLng,
            accuracy: accuracy ? Math.round(accuracy) : 25,
            address: `${formattedCoords} (Last Known Device GPS)`,
            isSimulated: false,
            source: Platform.OS === "web" ? "WEB_GEOLOCATION" : "REAL_GPS",
            googleMapsUrl: generateGoogleMapsUrl(cleanLat, cleanLng),
            timestamp: lastKnown.timestamp || timestamp,
            error: null,
            permissionStatus: "granted",
          },
          isRealGps: true,
          error: null,
        };
      }
    } catch {
      // Ignore fallback error
    }

    // 4. Return explicitly labeled simulation fallback if hardware GPS could not be resolved
    return {
      coords: {
        latitude: DEMO_FALLBACK_COORDS.latitude,
        longitude: DEMO_FALLBACK_COORDS.longitude,
        accuracy: DEMO_FALLBACK_COORDS.accuracy,
        address: `${formatCoordinates(DEMO_FALLBACK_COORDS.latitude, DEMO_FALLBACK_COORDS.longitude)} (Simulation Fallback - GPS Unavailable)`,
        isSimulated: true,
        source: "DEMO_FALLBACK",
        timestamp,
        error: err?.message || "GPS fix could not be acquired within timeout period.",
        permissionStatus: "granted",
      },
      isRealGps: false,
      error: err?.message || "GPS fix timed out.",
    };
  }
}
