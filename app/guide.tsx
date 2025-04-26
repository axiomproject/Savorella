import React, { useState, useRef } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Platform, UIManager } from "react-native";
import UserDock from "../components/UserDock";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { StatusBar } from "expo-status-bar";

const HEADER_HEIGHT = 100;

// Enable LayoutAnimation on Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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
    paddingBottom: 18,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 28,
    fontFamily: "FrancaDemo-Bold",
    textAlign: "center",
    letterSpacing: 1,
    marginBottom: 10,
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingBottom: 16,
  },
  sectionTitle: {
    fontSize: 24,
    color: "#2e6930",
    fontFamily: "FrancaDemo-SemiBold",
    marginBottom: 15,
    marginTop: 15,
    textAlign: "center",
  },
  paragraph: {
    fontSize: 15,
    color: "#333",
    fontFamily: "Franca-Light",
    marginBottom: 18,
    lineHeight: 17,
    textAlign: "left",
  },
  cardContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 22,
    paddingHorizontal: 0,
    paddingVertical: 0,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#b2d8b6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 6,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingLeft: 0,
    backgroundColor: "transparent",
  },
  cardHeaderUnderline: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 1,
    backgroundColor: "#e0e0e0",
    zIndex: 10,
  },
  cardHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  chevronIcon: {
    marginLeft: "auto",
    marginRight: 16,
  },
  iconWrapper: {
    marginRight: 10,
    marginLeft: 0,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#2e6930",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10, 
  },
  cardTitle: {
    color: "#2e6930",
    fontSize: 18,
    fontFamily: "FrancaDemo-SemiBold",
    textAlign: "left",
    marginLeft: 0,
  },
  cardContent: {
    paddingHorizontal: 18,
    paddingBottom: 14,
    paddingTop: 2,
  },
  cardDescription: {
    fontSize: 15,
    color: "#333",
    fontFamily: "Franca-Light",
    marginBottom: 8,
    marginTop: 8,
    lineHeight: 18,
  },
  cardSubInfo: {
    fontSize: 13,
    color: "#888",
    fontFamily: "Franca-Light",
    marginBottom: 8,
  },
  agesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  ageCol: {
    alignItems: "center",
    flex: 1,
  },
  ageLabel: {
    fontSize: 13,
    color: "#888",
    fontFamily: "Franca-Light",
  },
  ageValue: {
    fontSize: 15,
    color: "#2e6930",
    fontFamily: "FrancaDemo-Bold",
    marginTop: 8,
  },
});

// Custom icons for each nutrient (replace with your own icons as needed)
const NutrientIcons: Record<string, React.ReactNode> = {
  Protein: (
    <View style={styles.iconCircle}>
      <MaterialCommunityIcons name="food-drumstick" size={20} color="#fff" />
    </View>
  ),
  Carbohydrates: (
    <View style={styles.iconCircle}>
      <MaterialCommunityIcons name="bread-slice" size={20} color="#fff" />
    </View>
  ),
  Fats: (
    <View style={styles.iconCircle}>
      <MaterialCommunityIcons name="peanut" size={20} color="#fff" />
    </View>
  ),
  Vitamins: (
    <View style={styles.iconCircle}>
      <MaterialCommunityIcons name="food-apple" size={20} color="#fff" />
    </View>
  ),
};

const nutrients = [
  {
    key: "Protein",
    title: "Protein",
    icon: NutrientIcons.Protein,
    description: "Essential for growth and repair of tissues, immune function, and enzyme production.",
    sources: "Sources: Meat, fish, eggs, dairy, legumes, nuts",
    daily: "Daily Intake",
    ages: [
      { label: "Ages: 1-3", value: "13g" },
      { label: "Ages: 4-8", value: "19g" },
      { label: "Ages: 9-13", value: "34g" },
    ],
  },
  {
    key: "Carbohydrates",
    title: "Carbohydrates",
    icon: NutrientIcons.Carbohydrates,
    description: "Primary source of energy for growth, brain function, and physical activity.",
    sources: "Sources: Bread, rice, pasta, potatoes, fruits, vegetables",
    daily: "Daily Intake",
    ages: [
      { label: "Ages: 1-3", value: "130g" },
      { label: "Ages: 4-8", value: "130g" },
      { label: "Ages: 9-13", value: "130g" },
    ],
  },
  {
    key: "Fats",
    title: "Fats",
    icon: NutrientIcons.Fats,
    description: "Supports brain development, energy, and absorption of vitamins.",
    sources: "Sources: Oils, butter, avocados, nuts, seeds, fatty fish",
    daily: "Daily Intake",
    ages: [
      { label: "Ages: 1-3", value: "30-40% of calories" },
      { label: "Ages: 4-8", value: "25-35% of calories" },
      { label: "Ages: 9-13", value: "25-35% of calories" },
    ],
  },
  {
    key: "Vitamins",
    title: "Vitamins",
    icon: NutrientIcons.Vitamins,
    description: "Vital for immune function, vision, skin health, and overall growth.",
    sources: "Sources: Fruits, vegetables, dairy, eggs, fortified cereals",
    daily: "Daily Intake",
    ages: [
      { label: "Ages: 1-3", value: "Varies by vitamin" },
      { label: "Ages: 4-8", value: "Varies by vitamin" },
      { label: "Ages: 9-13", value: "Varies by vitamin" },
    ],
  },
];

