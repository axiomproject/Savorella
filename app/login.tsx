import React, { useState, useLayoutEffect } from "react";
import { View, Text, TextInput, Button, StyleSheet, TouchableOpacity, Alert, Image } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { router } from "expo-router";
import { useFonts as useCustomFonts } from "expo-font";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { auth } from "../firebaseConfig";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithCredential, updateProfile, sendPasswordResetEmail, sendEmailVerification } from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebaseConfig"; // Assuming db is exported from firebaseConfig
import * as AuthSession from "expo-auth-session";
import { AuthRequest } from "expo-auth-session";
import { StatusBar } from "expo-status-bar";
import * as WebBrowser from 'expo-web-browser';
import Constants from "expo-constants";

// Ensure web browser redirect results are handled properly
WebBrowser.maybeCompleteAuthSession();

// Add your admin email(s) here
const ADMIN_EMAILS = ["admin@example.com"];

// Replace "com.yourappname" with your actual Android package name from app.json/app.config.js
const ANDROID_PACKAGE_NAME = "com.qcu.savorella"; // <-- update this if needed

const isExpoGo = Constants.appOwnership === "expo";

// Google OAuth config
const CLIENT_ID = "1091784879284-dduqmnp878soa428b9g4f6v6dmq13smb.apps.googleusercontent.com";
const REDIRECT_URI = AuthSession.makeRedirectUri(
  isExpoGo
    ? {}
    : {
        scheme: ANDROID_PACKAGE_NAME,
        // Remove the path to avoid unmatched route error
        // path: "/oauthredirect",
      }
);

const DISCOVERY = {
  authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenEndpoint: "https://oauth2.googleapis.com/token",
};

