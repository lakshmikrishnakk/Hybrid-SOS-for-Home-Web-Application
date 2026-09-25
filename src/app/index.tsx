import React, { useState, useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/auth-context";
import { EmergencyContact, EmergencyEvent, LocationCoords, SocialWorker } from "@/types/emergency";

type ModalType =
  | "NONE"
  | "CONFIRM_SOS"
  | "SOS_SUCCESS"
  | "LOCATION"
  | "CONTACTS"
  | "SOCIAL_WORKER"
  | "HISTORY"
  | "PROFILE";

const INITIAL_CONTACTS: EmergencyContact[] = [
  {
    id: "c1",
    name: "Priya Sharma",
    relationship: "Mother",
    phone: "+1 (555) 0192",
    status: "Ready",
  },
  {
    id: "c2",
    name: "Maya Sharma",
    relationship: "Sister",
    phone: "+1 (555) 0183",
    status: "Ready",
  },
  {
    id: "c3",
    name: "Emergency Services",
    relationship: "National 911 / EMS",
    phone: "911",
    status: "Ready",
  },
];

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
  const { user, logout } = useAuth();

  const [modalType, setModalType] = useState<ModalType>("NONE");
  const [isSosActive, setIsSosActive] = useState<boolean>(false);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [currentLocation, setCurrentLocation] = useState<LocationCoords | null>(null);
  const [activeEvent, setActiveEvent] = useState<EmergencyEvent | null>(null);

  const [contacts, setContacts] = useState<EmergencyContact[]>(INITIAL_CONTACTS);
  const [socialWorker, setSocialWorker] = useState<SocialWorker>(INITIAL_WORKER);

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

  // Attempt to detect location
  const fetchLocation = async (): Promise<LocationCoords> => {
    setIsLocating(true);

    if (typeof navigator !== "undefined" && navigator.geolocation) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 6000,
            maximumAge: 10000,
          });
        });

        const coords: LocationCoords = {
          latitude: Number(position.coords.latitude.toFixed(5)),
          longitude: Number(position.coords.longitude.toFixed(5)),
          accuracy: Math.round(position.coords.accuracy || 12),
          address: `${position.coords.latitude.toFixed(4)}° N, ${position.coords.longitude.toFixed(4)}° E`,
          isSimulated: false,
        };

        setCurrentLocation(coords);
        setIsLocating(false);
        return coords;
      } catch (err) {
        // Fall through to fallback
      }
    }

    // Default emergency fallback coordinates
    const fallbackCoords: LocationCoords = {
      latitude: 12.9716,
      longitude: 77.5946,
      accuracy: 15,
      address: "12.9716° N, 77.5946° E (Estimated Device GPS)",
      isSimulated: true,
    };

    setCurrentLocation(fallbackCoords);
    setIsLocating(false);
    return fallbackCoords;
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

    const eventId = `SOS-${Date.now().toString().slice(-6)}`;
    const newEvent: EmergencyEvent = {
      id: eventId,
      userName: user?.fullName || "Active Citizen",
      userEmail: user?.email || "demo@hybridsos.com",
      userPhone: user?.phoneNumber || "+1 (555) 234-5678",
      timestamp: `${timeFormatted}, ${dateFormatted}`,
      dateStr: "Active Now",
      status: "ACTIVE_DISPATCH",
      location: loc.address || `${loc.latitude}° N, ${loc.longitude}° E`,
      latitude: loc.latitude,
      longitude: loc.longitude,
      notifiedContacts: [
        "Priya Sharma (Mother) - SMS Sent",
        "Maya Sharma (Sister) - SMS Sent",
        "Central Dispatch EMS (911) - Alert Received",
      ],
      assignedWorker: "Sarah Jenkins, LCSW (Badge #SW-4821)",
      notes: "Urgent beacon triggered by user. High-priority dispatch active.",
    };

    setActiveEvent(newEvent);
    setIsSosActive(true);

    // Update contacts status
    setContacts((prev) =>
      prev.map((c) => ({
        ...c,
        status: "Notified",
      }))
    );

    // Update social worker status
    setSocialWorker((prev) => ({
      ...prev,
      status: "En Route",
      eta: "7 mins",
    }));

    // Prepend to history
    setEmergencyHistory((prev) => [newEvent, ...prev]);

    // Open success modal
    setModalType("SOS_SUCCESS");
  };

  const handleResolveSOS = () => {
    setIsSosActive(false);

    if (activeEvent) {
      setEmergencyHistory((prev) =>
        prev.map((item) =>
          item.id === activeEvent.id ? { ...item, status: "RESOLVED", dateStr: "Resolved" } : item
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
                  Coordinates transmitted. Responders & contacts alerted.
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
                style={styles.bannerResolveButton}
                activeOpacity={0.8}
                onPress={handleResolveSOS}
              >
                <Text style={styles.bannerResolveButtonText}>Cancel / Resolve SOS</Text>
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
                      ? "Broadcasting"
                      : currentLocation
                      ? "GPS Ready"
                      : "Locating..."}
                  </Text>
                </View>
              </View>
              <Text style={styles.cardSubtitle}>
                {isSosActive
                  ? `Transmitting: ${currentLocation?.address || "Live Coordinates"}`
                  : currentLocation
                  ? `${currentLocation.address} (±${currentLocation.accuracy}m)`
                  : "Tap to detect your current location"}
              </Text>
            </View>

            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>

          {/* Emergency Contacts Card */}
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.75}
            onPress={() => setModalType("CONTACTS")}
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
                    {isSosActive ? "Alerted (2)" : "2 Configured"}
                  </Text>
                </View>
              </View>
              <Text style={styles.cardSubtitle}>
                {isSosActive
                  ? "SMS sent to Mother & Sister with live location"
                  : "Manage your primary and secondary trusted contacts"}
              </Text>
            </View>

            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>

          {/* Social Worker Card */}
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.75}
            onPress={() => setModalType("SOCIAL_WORKER")}
          >
            <View style={[styles.iconBox, styles.workerIconBox]}>
              <Text style={styles.icon}>👩‍💼</Text>
            </View>

            <View style={styles.cardText}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle}>Social Worker</Text>
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
                    {isSosActive ? "En Route (7m)" : "Assigned"}
                  </Text>
                </View>
              </View>
              <Text style={styles.cardSubtitle}>
                {isSosActive
                  ? `${socialWorker.name} dispatched to your location`
                  : `${socialWorker.name} assigned for immediate care`}
              </Text>
            </View>

            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>

          {/* Emergency History Card */}
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.75}
            onPress={() => setModalType("HISTORY")}
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
                  <Text style={styles.dialogPillLabel}>LOCATION TO BROADCAST:</Text>
                  {isLocating ? (
                    <View style={styles.locatingRow}>
                      <ActivityIndicator size="small" color="#4CA2FF" />
                      <Text style={styles.locatingText}>Acquiring GPS fix...</Text>
                    </View>
                  ) : (
                    <Text style={styles.dialogPillValue}>
                      📍 {currentLocation?.address || "Coordinates detected"}
                    </Text>
                  )}
                </View>

                <View style={styles.dialogButtonsContainer}>
                  <TouchableOpacity
                    style={styles.dialogConfirmButton}
                    activeOpacity={0.85}
                    onPress={handleConfirmSOS}
                  >
                    <Text style={styles.dialogConfirmButtonText}>CONFIRM EMERGENCY ALERT</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.dialogCancelButton}
                    activeOpacity={0.7}
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
                  <View style={[styles.dialogSirenRing, { borderColor: "#00E676", backgroundColor: "rgba(0, 230, 118, 0.15)" }]}>
                    <Text style={styles.dialogSirenIcon}>📡</Text>
                  </View>
                  <Text style={[styles.dialogTitle, { color: "#FF5252" }]}>
                    EMERGENCY ALERT DISPATCHED
                  </Text>
                  <Text style={styles.dialogSubtitle}>
                    Your emergency beacon is actively broadcasting. First responders and your
                    care team are mobilized.
                  </Text>
                </View>

                {/* Dispatch Details Card */}
                <View style={styles.dispatchDetailsCard}>
                  <View style={styles.dispatchRow}>
                    <Text style={styles.dispatchLabel}>Event ID:</Text>
                    <Text style={styles.dispatchValue}>{activeEvent?.id || "SOS-ACTIVE"}</Text>
                  </View>
                  <View style={styles.dispatchRow}>
                    <Text style={styles.dispatchLabel}>User:</Text>
                    <Text style={styles.dispatchValue}>{user?.fullName || "Active Citizen"}</Text>
                  </View>
                  <View style={styles.dispatchRow}>
                    <Text style={styles.dispatchLabel}>Phone:</Text>
                    <Text style={styles.dispatchValue}>{user?.phoneNumber || "+1 (555) 234-5678"}</Text>
                  </View>
                  <View style={styles.dispatchRow}>
                    <Text style={styles.dispatchLabel}>GPS Location:</Text>
                    <Text style={styles.dispatchValue}>
                      {currentLocation?.address || "Active Coordinates"}
                    </Text>
                  </View>
                  <View style={styles.dispatchRow}>
                    <Text style={styles.dispatchLabel}>Social Worker:</Text>
                    <Text style={[styles.dispatchValue, { color: "#00E676" }]}>
                      {socialWorker.name} (ETA ~7m)
                    </Text>
                  </View>
                  <View style={styles.dispatchRow}>
                    <Text style={styles.dispatchLabel}>Contacts Notified:</Text>
                    <Text style={styles.dispatchValue}>Priya Sharma, Maya Sharma</Text>
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
                    style={[styles.dialogCancelButton, { borderColor: "#E53935" }]}
                    activeOpacity={0.8}
                    onPress={handleResolveSOS}
                  >
                    <Text style={[styles.dialogCancelButtonText, { color: "#FF5252" }]}>
                      Cancel / Resolve SOS Alert
                    </Text>
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

                <View style={styles.dispatchDetailsCard}>
                  <View style={styles.dispatchRow}>
                    <Text style={styles.dispatchLabel}>Status:</Text>
                    <Text style={[styles.dispatchValue, { color: isSosActive ? "#FF5252" : "#00E676" }]}>
                      {isSosActive ? "Broadcasting to EMS" : "GPS Locked & Ready"}
                    </Text>
                  </View>
                  <View style={styles.dispatchRow}>
                    <Text style={styles.dispatchLabel}>Latitude:</Text>
                    <Text style={styles.dispatchValue}>{currentLocation?.latitude ?? "Detecting..."}° N</Text>
                  </View>
                  <View style={styles.dispatchRow}>
                    <Text style={styles.dispatchLabel}>Longitude:</Text>
                    <Text style={styles.dispatchValue}>{currentLocation?.longitude ?? "Detecting..."}° E</Text>
                  </View>
                  <View style={styles.dispatchRow}>
                    <Text style={styles.dispatchLabel}>Accuracy:</Text>
                    <Text style={styles.dispatchValue}>±{currentLocation?.accuracy || 12} meters</Text>
                  </View>
                  <View style={styles.dispatchRow}>
                    <Text style={styles.dispatchLabel}>Address / Tag:</Text>
                    <Text style={styles.dispatchValue}>{currentLocation?.address || "Active Coordinates"}</Text>
                  </View>
                </View>

                <View style={styles.dialogButtonsContainer}>
                  <TouchableOpacity
                    style={styles.dialogActionButton}
                    activeOpacity={0.8}
                    onPress={fetchLocation}
                  >
                    {isLocating ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
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

                <ScrollView style={{ maxHeight: 250 }} showsVerticalScrollIndicator={false}>
                  {contacts.map((contact) => (
                    <View key={contact.id} style={styles.contactItem}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.contactName}>{contact.name}</Text>
                        <Text style={styles.contactDetail}>
                          {contact.relationship} • {contact.phone}
                        </Text>
                      </View>
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
                          {contact.status === "Notified" ? "Alerted via SMS" : "Ready"}
                        </Text>
                      </View>
                    </View>
                  ))}
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
                  <Text style={styles.dialogTitle}>ASSIGNED SOCIAL WORKER</Text>
                  <Text style={styles.dialogSubtitle}>
                    Designated social care coordinator for emergency response and urgent assistance.
                  </Text>
                </View>

                <View style={styles.dispatchDetailsCard}>
                  <View style={styles.dispatchRow}>
                    <Text style={styles.dispatchLabel}>Worker Name:</Text>
                    <Text style={styles.dispatchValue}>{socialWorker.name}</Text>
                  </View>
                  <View style={styles.dispatchRow}>
                    <Text style={styles.dispatchLabel}>Badge Number:</Text>
                    <Text style={styles.dispatchValue}>{socialWorker.badgeNumber}</Text>
                  </View>
                  <View style={styles.dispatchRow}>
                    <Text style={styles.dispatchLabel}>Agency:</Text>
                    <Text style={styles.dispatchValue}>{socialWorker.agency}</Text>
                  </View>
                  <View style={styles.dispatchRow}>
                    <Text style={styles.dispatchLabel}>Direct Hotline:</Text>
                    <Text style={styles.dispatchValue}>{socialWorker.phone}</Text>
                  </View>
                  <View style={styles.dispatchRow}>
                    <Text style={styles.dispatchLabel}>Current Status:</Text>
                    <Text
                      style={[
                        styles.dispatchValue,
                        { color: isSosActive ? "#FF5252" : "#00E676" },
                      ]}
                    >
                      {isSosActive
                        ? `En Route to Location (ETA: ${socialWorker.eta || "7 mins"})`
                        : "Assigned & On Call"}
                    </Text>
                  </View>
                </View>

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
                  <Text style={styles.modalHeaderEmoji}>📋</Text>
                  <Text style={styles.dialogTitle}>EMERGENCY ALERT HISTORY</Text>
                  <Text style={styles.dialogSubtitle}>
                    Complete logs of all SOS beacon activations, coordinates, and dispatch outcomes.
                  </Text>
                </View>

                <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator={false}>
                  {emergencyHistory.map((event) => (
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
                      <Text style={styles.historyTime}>🕒 {event.timestamp}</Text>
                      {event.notes ? <Text style={styles.historyNotes}>{event.notes}</Text> : null}
                    </View>
                  ))}
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
});