export default function GuideScreen() {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const chevronAnimations = useRef<Record<string, Animated.Value>>({}).current;
  const contentAnimations = useRef<Record<string, Animated.Value>>({}).current;

  const toggleExpand = (key: string) => {
    // Chevron animation
    if (!chevronAnimations[key]) {
      chevronAnimations[key] = new Animated.Value(expanded[key] ? 1 : 0);
    }
    // Content animation
    if (!contentAnimations[key]) {
      contentAnimations[key] = new Animated.Value(expanded[key] ? 1 : 0);
    }
    const toValue = expanded[key] ? 0 : 1;
    Animated.timing(chevronAnimations[key], {
      toValue,
      duration: 200,
      useNativeDriver: true,
    }).start();
    Animated.timing(contentAnimations[key], {
      toValue,
      duration: 200,
      useNativeDriver: false, // height cannot use native driver
    }).start();
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor="#2e6930" />
      {/* Fixed Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Nutrient Guide</Text>
      </View>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: HEADER_HEIGHT }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Essential Nutrients</Text>
        <Text style={styles.paragraph}>
          Understanding the right nutrients for your child's development is crucial. Below is a breakdown of essential nutrients and their benefits.
        </Text>
        {/* Recycler View Cards */}
        {nutrients.map((nutrient) => {
          if (!chevronAnimations[nutrient.key]) {
            chevronAnimations[nutrient.key] = new Animated.Value(expanded[nutrient.key] ? 1 : 0);
          }
          if (!contentAnimations[nutrient.key]) {
            contentAnimations[nutrient.key] = new Animated.Value(expanded[nutrient.key] ? 1 : 0);
          }
          const rotate = chevronAnimations[nutrient.key].interpolate({
            inputRange: [0, 1],
            outputRange: ["0deg", "-180deg"],
          });
          const contentHeight = contentAnimations[nutrient.key].interpolate({
            inputRange: [0, 1],
            outputRange: [0, 190], // Increased from 110 to 180 for full content visibility
          });
          const contentOpacity = contentAnimations[nutrient.key].interpolate({
            inputRange: [0, 1],
            outputRange: [0, 1],
          });
          return (
            <View key={nutrient.key} style={styles.cardContainer}>
              <View>
                <TouchableOpacity
                  style={styles.cardHeader}
                  onPress={() => toggleExpand(nutrient.key)}
                  activeOpacity={0.7}
                >
                  <View style={styles.cardHeaderContent}>
                    <View style={styles.iconWrapper}>{nutrient.icon}</View>
                    <Text style={styles.cardTitle}>{nutrient.title}</Text>
                  </View>
                  <Animated.View style={[styles.chevronIcon, { transform: [{ rotate }] }]}>
                    <MaterialCommunityIcons
                      name="chevron-down"
                      size={28}
                      color="#2e6930"
                    />
                  </Animated.View>
                  {/* Gray underline when expanded */}
                  {expanded[nutrient.key] && (
                    <View style={styles.cardHeaderUnderline} />
                  )}
                </TouchableOpacity>
              </View>
              <Animated.View
                style={{
                  height: contentHeight,
                  opacity: contentOpacity,
                  overflow: "hidden",
                }}
              >
                <View style={styles.cardContent} pointerEvents={expanded[nutrient.key] ? "auto" : "none"}>
                  <Text style={styles.cardDescription}>{nutrient.description}</Text>
                  <Text style={styles.cardSubInfo}>{nutrient.sources}</Text>
                  <Text style={styles.cardSubInfo}>{nutrient.daily}</Text>
                  <View style={styles.agesRow}>
                    {nutrient.ages.map((age, idx) => (
                      <View key={age.label} style={styles.ageCol}>
                        <Text style={styles.ageLabel}>{age.label}</Text>
                        <Text style={styles.ageValue}>{age.value}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </Animated.View>
            </View>
          );
        })}
        <View style={{ height: 80 }} />
      </ScrollView>
      <UserDock activeTab="nutrition" />
    </View>
  );
}