export default function LoginScreen() {
  const [activeTab, setActiveTab] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [signUpName, setSignUpName] = useState("");
  const [signUpNameFocused, setSignUpNameFocused] = useState(false);
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState("");
  const [signUpEmailFocused, setSignUpEmailFocused] = useState(false);
  const [signUpPasswordFocused, setSignUpPasswordFocused] = useState(false);
  const [signUpConfirmPasswordFocused, setSignUpConfirmPasswordFocused] = useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [showSignUpConfirmPassword, setShowSignUpConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<{ text: string; type: "error" | "success" } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigation = useNavigation();

  // Load custom fonts
  const [customFontsLoaded] = useCustomFonts({
    "FrancaDemo-Bold": require("../assets/fonts/FrancaDemo-Bold.otf"),
    "FrancaDemo-SemiBold": require("../assets/fonts/Franca-SemiBold.ttf"),
    "Franca-Light": require("../assets/fonts/Franca-Light.ttf"),
  });

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  // Place this AFTER all hooks, but BEFORE any rendering logic
  if (!customFontsLoaded) {
    return null;
  }

  const handleLogin = async () => {
    setErrorMessage(null);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // Check if email is verified
      if (!userCredential.user.emailVerified) {
        setErrorMessage({ text: "Please verify your email address before logging in. Check your inbox or spam folder.", type: "error" });
        try { await sendEmailVerification(userCredential.user); } catch {}
        return;
      }
      // Fetch user doc to check admin status and family info
      const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.isAdmin) {
          setIsAdmin(true);
          router.replace("/admin/AdminDashboard");
        } else if (!userData.familyInfoCompleted) {
          setIsAdmin(false);
          router.replace("/FamilyInfo");
        } else {
          setIsAdmin(false);
          router.replace("/dashboard");
        }
      } else {
        setIsAdmin(false);
        router.replace("/dashboard");
      }
    } catch (error: any) {
      let msg = "Login failed.";
      if (error.code === "auth/invalid-email") msg = "Invalid email address.";
      else if (error.code === "auth/user-not-found") msg = "No account found with this email. If you were invited, please check your email for a password setup link.";
      else if (error.code === "auth/wrong-password") msg = "Incorrect password. If you were invited and haven't set your password, please check your email for a password setup link.";
      else if (error.code === "auth/too-many-requests") msg = "Too many attempts. Please try again later.";
      else if (error.code === "auth/invalid-credential") msg = "Invalid login credentials. Please try again.";
      // Debug log for unexpected errors
      else console.log("Login error:", error);
      setErrorMessage({ text: msg, type: "error" });
    }
  };

  const handleForgotPassword = async () => {
    setErrorMessage(null);
    if (!email) {
      setErrorMessage({ text: "Please enter your email to reset your password.", type: "error" });
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      setErrorMessage({ text: "Password reset email sent! Please check your inbox or spam.", type: "success" });
    } catch (error: any) {
      let msg = "Failed to send reset email.";
      if (error.code === "auth/invalid-email") msg = "Invalid email address.";
      else if (error.code === "auth/user-not-found") msg = "No account found with this email.";
      setErrorMessage({ text: msg, type: "error" });
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const request = new AuthRequest({
        clientId: CLIENT_ID,
        redirectUri: REDIRECT_URI,
        responseType: "code",
        scopes: ["openid", "profile", "email"],
        usePKCE: true,
        extraParams: { access_type: "offline", prompt: "consent" }
      });
      await request.makeAuthUrlAsync(DISCOVERY);

      const result = await request.promptAsync(DISCOVERY);

      if (result.type === "success" && result.params?.code) {
        // Exchange code for tokens
        const tokenResponse = await AuthSession.exchangeCodeAsync(
          {
            clientId: CLIENT_ID,
            code: result.params.code,
            redirectUri: REDIRECT_URI,
            extraParams: { code_verifier: request.codeVerifier ?? "" }
          },
          DISCOVERY
        );

        const idToken = tokenResponse.idToken;
        if (idToken) {
          const credential = GoogleAuthProvider.credential(idToken);
          const userCredential = await signInWithCredential(auth, credential);

          // Firestore user doc logic
          const userDocRef = doc(db, "users", userCredential.user.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            if (userData.isAdmin) {
              setIsAdmin(true);
              router.replace("/admin/AdminDashboard");
            } else if (!userData.familyInfoCompleted) {
              setIsAdmin(false);
              router.replace("/FamilyInfo");
            } else {
              setIsAdmin(false);
              router.replace("/dashboard");
            }
          } else {
            const isAdmin = ADMIN_EMAILS.includes(userCredential.user.email || "");
            await setDoc(userDocRef, {
              name: userCredential.user.displayName || "",
              email: userCredential.user.email || "",
              createdAt: serverTimestamp(),
              isAdmin,
              familyInfoCompleted: false,
            });
            setIsAdmin(isAdmin);
            router.replace(isAdmin ? "/admin/AdminDashboard" : "/FamilyInfo");
          }
        } else {
          Alert.alert("Google Sign-In Error", "No ID token found in token response.");
        }
      } else if (result.type === "cancel" || result.type === "dismiss") {
        Alert.alert("Google Sign-In Cancelled", "Authentication was cancelled.");
      }
    } catch (error: any) {
      console.error("Google sign-in error:", error);
      Alert.alert("Google Sign-In Error", error.message || "There was a problem processing your Google sign-in.");
    }
  };

  const handleCreateAccount = async () => {
    setErrorMessage(null);
    if (!signUpName || !signUpEmail || !signUpPassword || !signUpConfirmPassword) {
      setErrorMessage({ text: "Please fill in all fields.", type: "error" });
      return;
    }
    if (signUpPassword !== signUpConfirmPassword) {
      setErrorMessage({ text: "Passwords do not match.", type: "error" });
      return;
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, signUpEmail, signUpPassword);
      await updateProfile(userCredential.user, { displayName: signUpName });
      // Set isAdmin true if email is in ADMIN_EMAILS
      const isAdmin = ADMIN_EMAILS.includes(signUpEmail);
      await setDoc(doc(db, "users", userCredential.user.uid), {
        name: signUpName,
        email: signUpEmail,
        createdAt: serverTimestamp(),
        isAdmin,
      });
      // Send email verification
      await sendEmailVerification(userCredential.user);
      setErrorMessage({ text: "Account created! Please check your email to verify your address before logging in.", type: "success" });
      setActiveTab("signIn");
      setSignUpName("");
      setSignUpEmail("");
      setSignUpPassword("");
      setSignUpConfirmPassword("");
    } catch (error: any) {
      let msg = "Registration failed.";
      if (error.code === "auth/email-already-in-use") msg = "This email is already in use.";
      else if (error.code === "auth/invalid-email") msg = "Invalid email address.";
      else if (error.code === "auth/weak-password") msg = "Password should be at least 6 characters.";
      setErrorMessage({ text: msg, type: "error" });
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" backgroundColor="#fff" translucent={false} />
      {/* Logo and Savorella in a row */}
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 40 }}>
        <Image
          source={require("../assets/images/logo.png")}
          style={{ width: 60, height: 60, marginRight: 5, marginBottom: 8 }}
          resizeMode="contain"
        />
        <Text style={styles.savorella}>Savorella</Text>
      </View>
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "signIn" && styles.activeTab]}
          onPress={() => {
            setActiveTab("signIn");
            setErrorMessage(null);
          }}
        >
          <View style={styles.tabInner}>
            <Text
              style={[
                styles.tabText,
                activeTab === "signIn"
                  ? styles.activeTabText
                  : styles.inactiveTabText,
              ]}
            >
              Sign In
            </Text>
            {activeTab === "signIn" && <View style={styles.underline} />}
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "signUp" && styles.activeTab]}
          onPress={() => {
            setActiveTab("signUp");
            setErrorMessage(null);
          }}
        >
          <View style={styles.tabInner}>
            <Text
              style={[
                styles.tabText,
                activeTab === "signUp"
                  ? styles.activeTabText
                  : styles.inactiveTabText,
              ]}
            >
              Sign Up
            </Text>
            {activeTab === "signUp" && <View style={styles.underline} />}
          </View>
        </TouchableOpacity>
      </View>
      <View style={styles.formContainer}>
        {errorMessage && (
          <Text style={errorMessage.type === "success" ? styles.successText : styles.errorText}>
            {errorMessage.text}
          </Text>
        )}
        {activeTab === "signIn" && (
          <View>
            <Text style={styles.getStartedText}>
              Let's get started by filling out the form below.
            </Text>
            <TextInput
              style={[
                styles.input,
                emailFocused && styles.inputFocused,
              ]}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              selectionColor="#2e6930"
              placeholderTextColor="#bbb"
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
              underlineColorAndroid="transparent"
            />
            <View style={styles.passwordInputWrapper}>
              <TextInput
                style={[
                  styles.input,
                  { marginBottom: 0, flex: 1 },
                  passwordFocused && styles.inputFocused,
                ]}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                selectionColor="#2e6930"
                placeholderTextColor="#bbb"
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                underlineColorAndroid="transparent"
              />
              {password.length > 0 && (
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword((prev) => !prev)}
                  hitSlop={10}
                >
                  <MaterialCommunityIcons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={24}
                    color="#888"
                  />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity onPress={handleForgotPassword}>
              <Text style={styles.forgotPassword}>Forgot Password?</Text>
            </TouchableOpacity>
            <View style={styles.buttonWrapper}>
              <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
                <Text style={styles.loginButtonText}>Sign In</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.orText}>Or sign up with</Text>
            <View style={styles.buttonWrapper}>
              <TouchableOpacity style={styles.googleButton} onPress={handleGoogleSignIn}>
                <MaterialCommunityIcons
                  name="google"
                  size={22}
                  color="#000000"
                  style={{ marginRight: 12 }}
                />
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        {activeTab === "signUp" && (
          <View>
            <Text style={styles.getStartedText}>
              Let's get started by filling out the form below.
            </Text>
            <TextInput
              style={[
                styles.input,
                signUpNameFocused && styles.inputFocused,
              ]}
              placeholder="Name"
              value={signUpName}
              onChangeText={setSignUpName}
              autoCapitalize="words"
              selectionColor="#2e6930"
              placeholderTextColor="#bbb"
              onFocus={() => setSignUpNameFocused(true)}
              onBlur={() => setSignUpNameFocused(false)}
              underlineColorAndroid="transparent"
            />
            <TextInput
              style={[
                styles.input,
                signUpEmailFocused && styles.inputFocused,
              ]}
              placeholder="Email"
              value={signUpEmail}
              onChangeText={setSignUpEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              selectionColor="#2e6930"
              placeholderTextColor="#bbb"
              onFocus={() => setSignUpEmailFocused(true)}
              onBlur={() => setSignUpEmailFocused(false)}
              underlineColorAndroid="transparent"
            />
            <View style={styles.passwordInputWrapper}>
              <TextInput
                style={[
                  styles.input,
                  { marginBottom: 0, flex: 1 },
                  signUpPasswordFocused && styles.inputFocused,
                ]}
                placeholder="Password"
                value={signUpPassword}
                onChangeText={setSignUpPassword}
                secureTextEntry={!showSignUpPassword}
                selectionColor="#2e6930"
                placeholderTextColor="#bbb"
                onFocus={() => setSignUpPasswordFocused(true)}
                onBlur={() => setSignUpPasswordFocused(false)}
                underlineColorAndroid="transparent"
              />
              {signUpPassword.length > 0 && (
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowSignUpPassword((prev) => !prev)}
                  hitSlop={10}
                >
                  <MaterialCommunityIcons
                    name={showSignUpPassword ? "eye-off-outline" : "eye-outline"}
                    size={24}
                    color="#888"
                  />
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.passwordInputWrapper}>
              <TextInput
                style={[
                  styles.input,
                  { marginBottom: 0, flex: 1 },
                  signUpConfirmPasswordFocused && styles.inputFocused,
                ]}
                placeholder="Confirm Password"
                value={signUpConfirmPassword}
                onChangeText={setSignUpConfirmPassword}
                secureTextEntry={!showSignUpConfirmPassword}
                selectionColor="#2e6930"
                placeholderTextColor="#bbb"
                onFocus={() => setSignUpConfirmPasswordFocused(true)}
                onBlur={() => setSignUpConfirmPasswordFocused(false)}
                underlineColorAndroid="transparent"
              />
              {signUpConfirmPassword.length > 0 && (
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowSignUpConfirmPassword((prev) => !prev)}
                  hitSlop={10}
                >
                  <MaterialCommunityIcons
                    name={signUpConfirmPassword ? "eye-off-outline" : "eye-outline"}
                    size={24}
                    color="#888"
                  />
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.buttonWrapper}>
              <TouchableOpacity style={styles.createButton} onPress={handleCreateAccount}>
                <Text style={styles.createButtonText}>Create Account</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.orText}>Or sign up with</Text>
            <View style={styles.buttonWrapper}>
              <TouchableOpacity style={styles.googleButton} onPress={handleGoogleSignIn}>
                <MaterialCommunityIcons
                  name="google"
                  size={22}
                  color="#000000"
                  style={{ marginRight: 12 }}
                />
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#fff",
  },
  savorella: {
    fontSize: 50,
    fontFamily: "FrancaDemo-Bold",
    textAlign: "left",
    color: "#000",
    letterSpacing: 1,
  },
  tabContainer: {
    flexDirection: "row",
    marginBottom: 32,
    justifyContent: "flex-start",
    marginLeft: 1, // more left indent
    width: "auto",
  },
  tab: {
    alignItems: "center",
    paddingVertical: 8,
    position: "relative",
    marginRight: 50, // small space between tabs
    minWidth: 80,
  },
  activeTab: {
    // Style for active tab state
  },
  tabText: {
    fontSize: 35, // larger text
    fontWeight: "bold",
    color: "#000",
    marginBottom: 10,
  },
  activeTabText: {
    fontFamily: "FrancaDemo-SemiBold",
    color: "#000",
  },
  inactiveTabText: {
    fontFamily: "Franca-Light",
    color: "#afb2b3",
  },
  tabInner: {
    alignItems: "center",
  },
  underline: {
    height: 3,
    backgroundColor: "#2e6930",
    marginTop: 2,
    borderRadius: 2,
    width: "130%", // slightly wider than text
    alignSelf: "center",
    minWidth: 120,
  },
  formContainer: {
    width: "100%",
    alignSelf: "center",
  },
  input: {
    height: 48,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 24, // oblong
    marginBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: "#f8f8f8",
  },
  inputFocused: {
    borderColor: "#2e6930",
    shadowColor: "transparent",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  passwordInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    position: "relative",
  },
  eyeIcon: {
    position: "absolute",
    right: 20,
    padding: 4,
    zIndex: 1,
  },
  buttonWrapper: {
    alignItems: "center",
    marginTop: 8,
  },
  createButton: {
    backgroundColor: "#2e6930",
    borderRadius: 24, // oblong
    paddingVertical: 10,
    paddingHorizontal: 48,
    minWidth: 140,
    width: "80%", // shorter than input
    alignItems: "center",
    justifyContent: "center",
    // Drop shadow
    shadowColor: "#2e6930",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  createButtonText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "FrancaDemo-SemiBold",
    letterSpacing: 1,
  },
  loginButton: {
    backgroundColor: "#2e6930",
    borderRadius: 24, // oblong
    paddingVertical: 10,
    paddingHorizontal: 48,
    minWidth: 140,
    width: "80%", // shorter than input
    alignItems: "center",
    justifyContent: "center",
    // Drop shadow
    shadowColor: "#2e6930",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 18,
    fontFamily: "FrancaDemo-SemiBold",
    letterSpacing: 1,
  },
  forgotPassword: {
    color: "#2e6930",
    fontFamily: "FrancaDemo-SemiBold",
    fontSize: 16,
    marginTop: 4,
    marginBottom: 16,
    alignSelf: "flex-end",
    marginRight: 8,
  },
  orText: {
    textAlign: "center",
    color: "#888",
    fontSize: 16,
    marginVertical: 18,
    fontFamily: "Franca-Light",
  },
  googleButton: {
    backgroundColor: "#fff",
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 32,
    minWidth: 180,
    width: "70%",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    flexDirection: "row",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  googleButtonText: {
    color: "#222",
    fontSize: 12,
    fontFamily: "FrancaDemo-Bold",
    letterSpacing: 1,
    fontWeight: "bold",
  },
  getStartedText: {
    fontSize: 16,
    color: "#333",
    fontFamily: "Franca-Light",
    marginBottom: 18,

    textAlign: "left",
    marginLeft: 4,
  },
  errorText: {
    color: "#c0392b",
    fontSize: 15,
    marginBottom: 12,
    textAlign: "center",
    fontFamily: "FrancaDemo-SemiBold",
  },
  successText: {
    color: "#2ecc40",
    fontSize: 15,
    marginBottom: 12,
    textAlign: "center",
    fontFamily: "FrancaDemo-SemiBold",
  },
});

