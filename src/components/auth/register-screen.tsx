import React, { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import {
  ActivityIndicator,
  BackHandler,
  KeyboardAvoidingView,
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
import { RegisterFormData, ValidationErrors } from "@/types/auth";

interface RegisterScreenProps {
  onNavigateToLogin: () => void;
}

export default function RegisterScreen({ onNavigateToLogin }: RegisterScreenProps) {
  const insets = useSafeAreaInsets();
  const { register } = useAuth();

  const [formData, setFormData] = useState<RegisterFormData>({
    fullName: "",
    email: "",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});

  // Android hardware back button handler
  useEffect(() => {
    const onBackPress = () => {
      onNavigateToLogin();
      return true; // handled
    };

    const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => subscription.remove();
  }, [onNavigateToLogin]);

  const updateField = (field: keyof RegisterFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field] || errors.general) {
      setErrors((prev) => ({ ...prev, [field]: undefined, general: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: ValidationErrors = {};

    // Full Name
    const trimmedName = formData.fullName.trim();
    if (!trimmedName) {
      newErrors.fullName = "Full Name is required.";
    } else if (trimmedName.length < 2) {
      newErrors.fullName = "Full Name must be at least 2 characters.";
    }

    // Email
    const trimmedEmail = formData.email.trim();
    if (!trimmedEmail) {
      newErrors.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      newErrors.email = "Please enter a valid email address.";
    }

    // Phone Number
    const cleanedPhone = formData.phoneNumber.replace(/[\s\-()]/g, "");
    if (!cleanedPhone) {
      newErrors.phoneNumber = "Phone number is required.";
    } else if (cleanedPhone.length < 10) {
      newErrors.phoneNumber = "Phone number must have at least 10 digits.";
    } else if (!/^\+?[0-9]{10,15}$/.test(cleanedPhone)) {
      newErrors.phoneNumber = "Please enter a valid numeric phone number.";
    }

    // Password
    if (!formData.password.trim()) {
      newErrors.password = "Password is required.";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters.";
    }

    // Confirm Password
    if (!formData.confirmPassword.trim()) {
      newErrors.confirmPassword = "Confirm password is required.";
    } else if (formData.confirmPassword !== formData.password) {
      newErrors.confirmPassword = "Passwords do not match.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = () => {
    setErrors({});
    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    const result = register(formData);
    setIsSubmitting(false);

    if (!result.success) {
      setErrors({ general: result.error || "Registration failed. Please try again." });
    }
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
              paddingTop: Math.max(insets.top + 16, 28),
              paddingBottom: Math.max(insets.bottom + 24, 36),
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header Bar */}
          <View style={styles.topBar}>
            <TouchableOpacity
              onPress={onNavigateToLogin}
              style={styles.backButton}
              activeOpacity={0.7}
            >
              <Text style={styles.backArrow}>‹</Text>
              <Text style={styles.backText}>Back to Login</Text>
            </TouchableOpacity>
          </View>

          {/* Title Area */}
          <View style={styles.headerContainer}>
            <View style={styles.badgeRow}>
              <View style={styles.activeDot} />
              <Text style={styles.badgeText}>CITIZEN REGISTRATION</Text>
            </View>
            <Text style={styles.titleText}>Create SOS Profile</Text>
            <Text style={styles.subtitleText}>
              Register your profile to link emergency contacts, location services, and verified responder support.
            </Text>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            {/* General Error Banner */}
            {errors.general ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerIcon}>⚠️</Text>
                <Text style={styles.errorBannerText}>{errors.general}</Text>
              </View>
            ) : null}

            {/* Full Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>FULL NAME *</Text>
              <View
                style={[
                  styles.inputContainer,
                  errors.fullName ? styles.inputContainerError : null,
                ]}
              >
                <Text style={styles.inputIcon}>👤</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. John Doe"
                  placeholderTextColor="#617D9D"
                  value={formData.fullName}
                  onChangeText={(text) => updateField("fullName", text)}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>
              {errors.fullName ? (
                <Text style={styles.fieldError}>{errors.fullName}</Text>
              ) : null}
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>EMAIL ADDRESS *</Text>
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
                  value={formData.email}
                  onChangeText={(text) => updateField("email", text)}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                />
              </View>
              {errors.email ? <Text style={styles.fieldError}>{errors.email}</Text> : null}
            </View>

            {/* Phone Number */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>PHONE NUMBER *</Text>
              <View
                style={[
                  styles.inputContainer,
                  errors.phoneNumber ? styles.inputContainerError : null,
                ]}
              >
                <Text style={styles.inputIcon}>📞</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. +1 555 123 4567"
                  placeholderTextColor="#617D9D"
                  value={formData.phoneNumber}
                  onChangeText={(text) => updateField("phoneNumber", text)}
                  keyboardType="phone-pad"
                />
              </View>
              {errors.phoneNumber ? (
                <Text style={styles.fieldError}>{errors.phoneNumber}</Text>
              ) : null}
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>PASSWORD *</Text>
              <View
                style={[
                  styles.inputContainer,
                  errors.password ? styles.inputContainerError : null,
                ]}
              >
                <Text style={styles.inputIcon}>🔒</Text>
                <TextInput
                  style={styles.input}
                  placeholder="At least 6 characters"
                  placeholderTextColor="#617D9D"
                  value={formData.password}
                  onChangeText={(text) => updateField("password", text)}
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

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>CONFIRM PASSWORD *</Text>
              <View
                style={[
                  styles.inputContainer,
                  errors.confirmPassword ? styles.inputContainerError : null,
                ]}
              >
                <Text style={styles.inputIcon}>🛡️</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Re-enter password"
                  placeholderTextColor="#617D9D"
                  value={formData.confirmPassword}
                  onChangeText={(text) => updateField("confirmPassword", text)}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeButton}
                  activeOpacity={0.7}
                >
                  <Text style={styles.eyeIcon}>{showConfirmPassword ? "👁️" : "👁️‍🗨️"}</Text>
                </TouchableOpacity>
              </View>
              {errors.confirmPassword ? (
                <Text style={styles.fieldError}>{errors.confirmPassword}</Text>
              ) : null}
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.primaryButton, isSubmitting ? styles.buttonDisabled : null]}
              onPress={handleRegister}
              disabled={isSubmitting}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>COMPLETE REGISTRATION</Text>
              )}
            </TouchableOpacity>

            {/* Switch to Login Row */}
            <View style={styles.switchAuthRow}>
              <Text style={styles.switchAuthPrompt}>Already registered?</Text>
              <TouchableOpacity
                onPress={onNavigateToLogin}
                activeOpacity={0.7}
                style={styles.switchAuthLinkButton}
              >
                <Text style={styles.switchAuthLinkText}>Sign In</Text>
              </TouchableOpacity>
            </View>
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
    paddingHorizontal: 20,
    flexGrow: 1,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#102A48",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1E4775",
    gap: 4,
  },
  backArrow: {
    color: "#4CA2FF",
    fontSize: 22,
    lineHeight: 24,
    fontWeight: "700",
  },
  backText: {
    color: "#AFC4DD",
    fontSize: 12,
    fontWeight: "600",
  },
  headerContainer: {
    marginBottom: 18,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(0, 230, 118, 0.12)",
    borderColor: "rgba(0, 230, 118, 0.35)",
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 6,
    marginBottom: 8,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#00E676",
  },
  badgeText: {
    color: "#00E676",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  titleText: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  subtitleText: {
    color: "#AFC4DD",
    fontSize: 12,
    marginTop: 6,
    lineHeight: 18,
  },
  formCard: {
    backgroundColor: "#102A48",
    borderColor: "#183D66",
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
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
    marginBottom: 12,
  },
  inputLabel: {
    color: "#8EB8E6",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.9,
    marginBottom: 5,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0B1D33",
    borderColor: "#1E4775",
    borderWidth: 1.2,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
  },
  inputContainerError: {
    borderColor: "#E53935",
    backgroundColor: "rgba(229, 57, 53, 0.05)",
  },
  inputIcon: {
    fontSize: 15,
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 13,
    paddingVertical: 0,
  },
  eyeButton: {
    padding: 6,
  },
  eyeIcon: {
    fontSize: 15,
  },
  fieldError: {
    color: "#FF8A80",
    fontSize: 10,
    marginTop: 4,
    marginLeft: 2,
    fontWeight: "500",
  },
  primaryButton: {
    backgroundColor: "#00E676",
    borderRadius: 14,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#4BFF9F",
    ...Platform.select({
      ios: {
        shadowColor: "#00E676",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: "0px 4px 12px rgba(0, 230, 118, 0.3)",
      },
    }),
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  primaryButtonText: {
    color: "#081B33",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  switchAuthRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
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
});
