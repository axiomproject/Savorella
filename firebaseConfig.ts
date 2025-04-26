// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { initializeAuth, getReactNativePersistence, getAuth, Auth } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBP4oOeIn6pKZ9wAseuxXIyLCqrFMUYgaQ",
  authDomain: "savorella-1aa63.firebaseapp.com",
  projectId: "savorella-1aa63",
  storageBucket: "savorella-1aa63.appspot.com",
  messagingSenderId: "1091784879284",
  appId: "1:1091784879284:web:4fc0dd0fae1bd6e7a27be1"
};

// Initialize Firebase
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

let auth: Auth;
if (Platform.OS === "web") {
  auth = getAuth(app);
} else {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
}
const db = getFirestore(app);

export { app, auth, db };