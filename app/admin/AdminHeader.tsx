import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Platform } from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface AdminHeaderProps {
  showLogout?: boolean;
  onLogout?: () => void;
  onReports?: () => void;
  noTopPadding?: boolean;
}

export default function AdminHeader({ showLogout, onLogout, onReports, noTopPadding }: AdminHeaderProps) {
  // Get safe area insets to respect status bar height
  const insets = useSafeAreaInsets();
  
  // Set explicit top padding - use 0 if noTopPadding is true
  const topPadding = noTopPadding ? 0 : (Platform.OS === 'ios' ? insets.top : StatusBar.currentHeight || 0);
  
  return (
    <View style={[
      styles.header, 
      { 
        paddingTop: topPadding + (noTopPadding ? 10 : 18),
        marginTop: 0 // Explicitly set margin top to 0
      }
    ]}>
      <MaterialCommunityIcons name="shield-account" size={28} color="#2e6930" style={{ marginRight: 10 }} />
      <Text style={styles.headerText}>Admin Panel</Text>
      {onReports && (
        <TouchableOpacity style={styles.reportsBtn} onPress={onReports}>
          <MaterialCommunityIcons name="alert-decagram-outline" size={28} color="#f7c948" />
        </TouchableOpacity>
      )}
      {showLogout && onLogout && (
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
          <Ionicons name="log-out-outline" size={28} color="#c0392b" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 18,
    paddingHorizontal: 24,
    backgroundColor: "#f8f8f8",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    elevation: 2,
    zIndex: 1000,
    marginTop: 0, // Explicitly set margin top to 0
  },
  headerText: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#2e6930",
    fontFamily: "FrancaDemo-Bold",
    letterSpacing: 1,
    flex: 1,
  },
  reportsBtn: {
    marginLeft: 8,
    padding: 4,
  },
  logoutBtn: {
    marginLeft: 8,
    padding: 4,
  },
});

