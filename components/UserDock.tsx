import React, { useRef, useEffect } from "react";
import { View, TouchableOpacity, Text, StyleSheet, Animated, Dimensions } from "react-native";
import { MaterialCommunityIcons, Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { useRouter } from "expo-router";

type DockTab = "dashboard" | "mealplans" | "nutrition" | "community" | "settings";

interface UserDockProps {
  activeTab: DockTab;
  onTabPress?: (tab: DockTab) => void;
}

const tabs: { key: DockTab; label: string; icon: JSX.Element; route: string }[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: <MaterialCommunityIcons name="view-dashboard-outline" size={28} color="#2e6930" />,
    route: "/dashboard",
  },
  {
    key: "mealplans",
    label: "Meal Plans",
    icon: <MaterialCommunityIcons name="food-apple-outline" size={28} color="#2e6930" />,
    route: "/mealplans",
  },
  {
    key: "nutrition",
    label: "Nutrition",
    icon: <Ionicons name="nutrition-outline" size={28} color="#2e6930" />,
    route: "/guide",
  },
  {
    key: "community",
    label: "Community",
    icon: <MaterialCommunityIcons name="account-group-outline" size={28} color="#2e6930" />,
    route: "/community",
  },
  {
    key: "settings",
    label: "Settings",
    icon: <Ionicons name="settings-outline" size={28} color="#2e6930" />,
    route: "/settings",
  },
];

export default function UserDock({ activeTab, onTabPress }: UserDockProps) {
  const router = useRouter();

  // Create animations for tab press only
  const tabScales = useRef(tabs.map(() => new Animated.Value(1))).current;

  // Fade animation for the dock
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const prevActiveTab = useRef(activeTab);

  useEffect(() => {
    if (prevActiveTab.current !== activeTab) {
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0.5, duration: 100, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();
      prevActiveTab.current = activeTab;
    }
  }, [activeTab]);

  const handleTabPress = (tab: DockTab, index: number) => {
    // Animate the tab press
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

    // Navigate to the tab
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
    <Animated.View style={[styles.dockContainer, { opacity: fadeAnim }]}>
      {/* Tab items */}
      {tabs.map((tab, index) => (
        <TouchableOpacity
          key={tab.key}
          style={styles.dockItem}
          onPress={() => handleTabPress(tab.key as DockTab, index)}
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
    </Animated.View>
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
    backgroundColor: "rgba(0,0,0,0.001)", // Transparent but needed for native driver
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
