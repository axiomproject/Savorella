import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Modal, TextInput, Alert, Platform, StatusBar as RNStatusBar } from "react-native";
import { StatusBar } from "expo-status-bar";
import { collection, getDocs, deleteDoc, doc, updateDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../../firebaseConfig";
import AdminHeader from "./AdminHeader";
import AdminDock from "./AdminDock";
import { createUserWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { Ionicons } from "@expo/vector-icons";

interface User {
  id: string;
  name: string;
  email: string;
  isAdmin?: boolean;
  isNutritionist?: boolean; // add this for type safety
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editIsNutritionist, setEditIsNutritionist] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [menuVisibleUserId, setMenuVisibleUserId] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    const usersCol = collection(db, "users");
    const userSnapshot = await getDocs(usersCol);
    const userList: User[] = [];
    userSnapshot.forEach((docSnap) => {
      const data = docSnap.data() as User;
      // Exclude admins
      if (!data.isAdmin) {
        userList.push({ ...data, id: docSnap.id });
      }
    });
    setUsers(userList);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDelete = (userId: string) => {
    setDeleteUserId(userId);
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (!deleteUserId) return;
    await deleteDoc(doc(db, "users", deleteUserId));
    setDeleteModalVisible(false);
    setDeleteUserId(null);
    fetchUsers();
  };

  const handleEdit = (user: User) => {
    setEditUser(user);
    setEditName(user.name || "");
    setEditEmail(user.email || "");
    setEditPassword("");
    setEditIsNutritionist(!!user.isNutritionist);
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!editUser) return;
    try {
      await updateDoc(doc(db, "users", editUser.id), {
        name: editName,
        email: editEmail,
        isNutritionist: editIsNutritionist,
      });
      // Password update for other users is not possible from client SDK
      if (editPassword) {
        Alert.alert(
          "Password Update",
          "Password update is only available for the current user. Please use the password reset feature."
        );
      }
      setEditModalVisible(false);
      setEditUser(null);
      fetchUsers();
    } catch (e) {
      Alert.alert("Error", "Failed to update user.");
    }
  };

  const handleSendResetEmail = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert("Success", "Password reset email sent to " + email);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to send reset email.");
    }
  };

  const handleSelectUser = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedUsers([]);
      setSelectAll(false);
    } else {
      setSelectedUsers(users.map((u) => u.id));
      setSelectAll(true);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedUsers.length === 0) return;
    Alert.alert(
      "Delete Users",
      `Are you sure you want to delete ${selectedUsers.length} user(s)?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            for (const userId of selectedUsers) {
              await deleteDoc(doc(db, "users", userId));
            }
            setSelectedUsers([]);
            setSelectAll(false);
            fetchUsers();
          },
        },
      ]
    );
  };

  const handleAddUser = async () => {
    if (!addName || !addEmail) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }
    setAddLoading(true);
    try {
      // Create Firestore user doc with createdAt
      const usersCol = collection(db, "users");
      const userDoc = doc(usersCol);
      await setDoc(userDoc, {
        name: addName,
        email: addEmail,
        createdAt: serverTimestamp(),
        isAdmin: false,
      });
      // Send password reset email
      await sendPasswordResetEmail(auth, addEmail);
      setAddModalVisible(false);
      setAddName("");
      setAddEmail("");
      fetchUsers();
      Alert.alert("Success", "User added and password setup email sent.");
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to add user.");
    }
    setAddLoading(false);
  };

  // Add this function to get status bar height
  const getStatusBarHeight = () => {
    if (Platform.OS === 'ios') {
      return 44; // iOS status bar height
    } else {
      return RNStatusBar.currentHeight || 0;
    }
  };

  return (
    <View style={[styles.container, { marginTop: 0, paddingTop: getStatusBarHeight() }]}>
      <StatusBar style="dark" backgroundColor="#f8f8f8" translucent />
      <AdminHeader noTopPadding={true} />
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Manage Users</Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setAddModalVisible(true)}
          >
            <Ionicons name="add-circle" size={32} color="#2e6930" />
          </TouchableOpacity>
        </View>
        <View style={styles.selectAllRow}>
          <TouchableOpacity
            style={styles.checkbox}
            onPress={handleSelectAll}
          >
            {selectAll ? (
              <Ionicons name="checkbox" size={22} color="#2e6930" />
            ) : (
              <Ionicons name="square-outline" size={22} color="#bbb" />
            )}
          </TouchableOpacity>
          <Text style={{ fontSize: 15, color: "#222", marginLeft: 6 }}>Select All</Text>
          <TouchableOpacity
            style={[
              styles.deleteBtn,
              {
                marginLeft: "auto",
                opacity: selectedUsers.length === 0 ? 0.5 : 1,
              },
            ]}
            onPress={handleDeleteSelected}
            disabled={selectedUsers.length === 0}
          >
            <Text style={styles.actionText}>Delete Selected</Text>
          </TouchableOpacity>
        </View>
        {loading ? (
          <ActivityIndicator size="large" color="#2e6930" />
        ) : (
          <FlatList
            data={users}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.userRow}>
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() => handleSelectUser(item.id)}
                >
                  {selectedUsers.includes(item.id) ? (
                    <Ionicons name="checkbox" size={22} color="#2e6930" />
                  ) : (
                    <Ionicons name="square-outline" size={22} color="#bbb" />
                  )}
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName}>{item.name || "No Name"}</Text>
                  <Text style={styles.userEmail}>{item.email}</Text>
                </View>
                {/* 3-dot menu */}
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={styles.menuBtn}
                    onPress={() =>
                      setMenuVisibleUserId(
                        menuVisibleUserId === item.id ? null : item.id
                      )
                    }
                  >
                    <MaterialCommunityIcons
                      name="dots-vertical"
                      size={26}
                      color="#222"
                    />
                  </TouchableOpacity>
                  {menuVisibleUserId === item.id && (
                    <View style={styles.dropdownMenu}>
                      <TouchableOpacity
                        style={styles.dropdownItem}
                        onPress={() => {
                          setMenuVisibleUserId(null);
                          handleEdit(item);
                        }}
                      >
                        <Text style={styles.dropdownText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.dropdownItem}
                        onPress={() => {
                          setMenuVisibleUserId(null);
                          handleDelete(item.id);
                        }}
                      >
                        <Text style={[styles.dropdownText, { color: "#c0392b" }]}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            )}
            ListEmptyComponent={
              <Text style={{ color: "#888", textAlign: "center", marginTop: 32 }}>
                No users found.
              </Text>
            }
          />
        )}
      </View>
      <AdminDock activeTab="users" />
      {/* Edit Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit User</Text>
            <TextInput
              style={styles.modalInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="Name"
            />
            <TextInput
              style={styles.modalInput}
              value={editEmail}
              onChangeText={setEditEmail}
              placeholder="Email"
              autoCapitalize="none"
              keyboardType="email-address"
            />
            {/* Nutritionist Checkbox */}
            <TouchableOpacity
              style={styles.nutritionistRow}
              onPress={() => setEditIsNutritionist((v) => !v)}
              activeOpacity={0.7}
            >
              {editIsNutritionist ? (
                <Ionicons name="checkbox" size={22} color="#2e6930" />
              ) : (
                <Ionicons name="square-outline" size={22} color="#bbb" />
              )}
              <Text style={styles.nutritionistLabel}>Assign as Nutritionist</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalSave, { backgroundColor: "#2e6930", marginBottom: 10 }]}
              onPress={() => handleSendResetEmail(editEmail)}
            >
              <Text style={styles.actionText}>Send Password Reset Email</Text>
            </TouchableOpacity>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.actionText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSave}
                onPress={handleSaveEdit}
              >
                <Text style={styles.actionText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Delete Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModalContent}>
            <Text style={styles.modalTitle}>Delete User</Text>
            <Text style={{ marginBottom: 18, color: "#333", fontSize: 16 }}>
              Are you sure you want to delete this user?
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setDeleteModalVisible(false)}
              >
                <Text style={styles.actionText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={confirmDelete}
              >
                <Text style={styles.actionText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Add User Modal */}
      <Modal
        visible={addModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add User</Text>
            <TextInput
              style={styles.modalInput}
              value={addName}
              onChangeText={setAddName}
              placeholder="Name"
              autoCapitalize="words"
            />
            <TextInput
              style={styles.modalInput}
              value={addEmail}
              onChangeText={setAddEmail}
              placeholder="Email"
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setAddModalVisible(false)}
                disabled={addLoading}
              >
                <Text style={styles.actionText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSave}
                onPress={handleAddUser}
                disabled={addLoading}
              >
                <Text style={styles.actionText}>{addLoading ? "Adding..." : "Add"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    flex: 1,
    padding: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#2e6930",
    marginBottom: 18,
    textAlign: "center",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  addBtn: {
    marginLeft: "auto",
    padding: 4,
  },
  userRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f8f8f8",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#222",
  },
  userEmail: {
    fontSize: 14,
    color: "#555",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },
  menuBtn: {
    padding: 6,
  },
  dropdownMenu: {
    position: "absolute",
    top: 32,
    right: 0,
    backgroundColor: "#fff",
    borderRadius: 8,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    zIndex: 100,
    minWidth: 110,
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  dropdownText: {
    fontSize: 15,
    color: "#222",
  },
  selectAllRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  checkbox: {
    marginRight: 8,
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "85%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2e6930",
    marginBottom: 16,
  },
  modalInput: {
    width: "100%",
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
    fontSize: 15,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    width: "100%",
  },
  modalCancel: {
    backgroundColor: "#bbb",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 18,
    marginRight: 10,
  },
  modalSave: {
    backgroundColor: "#2e6930",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 18,
  },
  deleteModalContent: {
    width: "85%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    elevation: 8,
  },
  deleteBtn: {
    backgroundColor: "#c0392b",
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  actionText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 13,
  },
  nutritionistRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginBottom: 14,
    marginTop: -6,
  },
  nutritionistLabel: {
    marginLeft: 8,
    fontSize: 15,
    color: "#222",
  },
});
