import React, { useState, useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/auth-context";
import { EmergencyContact, EmergencyEvent, LocationCoords, SocialWorker } from "@/types/emergency";
import {
  apiGetContacts,
  apiAddContact,
  apiDeleteContact,
  apiGetWorkers,
  apiRegisterWorker,
  apiDeleteWorker,
  apiTriggerSOS,
  apiGetAlertHistory,
  apiResolveSOS,
  TriggerSosPayload,
} from "@/services/api";
import { fetchDeviceLocation, formatCoordinates } from "@/services/location";

type ModalType =
  | "NONE"
  | "CONFIRM_SOS"
  | "SOS_SUCCESS"
  | "LOCATION"
  | "CONTACTS"
  | "SOCIAL_WORKER"
  | "HISTORY"
  | "PROFILE";

const INITIAL_CONTACTS: EmergencyContact[] = [];

const INITIAL_WORKER: SocialWorker = {
  id: "sw-1",
  name: "Sarah Jenkins, LCSW",
  badgeNumber: "SW-4821",
  agency: "Metropolitan Crisis & Emergency Social Care",
  phone: "+1 (555) 789-0123",
  status: "Assigned",
};

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout, token } = useAuth();

  const [modalType, setModalType] = useState<ModalType>("NONE");
  const [isSosActive, setIsSosActive] = useState<boolean>(false);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [currentLocation, setCurrentLocation] = useState<LocationCoords | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [activeEvent, setActiveEvent] = useState<EmergencyEvent | null>(null);
  const [isTriggeringSos, setIsTriggeringSos] = useState<boolean>(false);
  const [isResolvingSos, setIsResolvingSos] = useState<boolean>(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [sosError, setSosError] = useState<string | null>(null);

  const [contacts, setContacts] = useState<EmergencyContact[]>(INITIAL_CONTACTS);
  const [socialWorker, setSocialWorker] = useState<SocialWorker>(INITIAL_WORKER);
  const [workers, setWorkers] = useState<SocialWorker[]>([]);
  const [isLoadingWorkers, setIsLoadingWorkers] = useState<boolean>(false);
  const [isSavingWorker, setIsSavingWorker] = useState<boolean>(false);
  const [workerSuccess, setWorkerSuccess] = useState<string | null>(null);
  const [workerError, setWorkerError] = useState<string | null>(null);
  const [deletingWorkerId, setDeletingWorkerId] = useState<string | null>(null);

  // New demo social worker form fields
  const [newWorkerName, setNewWorkerName] = useState<string>("");
  const [newWorkerPhone, setNewWorkerPhone] = useState<string>("");
  const [newWorkerBadge, setNewWorkerBadge] = useState<string>("");
  const [newWorkerAgency, setNewWorkerAgency] = useState<string>("");

  // Emergency contacts state & handlers
  const [isLoadingContacts, setIsLoadingContacts] = useState<boolean>(false);
  const [isSavingContact, setIsSavingContact] = useState<boolean>(false);
  const [deletingContactId, setDeletingContactId] = useState<string | null>(null);
  const [contactSuccess, setContactSuccess] = useState<string | null>(null);
  const [contactError, setContactError] = useState<string | null>(null);

  // New contact form fields
  const [newName, setNewName] = useState<string>("");
  const [newRelationship, setNewRelationship] = useState<string>("");
  const [newPhone, setNewPhone] = useState<string>("");

  const loadContacts = async () => {
    if (!token) return;
    setIsLoadingContacts(true);
    try {
      const res = await apiGetContacts(token);
      if (res.success && res.contacts) {
        setContacts(res.contacts);
      } else if (res.error) {
        setContactError(res.error);
      }
    } catch (err: any) {
      setContactError(err?.message || "Failed to load emergency contacts.");
    } finally {
      setIsLoadingContacts(false);
    }
  };

  const loadWorkers = async () => {
    setIsLoadingWorkers(true);
    try {
      const res = await apiGetWorkers();
      if (res.success && res.workers) {
        setWorkers(res.workers);
        if (res.workers.length > 0) {
          // If the assigned worker is default or not found, update to first available worker
          setSocialWorker((prev) => {
            const found = res.workers!.find(
              (w) => w.id === prev.id || w.badgeNumber === prev.badgeNumber
            );
            return found || res.workers![0];
          });
        }
      } else if (res.error) {
        setWorkerError(res.error);
      }
    } catch (err: any) {
      setWorkerError(err?.message || "Failed to load social workers.");
    } finally {
      setIsLoadingWorkers(false);
    }
  };

  const loadAlertHistory = async () => {
    if (!token) return;
    setIsLoadingHistory(true);
    try {
      const res = await apiGetAlertHistory(token);
      if (res.success && Array.isArray(res.alerts)) {
        const mapped: EmergencyEvent[] = res.alerts.map((a: any) => {
          const created = new Date(a.createdAt || Date.now());
          const timeFormatted = created.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          });
          const dateFormatted = created.toLocaleDateString([], {
            month: "short",
            day: "numeric",
            year: "numeric",
          });
          const isSim = Boolean(a.isSimulatedLocation || a.location?.isSimulated);
          const rawContacts = Array.isArray(a.notifiedContacts) ? a.notifiedContacts : [];
          const contactLabels =
            rawContacts.length > 0
              ? rawContacts.map(
                  (c: any) =>
                    `${c.name} (${c.relationship || "Contact"}) - Registered (Pending SMS)`
                )
              : ["No emergency contacts configured"];

          return {
            id: a.alertId || a._id,
            userName: a.userName || user?.fullName || "Active Citizen",
            userEmail: a.userEmail || user?.email || "",
            userPhone: a.userPhone || user?.phoneNumber || "",
            timestamp: `${timeFormatted}, ${dateFormatted}`,
            dateStr: a.status === "ACTIVE_DISPATCH" ? "Active Now" : "Resolved",
            status: (a.status as "ACTIVE_DISPATCH" | "RESOLVED") || "RESOLVED",
            location:
              a.location?.address ||
              `${a.location?.latitude}° N, ${a.location?.longitude}° E`,
            latitude: a.location?.latitude,
            longitude: a.location?.longitude,
            notifiedContacts: contactLabels,
            assignedWorker: a.assignedWorker
              ? `${a.assignedWorker.name} (${a.assignedWorker.badgeNumber || "Responder"})`
              : "Metropolitan Crisis Care",
            notes: a.notes,
            isSimulatedLocation: isSim,
            googleMapsUrl: !isSim ? a.googleMapsUrl || a.location?.googleMapsUrl : undefined,
          };
        });

        setEmergencyHistory(mapped);

        // Restore active dispatch if one is active in database
        const active = res.alerts.find((a: any) => a.status === "ACTIVE_DISPATCH");
        if (active) {
          const activeMapped = mapped.find((m) => m.id === active.alertId || m.id === active._id);
          if (activeMapped) {
            setActiveEvent(activeMapped);
            setIsSosActive(true);
            if (active.assignedWorker) {
              setSocialWorker((prev) => ({
                ...prev,
                name: active.assignedWorker.name,
                badgeNumber: active.assignedWorker.badgeNumber || prev.badgeNumber,
                phone: active.assignedWorker.phone || prev.phone,
                status: "En Route",
                eta: active.assignedWorker.eta || "7 mins",
              }));
            }
          }
        }
      }
    } catch (err: any) {
      console.error("Failed to load emergency history:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadWorkers();
  }, []);

  useEffect(() => {
    if (token) {
      loadContacts();
      loadWorkers();
      loadAlertHistory();
    }
  }, [token]);

  const validateNewContact = (): string | null => {
    const trimmedName = newName.trim();
    if (!trimmedName) {
      return "Contact name is required.";
    }
    if (trimmedName.length < 2) {
      return "Contact name must be at least 2 characters.";
    }

    const trimmedRel = newRelationship.trim();
    if (!trimmedRel) {
      return "Relationship is required.";
    }
    if (trimmedRel.length < 2) {
      return "Relationship must be at least 2 characters.";
    }

    const trimmedPhone = newPhone.trim();
    if (!trimmedPhone) {
      return "Phone number is required.";
    }

    const cleanedPhone = trimmedPhone.replace(/[\s\-\(\)\.]/g, "");
    if (cleanedPhone.length < 10) {
      return "Phone number must have at least 10 digits.";
    }

    // Support Indian mobile numbers (10 digits, +91) and international formats (up to 15 digits)
    const phoneRegex = /^\+?[0-9]{10,15}$/;
    if (!phoneRegex.test(cleanedPhone)) {
      return "Please enter a valid phone number (e.g. 9876543210 or +91 98765 43210).";
    }

    return null;
  };

  const handleAddContact = async () => {
    setContactError(null);
    setContactSuccess(null);

    const validationError = validateNewContact();
    if (validationError) {
      setContactError(validationError);
      return;
    }

    if (!token) {
      setContactError("Session expired. Please sign in again.");
      return;
    }

    setIsSavingContact(true);
    try {
      const res = await apiAddContact(token, {
        name: newName.trim(),
        relationship: newRelationship.trim(),
        phone: newPhone.trim(),
      });

      if (res.success && res.contact) {
        setNewName("");
        setNewRelationship("");
        setNewPhone("");
        setContactSuccess(`✓ "${res.contact.name}" added to emergency contacts.`);
        setContacts((prev) => [res.contact!, ...prev.filter((c) => c.id !== res.contact!.id)]);
      } else {
        setContactError(res.error || "Failed to add emergency contact.");
      }
    } catch (err: any) {
      setContactError(err?.message || "An unexpected error occurred while adding contact.");
    } finally {
      setIsSavingContact(false);
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!token) {
      setContactError("Session expired. Please sign in again.");
      return;
    }

    setContactError(null);
    setContactSuccess(null);
    setDeletingContactId(contactId);

    try {
      const res = await apiDeleteContact(token, contactId);
      if (res.success) {
        setContacts((prev) => prev.filter((c) => c.id !== contactId));
        setContactSuccess("✓ Emergency contact removed successfully.");
      } else {
        setContactError(res.error || "Failed to delete emergency contact.");
      }
    } catch (err: any) {
      setContactError(err?.message || "Error deleting emergency contact.");
    } finally {
      setDeletingContactId(null);
    }
  };

  const confirmDeleteContact = (contact: EmergencyContact) => {
    if (Platform.OS === "web") {
      if (
        typeof window !== "undefined" &&
        window.confirm(
          `Are you sure you want to delete emergency contact "${contact.name}"?`
        )
      ) {
        handleDeleteContact(contact.id);
      }
    } else {
      Alert.alert(
        "Delete Emergency Contact",
        `Are you sure you want to delete "${contact.name}"?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => handleDeleteContact(contact.id),
          },
        ]
      );
    }
  };

  const validateNewWorker = (): string | null => {
    const trimmedName = newWorkerName.trim();
    if (!trimmedName) {
      return "Responder full name is required.";
    }
    if (trimmedName.length < 2) {
      return "Responder full name must be at least 2 characters.";
    }

    const trimmedPhone = newWorkerPhone.trim();
    if (!trimmedPhone) {
      return "Direct mobile number is required.";
    }
    const cleanedPhone = trimmedPhone.replace(/[\s\-\(\)\.]/g, "");
    if (cleanedPhone.length < 10) {
      return "Mobile number must have at least 10 digits.";
    }
    // Support Indian mobile numbers (10 digits, +91) and international formats (up to 15 digits)
    const phoneRegex = /^\+?[0-9]{10,15}$/;
    if (!phoneRegex.test(cleanedPhone)) {
      return "Please enter a valid phone number (e.g. 9876543210 or +91 98765 43210).";
    }

    const trimmedBadge = newWorkerBadge.trim();
    if (!trimmedBadge) {
      return "Badge number is required (e.g. SW-501 or DEMO-01).";
    }
    if (trimmedBadge.length < 2) {
      return "Badge number must be at least 2 characters.";
    }

    return null;
  };

  const handleRegisterWorker = async () => {
    setWorkerError(null);
    setWorkerSuccess(null);

    const validationError = validateNewWorker();
    if (validationError) {
      setWorkerError(validationError);
      return;
    }

    if (!token) {
      setWorkerError("Authentication required. Please sign in to register a demo worker.");
      return;
    }

    setIsSavingWorker(true);
    try {
      const res = await apiRegisterWorker(token, {
        name: newWorkerName,
        phone: newWorkerPhone,
        badgeNumber: newWorkerBadge.toUpperCase(),
        agency: newWorkerAgency.trim() || "Hybrid SOS Demo Responder Unit",
      });

      if (res.success) {
        setWorkerSuccess(
          `Demo Social Worker "${newWorkerName.trim()}" registered successfully! (Simulation only)`
        );
        setNewWorkerName("");
        setNewWorkerPhone("");
        setNewWorkerBadge("");
        setNewWorkerAgency("");
        await loadWorkers();
      } else {
        setWorkerError(res.error || "Failed to register demo social worker.");
      }
    } catch (err: any) {
      setWorkerError(err?.message || "An unexpected error occurred while registering.");
    } finally {
      setIsSavingWorker(false);
    }
  };

  const handleDeleteWorker = async (workerId: string, workerName: string) => {
    if (!token) {
      setWorkerError("Authentication required. Please sign in to delete a demo worker.");
      return;
    }

    setWorkerError(null);
    setWorkerSuccess(null);
    setDeletingWorkerId(workerId);

    try {
      const res = await apiDeleteWorker(token, workerId);
      if (res.success) {
        setWorkers((prev) => prev.filter((w) => w.id !== workerId));
        setWorkerSuccess(`Demo Social Worker "${workerName}" deleted successfully.`);
        // Reassign active socialWorker if the deleted worker was currently selected
        setSocialWorker((prev) => {
          if (prev.id === workerId) {
            const remaining = workers.filter((w) => w.id !== workerId);
            return remaining.length > 0 ? remaining[0] : INITIAL_WORKER;
          }
          return prev;
        });
      } else {
        setWorkerError(res.error || "Failed to delete demo social worker.");
      }
    } catch (err: any) {
      setWorkerError(err?.message || "Error deleting demo social worker.");
    } finally {
      setDeletingWorkerId(null);
    }
  };

  const confirmDeleteWorker = (worker: SocialWorker) => {
    if (Platform.OS === "web") {
      if (
        typeof window !== "undefined" &&
        window.confirm(
          `Are you sure you want to delete Demo Social Worker "${worker.name}"?`
        )
      ) {
        handleDeleteWorker(worker.id, worker.name);
      }
    } else {
      Alert.alert(
        "Delete Demo Social Worker",
        `Are you sure you want to delete Demo Social Worker "${worker.name}"?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => handleDeleteWorker(worker.id, worker.name),
          },
        ]
      );
    }
  };

  const [emergencyHistory, setEmergencyHistory] = useState<EmergencyEvent[]>([
    {
      id: "SOS-INIT-901",
      userName: user?.fullName || "Active Citizen",
      userEmail: user?.email || "demo@hybridsos.com",
      userPhone: user?.phoneNumber || "+1 (555) 234-5678",
      timestamp: "10:30 AM",
      dateStr: "Yesterday",
      status: "RESOLVED",
      location: "37.7749° N, 122.4194° W (Routine System Check)",
      latitude: 37.7749,
      longitude: -122.4194,
      notifiedContacts: ["Emergency Services (Routine)", "Priya Sharma"],
      assignedWorker: "Sarah Jenkins, LCSW (SW-4821)",
      notes: "Weekly device connectivity & beacon verification completed.",
    },
  ]);

  // Attempt to detect genuine device GPS location
  const fetchLocation = async (): Promise<LocationCoords> => {
    setIsLocating(true);
    setLocationError(null);

    try {
      const result = await fetchDeviceLocation(9000);
      setCurrentLocation(result.coords);
      if (result.error) {
        setLocationError(result.error);
      }
      setIsLocating(false);
      return result.coords;
    } catch (err: any) {
      const fallbackCoords: LocationCoords = {
        latitude: 12.9716,
        longitude: 77.5946,
        accuracy: 15,
        address: "12.9716° N, 77.5946° E (Simulation Fallback - GPS Failed)",
        isSimulated: true,
        source: "DEMO_FALLBACK",
        error: err?.message || "Location acquisition failed.",
        permissionStatus: "denied",
      };
      setCurrentLocation(fallbackCoords);
      setLocationError(err?.message || "GPS acquisition error.");
      setIsLocating(false);
      return fallbackCoords;
    }
  };

  useEffect(() => {
    // Silently warm up location on initial load
    fetchLocation();
  }, []);

  const handleSOSPress = () => {
    if (isSosActive) {
      // If already active, show the active dispatch status modal
      setModalType("SOS_SUCCESS");
    } else {
      // Trigger confirmation dialog
      setModalType("CONFIRM_SOS");
      fetchLocation();
    }
  };

  const handleConfirmSOS = async () => {
    if (isTriggeringSos) return;
    setIsTriggeringSos(true);
    setSosError(null);

    try {
      const loc = currentLocation || (await fetchLocation());
      const now = new Date();
      const timeFormatted = now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      const dateFormatted = now.toLocaleDateString([], {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      const locationDisplay = loc.isSimulated
        ? `${loc.address} [DEMO SIMULATION]`
        : `${loc.address} (±${loc.accuracy || 15}m)`;

      // If user has a valid session token, record alert in MongoDB via backend API
      if (token) {
        const payload: TriggerSosPayload = {
          latitude: loc.latitude,
          longitude: loc.longitude,
          accuracy: loc.accuracy,
          address: loc.address,
          isSimulatedLocation: loc.isSimulated,
          locationSource: loc.source,
          googleMapsUrl: !loc.isSimulated ? loc.googleMapsUrl : undefined,
          notes: loc.isSimulated
            ? "Urgent beacon triggered by user [SIMULATION DEMO - NOT REAL GPS]."
            : "Urgent beacon triggered by user [REAL DEVICE GPS].",
        };

        const res = await apiTriggerSOS(token, payload);

        if (!res.success || !res.alert) {
          const errMsg = res.error || "Unable to transmit SOS emergency alert to server.";
          setSosError(errMsg);
          Alert.alert("Emergency Alert Failed", errMsg);
          setIsTriggeringSos(false);
          return;
        }

        const backendAlert = res.alert;
        const eventId = backendAlert.alertId || backendAlert._id || `SOS-${Date.now().toString().slice(-6)}`;

        // Use user's real registered contacts list with clear "SMS Pending Phase 2" truthfulness
        const rawAlertContacts = Array.isArray(backendAlert.notifiedContacts)
          ? backendAlert.notifiedContacts
          : [];
        const contactLabels =
          contacts.length > 0
            ? contacts.map((c) => `${c.name} (${c.relationship}) - Registered (SMS Pending Phase 2)`)
            : rawAlertContacts.length > 0
            ? rawAlertContacts.map(
                (c: any) => `${c.name} (${c.relationship}) - Registered (SMS Pending Phase 2)`
              )
            : ["No emergency contacts registered"];

        const assignedWorkerLabel = backendAlert.assignedWorker
          ? `${backendAlert.assignedWorker.name} (${backendAlert.assignedWorker.badgeNumber || "Assigned"})`
          : `${socialWorker.name} (${socialWorker.badgeNumber || "Assigned"})`;

        const newEvent: EmergencyEvent = {
          id: eventId,
          userName: backendAlert.userName || user?.fullName || "Active Citizen",
          userEmail: backendAlert.userEmail || user?.email || "demo@hybridsos.com",
          userPhone: backendAlert.userPhone || user?.phoneNumber || "",
          timestamp: `${timeFormatted}, ${dateFormatted}`,
          dateStr: "Active Now",
          status: "ACTIVE_DISPATCH",
          location: locationDisplay,
          latitude: loc.latitude,
          longitude: loc.longitude,
          isSimulatedLocation: loc.isSimulated,
          googleMapsUrl: !loc.isSimulated
            ? loc.googleMapsUrl || backendAlert.googleMapsUrl
            : undefined,
          notifiedContacts: contactLabels,
          assignedWorker: assignedWorkerLabel,
          notes: backendAlert.notes,
        };

        setActiveEvent(newEvent);
        setIsSosActive(true);

        // Update social worker status from backend assignment
        if (backendAlert.assignedWorker) {
          setSocialWorker((prev) => ({
            ...prev,
            name: backendAlert.assignedWorker.name || prev.name,
            badgeNumber: backendAlert.assignedWorker.badgeNumber || prev.badgeNumber,
            phone: backendAlert.assignedWorker.phone || prev.phone,
            status: "En Route",
            eta: backendAlert.assignedWorker.eta || "7 mins",
          }));
        } else {
          setSocialWorker((prev) => ({
            ...prev,
            status: "En Route",
            eta: "7 mins",
          }));
        }

        // Keep contacts marked as Ready (truthful: SMS provider is Phase 2)
        setContacts((prev) =>
          prev.map((c) => ({
            ...c,
            status: "Ready",
          }))
        );

        // Prepend new event to history
        setEmergencyHistory((prev) => [newEvent, ...prev.filter((e) => e.id !== newEvent.id)]);

        // Open dispatch success modal
        setModalType("SOS_SUCCESS");
      } else {
        // Fallback for offline / unauthenticated demo
        const eventId = `SOS-${Date.now().toString().slice(-6)}`;
        const contactLabels =
          contacts.length > 0
            ? contacts.map((c) => `${c.name} (${c.relationship}) - Registered (SMS Pending Phase 2)`)
            : ["No emergency contacts registered"];

        const newEvent: EmergencyEvent = {
          id: eventId,
          userName: user?.fullName || "Active Citizen",
          userEmail: user?.email || "demo@hybridsos.com",
          userPhone: user?.phoneNumber || "+1 (555) 234-5678",
          timestamp: `${timeFormatted}, ${dateFormatted}`,
          dateStr: "Active Now",
          status: "ACTIVE_DISPATCH",
          location: locationDisplay,
          latitude: loc.latitude,
          longitude: loc.longitude,
          isSimulatedLocation: loc.isSimulated,
          googleMapsUrl: !loc.isSimulated ? loc.googleMapsUrl : undefined,
          notifiedContacts: contactLabels,
          assignedWorker: `${socialWorker.name} (${socialWorker.badgeNumber})`,
          notes: loc.isSimulated
            ? "Urgent beacon triggered in offline simulation mode."
            : "Urgent beacon triggered with real device GPS coordinates.",
        };

        setActiveEvent(newEvent);
        setIsSosActive(true);
        setSocialWorker((prev) => ({
          ...prev,
          status: "En Route",
          eta: "7 mins",
        }));
        setEmergencyHistory((prev) => [newEvent, ...prev]);
        setModalType("SOS_SUCCESS");
      }
    } catch (err: any) {
      console.error("SOS confirmation error:", err);
      Alert.alert("Emergency Error", err?.message || "An unexpected error occurred triggering SOS.");
    } finally {
      setIsTriggeringSos(false);
    }
  };

  const handleResolveSOS = async () => {
    if (isResolvingSos) return;
    setIsResolvingSos(true);

    try {
      if (token && activeEvent) {
        const res = await apiResolveSOS(token, activeEvent.id, "Resolved by user via mobile app");
        if (!res.success) {
          Alert.alert("Resolve Error", res.error || "Failed to resolve SOS alert on server.");
          setIsResolvingSos(false);
          return;
        }
      }

      setIsSosActive(false);

      if (activeEvent) {
        setEmergencyHistory((prev) =>
          prev.map((item) =>
            item.id === activeEvent.id
              ? { ...item, status: "RESOLVED", dateStr: "Resolved" }
              : item
          )
        );
        setActiveEvent(null);
      }

      setContacts((prev) =>
        prev.map((c) => ({
          ...c,
          status: "Ready",
        }))
      );

      setSocialWorker((prev) => ({
        ...prev,
        status: "Assigned",
        eta: undefined,
      }));

      setModalType("NONE");
    } catch (err: any) {
      console.error("Resolve SOS error:", err);
      Alert.alert("Resolve Error", err?.message || "Failed to resolve emergency alert.");
    } finally {
      setIsResolvingSos(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(insets.top + 14, 28),
            paddingBottom: Math.max(insets.bottom + 80, 90),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleContainer}>
            <View style={styles.brandRow}>
              <Text style={styles.appName}>HYBRID SOS</Text>
              <View style={[styles.activeBadge, isSosActive ? styles.activeBadgeEmergency : null]}>
                <View style={[styles.activeDot, isSosActive ? styles.activeDotEmergency : null]} />
                <Text
                  style={[
                    styles.activeBadgeText,
                    isSosActive ? styles.activeBadgeTextEmergency : null,
                  ]}
                >
                  {isSosActive ? "🚨 SOS ACTIVE" : "PROTECTED"}
                </Text>
              </View>
            </View>
            <Text style={styles.subtitle}>
              {user ? `Active User: ${user.fullName}` : "Emergency assistance when you need it"}
            </Text>
          </View>

          {/* Profile Button in Top-Right Corner */}
          <TouchableOpacity
            style={[
              styles.profileCircle,
              isSosActive ? { borderColor: "#E53935" } : null,
            ]}
            activeOpacity={0.7}
            onPress={() => setModalType("PROFILE")}
            accessibilityLabel="Citizen profile and account settings"
          >
            <Text style={styles.profileText} pointerEvents="none">👤</Text>
            <View
              pointerEvents="none"
              style={[
                styles.profileStatusDot,
                isSosActive ? { backgroundColor: "#E53935" } : null,
              ]}
            />
          </TouchableOpacity>
        </View>

        {/* Emergency Alert Banner (Shown when SOS is active) */}
        {isSosActive && (
          <View style={styles.emergencyBanner}>
            <View style={styles.emergencyBannerHeader}>
              <Text style={styles.emergencyBannerIcon}>🚨</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.emergencyBannerTitle}>EMERGENCY DISPATCH IN PROGRESS</Text>
                <Text style={styles.emergencyBannerSubtitle}>
                  {activeEvent?.isSimulatedLocation
                    ? "Simulation coordinates recorded. Responders mobilized."
                    : "Genuine device GPS transmitted. Responders mobilized."}
                </Text>
              </View>
            </View>
            <View style={styles.emergencyBannerActions}>
              <TouchableOpacity
                style={styles.bannerViewButton}
                activeOpacity={0.8}
                onPress={() => setModalType("SOS_SUCCESS")}
              >
                <Text style={styles.bannerViewButtonText}>View Status</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.bannerResolveButton, isResolvingSos ? { opacity: 0.6 } : null]}
                activeOpacity={0.8}
                disabled={isResolvingSos}
                onPress={handleResolveSOS}
              >
                {isResolvingSos ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.bannerResolveButtonText}>Cancel / Resolve SOS</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* SOS Action Beacon Area */}
        <View style={styles.sosSection}>
          <View
            style={[
              styles.helpHeaderPill,
              isSosActive ? styles.helpHeaderPillEmergency : null,
            ]}
          >
            <Text
              style={[
                styles.helpText,
                isSosActive ? styles.helpTextEmergency : null,
              ]}
            >
              {isSosActive ? "BROADCASTING EMERGENCY BEACON" : "EMERGENCY BEACON"}
            </Text>
          </View>

          {/* Concentric Glow Rings around SOS Button */}
          <View
            style={[
              styles.sosRingOuter,
              isSosActive ? styles.sosRingOuterActive : null,
            ]}
          >
            <View
              style={[
                styles.sosRingMiddle,
                isSosActive ? styles.sosRingMiddleActive : null,
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.sosButton,
                  isSosActive ? styles.sosButtonActive : null,
                ]}
                onPress={handleSOSPress}
                activeOpacity={0.85}
              >
                <View style={styles.sosInnerGlow}>
                  <Text style={styles.sosText}>SOS</Text>
                  <Text style={styles.tapText}>
                    {isSosActive ? "ALERT ACTIVE" : "TAP FOR HELP"}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.sosDescription}>
            {isSosActive
              ? "Emergency alert active. Tap the beacon to view responder details or resolve alert."
              : "Your emergency contacts and assigned social worker can be alerted."}
          </Text>
        </View>

        {/* Action Cards Section */}
        <View style={styles.cardsContainer}>
          {/* Location Card */}
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.75}
            onPress={() => {
              fetchLocation();
              setModalType("LOCATION");
            }}
          >
            <View style={[styles.iconBox, styles.locationIconBox]}>
              <Text style={styles.icon}>📍</Text>
            </View>

            <View style={styles.cardText}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle}>Your Location</Text>
                <View
                  style={[
                    styles.pillBadge,
                    isSosActive
                      ? styles.pillBadgeAlert
                      : isLocating
                      ? styles.pillBadgeLocating
                      : currentLocation && !currentLocation.isSimulated
                      ? styles.pillBadgeRealGps
                      : styles.pillBadgeDemoLocation,
                  ]}
                >
                  <Text
                    style={[
                      styles.pillBadgeText,
                      isSosActive
                        ? styles.pillBadgeTextAlert
                        : isLocating
                        ? styles.pillBadgeTextLocating
                        : currentLocation && !currentLocation.isSimulated
                        ? styles.pillBadgeTextRealGps
                        : styles.pillBadgeTextDemoLocation,
                    ]}
                  >
                    {isSosActive
                      ? "Broadcasting"
                      : isLocating
                      ? "Locating..."
                      : currentLocation && !currentLocation.isSimulated
                      ? `🟢 Real GPS (±${currentLocation.accuracy}m)`
                      : currentLocation?.permissionStatus === "denied"
                      ? "❌ Permission Denied"
                      : "⚠️ Demo Coordinates"}
                  </Text>
                </View>
              </View>
              <Text style={styles.cardSubtitle}>
                {isSosActive
                  ? `Transmitting: ${currentLocation?.address || "Live Coordinates"}`
                  : isLocating
                  ? "Acquiring real-time GPS fix from satellite/device..."
                  : currentLocation && !currentLocation.isSimulated
                  ? `${currentLocation.address} (±${currentLocation.accuracy}m)`
                  : currentLocation?.permissionStatus === "denied"
                  ? "Location permission denied. Tap to view details & retry."
                  : `${currentLocation?.address || "Tap to detect your current location"}`}
              </Text>
            </View>

            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>

          {/* Emergency Contacts Card */}
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.75}
            onPress={() => {
              setContactError(null);
              setContactSuccess(null);
              setModalType("CONTACTS");
              if (token) loadContacts();
            }}
          >
            <View style={[styles.iconBox, styles.contactsIconBox]}>
              <Text style={styles.icon}>👨‍👩‍👧</Text>
            </View>

            <View style={styles.cardText}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle}>Emergency Contacts</Text>
                <View
                  style={[
                    styles.pillBadge,
                    isSosActive ? styles.pillBadgeAlert : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.pillBadgeText,
                      isSosActive ? styles.pillBadgeTextAlert : null,
                    ]}
                  >
                    {isSosActive
                      ? `Alerted (${contacts.length})`
                      : `${contacts.length} Configured`}
                  </Text>
                </View>
              </View>
              <Text style={styles.cardSubtitle}>
                {isSosActive
                  ? `${contacts.map((c) => c.name).join(", ") || "Contacts"} notified via SOS broadcast`
                  : contacts.length > 0
                  ? `${contacts.length} contact${contacts.length === 1 ? "" : "s"} saved in your emergency network`
                  : "Tap to add your trusted emergency contacts"}
              </Text>
            </View>

            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>

          {/* Social Worker Card */}
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.75}
            onPress={() => {
              setWorkerError(null);
              setWorkerSuccess(null);
              setModalType("SOCIAL_WORKER");
              loadWorkers();
            }}
          >
            <View style={[styles.iconBox, styles.workerIconBox]}>
              <Text style={styles.icon}>👩‍💼</Text>
            </View>

            <View style={styles.cardText}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle}>Demo Social Workers</Text>
                <View
                  style={[
                    styles.pillBadge,
                    styles.workerBadge,
                    isSosActive ? styles.workerBadgeEnRoute : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.workerBadgeText,
                      isSosActive ? styles.workerBadgeTextEnRoute : null,
                    ]}
                  >
                    {isSosActive
                      ? "En Route (7m)"
                      : workers.length > 0
                      ? `${workers.length} Available`
                      : "Simulation Ready"}
                  </Text>
                </View>
              </View>
              <Text style={styles.cardSubtitle}>
                {isSosActive
                  ? `${socialWorker?.name || "Demo Responder"} dispatched to your location`
                  : workers.length > 0
                  ? `${workers.length} demo responder${workers.length === 1 ? "" : "s"} on standby (College Simulation)`
                  : "Tap to register or view demo emergency responders"}
              </Text>
            </View>

            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>

          {/* Emergency History Card */}
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.75}
            onPress={() => {
              if (token) loadAlertHistory();
              setModalType("HISTORY");
            }}
          >
            <View style={[styles.iconBox, styles.historyIconBox]}>
              <Text style={styles.icon}>📋</Text>
            </View>

            <View style={styles.cardText}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle}>Emergency History</Text>
                <View style={styles.pillBadge}>
                  <Text style={styles.pillBadgeText}>
                    {emergencyHistory.length} {emergencyHistory.length === 1 ? "Log" : "Logs"}
                  </Text>
                </View>
              </View>
              <Text style={styles.cardSubtitle}>
                {isSosActive
                  ? "Latest alert is currently active"
                  : "View previous SOS alerts, dispatch logs and timestamps"}
              </Text>
            </View>

            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footerContainer}>
          <Text style={styles.footerSecurityIcon}>🛡️</Text>
          <Text style={styles.footer}>Stay safe. Help is one tap away.</Text>
        </View>
      </ScrollView>

      {/* ========================================================================= */}
      {/* UNIFIED CROSS-PLATFORM MODAL SYSTEM (Works on Web and Mobile)             */}
      {/* ========================================================================= */}
      <Modal
        visible={modalType !== "NONE"}
        transparent
        animationType="fade"
        onRequestClose={() => setModalType("NONE")}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {/* 1. CONFIRM SOS MODAL */}
            {modalType === "CONFIRM_SOS" && (
              <View>
                <View style={styles.dialogHeader}>
                  <View style={styles.dialogSirenRing}>
                    <Text style={styles.dialogSirenIcon}>🚨</Text>
                  </View>
                  <Text style={styles.dialogTitle}>ACTIVATE EMERGENCY SOS?</Text>
                  <Text style={styles.dialogSubtitle}>
                    Emergency assistance will be immediately notified. Your real-time location will
                    be transmitted to emergency dispatch, your trusted contacts, and your assigned
                    social worker.
                  </Text>
                </View>

                {/* Location Status Pill */}
                <View style={styles.dialogPillBox}>
                  <View style={styles.dialogPillHeaderRow}>
                    <Text style={styles.dialogPillLabel}>LOCATION TO BROADCAST:</Text>
                    {currentLocation && !isLocating && (
                      <View
                        style={[
                          styles.gpsSourceTag,
                          currentLocation.isSimulated
                            ? styles.gpsSourceTagDemo
                            : styles.gpsSourceTagReal,
                        ]}
                      >
                        <Text
                          style={[
                            styles.gpsSourceTagText,
                            currentLocation.isSimulated
                              ? styles.gpsSourceTagTextDemo
                              : styles.gpsSourceTagTextReal,
                          ]}
                        >
                          {currentLocation.isSimulated ? "⚠️ DEMO SIMULATION" : "🟢 REAL DEVICE GPS"}
                        </Text>
                      </View>
                    )}
                  </View>
                  {isLocating ? (
                    <View style={styles.locatingRow}>
                      <ActivityIndicator size="small" color="#4CA2FF" />
                      <Text style={styles.locatingText}>Acquiring genuine GPS fix...</Text>
                    </View>
                  ) : (
                    <Text style={styles.dialogPillValue}>
                      📍 {currentLocation?.address || "Coordinates detected"}
                    </Text>
                  )}
                </View>

                <View style={styles.dialogButtonsContainer}>
                  <TouchableOpacity
                    style={[styles.dialogConfirmButton, isTriggeringSos ? { opacity: 0.75 } : null]}
                    activeOpacity={0.85}
                    disabled={isTriggeringSos}
                    onPress={handleConfirmSOS}
                  >
                    {isTriggeringSos ? (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                        }}
                      >
                        <ActivityIndicator size="small" color="#FFFFFF" />
                        <Text style={styles.dialogConfirmButtonText}>
                          TRANSMITTING SOS BEACON...
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.dialogConfirmButtonText}>CONFIRM EMERGENCY ALERT</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.dialogCancelButton}
                    activeOpacity={0.7}
                    disabled={isTriggeringSos}
                    onPress={() => setModalType("NONE")}
                  >
                    <Text style={styles.dialogCancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* 2. SOS ACTIVE / DISPATCH SUCCESS MODAL */}
            {modalType === "SOS_SUCCESS" && (
              <View>
                <View style={styles.dialogHeader}>
                  <View
                    style={[
                      styles.dialogSirenRing,
                      {
                        borderColor: "#00E676",
                        backgroundColor: "rgba(0, 230, 118, 0.15)",
                      },
                    ]}
                  >
                    <Text style={styles.dialogSirenIcon}>📡</Text>
                  </View>
                  <Text style={[styles.dialogTitle, { color: "#FF5252" }]}>
                    EMERGENCY ALERT DISPATCHED
                  </Text>
                  <Text style={styles.dialogSubtitle}>
                    Your emergency beacon is actively broadcasting. First responders and your care
                    team are mobilized.
                  </Text>
                </View>

                {/* Dispatch Details Card */}
                <View style={styles.dispatchDetailsCard}>
                  <View style={styles.dispatchRow}>
                    <Text style={styles.dispatchLabel}>Alert ID:</Text>
                    <Text style={[styles.dispatchValue, { fontWeight: "700", color: "#FF5252" }]}>
                      {activeEvent?.id || "SOS-ACTIVE"}
                    </Text>
                  </View>
                  <View style={styles.dispatchRow}>
                    <Text style={styles.dispatchLabel}>User:</Text>
                    <Text style={styles.dispatchValue}>{user?.fullName || "Active Citizen"}</Text>
                  </View>
                  <View style={styles.dispatchRow}>
                    <Text style={styles.dispatchLabel}>Phone:</Text>
                    <Text style={styles.dispatchValue}>
                      {user?.phoneNumber || "+1 (555) 234-5678"}
                    </Text>
                  </View>
                  <View style={styles.dispatchRow}>
                    <Text style={styles.dispatchLabel}>GPS Location:</Text>
                    <View style={{ flex: 1, alignItems: "flex-end" }}>
                      <Text style={styles.dispatchValue}>
                        {currentLocation?.address || activeEvent?.location || "Active Coordinates"}
                      </Text>
                      {activeEvent?.isSimulatedLocation ? (
                        <Text style={styles.demoWarningSmall}>⚠️ Demo Simulation (Not Real GPS)</Text>
                      ) : (
                        <Text style={styles.realGpsSmall}>🟢 Real Hardware GPS Fix</Text>
                      )}
                      {activeEvent?.googleMapsUrl ? (
                        <TouchableOpacity
                          style={{
                            marginTop: 4,
                            paddingVertical: 2,
                            paddingHorizontal: 6,
                            backgroundColor: "rgba(76, 162, 255, 0.15)",
                            borderRadius: 4,
                          }}
                          onPress={() => Linking.openURL(activeEvent.googleMapsUrl!)}
                        >
                          <Text style={{ fontSize: 11, color: "#4CA2FF", fontWeight: "600" }}>
                            🗺️ Open in Google Maps
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                  <View style={styles.dispatchRow}>
                    <Text style={styles.dispatchLabel}>Social Worker:</Text>
                    <Text style={[styles.dispatchValue, { color: "#00E676" }]}>
                      {socialWorker.name} ({socialWorker.status} - ETA {socialWorker.eta || "7 mins"})
                    </Text>
                  </View>
                  <View style={styles.dispatchRow}>
                    <Text style={styles.dispatchLabel}>Emergency Contacts:</Text>
                    <View style={{ flex: 1, alignItems: "flex-end" }}>
                      <Text style={styles.dispatchValue}>
                        {contacts.length > 0
                          ? contacts.map((c) => c.name).join(", ")
                          : "No contacts registered"}
                      </Text>
                      <Text style={{ fontSize: 10, color: "#9E9E9E", marginTop: 2 }}>
                        ℹ️ Saved in Network (SMS Pending Phase 2)
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.dialogButtonsContainer}>
                  <TouchableOpacity
                    style={styles.dialogDoneButton}
                    activeOpacity={0.8}
                    onPress={() => setModalType("NONE")}
                  >
                    <Text style={styles.dialogDoneButtonText}>Keep SOS Active & Close</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.dialogCancelButton,
                      { borderColor: "#E53935" },
                      isResolvingSos ? { opacity: 0.6 } : null,
                    ]}
                    activeOpacity={0.8}
                    disabled={isResolvingSos}
                    onPress={handleResolveSOS}
                  >
                    {isResolvingSos ? (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                        }}
                      >
                        <ActivityIndicator size="small" color="#FF5252" />
                        <Text style={[styles.dialogCancelButtonText, { color: "#FF5252" }]}>
                          Resolving Alert...
                        </Text>
                      </View>
                    ) : (
                      <Text style={[styles.dialogCancelButtonText, { color: "#FF5252" }]}>
                        Cancel / Resolve SOS Alert
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* 3. LOCATION DETAILS MODAL */}
            {modalType === "LOCATION" && (
              <View>
                <View style={styles.dialogHeader}>
                  <Text style={styles.modalHeaderEmoji}>📍</Text>
                  <Text style={styles.dialogTitle}>GPS LOCATION SERVICES</Text>
                  <Text style={styles.dialogSubtitle}>
                    Real-time geolocation status transmitted during emergency dispatch.
                  </Text>
                </View>

                {/* Warning banner when in simulation fallback or permission denied */}
                {currentLocation?.isSimulated && (
                  <View style={styles.locationWarningBox}>
                    <Text style={styles.locationWarningIcon}>⚠️</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.locationWarningTitle}>
                        {currentLocation.permissionStatus === "denied"
                          ? "LOCATION PERMISSION DENIED"
                          : "DEMO SIMULATION COORDINATES"}
                      </Text>
                      <Text style={styles.locationWarningText}>
                        {locationError ||
                          (currentLocation.permissionStatus === "denied"
                            ? "Permission was denied. Tap 'Refresh GPS Fix' to request access or enable in device settings."
                            : "Real device GPS is unavailable. Displaying demo coordinates for simulation only.")}
                      </Text>
                    </View>
                  </View>
                )}

                <View style={styles.dispatchDetailsCard}>
                  <View style={styles.dispatchRow}>
                    <Text style={styles.dispatchLabel}>Fix Type:</Text>
                    <Text
                      style={[
                        styles.dispatchValue,
                        {
                          color: isSosActive
                            ? "#FF5252"
                            : currentLocation && !currentLocation.isSimulated
                            ? "#00E676"
                            : "#FFB300",
                          fontWeight: "700",
                        },
                      ]}
                    >
                      {isSosActive
                        ? "Broadcasting to EMS"
                        : isLocating
                        ? "Acquiring GPS fix..."
                        : currentLocation && !currentLocation.isSimulated
                        ? "🟢 Genuine Device GPS"
                        : "⚠️ Simulated Fallback"}
                    </Text>
                  </View>
                  <View style={styles.dispatchRow}>
                    <Text style={styles.dispatchLabel}>Latitude:</Text>
                    <Text style={styles.dispatchValue}>
                      {currentLocation
                        ? `${Math.abs(currentLocation.latitude).toFixed(5)}° ${currentLocation.latitude >= 0 ? "N" : "S"}`
                        : "Detecting..."}
                    </Text>
                  </View>
                  <View style={styles.dispatchRow}>
                    <Text style={styles.dispatchLabel}>Longitude:</Text>
                    <Text style={styles.dispatchValue}>
                      {currentLocation
                        ? `${Math.abs(currentLocation.longitude).toFixed(5)}° ${currentLocation.longitude >= 0 ? "E" : "W"}`
                        : "Detecting..."}
                    </Text>
                  </View>
                  <View style={styles.dispatchRow}>
                    <Text style={styles.dispatchLabel}>Accuracy:</Text>
                    <Text style={styles.dispatchValue}>
                      {currentLocation
                        ? `±${currentLocation.accuracy || 12} meters ${currentLocation.isSimulated ? "(Simulated)" : "(Hardware)"}`
                        : "Detecting..."}
                    </Text>
                  </View>
                  <View style={styles.dispatchRow}>
                    <Text style={styles.dispatchLabel}>Address / Tag:</Text>
                    <Text style={styles.dispatchValue}>{currentLocation?.address || "Active Coordinates"}</Text>
                  </View>
                </View>

                {/* Google Maps link: only shown when REAL GPS coordinates are obtained */}
                {currentLocation?.googleMapsUrl && !currentLocation.isSimulated && (
                  <View style={styles.mapsLinkBox}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={styles.mapsLinkLabel}>GOOGLE MAPS EMERGENCY LINK:</Text>
                      <Text style={styles.mapsLinkUrl} numberOfLines={1} ellipsizeMode="middle">
                        {currentLocation.googleMapsUrl}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.mapsOpenButton}
                      activeOpacity={0.8}
                      onPress={() => {
                        if (currentLocation?.googleMapsUrl) {
                          Linking.openURL(currentLocation.googleMapsUrl);
                        }
                      }}
                    >
                      <Text style={styles.mapsOpenButtonText}>Open Map ↗</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <View style={styles.dialogButtonsContainer}>
                  <TouchableOpacity
                    style={[styles.dialogActionButton, isLocating ? { opacity: 0.7 } : null]}
                    activeOpacity={0.8}
                    disabled={isLocating}
                    onPress={fetchLocation}
                  >
                    {isLocating ? (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <ActivityIndicator size="small" color="#FFFFFF" />
                        <Text style={styles.dialogActionButtonText}>Acquiring GPS...</Text>
                      </View>
                    ) : (
                      <Text style={styles.dialogActionButtonText}>Refresh GPS Fix</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.dialogDoneButton}
                    activeOpacity={0.8}
                    onPress={() => setModalType("NONE")}
                  >
                    <Text style={styles.dialogDoneButtonText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* 4. EMERGENCY CONTACTS MODAL */}
            {modalType === "CONTACTS" && (
              <View>
                <View style={styles.dialogHeader}>
                  <Text style={styles.modalHeaderEmoji}>👨‍👩‍👧</Text>
                  <Text style={styles.dialogTitle}>EMERGENCY CONTACTS</Text>
                  <Text style={styles.dialogSubtitle}>
                    Trusted individuals alerted via automated high-priority SMS and push notification.
                  </Text>
                </View>

                <ScrollView
                  style={{ maxHeight: 390 }}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {/* Feedback Banners */}
                  {contactSuccess ? (
                    <View style={styles.contactSuccessBanner}>
                      <Text style={styles.contactSuccessIcon}>✓</Text>
                      <Text style={styles.contactSuccessText}>{contactSuccess}</Text>
                    </View>
                  ) : null}

                  {contactError ? (
                    <View style={styles.contactErrorBanner}>
                      <Text style={styles.contactErrorIcon}>⚠️</Text>
                      <Text style={styles.contactErrorText}>{contactError}</Text>
                    </View>
                  ) : null}

                  {/* Registered Contacts Header */}
                  <View style={styles.contactsSectionHeaderRow}>
                    <Text style={styles.contactsSectionHeader}>
                      REGISTERED CONTACTS ({contacts.length})
                    </Text>
                    {isLoadingContacts ? (
                      <ActivityIndicator size="small" color="#4CA2FF" />
                    ) : (
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={loadContacts}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Text style={styles.contactsReloadText}>🔄 Refresh</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Empty state */}
                  {!isLoadingContacts && contacts.length === 0 ? (
                    <View style={styles.emptyContactsBox}>
                      <Text style={styles.emptyContactsIcon}>👥</Text>
                      <Text style={styles.emptyContactsTitle}>No Contacts Saved Yet</Text>
                      <Text style={styles.emptyContactsSubtitle}>
                        Add your trusted family members or friends below. When an emergency alert is triggered, all registered contacts will be notified.
                      </Text>
                    </View>
                  ) : null}

                  {/* Contacts List */}
                  {contacts.map((contact) => (
                    <View key={contact.id} style={styles.contactItem}>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={styles.contactName}>{contact.name}</Text>
                        <Text style={styles.contactDetail}>
                          {contact.relationship} • {contact.phone}
                        </Text>
                      </View>
                      <View style={styles.contactActionsRow}>
                        <View
                          style={[
                            styles.contactBadge,
                            contact.status === "Notified"
                              ? styles.contactBadgeAlerted
                              : styles.contactBadgeReady,
                          ]}
                        >
                          <Text
                            style={[
                              styles.contactBadgeText,
                              contact.status === "Notified"
                                ? { color: "#FF5252" }
                                : { color: "#00E676" },
                            ]}
                          >
                            {contact.status === "Notified" ? "Alerted" : "Ready"}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.deleteContactButton}
                          activeOpacity={0.7}
                          disabled={deletingContactId === contact.id}
                          onPress={() => confirmDeleteContact(contact)}
                          accessibilityLabel={`Delete contact ${contact.name}`}
                        >
                          {deletingContactId === contact.id ? (
                            <ActivityIndicator size="small" color="#FF5252" />
                          ) : (
                            <Text style={styles.deleteContactIcon}>🗑️</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}

                  {/* Add New Contact Form Card */}
                  <View style={styles.addContactCard}>
                    <Text style={styles.addContactCardTitle}>+ ADD EMERGENCY CONTACT</Text>

                    <View style={styles.miniInputGroup}>
                      <Text style={styles.miniInputLabel}>CONTACT NAME *</Text>
                      <TextInput
                        style={styles.miniTextInput}
                        placeholder="e.g. Priya Sharma"
                        placeholderTextColor="#5E7E9E"
                        value={newName}
                        onChangeText={(t) => {
                          setNewName(t);
                          if (contactError) setContactError(null);
                        }}
                        autoCapitalize="words"
                      />
                    </View>

                    <View style={styles.miniInputGroup}>
                      <Text style={styles.miniInputLabel}>RELATIONSHIP *</Text>
                      <TextInput
                        style={styles.miniTextInput}
                        placeholder="e.g. Mother, Father, Spouse, Friend"
                        placeholderTextColor="#5E7E9E"
                        value={newRelationship}
                        onChangeText={(t) => {
                          setNewRelationship(t);
                          if (contactError) setContactError(null);
                        }}
                        autoCapitalize="words"
                      />
                      <View style={styles.chipsRow}>
                        {["Mother", "Father", "Spouse", "Sibling", "Friend", "Doctor"].map((rel) => (
                          <TouchableOpacity
                            key={rel}
                            style={[
                              styles.chipButton,
                              newRelationship === rel ? styles.chipButtonActive : null,
                            ]}
                            onPress={() => {
                              setNewRelationship(rel);
                              if (contactError) setContactError(null);
                            }}
                          >
                            <Text
                              style={[
                                styles.chipButtonText,
                                newRelationship === rel ? styles.chipButtonTextActive : null,
                              ]}
                            >
                              {rel}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    <View style={styles.miniInputGroup}>
                      <Text style={styles.miniInputLabel}>PHONE NUMBER *</Text>
                      <TextInput
                        style={styles.miniTextInput}
                        placeholder="e.g. +91 98765 43210 or 9876543210"
                        placeholderTextColor="#5E7E9E"
                        value={newPhone}
                        onChangeText={(t) => {
                          setNewPhone(t);
                          if (contactError) setContactError(null);
                        }}
                        keyboardType="phone-pad"
                      />
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.saveContactButton,
                        isSavingContact && styles.saveContactButtonDisabled,
                      ]}
                      activeOpacity={0.85}
                      onPress={handleAddContact}
                      disabled={isSavingContact}
                    >
                      {isSavingContact ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.saveContactButtonText}>SAVE EMERGENCY CONTACT</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </ScrollView>

                <View style={styles.dialogButtonsContainer}>
                  <TouchableOpacity
                    style={styles.dialogDoneButton}
                    activeOpacity={0.8}
                    onPress={() => setModalType("NONE")}
                  >
                    <Text style={styles.dialogDoneButtonText}>Done</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* 5. SOCIAL WORKER MODAL */}
            {modalType === "SOCIAL_WORKER" && (
              <View>
                <View style={styles.dialogHeader}>
                  <Text style={styles.modalHeaderEmoji}>👩‍💼</Text>
                  <Text style={styles.dialogTitle}>DEMO SOCIAL WORKERS</Text>
                  <Text style={styles.dialogSubtitle}>
                    Emergency care coordinators registered for college project simulation and dispatch testing.
                  </Text>
                </View>

                {/* Simulation Disclaimer Banner */}
                <View style={styles.workerDisclaimerBanner}>
                  <Text style={styles.workerDisclaimerIcon}>⚠️</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.workerDisclaimerTitle}>
                      SIMULATION DEMO ONLY
                    </Text>
                    <Text style={styles.workerDisclaimerText}>
                      Responders registered here are for demonstration testing and are NOT officially verified emergency or medical personnel.
                    </Text>
                  </View>
                </View>

                <ScrollView
                  style={{ maxHeight: 390 }}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {/* Feedback Banners */}
                  {workerSuccess ? (
                    <View style={styles.contactSuccessBanner}>
                      <Text style={styles.contactSuccessIcon}>✓</Text>
                      <Text style={styles.contactSuccessText}>{workerSuccess}</Text>
                    </View>
                  ) : null}

                  {workerError ? (
                    <View style={styles.contactErrorBanner}>
                      <Text style={styles.contactErrorIcon}>⚠️</Text>
                      <Text style={styles.contactErrorText}>{workerError}</Text>
                    </View>
                  ) : null}

                  {/* Registered Workers Header */}
                  <View style={styles.contactsSectionHeaderRow}>
                    <Text style={styles.contactsSectionHeader}>
                      REGISTERED WORKERS ({workers.length})
                    </Text>
                    {isLoadingWorkers ? (
                      <ActivityIndicator size="small" color="#4CA2FF" />
                    ) : (
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={loadWorkers}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Text style={styles.contactsReloadText}>🔄 Refresh</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Empty state */}
                  {!isLoadingWorkers && workers.length === 0 ? (
                    <View style={styles.emptyContactsBox}>
                      <Text style={styles.emptyContactsIcon}>👩‍💼</Text>
                      <Text style={styles.emptyContactsTitle}>No Social Workers Found</Text>
                      <Text style={styles.emptyContactsSubtitle}>
                        Register a friend or test responder below to simulate emergency social dispatch.
                      </Text>
                    </View>
                  ) : null}

                  {/* Live Workers List */}
                  {workers.map((w) => {
                    const isAssigned = socialWorker?.badgeNumber === w.badgeNumber;
                    return (
                      <View key={w.id || w.badgeNumber} style={styles.workerItemCard}>
                        <View style={styles.workerItemHeaderRow}>
                          <View style={{ flex: 1, paddingRight: 8 }}>
                            <Text style={styles.workerItemName}>{w.name}</Text>
                            <Text style={styles.workerItemAgency}>
                              {w.badgeNumber} • {w.agency}
                            </Text>
                          </View>
                          <View style={styles.workerActionsRow}>
                            <View
                              style={[
                                styles.workerStatusBadge,
                                w.status === "Available"
                                  ? styles.workerStatusBadgeAvailable
                                  : styles.workerStatusBadgeEnRoute,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.workerStatusBadgeText,
                                  {
                                    color:
                                      w.status === "Available" ? "#00E676" : "#FF5252",
                                  },
                                ]}
                              >
                                {isSosActive && isAssigned
                                  ? `En Route (${w.currentEta || w.eta || "7m"})`
                                  : w.status || "Available"}
                              </Text>
                            </View>

                            {/* Delete button (only for unverified demo workers) */}
                            {(!w.isVerified || w.isDemo) && (
                              <TouchableOpacity
                                style={styles.deleteContactButton}
                                activeOpacity={0.7}
                                disabled={deletingWorkerId === w.id}
                                onPress={() => confirmDeleteWorker(w)}
                                accessibilityLabel={`Delete demo worker ${w.name}`}
                              >
                                {deletingWorkerId === w.id ? (
                                  <ActivityIndicator size="small" color="#FF5252" />
                                ) : (
                                  <Text style={styles.deleteContactIcon}>🗑️</Text>
                                )}
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>

                        {/* Prominent Demo Worker Label */}
                        <View style={styles.unverifiedLabelBox}>
                          <Text style={styles.unverifiedLabelText}>
                            🛡️ Demo Social Worker — Not Officially Verified
                          </Text>
                        </View>

                        <View style={styles.workerDetailsRow}>
                          <Text style={styles.workerDetailLabel}>Direct Hotline:</Text>
                          <Text style={styles.workerDetailPhone}>{w.phone}</Text>
                        </View>

                        {isAssigned && (
                          <View style={styles.activeAssignmentTag}>
                            <Text style={styles.activeAssignmentTagText}>
                              ✓ Designated Dispatch Responder
                            </Text>
                          </View>
                        )}
                      </View>
                    );
                  })}

                  {/* Add Demo Social Worker Form */}
                  <View style={styles.addContactCard}>
                    <Text style={styles.addContactCardTitle}>+ REGISTER DEMO SOCIAL WORKER</Text>
                    <Text style={styles.addWorkerFormHelp}>
                      Register a friend or test coordinator to simulate social worker dispatch.
                    </Text>

                    <View style={styles.miniInputGroup}>
                      <Text style={styles.miniInputLabel}>FULL NAME *</Text>
                      <TextInput
                        style={styles.miniTextInput}
                        placeholder="e.g. Maya Iyer, MSW"
                        placeholderTextColor="#5E7E9E"
                        value={newWorkerName}
                        onChangeText={(t) => {
                          setNewWorkerName(t);
                          if (workerError) setWorkerError(null);
                        }}
                        autoCapitalize="words"
                      />
                    </View>

                    <View style={styles.miniInputGroup}>
                      <Text style={styles.miniInputLabel}>BADGE NUMBER *</Text>
                      <TextInput
                        style={styles.miniTextInput}
                        placeholder="e.g. DEMO-501 or SW-9021"
                        placeholderTextColor="#5E7E9E"
                        value={newWorkerBadge}
                        onChangeText={(t) => {
                          setNewWorkerBadge(t);
                          if (workerError) setWorkerError(null);
                        }}
                        autoCapitalize="characters"
                      />
                      <View style={styles.chipsRow}>
                        {["DEMO-101", "DEMO-202", "SW-7701", "SW-8822"].map((badge) => (
                          <TouchableOpacity
                            key={badge}
                            style={[
                              styles.chipButton,
                              newWorkerBadge === badge ? styles.chipButtonActive : null,
                            ]}
                            onPress={() => {
                              setNewWorkerBadge(badge);
                              if (workerError) setWorkerError(null);
                            }}
                          >
                            <Text
                              style={[
                                styles.chipButtonText,
                                newWorkerBadge === badge ? styles.chipButtonTextActive : null,
                              ]}
                            >
                              {badge}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    <View style={styles.miniInputGroup}>
                      <Text style={styles.miniInputLabel}>MOBILE NUMBER (HOTLINE) *</Text>
                      <TextInput
                        style={styles.miniTextInput}
                        placeholder="e.g. +91 98765 43210 or 9876543210"
                        placeholderTextColor="#5E7E9E"
                        value={newWorkerPhone}
                        onChangeText={(t) => {
                          setNewWorkerPhone(t);
                          if (workerError) setWorkerError(null);
                        }}
                        keyboardType="phone-pad"
                      />
                    </View>

                    <View style={styles.miniInputGroup}>
                      <Text style={styles.miniInputLabel}>AGENCY / ORGANIZATION</Text>
                      <TextInput
                        style={styles.miniTextInput}
                        placeholder="e.g. Metropolitan Crisis Social Care"
                        placeholderTextColor="#5E7E9E"
                        value={newWorkerAgency}
                        onChangeText={(t) => {
                          setNewWorkerAgency(t);
                          if (workerError) setWorkerError(null);
                        }}
                        autoCapitalize="words"
                      />
                      <View style={styles.chipsRow}>
                        {[
                          "Crisis Social Care",
                          "Community Emergency Response",
                          "Trauma Crisis Dispatch",
                        ].map((ag) => (
                          <TouchableOpacity
                            key={ag}
                            style={[
                              styles.chipButton,
                              newWorkerAgency === ag ? styles.chipButtonActive : null,
                            ]}
                            onPress={() => {
                              setNewWorkerAgency(ag);
                              if (workerError) setWorkerError(null);
                            }}
                          >
                            <Text
                              style={[
                                styles.chipButtonText,
                                newWorkerAgency === ag ? styles.chipButtonTextActive : null,
                              ]}
                            >
                              {ag}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.saveContactButton,
                        { backgroundColor: "#0288D1" },
                        isSavingWorker && styles.saveContactButtonDisabled,
                      ]}
                      activeOpacity={0.85}
                      onPress={handleRegisterWorker}
                      disabled={isSavingWorker}
                    >
                      {isSavingWorker ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.saveContactButtonText}>REGISTER DEMO SOCIAL WORKER</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </ScrollView>

                <View style={styles.dialogButtonsContainer}>
                  <TouchableOpacity
                    style={styles.dialogDoneButton}
                    activeOpacity={0.8}
                    onPress={() => setModalType("NONE")}
                  >
                    <Text style={styles.dialogDoneButtonText}>Done</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* 6. EMERGENCY HISTORY MODAL */}
            {modalType === "HISTORY" && (
              <View>
                <View style={styles.dialogHeader}>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      width: "100%",
                      marginBottom: 6,
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Text style={styles.modalHeaderEmoji}>📋</Text>
                      <Text style={[styles.dialogTitle, { marginBottom: 0 }]}>
                        EMERGENCY HISTORY
                      </Text>
                    </View>
                    {token ? (
                      <TouchableOpacity
                        onPress={loadAlertHistory}
                        disabled={isLoadingHistory}
                        activeOpacity={0.7}
                        style={{
                          paddingVertical: 4,
                          paddingHorizontal: 10,
                          backgroundColor: "rgba(76, 162, 255, 0.15)",
                          borderRadius: 6,
                        }}
                      >
                        {isLoadingHistory ? (
                          <ActivityIndicator size="small" color="#4CA2FF" />
                        ) : (
                          <Text style={{ fontSize: 12, color: "#4CA2FF", fontWeight: "600" }}>
                            🔄 Refresh
                          </Text>
                        )}
                      </TouchableOpacity>
                    ) : null}
                  </View>
                  <Text style={styles.dialogSubtitle}>
                    Recorded database logs of all SOS beacon activations, coordinates, and dispatch
                    outcomes.
                  </Text>
                </View>

                <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false}>
                  {isLoadingHistory ? (
                    <View style={{ padding: 24, alignItems: "center" }}>
                      <ActivityIndicator size="small" color="#4CA2FF" />
                      <Text style={{ color: "#9E9E9E", fontSize: 13, marginTop: 8 }}>
                        Loading alert records from MongoDB...
                      </Text>
                    </View>
                  ) : emergencyHistory.length === 0 ? (
                    <View style={{ padding: 24, alignItems: "center" }}>
                      <Text style={{ fontSize: 32, marginBottom: 8 }}>📭</Text>
                      <Text style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "600" }}>
                        No SOS Alerts Recorded
                      </Text>
                      <Text
                        style={{
                          color: "#9E9E9E",
                          fontSize: 12,
                          textAlign: "center",
                          marginTop: 4,
                        }}
                      >
                        When you trigger an emergency SOS, the alert and GPS location are recorded
                        in MongoDB and displayed here.
                      </Text>
                    </View>
                  ) : (
                    emergencyHistory.map((event) => (
                      <View key={event.id} style={styles.historyItem}>
                        <View style={styles.historyItemHeader}>
                          <Text style={styles.historyId}>{event.id}</Text>
                          <View
                            style={[
                              styles.historyBadge,
                              event.status === "ACTIVE_DISPATCH"
                                ? styles.historyBadgeActive
                                : styles.historyBadgeResolved,
                            ]}
                          >
                            <Text
                              style={[
                                styles.historyBadgeText,
                                event.status === "ACTIVE_DISPATCH"
                                  ? { color: "#FF5252" }
                                  : { color: "#00E676" },
                              ]}
                            >
                              {event.status === "ACTIVE_DISPATCH" ? "ACTIVE" : "RESOLVED"}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.historyLocation}>📍 {event.location}</Text>

                        {/* Location source indicator & Google Maps link */}
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            marginTop: 4,
                            marginBottom: 4,
                            gap: 6,
                            flexWrap: "wrap",
                          }}
                        >
                          <View
                            style={[
                              styles.gpsSourceTag,
                              event.isSimulatedLocation
                                ? styles.gpsSourceTagDemo
                                : styles.gpsSourceTagReal,
                            ]}
                          >
                            <Text
                              style={[
                                styles.gpsSourceTagText,
                                event.isSimulatedLocation
                                  ? styles.gpsSourceTagTextDemo
                                  : styles.gpsSourceTagTextReal,
                              ]}
                            >
                              {event.isSimulatedLocation
                                ? "⚠️ DEMO SIMULATION"
                                : "🟢 REAL DEVICE GPS"}
                            </Text>
                          </View>

                          {event.googleMapsUrl ? (
                            <TouchableOpacity
                              onPress={() => Linking.openURL(event.googleMapsUrl!)}
                              style={{
                                paddingVertical: 2,
                                paddingHorizontal: 6,
                                backgroundColor: "rgba(76, 162, 255, 0.15)",
                                borderRadius: 4,
                              }}
                            >
                              <Text
                                style={{ fontSize: 11, color: "#4CA2FF", fontWeight: "600" }}
                              >
                                🗺️ View Google Maps
                              </Text>
                            </TouchableOpacity>
                          ) : null}
                        </View>

                        <Text style={styles.historyTime}>🕒 {event.timestamp}</Text>
                        {event.assignedWorker ? (
                          <Text style={{ fontSize: 12, color: "#00E676", marginTop: 2 }}>
                            👨‍⚕️ Worker: {event.assignedWorker}
                          </Text>
                        ) : null}
                        {event.notes ? (
                          <Text style={styles.historyNotes}>{event.notes}</Text>
                        ) : null}
                      </View>
                    ))
                  )}
                </ScrollView>

                <View style={styles.dialogButtonsContainer}>
                  <TouchableOpacity
                    style={styles.dialogDoneButton}
                    activeOpacity={0.8}
                    onPress={() => setModalType("NONE")}
                  >
                    <Text style={styles.dialogDoneButtonText}>Close History</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* 7. CITIZEN PROFILE & LOGOUT MODAL */}
            {modalType === "PROFILE" && (
              <View>
                <View style={styles.dialogHeader}>
                  <Text style={styles.modalHeaderEmoji}>👤</Text>
                  <Text style={styles.dialogTitle}>CITIZEN PROFILE</Text>
                  <Text style={styles.dialogSubtitle}>
                    Active user identity registered with the Hybrid SOS network.
                  </Text>
                </View>

                <View style={styles.dispatchDetailsCard}>
                  <View style={styles.dispatchRow}>
                    <Text style={styles.dispatchLabel}>User Name:</Text>
                    <Text style={styles.dispatchValue}>{user?.fullName || "Active Citizen"}</Text>
                  </View>
                  <View style={styles.dispatchRow}>
                    <Text style={styles.dispatchLabel}>Email:</Text>
                    <Text style={styles.dispatchValue}>{user?.email || "N/A"}</Text>
                  </View>
                  <View style={styles.dispatchRow}>
                    <Text style={styles.dispatchLabel}>Phone Number:</Text>
                    <Text style={styles.dispatchValue}>{user?.phoneNumber || "Not provided"}</Text>
                  </View>
                  <View style={styles.dispatchRow}>
                    <Text style={styles.dispatchLabel}>Protection Status:</Text>
                    <Text style={[styles.dispatchValue, { color: isSosActive ? "#FF5252" : "#00E676" }]}>
                      {isSosActive ? "🚨 SOS Broadcast Active" : "Active & Protected"}
                    </Text>
                  </View>
                </View>

                <View style={styles.dialogButtonsContainer}>
                  <TouchableOpacity
                    style={[
                      styles.dialogCancelButton,
                      {
                        borderColor: "#E53935",
                        backgroundColor: "rgba(229, 57, 53, 0.15)",
                      },
                    ]}
                    activeOpacity={0.8}
                    onPress={() => {
                      setModalType("NONE");
                      logout();
                    }}
                  >
                    <Text style={[styles.dialogCancelButtonText, { color: "#FF5252", fontWeight: "700" }]}>
                      Log Out of Account
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.dialogDoneButton}
                    activeOpacity={0.8}
                    onPress={() => setModalType("NONE")}
                  >
                    <Text style={styles.dialogDoneButtonText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#081B33",
  },

  content: {
    paddingHorizontal: 20,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    zIndex: 10,
  },

  headerTitleContainer: {
    flex: 1,
    paddingRight: 12,
  },

  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },

  appName: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: 1.2,
  },

  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 230, 118, 0.12)",
    borderColor: "rgba(0, 230, 118, 0.35)",
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 5,
  },

  activeBadgeEmergency: {
    backgroundColor: "rgba(229, 57, 53, 0.2)",
    borderColor: "#E53935",
  },

  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#00E676",
  },

  activeDotEmergency: {
    backgroundColor: "#FF5252",
  },

  activeBadgeText: {
    color: "#00E676",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
  },

  activeBadgeTextEmergency: {
    color: "#FF5252",
  },

  subtitle: {
    color: "#AFC4DD",
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },

  profileCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#102A48",
    borderWidth: 1.5,
    borderColor: "#1E4775",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    zIndex: 20,
    ...Platform.select({
      web: {
        cursor: "pointer",
      },
    }),
  },

  profileText: {
    fontSize: 22,
  },

  profileStatusDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: "#00E676",
    borderWidth: 2,
    borderColor: "#081B33",
  },

  /* Emergency Active Banner */
  emergencyBanner: {
    backgroundColor: "#1B0D13",
    borderColor: "#E53935",
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#E53935",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: "0px 4px 14px rgba(229, 57, 53, 0.4)",
      },
    }),
  },

  emergencyBannerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  emergencyBannerIcon: {
    fontSize: 24,
  },

  emergencyBannerTitle: {
    color: "#FF5252",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  emergencyBannerSubtitle: {
    color: "#AFC4DD",
    fontSize: 12,
    marginTop: 2,
  },

  emergencyBannerActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },

  bannerViewButton: {
    flex: 1,
    backgroundColor: "#208AEF",
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
  },

  bannerViewButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },

  bannerResolveButton: {
    flex: 1.2,
    backgroundColor: "rgba(229, 57, 53, 0.2)",
    borderColor: "#E53935",
    borderWidth: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
  },

  bannerResolveButtonText: {
    color: "#FF8A80",
    fontSize: 12,
    fontWeight: "700",
  },

  sosSection: {
    alignItems: "center",
    marginVertical: 10,
  },

  helpHeaderPill: {
    backgroundColor: "rgba(229, 57, 53, 0.14)",
    borderColor: "rgba(229, 57, 53, 0.3)",
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 14,
  },

  helpHeaderPillEmergency: {
    backgroundColor: "rgba(229, 57, 53, 0.25)",
    borderColor: "#E53935",
  },

  helpText: {
    color: "#FF8A80",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
  },

  helpTextEmergency: {
    color: "#FFFFFF",
  },

  /* Concentric radar halo rings around SOS */
  sosRingOuter: {
    width: 246,
    height: 246,
    borderRadius: 123,
    backgroundColor: "rgba(229, 57, 53, 0.08)",
    borderWidth: 1.5,
    borderColor: "rgba(229, 57, 53, 0.18)",
    justifyContent: "center",
    alignItems: "center",
  },

  sosRingOuterActive: {
    backgroundColor: "rgba(229, 57, 53, 0.18)",
    borderColor: "rgba(229, 57, 53, 0.4)",
  },

  sosRingMiddle: {
    width: 218,
    height: 218,
    borderRadius: 109,
    backgroundColor: "rgba(229, 57, 53, 0.15)",
    borderWidth: 1.5,
    borderColor: "rgba(229, 57, 53, 0.32)",
    justifyContent: "center",
    alignItems: "center",
  },

  sosRingMiddleActive: {
    backgroundColor: "rgba(229, 57, 53, 0.28)",
    borderColor: "rgba(229, 57, 53, 0.6)",
  },

  sosButton: {
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: "#E53935",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "rgba(255, 255, 255, 0.25)",
    ...Platform.select({
      ios: {
        shadowColor: "#E53935",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
      web: {
        boxShadow: "0px 8px 24px rgba(229, 57, 53, 0.45)",
      },
    }),
  },

  sosButtonActive: {
    backgroundColor: "#D32F2F",
    borderColor: "#FFFFFF",
    ...Platform.select({
      web: {
        boxShadow: "0px 0px 30px rgba(255, 82, 82, 0.8)",
      },
    }),
  },

  sosInnerGlow: {
    alignItems: "center",
    justifyContent: "center",
  },

  sosText: {
    color: "#FFFFFF",
    fontSize: 48,
    fontWeight: "900",
    letterSpacing: 2,
  },

  tapText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginTop: 4,
    opacity: 0.95,
  },

  sosDescription: {
    color: "#AFC4DD",
    textAlign: "center",
    fontSize: 13,
    marginTop: 16,
    lineHeight: 20,
    maxWidth: 290,
  },

  cardsContainer: {
    marginTop: 18,
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#102A48",
    borderWidth: 1,
    borderColor: "#183D66",
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: "0px 3px 8px rgba(0, 0, 0, 0.2)",
      },
    }),
  },

  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#163A63",
    borderWidth: 1,
    borderColor: "#214D7C",
    justifyContent: "center",
    alignItems: "center",
  },

  locationIconBox: {
    backgroundColor: "#12375C",
    borderColor: "#1D5288",
  },

  contactsIconBox: {
    backgroundColor: "#19355B",
    borderColor: "#254C80",
  },

  workerIconBox: {
    backgroundColor: "#1B3A5A",
    borderColor: "#285682",
  },

  historyIconBox: {
    backgroundColor: "#173455",
    borderColor: "#224A75",
  },

  icon: {
    fontSize: 22,
  },

  cardText: {
    flex: 1,
    marginLeft: 14,
  },

  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingRight: 4,
  },

  cardTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  pillBadge: {
    backgroundColor: "#16385F",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#204F85",
  },

  pillBadgeAlert: {
    backgroundColor: "rgba(229, 57, 53, 0.2)",
    borderColor: "#E53935",
  },

  pillBadgeText: {
    color: "#8EB8E6",
    fontSize: 10,
    fontWeight: "600",
  },

  pillBadgeTextAlert: {
    color: "#FF5252",
    fontWeight: "700",
  },

  workerBadge: {
    backgroundColor: "rgba(0, 230, 118, 0.1)",
    borderColor: "rgba(0, 230, 118, 0.3)",
  },

  workerBadgeText: {
    color: "#00E676",
    fontSize: 10,
    fontWeight: "600",
  },

  workerBadgeEnRoute: {
    backgroundColor: "rgba(255, 152, 0, 0.15)",
    borderColor: "#FF9800",
  },

  workerBadgeTextEnRoute: {
    color: "#FFB74D",
    fontSize: 10,
    fontWeight: "700",
  },

  cardSubtitle: {
    color: "#AFC4DD",
    fontSize: 12,
    marginTop: 4,
    lineHeight: 17,
  },

  arrow: {
    color: "#7E9EBE",
    fontSize: 26,
    marginLeft: 6,
    fontWeight: "300",
  },

  footerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    marginBottom: 8,
    gap: 6,
  },

  footerSecurityIcon: {
    fontSize: 13,
  },

  footer: {
    color: "#7693B1",
    fontSize: 12,
    fontWeight: "500",
  },

  /* ========================================================================= */
  /* MODAL STYLES                                                              */
  /* ========================================================================= */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  modalCard: {
    width: "100%",
    maxWidth: 480,
    backgroundColor: "#102A48",
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: "#1E4775",
    padding: 22,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: "0px 8px 28px rgba(0, 0, 0, 0.5)",
      },
    }),
  },

  dialogHeader: {
    alignItems: "center",
    marginBottom: 16,
  },

  dialogSirenRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(229, 57, 53, 0.15)",
    borderWidth: 2,
    borderColor: "rgba(229, 57, 53, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },

  dialogSirenIcon: {
    fontSize: 28,
  },

  modalHeaderEmoji: {
    fontSize: 34,
    marginBottom: 8,
  },

  dialogTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 1,
    textAlign: "center",
  },

  dialogSubtitle: {
    color: "#AFC4DD",
    fontSize: 13,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },

  dialogPillBox: {
    backgroundColor: "#0B1D33",
    borderColor: "#1E4775",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },

  dialogPillLabel: {
    color: "#8EB8E6",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 4,
  },

  dialogPillValue: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },

  locatingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  locatingText: {
    color: "#4CA2FF",
    fontSize: 12,
  },

  dialogButtonsContainer: {
    gap: 10,
    marginTop: 8,
  },

  dialogConfirmButton: {
    backgroundColor: "#E53935",
    borderRadius: 12,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FF8A80",
  },

  dialogConfirmButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 1,
  },

  dialogCancelButton: {
    backgroundColor: "#163A63",
    borderRadius: 12,
    height: 46,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#214D7C",
  },

  dialogCancelButtonText: {
    color: "#AFC4DD",
    fontSize: 13,
    fontWeight: "600",
  },

  dialogDoneButton: {
    backgroundColor: "#208AEF",
    borderRadius: 12,
    height: 46,
    justifyContent: "center",
    alignItems: "center",
  },

  dialogDoneButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  dialogActionButton: {
    backgroundColor: "#163A63",
    borderRadius: 12,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2B5E94",
  },

  dialogActionButtonText: {
    color: "#4CA2FF",
    fontSize: 13,
    fontWeight: "700",
  },

  dispatchDetailsCard: {
    backgroundColor: "#0B1D33",
    borderColor: "#1E4775",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    gap: 8,
  },

  dispatchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  dispatchLabel: {
    color: "#8EB8E6",
    fontSize: 12,
    fontWeight: "600",
    width: 130,
  },

  dispatchValue: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    flex: 1,
    textAlign: "right",
  },

  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0B1D33",
    borderColor: "#1E4775",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },

  contactName: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  contactDetail: {
    color: "#AFC4DD",
    fontSize: 11,
    marginTop: 2,
  },

  contactBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },

  contactBadgeReady: {
    backgroundColor: "rgba(0, 230, 118, 0.12)",
    borderColor: "rgba(0, 230, 118, 0.35)",
  },

  contactBadgeAlerted: {
    backgroundColor: "rgba(229, 57, 53, 0.2)",
    borderColor: "#E53935",
  },

  contactBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },

  historyItem: {
    backgroundColor: "#0B1D33",
    borderColor: "#1E4775",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },

  historyItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },

  historyId: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  historyBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },

  historyBadgeActive: {
    backgroundColor: "rgba(229, 57, 53, 0.2)",
    borderColor: "#E53935",
  },

  historyBadgeResolved: {
    backgroundColor: "rgba(0, 230, 118, 0.12)",
    borderColor: "rgba(0, 230, 118, 0.35)",
  },

  historyBadgeText: {
    fontSize: 9,
    fontWeight: "800",
  },

  historyLocation: {
    color: "#8EB8E6",
    fontSize: 11,
    marginTop: 2,
  },

  historyTime: {
    color: "#7E9EBE",
    fontSize: 10,
    marginTop: 2,
  },

  historyNotes: {
    color: "#AFC4DD",
    fontSize: 11,
    marginTop: 4,
    fontStyle: "italic",
  },

  contactActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  deleteContactButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "rgba(229, 57, 53, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(229, 57, 53, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },

  deleteContactIcon: {
    fontSize: 14,
  },

  emptyContactsBox: {
    backgroundColor: "#0B1D33",
    borderColor: "#1E4775",
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 12,
  },

  emptyContactsIcon: {
    fontSize: 28,
    marginBottom: 6,
  },

  emptyContactsTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },

  emptyContactsSubtitle: {
    color: "#8EB8E6",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 16,
  },

  contactsSectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    marginTop: 4,
  },

  contactsSectionHeader: {
    color: "#8EB8E6",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },

  contactsReloadText: {
    color: "#4CA2FF",
    fontSize: 11,
    fontWeight: "700",
  },

  contactSuccessBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 230, 118, 0.15)",
    borderColor: "rgba(0, 230, 118, 0.4)",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    gap: 8,
  },

  contactSuccessIcon: {
    color: "#00E676",
    fontSize: 14,
    fontWeight: "800",
  },

  contactSuccessText: {
    color: "#00E676",
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },

  contactErrorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(229, 57, 53, 0.15)",
    borderColor: "rgba(229, 57, 53, 0.4)",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    gap: 8,
  },

  contactErrorIcon: {
    fontSize: 14,
  },

  contactErrorText: {
    color: "#FF8A80",
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },

  addContactCard: {
    backgroundColor: "#0B1D33",
    borderColor: "#1E4775",
    borderWidth: 1.2,
    borderRadius: 14,
    padding: 14,
    marginTop: 8,
    marginBottom: 8,
  },

  addContactCardTitle: {
    color: "#4CA2FF",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 12,
  },

  miniInputGroup: {
    marginBottom: 10,
  },

  miniInputLabel: {
    color: "#8EB8E6",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 4,
  },

  miniTextInput: {
    backgroundColor: "#071424",
    borderColor: "#1E4775",
    borderWidth: 1,
    borderRadius: 10,
    color: "#FFFFFF",
    fontSize: 13,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
  },

  chipButton: {
    backgroundColor: "#102A48",
    borderColor: "#1E4775",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },

  chipButtonActive: {
    backgroundColor: "rgba(32, 138, 239, 0.3)",
    borderColor: "#208AEF",
  },

  chipButtonText: {
    color: "#AFC4DD",
    fontSize: 11,
    fontWeight: "600",
  },

  chipButtonTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  saveContactButton: {
    backgroundColor: "#208AEF",
    borderRadius: 10,
    height: 42,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 6,
  },

  saveContactButtonDisabled: {
    opacity: 0.6,
  },

  saveContactButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
  },

  workerDisclaimerBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "rgba(255, 171, 0, 0.12)",
    borderColor: "rgba(255, 171, 0, 0.4)",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 10,
  },

  workerDisclaimerIcon: {
    fontSize: 18,
    marginTop: 2,
  },

  workerDisclaimerTitle: {
    color: "#FFD54F",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 2,
  },

  workerDisclaimerText: {
    color: "#FFE082",
    fontSize: 11,
    lineHeight: 15,
  },

  workerItemCard: {
    backgroundColor: "#0B1D33",
    borderColor: "#1E4775",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },

  workerItemHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },

  workerActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  workerItemName: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  workerItemAgency: {
    color: "#8EB8E6",
    fontSize: 11,
    marginTop: 2,
  },

  workerStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },

  workerStatusBadgeAvailable: {
    backgroundColor: "rgba(0, 230, 118, 0.15)",
    borderColor: "rgba(0, 230, 118, 0.4)",
  },

  workerStatusBadgeEnRoute: {
    backgroundColor: "rgba(229, 57, 53, 0.15)",
    borderColor: "rgba(229, 57, 53, 0.4)",
  },

  workerStatusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },

  unverifiedLabelBox: {
    backgroundColor: "rgba(255, 171, 0, 0.1)",
    borderColor: "rgba(255, 171, 0, 0.3)",
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 6,
    alignSelf: "flex-start",
    marginVertical: 4,
  },

  unverifiedLabelText: {
    color: "#FFB300",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4,
  },

  workerDetailsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },

  workerDetailLabel: {
    color: "#5E7E9E",
    fontSize: 11,
    fontWeight: "600",
  },

  workerDetailPhone: {
    color: "#4CA2FF",
    fontSize: 12,
    fontWeight: "700",
  },

  activeAssignmentTag: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "rgba(30, 71, 117, 0.5)",
  },

  activeAssignmentTagText: {
    color: "#00E676",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  addWorkerFormHelp: {
    color: "#8EB8E6",
    fontSize: 11,
    lineHeight: 15,
    marginTop: -8,
    marginBottom: 10,
  },

  pillBadgeRealGps: {
    backgroundColor: "rgba(0, 230, 118, 0.15)",
    borderColor: "rgba(0, 230, 118, 0.4)",
  },
  pillBadgeTextRealGps: {
    color: "#00E676",
  },
  pillBadgeDemoLocation: {
    backgroundColor: "rgba(255, 171, 0, 0.15)",
    borderColor: "rgba(255, 171, 0, 0.4)",
  },
  pillBadgeTextDemoLocation: {
    color: "#FFB300",
  },
  pillBadgeLocating: {
    backgroundColor: "rgba(76, 162, 255, 0.15)",
    borderColor: "rgba(76, 162, 255, 0.4)",
  },
  pillBadgeTextLocating: {
    color: "#4CA2FF",
  },

  dialogPillHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  gpsSourceTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  gpsSourceTagReal: {
    backgroundColor: "rgba(0, 230, 118, 0.15)",
    borderColor: "rgba(0, 230, 118, 0.4)",
  },
  gpsSourceTagDemo: {
    backgroundColor: "rgba(255, 171, 0, 0.15)",
    borderColor: "rgba(255, 171, 0, 0.4)",
  },
  gpsSourceTagText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  gpsSourceTagTextReal: {
    color: "#00E676",
  },
  gpsSourceTagTextDemo: {
    color: "#FFB300",
  },

  locationWarningBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "rgba(255, 171, 0, 0.12)",
    borderColor: "rgba(255, 171, 0, 0.4)",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    gap: 8,
  },
  locationWarningIcon: {
    fontSize: 16,
    marginTop: 1,
  },
  locationWarningTitle: {
    color: "#FFB300",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  locationWarningText: {
    color: "#DCE7F5",
    fontSize: 11,
    lineHeight: 15,
  },

  mapsLinkBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#0D223B",
    borderColor: "rgba(76, 162, 255, 0.3)",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  mapsLinkLabel: {
    color: "#5E7E9E",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  mapsLinkUrl: {
    color: "#4CA2FF",
    fontSize: 11,
    fontWeight: "600",
  },
  mapsOpenButton: {
    backgroundColor: "rgba(76, 162, 255, 0.2)",
    borderColor: "#4CA2FF",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  mapsOpenButtonText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },

  demoWarningSmall: {
    color: "#FFB300",
    fontSize: 10,
    fontWeight: "700",
    marginTop: 2,
  },
  realGpsSmall: {
    color: "#00E676",
    fontSize: 10,
    fontWeight: "700",
    marginTop: 2,
  },
});
