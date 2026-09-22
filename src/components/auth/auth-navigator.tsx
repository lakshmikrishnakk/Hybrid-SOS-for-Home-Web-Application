import React, { useState } from "react";
import LoginScreen from "./login-screen";
import RegisterScreen from "./register-screen";

export type AuthScreenType = "login" | "register";

export default function AuthNavigator() {
  const [currentScreen, setCurrentScreen] = useState<AuthScreenType>("login");

  if (currentScreen === "register") {
    return <RegisterScreen onNavigateToLogin={() => setCurrentScreen("login")} />;
  }

  return <LoginScreen onNavigateToRegister={() => setCurrentScreen("register")} />;
}
