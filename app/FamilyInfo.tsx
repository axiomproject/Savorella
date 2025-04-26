import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Platform, Alert, ScrollView } from "react-native";
import { auth, db } from "../firebaseConfig";
import { doc, updateDoc } from "firebase/firestore";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";

const FOOD_PREFERENCES = [
  "Vegetarian",
  "Vegan",
  "Gluten-free",
  "Dairy-free",
  "Nut-free",
];

export default function FamilyInfo() {
  const [parentName, setParentName] = useState("");
  const [adults, setAdults] = useState([{ name: "", preferences: [] as string[], height: "", weight: "" }]);
  const [children, setChildren] = useState([{ name: "", age: "", preferences: [] as string[], height: "", weight: "" }]);
  const [submitting, setSubmitting] = useState(false);

  // Input validation functions
  const validateNumeric = (value: string) => {
    return value.replace(/[^0-9.]/g, ''); // Allow only numbers and decimal point
  };

  const validateName = (value: string) => {
    return value.replace(/[^a-zA-Z\s'-]/g, ''); // Allow letters, spaces, apostrophes, and hyphens
  };

  // Adult counter handlers
  const addAdult = () => setAdults([...adults, { name: "", preferences: [], height: "", weight: "" }]);
  const removeAdult = () => adults.length > 1 && setAdults(adults.slice(0, -1));
  // Child counter handlers
  const addChild = () => setChildren([...children, { name: "", age: "", preferences: [], height: "", weight: "" }]);
  const removeChild = () => children.length > 0 && setChildren(children.slice(0, -1));

  const handleAdultChange = (idx: number, field: "name" | "height" | "weight", value: string) => {
    const updated = [...adults];
    
    if (field === "name") {
      updated[idx][field] = validateName(value);
    } else if (field === "height" || field === "weight") {
      updated[idx][field] = validateNumeric(value);
    }
    
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
    
    if (field === "name") {
      updated[idx][field] = validateName(value);
    } else if (field === "age" || field === "height" || field === "weight") {
      updated[idx][field] = validateNumeric(value);
    }
    
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

  const handleSubmit = async () => {
    if (!parentName) {
      Alert.alert("Please enter the parent's name.");
      return;
    }
    setSubmitting(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("No user found.");
      await updateDoc(doc(db, "users", user.uid), {
        familyInfoCompleted: true,
        parentName,
        adults,
        children,
      });
      router.replace("/dashboard");
    } catch (e) {
      Alert.alert("Error", "Could not save family info.");
    }
    setSubmitting(false);
  };

  return (
    <View style={styles.container}>
      {/* Purple Header */}
      <View style={styles.header}>
        <Text style={styles.headerText}></Text>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <Text style={styles.title}>Tell us about your family</Text>
          <Text style={styles.paragraph}>
            This helps us personalize your meal planning experience
          </Text>
          {/* Parent's Name */}
          <Text style={styles.inputLabel}>Parent's Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Your name"
            value={parentName}
            onChangeText={value => setParentName(validateName(value))}
            placeholderTextColor="#bbb"
          />
          {/* Number of Family Members */}
          <Text style={styles.sectionLabel}>Number of Family Members</Text>
          <View style={styles.cardsRow}>
            {/* Adult Card */}
            <View style={styles.card}>
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
            {/* Child Card */}
            <View style={styles.card}>
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
          {/* Adult Details */}
          {adults.map((adult, idx) => (
            <View style={styles.adultDetails} key={idx}>
              <Text style={styles.inputLabel}>Adult {adults.length > 1 ? `#${idx + 1}` : ""} Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Adult's name"
                value={adult.name}
                onChangeText={val => handleAdultChange(idx, "name", val)}
                placeholderTextColor="#bbb"
              />
              <Text style={styles.inputLabel}>Height (cm)</Text>
              <TextInput
                style={styles.input}
                placeholder="Height in cm"
                value={adult.height}
                onChangeText={val => handleAdultChange(idx, "height", val)}
                placeholderTextColor="#bbb"
                keyboardType="numeric"
              />
              <Text style={styles.inputLabel}>Weight (kg)</Text>
              <TextInput
                style={styles.input}
                placeholder="Weight in kg"
                value={adult.weight}
                onChangeText={val => handleAdultChange(idx, "weight", val)}
                placeholderTextColor="#bbb"
                keyboardType="numeric"
              />
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
          {/* Children Details */}
          {children.map((child, idx) => (
            <View style={styles.adultDetails} key={idx + "child"}>
              <Text style={styles.inputLabel}>Child {children.length > 1 ? `#${idx + 1}` : ""} Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Child's name"
                value={child.name}
                onChangeText={val => handleChildChange(idx, "name", val)}
                placeholderTextColor="#bbb"
              />
              <Text style={styles.inputLabel}>Child's Age</Text>
              <TextInput
                style={styles.input}
                placeholder="Child's age"
                value={child.age}
                onChangeText={val => handleChildChange(idx, "age", val)}
                placeholderTextColor="#bbb"
                keyboardType="numeric"
              />
              <Text style={styles.inputLabel}>Height (cm)</Text>
              <TextInput
                style={styles.input}
                placeholder="Height in cm"
                value={child.height}
                onChangeText={val => handleChildChange(idx, "height", val)}
                placeholderTextColor="#bbb"
                keyboardType="numeric"
              />
              <Text style={styles.inputLabel}>Weight (kg)</Text>
              <TextInput
                style={styles.input}
                placeholder="Weight in kg"
                value={child.weight}
                onChangeText={val => handleChildChange(idx, "weight", val)}
                placeholderTextColor="#bbb"
                keyboardType="numeric"
              />
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
            style={[styles.submitButton, submitting && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <Text style={styles.submitButtonText}>Save</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    backgroundColor: "#7c3aed",
    height: Platform.OS === "ios" ? 120 : 100,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 18,
    width: "100%",
  },
  headerText: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 18,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#2e2e2e",
    marginBottom: 8,
    marginTop: 10,
    letterSpacing: 0.5,
  },
  paragraph: {
    fontSize: 15,
    color: "#555",
    marginBottom: 24,
    lineHeight: 20,
  },
  inputLabel: {
    fontSize: 15,
    color: "#2e6930",
    marginBottom: 6,
    marginTop: 10,
    fontWeight: "600",
  },
  input: {
    height: 44,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: "#f8f8f8",
    marginBottom: 10,
    fontSize: 16,
    color: "#222",
  },
  sectionLabel: {
    fontSize: 17,
    color: "#2e6930",
    marginTop: 18,
    marginBottom: 10,
    fontWeight: "bold",
  },
  cardsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  card: {
    flex: 1,
    backgroundColor: "#f3f0ff",
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 4,
    alignItems: "center",
    shadowColor: "#7c3aed",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 17,
    color: "#7c3aed",
    fontWeight: "bold",
    marginBottom: 8,
  },
  counterRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  counterButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#e0e7ff",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 8,
  },
  counterButtonText: {
    fontSize: 22,
    color: "#7c3aed",
    fontWeight: "bold",
  },
  counterValue: {
    fontSize: 18,
    color: "#2e2e2e",
    fontWeight: "bold",
    minWidth: 24,
    textAlign: "center",
  },
  adultDetails: {
    marginTop: 18,
    backgroundColor: "#f8f8ff",
    borderRadius: 12,
    padding: 14,
    shadowColor: "#7c3aed",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  dropdown: {
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#fff",
    marginTop: 6,
  },
  dropdownText: {
    fontSize: 15,
    color: "#555",
  },
  dropdownList: {
    backgroundColor: "#fff",
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 10,
    marginTop: 2,
    zIndex: 10,
    position: "absolute",
    width: "100%",
    left: 0,
  },
  dropdownItem: {
    padding: 12,
  },
  dropdownItemText: {
    fontSize: 15,
    color: "#2e6930",
  },
  submitButton: {
    marginTop: 30,
    backgroundColor: "#7c3aed",
    borderRadius: 24,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    shadowColor: "#7c3aed",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  checkboxRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 6,
    marginBottom: 4,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 18,
    marginBottom: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#7c3aed",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 7,
  },
  checkboxChecked: {
    backgroundColor: "#7c3aed",
    borderColor: "#7c3aed",
  },
  checkboxLabel: {
    fontSize: 15,
    color: "#2e2e2e",
  },
});
