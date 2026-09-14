import { StatusBar } from "expo-status-bar";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();

  const handleSOS = () => {
    Alert.alert(
      "🚨 Emergency SOS",
      "SOS button pressed. Emergency assistance will be activated here, notifying your emergency contacts and assigned social worker with your real-time location.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm Alert",
          style: "destructive",
          onPress: () => {
            Alert.alert("Alert Sent", "Emergency services and contacts have been notified.");
          },
        },
      ]
    );
  };

  const handleSectionPress = (sectionName: string, message: string) => {
    Alert.alert(sectionName, message);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(insets.top + 10, 24),
            paddingBottom: Math.max(insets.bottom + 30, 40),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleContainer}>
            <View style={styles.brandRow}>
              <Text style={styles.appName}>HYBRID SOS</Text>
              <View style={styles.activeBadge}>
                <View style={styles.activeDot} />
                <Text style={styles.activeBadgeText}>PROTECTED</Text>
              </View>
            </View>
            <Text style={styles.subtitle}>
              Emergency assistance when you need it
            </Text>
          </View>

          <TouchableOpacity
            style={styles.profileCircle}
            activeOpacity={0.7}
            onPress={() => handleSectionPress("Profile", "User profile and settings.")}
          >
            <Text style={styles.profileText}>👤</Text>
            <View style={styles.profileStatusDot} />
          </TouchableOpacity>
        </View>

        {/* SOS Action Beacon Area */}
        <View style={styles.sosSection}>
          <View style={styles.helpHeaderPill}>
            <Text style={styles.helpText}>EMERGENCY BEACON</Text>
          </View>

          {/* Concentric Glow Rings around SOS Button */}
          <View style={styles.sosRingOuter}>
            <View style={styles.sosRingMiddle}>
              <TouchableOpacity
                style={styles.sosButton}
                onPress={handleSOS}
                activeOpacity={0.85}
              >
                <View style={styles.sosInnerGlow}>
                  <Text style={styles.sosText}>SOS</Text>
                  <Text style={styles.tapText}>TAP FOR HELP</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.sosDescription}>
            Your emergency contacts and assigned social worker can be alerted.
          </Text>
        </View>

        {/* Action Cards Section */}
        <View style={styles.cardsContainer}>
          {/* Location Card */}
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.75}
            onPress={() =>
              handleSectionPress(
                "Your Location",
                "Your current location will be automatically captured and transmitted during an SOS alert."
              )
            }
          >
            <View style={[styles.iconBox, styles.locationIconBox]}>
              <Text style={styles.icon}>📍</Text>
            </View>

            <View style={styles.cardText}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle}>Your Location</Text>
                <View style={styles.pillBadge}>
                  <Text style={styles.pillBadgeText}>GPS Ready</Text>
                </View>
              </View>
              <Text style={styles.cardSubtitle}>
                Location will be detected when SOS is activated
              </Text>
            </View>

            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>

          {/* Emergency Contacts Card */}
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.75}
            onPress={() =>
              handleSectionPress(
                "Emergency Contacts",
                "Manage your primary and secondary emergency contacts."
              )
            }
          >
            <View style={[styles.iconBox, styles.contactsIconBox]}>
              <Text style={styles.icon}>👨‍👩‍👧</Text>
            </View>

            <View style={styles.cardText}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle}>Emergency Contacts</Text>
                <View style={styles.pillBadge}>
                  <Text style={styles.pillBadgeText}>Configured</Text>
                </View>
              </View>
              <Text style={styles.cardSubtitle}>
                Add family members or trusted contacts
              </Text>
            </View>

            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>

          {/* Social Worker Card */}
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.75}
            onPress={() =>
              handleSectionPress(
                "Social Worker",
                "Connect with your designated social worker for care coordination and urgent help."
              )
            }
          >
            <View style={[styles.iconBox, styles.workerIconBox]}>
              <Text style={styles.icon}>👩‍💼</Text>
            </View>

            <View style={styles.cardText}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle}>Social Worker</Text>
                <View style={[styles.pillBadge, styles.workerBadge]}>
                  <Text style={styles.workerBadgeText}>Assigned</Text>
                </View>
              </View>
              <Text style={styles.cardSubtitle}>
                Get help from an assigned nearby social worker
              </Text>
            </View>

            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>

          {/* Emergency History Card */}
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.75}
            onPress={() =>
              handleSectionPress(
                "Emergency History",
                "View logs of previous alerts, dispatch status, and timestamps."
              )
            }
          >
            <View style={[styles.iconBox, styles.historyIconBox]}>
              <Text style={styles.icon}>📋</Text>
            </View>

            <View style={styles.cardText}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle}>Emergency History</Text>
                <View style={styles.pillBadge}>
                  <Text style={styles.pillBadgeText}>Logs</Text>
                </View>
              </View>
              <Text style={styles.cardSubtitle}>
                View your previous SOS requests
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

  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#00E676",
  },

  activeBadgeText: {
    color: "#00E676",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
  },

  subtitle: {
    color: "#AFC4DD",
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },

  profileCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#102A48",
    borderWidth: 1.5,
    borderColor: "#1E4775",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },

  profileText: {
    fontSize: 20,
  },

  profileStatusDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#00E676",
    borderWidth: 2,
    borderColor: "#081B33",
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

  helpText: {
    color: "#FF8A80",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
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

  pillBadgeText: {
    color: "#8EB8E6",
    fontSize: 10,
    fontWeight: "600",
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
});
