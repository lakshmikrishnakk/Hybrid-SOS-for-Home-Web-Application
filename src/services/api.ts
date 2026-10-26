/**
 * src/services/api.ts
 *
 * Centralized API client for the Hybrid SOS frontend application.
 *
 * Configured to connect Expo Go on physical Android devices, emulators,
 * and web development environments to the Express backend.
 */

import Constants from "expo-constants";
import { Platform } from "react-native";
import { LoginCredentials, RegisterFormData, UserProfile } from "@/types/auth";
import { EmergencyContact, SocialWorker } from "@/types/emergency";

/**
 * Dynamically resolves the API base URL based on runtime environment.
 * - Web: uses the current host or localhost
 * - Expo Go (Android phone/emulator): extracts machine IP from Expo hostUri
 * - Fallback: computer's LAN IP (192.168.1.43:5000)
 */
export function getApiBaseUrl(): string {
  // 1. Explicit environment variable override if specified
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/+$/, "");
  }

  // 2. Web browser: localhost/current hostname is direct and reliable
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window.location?.hostname) {
      return `http://${window.location.hostname}:5000`;
    }
    return "http://localhost:5000";
  }

  // 3. Expo Go on Android / iOS device: discover host IP from debugger connection
  const hostUri =
    Constants.expoConfig?.hostUri ||
    // @ts-ignore legacy manifest fallback
    Constants.manifest?.debuggerHost ||
    // @ts-ignore manifest2 fallback
    Constants.manifest2?.extra?.expoGo?.debuggerHost;

  if (hostUri) {
    const host = hostUri.split(":")[0];
    if (host && host !== "localhost" && host !== "127.0.0.1") {
      return `http://${host}:5000`;
    }
  }

  // 4. Fallback for physical phone on the same Wi-Fi LAN
  return "http://192.168.1.43:5000";
}

export interface AuthApiResponse {
  success: boolean;
  message?: string;
  token?: string;
  user?: UserProfile;
  error?: string;
}

/**
 * Log in to the Express backend via POST /api/auth/login
 */
export async function apiLogin(credentials: LoginCredentials): Promise<AuthApiResponse> {
  const baseUrl = getApiBaseUrl();
  try {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: credentials.email.trim().toLowerCase(),
        password: credentials.password,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        success: false,
        error: data.message || `Login failed with HTTP status ${response.status}`,
      };
    }

    if (!data.token || !data.user) {
      return {
        success: false,
        error: "Server response was missing required authentication data.",
      };
    }

    return {
      success: true,
      token: data.token,
      user: data.user,
      message: data.message,
    };
  } catch (err: any) {
    const isNetworkError =
      err?.message?.includes("Network request failed") || err?.name === "TypeError";

    return {
      success: false,
      error: isNetworkError
        ? `Cannot reach backend at ${baseUrl}. Ensure Express is running on port 5000 and your phone is connected to the same Wi-Fi network.`
        : err?.message || "An unexpected error occurred during login.",
    };
  }
}

/**
 * Register a new user via POST /api/auth/register
 */
export async function apiRegister(formData: RegisterFormData): Promise<AuthApiResponse> {
  const baseUrl = getApiBaseUrl();
  try {
    const response = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fullName: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        phoneNumber: formData.phoneNumber.trim(),
        password: formData.password,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        success: false,
        error: data.message || `Registration failed with HTTP status ${response.status}`,
      };
    }

    if (!data.token || !data.user) {
      return {
        success: false,
        error: "Server response was missing required user or token data.",
      };
    }

    return {
      success: true,
      token: data.token,
      user: data.user,
      message: data.message,
    };
  } catch (err: any) {
    const isNetworkError =
      err?.message?.includes("Network request failed") || err?.name === "TypeError";

    return {
      success: false,
      error: isNetworkError
        ? `Cannot reach backend at ${baseUrl}. Ensure Express is running on port 5000 and your phone is connected to the same Wi-Fi network.`
        : err?.message || "An unexpected error occurred during registration.",
    };
  }
}

