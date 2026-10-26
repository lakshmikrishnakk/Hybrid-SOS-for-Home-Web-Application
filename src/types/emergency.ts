export type LocationSource = "REAL_GPS" | "WEB_GEOLOCATION" | "DEMO_FALLBACK";

export interface LocationCoords {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number | null;
  heading?: number | null;
  speed?: number | null;
  address?: string;
  isSimulated: boolean;
  source: LocationSource;
  googleMapsUrl?: string;
  timestamp?: number;
  error?: string | null;
  permissionStatus?: "granted" | "denied" | "undetermined";
}

export interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  status: "Notified" | "Pending" | "Ready";
}

export interface SocialWorker {
  id: string;
  name: string;
  badgeNumber: string;
  agency: string;
  phone: string;
  status: "Assigned" | "En Route" | "On Standby" | "Available" | "Off Duty" | string;
  eta?: string;
  currentEta?: string;
  isDemo?: boolean;
  isVerified?: boolean;
}

export interface EmergencyEvent {
  id: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  timestamp: string;
  dateStr: string;
  status: "ACTIVE_DISPATCH" | "RESOLVED";
  location: string;
  latitude?: number;
  longitude?: number;
  notifiedContacts: string[];
  assignedWorker: string;
  notes?: string;
  isSimulatedLocation?: boolean;
  googleMapsUrl?: string;
}
