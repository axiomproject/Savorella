import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, ActivityIndicator, TextInput, Platform, StatusBar as RNStatusBar } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { auth, db } from "../../firebaseConfig";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { updatePassword, signOut } from "firebase/auth";
import * as ImagePicker from "expo-image-picker";
import AdminHeader from "./AdminHeader";
import AdminDock from "./AdminDock";
import { router } from "expo-router";

const CLOUDINARY_UPLOAD_PRESET = "Savorella";
const CLOUDINARY_CLOUD_NAME = "dj1zqnsnb";

async function uploadToCloudinary(uri: string): Promise<string> {
  const apiUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
  const formData = new FormData();

  let ext = uri.split(".").pop()?.toLowerCase();
  let mimeType = "image/jpeg";
  let fileName = "avatar.jpg";
  if (ext === "png") {
    mimeType = "image/png";
    fileName = "avatar.png";
  }

  if (Platform.OS === "web") {
    // Fetch the blob from the blob URL
    const response = await fetch(uri);
    const blob = await response.blob();
    // @ts-ignore
    formData.append("file", blob, fileName);
  } else {
    // @ts-ignore
    formData.append("file", {
      uri: uri,
      type: mimeType,
      name: fileName,
    });
  }
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  const response = await fetch(apiUrl, {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error("Failed to upload image to Cloudinary: " + errorText);
  }
  const data = await response.json();
  return data.secure_url;
}

export default function AdminSettings() {
  const [admin, setAdmin] = useState<{ name: string; email: string; avatar?: string }>({
    name: "",
    email: "",
    avatar: undefined,
  });
  const [loading, setLoading] = useState(true);
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [newAvatar, setNewAvatar] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [newName, setNewName] = useState("");
  const [alert, setAlert] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const getStatusBarHeight = () => {
    if (Platform.OS === 'ios') {
      return 44; // iOS status bar height
    } else {
      return RNStatusBar.currentHeight || 0;
    }
  };

  useEffect(() => {
    const fetchAdmin = async () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setAdmin({
            name: data.name || currentUser.displayName || "",
            email: data.email || currentUser.email || "",
            avatar: data.avatar || undefined,
          });
          setNewName(data.name || currentUser.displayName || "");
        } else {
          setAdmin({
            name: currentUser.displayName || "",
            email: currentUser.email || "",
            avatar: undefined,
          });
          setNewName(currentUser.displayName || "");
        }
      }
      setLoading(false);
    };
    fetchAdmin();
  }, []);

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setNewAvatar(result.assets[0].uri);
    }
  };

  const handleUpdateProfile = async () => {
    setUpdating(true);
    let avatarUrl = admin.avatar;
    try {
      if (newAvatar && auth.currentUser) {
        setUploadingAvatar(true);
        try {
          avatarUrl = await uploadToCloudinary(newAvatar);
        } catch (uploadError: any) {
          setUploadingAvatar(false);
          setUpdating(false);
          setAlert({ text: uploadError.message || "Failed to upload avatar.", type: "error" });
          setTimeout(() => setAlert(null), 3000);
          return;
        }
        setUploadingAvatar(false);
      }
      if (newPassword && auth.currentUser) {
        await updatePassword(auth.currentUser, newPassword);
        setNewPassword("");
        setAlert({ text: "Password updated successfully.", type: "success" });
      }
      if (
        auth.currentUser &&
        ((newAvatar && avatarUrl) || (newName && newName !== admin.name))
      ) {
        await setDoc(
          doc(db, "users", auth.currentUser.uid),
          {
            ...admin,
            avatar: avatarUrl,
            name: newName,
          },
          { merge: true }
        );
        setAdmin(prev => ({ ...prev, avatar: avatarUrl, name: newName }));
        setNewAvatar(null);
        setAlert({
          text:
            newAvatar && newName !== admin.name
              ? "Profile updated successfully."
              : newAvatar
              ? "Avatar updated successfully."
              : "Name updated successfully.",
          type: "success",
        });
      }
      if (!newPassword && !newAvatar && newName === admin.name) {
        setAlert({ text: "Nothing to update.", type: "error" });
      }
    } catch (error: any) {
      setAlert({ text: error.message || "Failed to update profile.", type: "error" });
    }
    setUpdating(false);
    setUploadingAvatar(false);
    setTimeout(() => setAlert(null), 3000);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace("/login");
    } catch (error: any) {
      setAlert({ text: error.message || "Logout failed.", type: "error" });
      setTimeout(() => setAlert(null), 3000);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <AdminHeader noTopPadding={true} />
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#2e6930" />
        </View>
        <AdminDock activeTab="settings" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { marginTop: 0, paddingTop: getStatusBarHeight() }]}>
      <StatusBar style="dark" backgroundColor="#f8f8f8" translucent />
      <AdminHeader showLogout onLogout={handleLogout} noTopPadding={true} />
      
      <View style={{ flex: 1 }}>
        {alert && (
          <View
            style={[
              styles.customAlert,
              alert.type === "success" ? styles.customAlertSuccess : styles.customAlertError,
            ]}
          >
            <Text style={styles.customAlertText}>{alert.text}</Text>
          </View>
        )}
        <ScrollView contentContainerStyle={{ paddingBottom: 90, paddingTop: 5 }}>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { textAlign: "center" }]}>Edit Profile</Text>
            <View style={{ alignItems: "center", width: "100%" }}>
              <TouchableOpacity onPress={pickAvatar} disabled={uploadingAvatar || updating}>
                <Image
                  source={
                    newAvatar
                      ? { uri: newAvatar }
                      : admin.avatar
                      ? { uri: admin.avatar }
                      : require("../../assets/images/avatar-placeholder.png")
                  }
                  style={{ width: 100, height: 100, borderRadius: 50, marginBottom: 12, backgroundColor: "#e5d6ff" }}
                />
                <Text style={{ color: "#2e6930", fontSize: 13, marginBottom: 8, textAlign: "center" }}>
                  {uploadingAvatar ? "Uploading..." : "Change Avatar"}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={{ width: "100%", marginBottom: 10 }}>
              <Text style={styles.inputLabel}>Name</Text>
              <View style={[styles.inputPlaceholder, { width: "100%" }]}>
                <TextInput
                  style={{
                    fontSize: 15,
                    color: "#222",
                    fontFamily: "Franca-Light",
                    paddingVertical: 8,
                    paddingHorizontal: 0,
                    minWidth: 0,
                  }}
                  placeholder="Enter your name"
                  value={newName}
                  onChangeText={setNewName}
                  autoCapitalize="words"
                  placeholderTextColor="#bbb"
                />
              </View>
            </View>
            <View style={{ width: "100%", marginBottom: 10 }}>
              <Text style={styles.inputLabel}>Email</Text>
              <View style={[styles.inputPlaceholder, { width: "100%" }]}>
                <Text style={styles.inputPlaceholderText}>{admin.email}</Text>
              </View>
            </View>
            <View style={{ width: "100%", marginBottom: 10 }}>
              <Text style={styles.inputLabel}>New Password</Text>
              <View style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "#f5f5f5",
                borderRadius: 8,
                width: "100%",
                paddingRight: 8,
              }}>
                <TextInput
                  style={{
                    flex: 1,
                    fontSize: 15,
                    color: "#222",
                    fontFamily: "Franca-Light",
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    minWidth: 0,
                  }}
                  placeholder="Enter new password"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showNewPassword}
                  autoCapitalize="none"
                  placeholderTextColor="#bbb"
                />
                <TouchableOpacity onPress={() => setShowNewPassword(v => !v)} style={{ padding: 8 }}>
                  <MaterialCommunityIcons
                    name={showNewPassword ? "eye-off-outline" : "eye-outline"}
                    size={22}
                    color="#888"
                  />
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity
              style={{
                backgroundColor: "#2e6930",
                borderRadius: 8,
                paddingVertical: 10,
                paddingHorizontal: 24,
                alignItems: "center",
                marginTop: 4,
                opacity: updating || uploadingAvatar ? 0.7 : 1,
              }}
              onPress={handleUpdateProfile}
              disabled={updating || uploadingAvatar}
            >
              <Text style={{ color: "#fff", fontFamily: "FrancaDemo-SemiBold", fontSize: 15 }}>
                {(updating || uploadingAvatar) ? "Updating..." : "Update Profile"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
      
      <AdminDock activeTab="settings" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 40,
    marginHorizontal: 24,
    marginBottom: 32,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 32,
    backgroundColor: "#e5d6ff",
  },
  userInfo: {
    marginLeft: 18,
    flex: 1,
  },
  userName: {
    fontSize: 20,
    color: "#222",
    fontFamily: "FrancaDemo-SemiBold",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 15,
    color: "#888",
    fontFamily: "Franca-Light",
  },
  section: {
    marginHorizontal: 24,
    marginBottom: 18,
    marginTop: 5, // Add a small top margin
  },
  sectionTitle: {
    fontSize: 15,
    color: "#2e6930",
    fontFamily: "FrancaDemo-SemiBold",
    marginBottom: 8,
    marginTop: 8,
    letterSpacing: 0.5,
  },
  inputLabel: {
    fontSize: 13,
    color: "#2e6930",
    fontFamily: "FrancaDemo-SemiBold",
    marginBottom: 2,
    marginLeft: 2,
  },
  inputPlaceholder: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
    minWidth: 180,
  },
  inputPlaceholderText: {
    fontSize: 15,
    color: "#888",
    fontFamily: "Franca-Light",
  },
  customAlert: {
    marginHorizontal: 24,
    marginTop: 18,
    marginBottom: -8,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 18,
    alignItems: "center",
    zIndex: 10,
  },
  customAlertSuccess: {
    backgroundColor: "#eafaf1",
    borderColor: "#2ecc40",
    borderWidth: 1,
  },
  customAlertError: {
    backgroundColor: "#fdecea",
    borderColor: "#c0392b",
    borderWidth: 1,
  },
  customAlertText: {
    color: "#222",
    fontSize: 15,
    fontFamily: "FrancaDemo-SemiBold",
    textAlign: "center",
  },
});
