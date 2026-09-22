export interface LocationCoords {
  latitude: number;
  longitude: number;
  accuracy?: number;
  address?: string;
  isSimulated?: boolean;
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
  status: "Assigned" | "En Route" | "On Standby";
  eta?: string;
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
}