export interface ContactsApiResponse {
  success: boolean;
  contacts?: EmergencyContact[];
  contact?: EmergencyContact;
  count?: number;
  message?: string;
  error?: string;
}

/**
 * Fetch all registered emergency contacts for the authenticated user
 * Route: GET /api/contacts
 */
export async function apiGetContacts(token: string): Promise<ContactsApiResponse> {
  const baseUrl = getApiBaseUrl();
  try {
    const response = await fetch(`${baseUrl}/api/contacts`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        success: false,
        error: data.message || `Failed to fetch contacts (HTTP ${response.status})`,
      };
    }

    return {
      success: true,
      contacts: Array.isArray(data.contacts) ? data.contacts : [],
      count: data.count || 0,
    };
  } catch (err: any) {
    const isNetworkError =
      err?.message?.includes("Network request failed") || err?.name === "TypeError";

    return {
      success: false,
      error: isNetworkError
        ? `Cannot reach backend at ${baseUrl}. Ensure Express is running on port 5000 and your phone is on Wi-Fi.`
        : err?.message || "Error fetching emergency contacts.",
    };
  }
}

/**
 * Register a new emergency contact for the authenticated user
 * Route: POST /api/contacts
 */
export async function apiAddContact(
  token: string,
  contactData: { name: string; relationship: string; phone: string }
): Promise<ContactsApiResponse> {
  const baseUrl = getApiBaseUrl();
  try {
    const response = await fetch(`${baseUrl}/api/contacts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: contactData.name.trim(),
        relationship: contactData.relationship.trim(),
        phone: contactData.phone.trim(),
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        success: false,
        error: data.message || `Failed to add contact (HTTP ${response.status})`,
      };
    }

    return {
      success: true,
      contact: data.contact,
      message: data.message || "Emergency contact added successfully.",
    };
  } catch (err: any) {
    const isNetworkError =
      err?.message?.includes("Network request failed") || err?.name === "TypeError";

    return {
      success: false,
      error: isNetworkError
        ? `Cannot reach backend at ${baseUrl}. Ensure Express is running on port 5000 and your phone is on Wi-Fi.`
        : err?.message || "Error adding emergency contact.",
    };
  }
}

/**
 * Delete an emergency contact by ID for the authenticated user
 * Route: DELETE /api/contacts/:id
 */
export async function apiDeleteContact(
  token: string,
  contactId: string
): Promise<ContactsApiResponse> {
  const baseUrl = getApiBaseUrl();
  try {
    const response = await fetch(`${baseUrl}/api/contacts/${contactId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        success: false,
        error: data.message || `Failed to delete contact (HTTP ${response.status})`,
      };
    }

    return {
      success: true,
      message: data.message || "Emergency contact deleted successfully.",
    };
  } catch (err: any) {
    const isNetworkError =
      err?.message?.includes("Network request failed") || err?.name === "TypeError";

    return {
      success: false,
      error: isNetworkError
        ? `Cannot reach backend at ${baseUrl}. Ensure Express is running on port 5000 and your phone is on Wi-Fi.`
        : err?.message || "Error deleting emergency contact.",
    };
  }
}

export interface WorkersApiResponse {
  success: boolean;
  workers?: SocialWorker[];
  worker?: SocialWorker;
  count?: number;
  message?: string;
  error?: string;
}

/**
 * Fetch all registered social workers
 * Route: GET /api/workers
 */
