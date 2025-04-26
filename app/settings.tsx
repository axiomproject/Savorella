import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Modal, Pressable, ActivityIndicator, TextInput, Platform } from "react-native";
import UserDock from "../components/UserDock";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { auth, db } from "../firebaseConfig";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { updatePassword, signOut } from "firebase/auth";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";

const CLOUDINARY_UPLOAD_PRESET = "Savorella";
const CLOUDINARY_CLOUD_NAME = "dj1zqnsnb";

const FOOD_PREFERENCES = [
  "Vegetarian",
  "Vegan",
  "Gluten-free",
  "Dairy-free",
  "Nut-free",
];

async function uploadToCloudinary(uri: string): Promise<string> {
  const apiUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
  const formData = new FormData();
  // Detect file extension
  const ext = uri.split(".").pop()?.toLowerCase();
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

const HEADER_HEIGHT = 100;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    backgroundColor: "#2e6930",
    alignItems: "center",
    justifyContent: "flex-end",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    height: HEADER_HEIGHT,
    paddingBottom: 0,
    flexDirection: "row",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 28,
    fontFamily: "FrancaDemo-Bold",
    textAlign: "center",
    letterSpacing: 1,
    marginTop: 20,
    marginBottom: 0,
    flex: 1,
  },
  headerLogout: {
    position: "absolute",
    right: 18,
    bottom: 20,
    padding: 4,
    zIndex: 101,
  },
  content: {
    flex: 1,
    justifyContent: "flex-start",
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: HEADER_HEIGHT + 24,
    marginHorizontal: 24,
    marginBottom: 32,
  },
  avatar: {
    width: 64,
    height: 64,
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
  },
  sectionTitle: {
    fontSize: 15,
    color: "#2e6930",
    fontFamily: "FrancaDemo-SemiBold",
    marginBottom: 8,
    marginTop: 8,
    letterSpacing: 0.5,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    marginBottom: 12,
    paddingVertical: 15,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.09,
    shadowRadius: 4,
    elevation: 2,
  },
  optionIcon: {
    marginRight: 14,
  },
  optionText: {
    fontSize: 16,
    color: "#222",
    fontFamily: "FrancaDemo-SemiBold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 28,
    width: "80%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: "FrancaDemo-SemiBold",
    color: "#2e6930",
    marginBottom: 12,
    textAlign: "center",
  },
  modalText: {
    fontSize: 15,
    color: "#333",
    fontFamily: "Franca-Light",
    marginBottom: 18,
    textAlign: "center",
  },
  modalCloseBtn: {
    marginTop: 8,
    backgroundColor: "#2e6930",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 80,
  },
  modalCloseText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "FrancaDemo-SemiBold",
    textAlign: "center",
    width: "100%",
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
  card: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: "FrancaDemo-SemiBold",
    color: "#2e6930",
    marginBottom: 8,
  },
  counterRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  counterButton: {
    backgroundColor: "#2e6930",
    borderRadius: 4,
    padding: 4,
    marginHorizontal: 4,
    height: 28,
    width: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  counterButtonText: {
    color: "#fff",
    fontSize: 18,
    fontFamily: "FrancaDemo-SemiBold",
  },
  counterValue: {
    fontSize: 16,
    fontFamily: "FrancaDemo-SemiBold",
    color: "#222",
  },
  adultDetails: {
    marginBottom: 16,
  },
  checkboxRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
    marginBottom: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#2e6930",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  checkboxChecked: {
    backgroundColor: "#2e6930",
  },
  checkboxLabel: {
    fontSize: 14,
    color: "#222",
    fontFamily: "Franca-Light",
  },
});

