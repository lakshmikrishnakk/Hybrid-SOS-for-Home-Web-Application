import React, { useState } from "react";
import { StatusBar } from "expo-status-bar";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/auth-context";

interface LoginScreenProps {
  onNavigateToRegister: () => void;
}

export default function LoginScreen({ onNavigateToRegister }: LoginScreenProps) {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    general?: string;
  }>({});

  const validate = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      newErrors.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      newErrors.email = "Please enter a valid email address.";
    }

    if (!password.trim()) {
      newErrors.password = "Password is required.";
    } else if (password.trim().length < 6) {
      newErrors.password = "Password must be at least 6 characters.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = () => {
    setErrors({});
    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    const result = login({ email, password });
    setIsSubmitting(false);

    if (!result.success) {
      setErrors({ general: result.error || "Login failed. Please check your credentials." });
    }
  };

  const handleFillDemo = () => {
    setEmail("demo@hybridsos.com");
    setPassword("Password123");
    setErrors({});
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: Math.max(insets.top + 20, 36),
              paddingBottom: Math.max(insets.bottom + 24, 36),
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header Brand Section */}
          <View style={styles.brandContainer}>
            <View style={styles.shieldBadge}>
              <Text style={styles.shieldIcon}>🛡️</Text>
            </View>

            <View style={styles.appNameRow}>
              <Text style={styles.appName}>HYBRID</Text>
              <Text style={styles.appNameHighlight}> SOS</Text>
            </View>

            <View style={styles.statusPill}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>EMERGENCY DISPATCH SYSTEM</Text>
            </View>

            <Text style={styles.headerSubtitle}>
              Sign in to manage your emergency beacon, trusted contacts, and social worker response.
            </Text>
          </View>

          {/* Quick Demo Credentials Pill */}
          <View style={styles.demoCard}>
            <View style={styles.demoHeader}>
              <Text style={styles.demoTitle}>⚡ Quick Demo Access</Text>
              <TouchableOpacity
                onPress={handleFillDemo}
                activeOpacity={0.8}
                style={styles.demoButton}
              >
                <Text style={styles.demoButtonText}>Auto-Fill Demo</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.demoSubtitle}>
              Email: <Text style={styles.demoCode}>demo@hybridsos.com</Text> | Pass:{" "}
              <Text style={styles.demoCode}>Password123</Text>
            </Text>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>ACCOUNT LOGIN</Text>

            {/* General Error Banner */}
            {errors.general ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerIcon}>⚠️</Text>
                <Text style={styles.errorBannerText}>{errors.general}</Text>
              </View>
            ) : null}

            {/* Email Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
              <View
                style={[
                  styles.inputContainer,
                  errors.email ? styles.inputContainerError : null,
                ]}
              >
                <Text style={styles.inputIcon}>✉️</Text>
                <TextInput
                  style={styles.input}
                  placeholder="name@example.com"
                  placeholderTextColor="#617D9D"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                />
              </View>
              {errors.email ? <Text style={styles.fieldError}>{errors.email}</Text> : null}
            </View>

            {/* Password Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>PASSWORD</Text>
              <View
                style={[
                  styles.inputContainer,
                  errors.password ? styles.inputContainerError : null,
                ]}
              >
                <Text style={styles.inputIcon}>🔒</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor="#617D9D"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                  activeOpacity={0.7}
                >
                  <Text style={styles.eyeIcon}>{showPassword ? "👁️" : "👁️‍🗨️"}</Text>
                </TouchableOpacity>
              </View>
              {errors.password ? (
                <Text style={styles.fieldError}>{errors.password}</Text>
              ) : null}
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.primaryButton, isSubmitting ? styles.buttonDisabled : null]}
              onPress={handleLogin}
              disabled={isSubmitting}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>SIGN IN</Text>
              )}
            </TouchableOpacity>

            {/* Register Navigation Row */}
            <View style={styles.switchAuthRow}>
              <Text style={styles.switchAuthPrompt}>Don't have an account?</Text>
              <TouchableOpacity
                onPress={onNavigateToRegister}
                activeOpacity={0.7}
                style={styles.switchAuthLinkButton}
              >
                <Text style={styles.switchAuthLinkText}>Register Now</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Security Assurance Footer */}
          <View style={styles.footerNote}>
            <Text style={styles.footerIcon}>🔒</Text>
            <Text style={styles.footerText}>
              256-bit encrypted authentication • Protected by Hybrid SOS Dispatch
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#081B33",
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 22,
    flexGrow: 1,
    justifyContent: "center",
  },
  brandContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  shieldBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#102A48",
    borderWidth: 2,
    borderColor: "#1E4775",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  shieldIcon: {
    fontSize: 28,
  },
  appNameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  appName: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  appNameHighlight: {
    color: "#E53935",
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 230, 118, 0.12)",
    borderColor: "rgba(0, 230, 118, 0.35)",
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#00E676",
  },
  statusText: {
    color: "#00E676",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  headerSubtitle: {
    color: "#AFC4DD",
    fontSize: 13,
    textAlign: "center",
    marginTop: 10,
    lineHeight: 18,
    maxWidth: 320,
  },
  demoCard: {
    backgroundColor: "#0D223B",
    borderColor: "#1B436D",
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  demoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  demoTitle: {
    color: "#8EB8E6",
    fontSize: 12,
    fontWeight: "700",
  },
  demoButton: {
    backgroundColor: "#163A63",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2B5E94",
  },
  demoButtonText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  demoSubtitle: {
    color: "#8EB8E6",
    fontSize: 11,
    marginTop: 2,
  },
  demoCode: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  formCard: {
    backgroundColor: "#102A48",
    borderColor: "#183D66",
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.3)",
      },
    }),
  },
  formTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 16,
    textAlign: "center",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(229, 57, 53, 0.16)",
    borderColor: "rgba(229, 57, 53, 0.45)",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
    gap: 8,
  },
  errorBannerIcon: {
    fontSize: 16,
  },
  errorBannerText: {
    color: "#FF8A80",
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
    lineHeight: 16,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    color: "#8EB8E6",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0B1D33",
    borderColor: "#1E4775",
    borderWidth: 1.2,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  inputContainerError: {
    borderColor: "#E53935",
    backgroundColor: "rgba(229, 57, 53, 0.05)",
  },
  inputIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 14,
    paddingVertical: 0,
  },
  eyeButton: {
    padding: 6,
  },
  eyeIcon: {
    fontSize: 16,
  },
  fieldError: {
    color: "#FF8A80",
    fontSize: 11,
    marginTop: 4,
    marginLeft: 2,
    fontWeight: "500",
  },
  primaryButton: {
    backgroundColor: "#208AEF",
    borderRadius: 14,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#4CA2FF",
    ...Platform.select({
      ios: {
        shadowColor: "#208AEF",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: "0px 4px 12px rgba(32, 138, 239, 0.35)",
      },
    }),
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  switchAuthRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 18,
    gap: 6,
  },
  switchAuthPrompt: {
    color: "#AFC4DD",
    fontSize: 13,
  },
  switchAuthLinkButton: {
    paddingVertical: 4,
  },
  switchAuthLinkText: {
    color: "#4CA2FF",
    fontSize: 13,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  footerNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    gap: 6,
  },
  footerIcon: {
    fontSize: 12,
  },
  footerText: {
    color: "#617D9D",
    fontSize: 11,
    textAlign: "center",
  },
});