export async function apiGetWorkers(): Promise<WorkersApiResponse> {
  const baseUrl = getApiBaseUrl();
  try {
    const response = await fetch(`${baseUrl}/api/workers`, {
      method: "GET",
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        success: false,
        error: data.message || `Failed to fetch social workers (HTTP ${response.status})`,
      };
    }

    const rawWorkers = Array.isArray(data.workers) ? data.workers : [];
    const normalizedWorkers: SocialWorker[] = rawWorkers.map((w: any) => ({
      id: w._id || w.id || w.badgeNumber || String(Math.random()),
      name: w.name || "Unknown Worker",
      badgeNumber: w.badgeNumber || "N/A",
      agency: w.agency || "Hybrid SOS Demo Responder Unit",
      phone: w.phone || "",
      status: w.status || "Available",
      eta: w.currentEta || w.eta || "5 mins",
      currentEta: w.currentEta || w.eta || "5 mins",
      isDemo: w.isDemo !== undefined ? w.isDemo : true,
      isVerified: w.isVerified !== undefined ? w.isVerified : false,
    }));

    return {
      success: true,
      workers: normalizedWorkers,
      count: normalizedWorkers.length,
    };
  } catch (err: any) {
    const isNetworkError =
      err?.message?.includes("Network request failed") || err?.name === "TypeError";

    return {
      success: false,
      error: isNetworkError
        ? `Cannot reach backend at ${baseUrl}. Ensure Express is running on port 5000 and your phone is on Wi-Fi.`
        : err?.message || "Error fetching social workers.",
    };
  }
}

/**
 * Register a new Demo Social Worker
 * Route: POST /api/workers (protected by JWT token)
 */
export async function apiRegisterWorker(
  token: string,
  workerData: {
    name: string;
    phone: string;
    badgeNumber: string;
    agency?: string;
    currentEta?: string;
  }
): Promise<WorkersApiResponse> {
  const baseUrl = getApiBaseUrl();
  try {
    const response = await fetch(`${baseUrl}/api/workers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: workerData.name.trim(),
        phone: workerData.phone.trim(),
        badgeNumber: workerData.badgeNumber.trim(),
        agency: workerData.agency?.trim() || "Hybrid SOS Demo Responder Unit",
        currentEta: workerData.currentEta?.trim() || "5 mins",
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        success: false,
        error: data.message || `Failed to register demo social worker (HTTP ${response.status})`,
      };
    }

    const rawWorker = data.worker;
    const normalizedWorker: SocialWorker | undefined = rawWorker
      ? {
          id: rawWorker._id || rawWorker.id || rawWorker.badgeNumber,
          name: rawWorker.name,
          badgeNumber: rawWorker.badgeNumber,
          agency: rawWorker.agency,
          phone: rawWorker.phone,
          status: rawWorker.status || "Available",
          eta: rawWorker.currentEta || rawWorker.eta || "5 mins",
          currentEta: rawWorker.currentEta || rawWorker.eta || "5 mins",
          isDemo: rawWorker.isDemo !== undefined ? rawWorker.isDemo : true,
          isVerified: rawWorker.isVerified !== undefined ? rawWorker.isVerified : false,
        }
      : undefined;

    return {
      success: true,
      worker: normalizedWorker,
      message: data.message || "Demo social worker registered successfully.",
    };
  } catch (err: any) {
    const isNetworkError =
      err?.message?.includes("Network request failed") || err?.name === "TypeError";

    return {
      success: false,
      error: isNetworkError
        ? `Cannot reach backend at ${baseUrl}. Ensure Express is running on port 5000 and your phone is on Wi-Fi.`
        : err?.message || "Error registering demo social worker.",
    };
  }
}

/**
 * Delete an unverified Demo Social Worker by ID
 * Route: DELETE /api/workers/:id
 */
export async function apiDeleteWorker(
  token: string,
  workerId: string
): Promise<WorkersApiResponse> {
  const baseUrl = getApiBaseUrl();
  try {
    const response = await fetch(`${baseUrl}/api/workers/${workerId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        success: false,
        error: data.message || `Failed to delete demo social worker (HTTP ${response.status})`,
      };
    }

    return {
      success: true,
      message: data.message || "Demo social worker deleted successfully.",
    };
  } catch (err: any) {
    const isNetworkError =
      err?.message?.includes("Network request failed") || err?.name === "TypeError";

    return {
      success: false,
      error: isNetworkError
        ? `Cannot reach backend at ${baseUrl}. Ensure Express is running on port 5000 and your phone is on Wi-Fi.`
        : err?.message || "Error deleting demo social worker.",
    };
  }
}