export default function SettingsScreen() {
  const [user, setUser] = useState<{ name: string; email: string; avatar?: string }>({
    name: "",
    email: "",
    avatar: undefined,
  });
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<"support" | "terms" | "about" | "edit" | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [newAvatar, setNewAvatar] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [newName, setNewName] = useState("");

  const [familyModalVisible, setFamilyModalVisible] = useState(false);
  const [familyLoading, setFamilyLoading] = useState(false);
  const [familySubmitting, setFamilySubmitting] = useState(false);
  const [parentName, setParentName] = useState("");
  const [adults, setAdults] = useState([{ name: "", preferences: [] as string[], height: "", weight: "" }]);
  const [children, setChildren] = useState([{ name: "", age: "", preferences: [] as string[], height: "", weight: "" }]);

  const validateNumeric = (value: string) => value.replace(/[^0-9.]/g, '');
  const validateName = (value: string) => value.replace(/[^a-zA-Z\s'-]/g, '');

  const addAdult = () => setAdults([...adults, { name: "", preferences: [], height: "", weight: "" }]);
  const removeAdult = () => adults.length > 1 && setAdults(adults.slice(0, -1));
  const addChild = () => setChildren([...children, { name: "", age: "", preferences: [], height: "", weight: "" }]);
  const removeChild = () => children.length > 0 && setChildren(children.slice(0, -1));

  const handleAdultChange = (idx: number, field: "name" | "height" | "weight", value: string) => {
    const updated = [...adults];
    if (field === "name") updated[idx][field] = validateName(value);
    else updated[idx][field] = validateNumeric(value);
    setAdults(updated);
  };
  const handleAdultPreferenceToggle = (idx: number, pref: string) => {
    const updated = [...adults];
    if (updated[idx].preferences.includes(pref)) {
      updated[idx].preferences = updated[idx].preferences.filter(p => p !== pref);
    } else {
      updated[idx].preferences = [...updated[idx].preferences, pref];
    }
    setAdults(updated);
  };
  const handleChildChange = (idx: number, field: "name" | "age" | "height" | "weight", value: string) => {
    const updated = [...children];
    if (field === "name") updated[idx][field] = validateName(value);
    else updated[idx][field] = validateNumeric(value);
    setChildren(updated);
  };
  const handleChildPreferenceToggle = (idx: number, pref: string) => {
    const updated = [...children];
    if (updated[idx].preferences.includes(pref)) {
      updated[idx].preferences = updated[idx].preferences.filter(p => p !== pref);
    } else {
      updated[idx].preferences = [...updated[idx].preferences, pref];
    }
    setChildren(updated);
  };

  const openFamilyModal = async () => {
    setFamilyModalVisible(true);
    setFamilyLoading(true);
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setParentName(data.parentName || "");
          setAdults(Array.isArray(data.adults) && data.adults.length > 0 ? data.adults : [{ name: "", preferences: [], height: "", weight: "" }]);
          setChildren(Array.isArray(data.children) ? data.children : [{ name: "", age: "", preferences: [], height: "", weight: "" }]);
        } else {
          setParentName("");
          setAdults([{ name: "", preferences: [], height: "", weight: "" }]);
          setChildren([{ name: "", age: "", preferences: [], height: "", weight: "" }]);
        }
      }
    } catch (e) {
      alert("Failed to fetch family info.");
    }
    setFamilyLoading(false);
  };

  const closeFamilyModal = () => setFamilyModalVisible(false);

  const handleFamilySubmit = async () => {
    if (!parentName) {
      alert("Please enter the parent's name.");
      return;
    }
    setFamilySubmitting(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("No user found.");
      await setDoc(doc(db, "users", user.uid), {
        familyInfoCompleted: true,
        parentName,
        adults,
        children,
      }, { merge: true });
      alert("Family info updated!");
      setFamilyModalVisible(false);
    } catch (e) {
      alert("Could not save family info.");
    }
    setFamilySubmitting(false);
  };

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        // Try to get user data from Firestore
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUser({
            name: data.name || currentUser.displayName || "",
            email: data.email || currentUser.email || "",
            avatar: data.avatar || undefined,
          });
          setNewName(data.name || currentUser.displayName || "");
        } else {
          // Fallback to Auth info if Firestore doc doesn't exist
          setUser({
            name: currentUser.displayName || "",
            email: currentUser.email || "",
            avatar: undefined,
          });
          setNewName(currentUser.displayName || "");
        }
      }
      setLoading(false);
    };
    fetchUser();
  }, []);

  const handleOpenModal = (
    type: "support" | "terms" | "about" | "edit"
  ) => {
    setModalType(type);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setModalType(null);
  };

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
    setUpdatingPassword(true);
    let avatarUrl = user.avatar;
    try {
      // Upload avatar if changed (Cloudinary)
      if (newAvatar && auth.currentUser) {
        setUploadingAvatar(true);
        avatarUrl = await uploadToCloudinary(newAvatar);
        setUploadingAvatar(false);
      }
      // Update password if provided
      if (newPassword && auth.currentUser) {
        await updatePassword(auth.currentUser, newPassword);
        setNewPassword("");
        alert("Password updated successfully.");
      }
      // Update name or avatar in Firestore if changed
      if (
        auth.currentUser &&
        ((newAvatar && avatarUrl) || (newName && newName !== user.name))
      ) {
        await setDoc(
          doc(db, "users", auth.currentUser.uid),
          {
            ...user,
            avatar: avatarUrl,
            name: newName,
          },
          { merge: true }
        );
        setUser(prev => ({ ...prev, avatar: avatarUrl, name: newName }));
        setNewAvatar(null);
        alert(
          newAvatar && newName !== user.name
            ? "Profile updated successfully."
            : newAvatar
            ? "Avatar updated successfully."
            : "Name updated successfully."
        );
      }
      if (!newPassword && !newAvatar && newName === user.name) {
        alert("Nothing to update.");
      }
    } catch (error: any) {
      alert(error.message || "Failed to update profile.");
    }
    setUpdatingPassword(false);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace("/login");
    } catch (error: any) {
      alert(error.message || "Logout failed.");
    }
  };

  const renderModalContent = () => {
    if (modalType === "support") {
      return (
        <>
          <Text style={styles.modalTitle}>Support</Text>
          <Text style={styles.modalText}>
            For support, please contact us at support@savorella.com or visit our help center.
          </Text>
        </>
      );
    }
    if (modalType === "terms") {
      return (
        <>
          <Text style={styles.modalTitle}>Terms of Service</Text>
          <Text style={styles.modalText}>
            By using this app, you agree to our Terms of Service. Please review them on our website for more details.
          </Text>
        </>
      );
    }
    if (modalType === "about") {
      return (
        <>
          <Text style={styles.modalTitle}>About</Text>
          <Text style={styles.modalText}>
            Savorella helps you manage nutrition and meal plans for your family. Version 1.0.0
          </Text>
        </>
      );
    }
    if (modalType === "edit") {
      return (
        <>
          <Text style={styles.modalTitle}>Edit Profile</Text>
          <View style={{ alignItems: "center", marginBottom: 18, width: "100%" }}>
            <TouchableOpacity onPress={pickAvatar} disabled={uploadingAvatar || updatingPassword}>
              <Image
                source={
                  newAvatar
                    ? { uri: newAvatar }
                    : user.avatar
                    ? { uri: user.avatar }
                    : require("../assets/images/avatar-placeholder.png")
                }
                style={{ width: 64, height: 64, borderRadius: 32, marginBottom: 12, backgroundColor: "#e5d6ff" }}
              />
              <Text style={{ color: "#2e6930", fontSize: 13, marginBottom: 8, textAlign: "center" }}>
                {uploadingAvatar ? "Uploading..." : "Change Avatar"}
              </Text>
            </TouchableOpacity>
            {/* Name input */}
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
            {/* Password input */}
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
                opacity: updatingPassword || uploadingAvatar ? 0.7 : 1,
              }}
              onPress={handleUpdateProfile}
              disabled={updatingPassword || uploadingAvatar}
            >
              <Text style={{ color: "#fff", fontFamily: "FrancaDemo-SemiBold", fontSize: 15 }}>
                {(updatingPassword || uploadingAvatar) ? "Updating..." : "Update Profile"}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" backgroundColor="#2e6930" />
        <View style={styles.header}>
          <View style={{ flex: 1, alignItems: "center", flexDirection: "row", justifyContent: "center" }}>
            <Text style={styles.headerTitle}>Settings</Text>
          </View>
          <TouchableOpacity style={styles.headerLogout} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={30} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#2e6930" />
        </View>
        <UserDock activeTab="settings" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor="#2e6930" />
      <View style={styles.header}>
        <View style={{ flex: 1, alignItems: "center", flexDirection: "row", justifyContent: "center" }}>
          <Text style={styles.headerTitle}>Settings</Text>
        </View>
        <TouchableOpacity style={styles.headerLogout} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={30} color="#fff" />
        </TouchableOpacity>
      </View>
      <View style={styles.content}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: 90 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.profileRow}>
            <Image
              source={
                user.avatar
                  ? { uri: user.avatar }
                  : require("../assets/images/avatar-placeholder.png")
              }
              style={styles.avatar}
            />
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user.name}</Text>
              <Text style={styles.userEmail}>{user.email}</Text>
            </View>
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account</Text>
            <TouchableOpacity style={styles.option} onPress={() => handleOpenModal("edit")}>
              <Feather name="user" size={22} color="#2e6930" style={styles.optionIcon} />
              <Text style={styles.optionText}>Edit Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.option} onPress={openFamilyModal}>
              <MaterialCommunityIcons name="account-group-outline" size={22} color="#2e6930" style={styles.optionIcon} />
              <Text style={styles.optionText}>Edit Family</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>General</Text>
            <TouchableOpacity style={styles.option} onPress={() => handleOpenModal("support")}>
              <Feather name="help-circle" size={22} color="#2e6930" style={styles.optionIcon} />
              <Text style={styles.optionText}>Support</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.option} onPress={() => handleOpenModal("terms")}>
              <MaterialCommunityIcons name="file-document-outline" size={22} color="#2e6930" style={styles.optionIcon} />
              <Text style={styles.optionText}>Terms of Service</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.option} onPress={() => handleOpenModal("about")}>
              <Ionicons name="information-circle-outline" size={22} color="#2e6930" style={styles.optionIcon} />
              <Text style={styles.optionText}>About</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
      <Modal
        visible={modalVisible}
        animationType="fade"
        transparent
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {renderModalContent()}
            <Pressable style={styles.modalCloseBtn} onPress={handleCloseModal}>
              <Text style={styles.modalCloseText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <Modal
        visible={familyModalVisible}
        animationType="fade"
        transparent
        onRequestClose={closeFamilyModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: "90%", width: "92%" }]}>
            <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
              <Text style={styles.modalTitle}>Edit Family Info</Text>
              {familyLoading ? (
                <ActivityIndicator size="large" color="#2e6930" style={{ marginVertical: 30 }} />
              ) : (
                <>
                  <Text style={styles.inputLabel}>Parent's Name</Text>
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
                      placeholder="Your name"
                      value={parentName}
                      onChangeText={value => setParentName(validateName(value))}
                      placeholderTextColor="#bbb"
                    />
                  </View>
                  <Text style={styles.sectionTitle}>Number of Family Members</Text>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
                    <View style={[styles.card, { flex: 1, marginHorizontal: 2 }]}>
                      <Text style={styles.cardTitle}>Adult</Text>
                      <View style={styles.counterRow}>
                        <TouchableOpacity
                          style={styles.counterButton}
                          onPress={removeAdult}
                          disabled={adults.length <= 1}
                        >
                          <Text style={[styles.counterButtonText, adults.length <= 1 && { opacity: 0.3 }]}>-</Text>
                        </TouchableOpacity>
                        <Text style={styles.counterValue}>{adults.length}</Text>
                        <TouchableOpacity
                          style={styles.counterButton}
                          onPress={addAdult}
                        >
                          <Text style={styles.counterButtonText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={[styles.card, { flex: 1, marginHorizontal: 2 }]}>
                      <Text style={styles.cardTitle}>Child</Text>
                      <View style={styles.counterRow}>
                        <TouchableOpacity
                          style={styles.counterButton}
                          onPress={removeChild}
                          disabled={children.length <= 0}
                        >
                          <Text style={[styles.counterButtonText, children.length <= 0 && { opacity: 0.3 }]}>-</Text>
                        </TouchableOpacity>
                        <Text style={styles.counterValue}>{children.length}</Text>
                        <TouchableOpacity
                          style={styles.counterButton}
                          onPress={addChild}
                        >
                          <Text style={styles.counterButtonText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                  {adults.map((adult, idx) => (
                    <View style={styles.adultDetails} key={idx}>
                      <Text style={styles.inputLabel}>Adult {adults.length > 1 ? `#${idx + 1}` : ""} Name</Text>
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
                          placeholder="Adult's name"
                          value={adult.name}
                          onChangeText={val => handleAdultChange(idx, "name", val)}
                          placeholderTextColor="#bbb"
                        />
                      </View>
                      <Text style={styles.inputLabel}>Height (cm)</Text>
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
                          placeholder="Height in cm"
                          value={adult.height}
                          onChangeText={val => handleAdultChange(idx, "height", val)}
                          placeholderTextColor="#bbb"
                          keyboardType="numeric"
                        />
                      </View>
                      <Text style={styles.inputLabel}>Weight (kg)</Text>
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
                          placeholder="Weight in kg"
                          value={adult.weight}
                          onChangeText={val => handleAdultChange(idx, "weight", val)}
                          placeholderTextColor="#bbb"
                          keyboardType="numeric"
                        />
                      </View>
                      <Text style={styles.inputLabel}>Food Preferences</Text>
                      <View style={styles.checkboxRow}>
                        {FOOD_PREFERENCES.map((pref) => (
                          <TouchableOpacity
                            key={pref}
                            style={styles.checkboxContainer}
                            onPress={() => handleAdultPreferenceToggle(idx, pref)}
                            activeOpacity={0.7}
                          >
                            <View style={[styles.checkbox, adult.preferences.includes(pref) && styles.checkboxChecked]}>
                              {adult.preferences.includes(pref) && (
                                <MaterialCommunityIcons name="check" size={18} color="#fff" />
                              )}
                            </View>
                            <Text style={styles.checkboxLabel}>{pref}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  ))}
                  {children.map((child, idx) => (
                    <View style={styles.adultDetails} key={idx + "child"}>
                      <Text style={styles.inputLabel}>Child {children.length > 1 ? `#${idx + 1}` : ""} Name</Text>
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
                          placeholder="Child's name"
                          value={child.name}
                          onChangeText={val => handleChildChange(idx, "name", val)}
                          placeholderTextColor="#bbb"
                        />
                      </View>
                      <Text style={styles.inputLabel}>Child's Age</Text>
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
                          placeholder="Child's age"
                          value={child.age}
                          onChangeText={val => handleChildChange(idx, "age", val)}
                          placeholderTextColor="#bbb"
                          keyboardType="numeric"
                        />
                      </View>
                      <Text style={styles.inputLabel}>Height (cm)</Text>
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
                          placeholder="Height in cm"
                          value={child.height}
                          onChangeText={val => handleChildChange(idx, "height", val)}
                          placeholderTextColor="#bbb"
                          keyboardType="numeric"
                        />
                      </View>
                      <Text style={styles.inputLabel}>Weight (kg)</Text>
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
                          placeholder="Weight in kg"
                          value={child.weight}
                          onChangeText={val => handleChildChange(idx, "weight", val)}
                          placeholderTextColor="#bbb"
                          keyboardType="numeric"
                        />
                      </View>
                      <Text style={styles.inputLabel}>Food Preferences</Text>
                      <View style={styles.checkboxRow}>
                        {FOOD_PREFERENCES.map((pref) => (
                          <TouchableOpacity
                            key={pref}
                            style={styles.checkboxContainer}
                            onPress={() => handleChildPreferenceToggle(idx, pref)}
                            activeOpacity={0.7}
                          >
                            <View style={[styles.checkbox, child.preferences.includes(pref) && styles.checkboxChecked]}>
                              {child.preferences.includes(pref) && (
                                <MaterialCommunityIcons name="check" size={18} color="#fff" />
                              )}
                            </View>
                            <Text style={styles.checkboxLabel}>{pref}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  ))}
                  <TouchableOpacity
                    style={{
                      backgroundColor: "#2e6930",
                      borderRadius: 8,
                      paddingVertical: 10,
                      paddingHorizontal: 24,
                      alignItems: "center",
                      marginTop: 16,
                      opacity: familySubmitting ? 0.7 : 1,
                    }}
                    onPress={handleFamilySubmit}
                    disabled={familySubmitting}
                  >
                    <Text style={{ color: "#fff", fontFamily: "FrancaDemo-SemiBold", fontSize: 15 }}>
                      {familySubmitting ? "Saving..." : "Save"}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
              <Pressable style={[styles.modalCloseBtn, { marginTop: 16 }]} onPress={closeFamilyModal}>
                <Text style={styles.modalCloseText}>Close</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
      <UserDock activeTab="settings" />
    </View>
  );
}
