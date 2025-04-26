import React, { useRef } from "react";
import { View, TouchableOpacity, Text, StyleSheet, Animated } from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

type AdminTab = "dashboard" | "users" | "settings" | "community" | "mealPlans";

interface AdminDockProps {
  activeTab: AdminTab;
  onTabPress?: (tab: AdminTab) => void;
}

const tabs: { key: AdminTab; label: string; icon: JSX.Element; route: string }[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: <MaterialCommunityIcons name="view-dashboard-outline" size={28} color="#2e6930" />,
    route: "/admin/AdminDashboard",
  },
  {
    key: "users",
    label: "Users",
    icon: <MaterialCommunityIcons name="account-group-outline" size={28} color="#2e6930" />,
    route: "/admin/AdminUsers", // updated route
  },
  {
    key: "community",
    label: "Community",
    icon: <MaterialCommunityIcons name="account-voice" size={28} color="#2e6930" />,
    route: "/community",
  },
  {
    key: "mealPlans",
    label: "Meal Plans",
    icon: <MaterialCommunityIcons name="food-variant" size={28} color="#2e6930" />,
    route: "/admin/AdminMealPlans",
  },
  {
    key: "settings",
    label: "Settings",
    icon: <Ionicons name="settings-outline" size={28} color="#2e6930" />,
    route: "/admin/AdminSettings",
  },
];

export default function AdminDock({ activeTab, onTabPress }: AdminDockProps) {
  const router = useRouter();
  const tabScales = useRef(tabs.map(() => new Animated.Value(1))).current;

  const handleTabPress = (tab: AdminTab, index: number) => {
    Animated.sequence([
      Animated.timing(tabScales[index], {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: true
      }),
      Animated.timing(tabScales[index], {
        toValue: 1.1,
        duration: 100,
        useNativeDriver: true
      }),
      Animated.timing(tabScales[index], {
        toValue: 1,
        duration: 100,
        useNativeDriver: true
      })
    ]).start();

    // Skip navigation if the tab is already active
    if (tab === activeTab) return;

    if (onTabPress) {
      onTabPress(tab);
    } else {
      const found = tabs.find((t) => t.key === tab);
      if (found && found.route) {
        router.replace(found.route as any);
      }
    }
  };

  return (
    <View style={styles.dockContainer}>
      {tabs.map((tab, index) => (
        <TouchableOpacity
          key={tab.key}
          style={styles.dockItem}
          onPress={() => handleTabPress(tab.key as AdminTab, index)}
          activeOpacity={0.7}
        >
          <Animated.View
            style={[
              styles.iconWrapper,
              { transform: [{ scale: tabScales[index] }] }
            ]}
          >
            {React.cloneElement(tab.icon, {
              color: activeTab === tab.key ? "#2e6930" : "#bbb",
            })}
          </Animated.View>
          <Text
            style={[
              styles.dockLabel,
              activeTab === tab.key && styles.activeDockLabel,
            ]}
          >
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  dockContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    backgroundColor: "#fff",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  dockItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  iconWrapper: {
    marginBottom: 2,
    padding: 6,
    backgroundColor: "rgba(0,0,0,0.001)",
  },
  dockLabel: {
    fontSize: 12,
    color: "#bbb",
    fontFamily: "FrancaDemo-SemiBold",
    marginTop: 2,
  },
  activeDockLabel: {
    color: "#2e6930",
  },
});
