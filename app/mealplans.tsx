import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Modal, Pressable, ScrollView, Dimensions, Platform } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import UserDock from "../components/UserDock";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { auth, db } from "../firebaseConfig";
import { doc, getDoc, collection, addDoc, getDocs, query, orderBy, deleteDoc, where } from "firebase/firestore";
import { mealDishes, MealDish } from "../data/mealDishes";

const HEADER_HEIGHT = 100;
const SCREEN_WIDTH = Dimensions.get("window").width;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingBottom: 0,
    position: "relative",
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
  content: {
    paddingTop: HEADER_HEIGHT,
    paddingHorizontal: 24,
    flex: 1,
  },
  searchBarContainer: {
    position: 'relative',
    zIndex: 10,
    elevation: 5, // Added elevation for Android
    marginBottom: 30, // Added to ensure space for suggestions
  },
  searchBarWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eaf0eb",
    borderRadius: 16,
    marginBottom: 22,
    marginTop: 10,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchBar: {
    flex: 1,
    backgroundColor: "transparent",
    borderRadius: 16,
    paddingHorizontal: 6,
    paddingVertical: 10,
    fontSize: 16,
    fontFamily: "Franca-Light",
    color: "#222",
  },
  suggestionsContainer: {
    position: 'absolute',
    top: 50, // Changed from percentage to fixed value
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 0,
    paddingVertical: 6,
    maxHeight: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5, // Increased from 0 to 5 for Android
    borderWidth: 1,
    borderColor: '#e0e0e0',
    zIndex: 20,
  },
  suggestionItem: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  suggestionText: {
    fontSize: 16,
    color: '#2e6930',
    fontFamily: "FrancaDemo-SemiBold",
  },
  suggestionSubtext: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  plannerCard: {
    backgroundColor: "#2e6930",
    borderRadius: 18,
    paddingVertical: 22,
    paddingHorizontal: 20,
    marginBottom: 22,
    shadowColor: "#2e6930",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 10,
    elevation: 4,
  },
  plannerTitle: {
    color: "#fff",
    fontSize: 22,
    fontFamily: "FrancaDemo-Bold",
    marginBottom: 8,
    textAlign: "left",
  },
  plannerSubtitle: {
    color: "#e5d6ff",
    fontSize: 15,
    fontFamily: "Franca-Light",
    textAlign: "left",
    marginBottom: 16,
  },
  createButton: {
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignSelf: "flex-start",
    shadowColor: "#2e6930",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  createButtonText: {
    color: "#2e6930",
    fontSize: 16,
    fontFamily: "FrancaDemo-SemiBold",
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 18,
    color: "#2e6930",
    fontFamily: "FrancaDemo-SemiBold",
    marginBottom: 12,
    marginTop: 8,
    textAlign: "left",
  },
  mealPlanCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    marginBottom: 22,
    shadowColor: "#2e6930",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  mealPlanHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    justifyContent: "space-between",
  },
  mealPlanTitle: {
    fontSize: 17,
    color: "#2e6930",
    fontFamily: "FrancaDemo-Bold",
    textAlign: "left",
  },
  mealPlanDays: {
    flexDirection: "row",
    alignItems: "center",
  },
  mealPlanDaysText: {
    fontSize: 14,
    color: "#2e6930",
    fontFamily: "FrancaDemo-SemiBold",
  },
  mealRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  mealRowTitle: {
    fontSize: 15,
    color: "#222",
    fontFamily: "FrancaDemo-SemiBold",
    minWidth: 80,
    marginRight: 10,
  },
  mealRowDesc: {
    fontSize: 14,
    color: "#888",
    fontFamily: "Franca-Light",
    flex: 1,
    marginLeft: 0,
  },
  mealPlanActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  actionButton: {
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 18,
    marginRight: 8,
  },
  actionButtonSecondary: {
    backgroundColor: "#2e6930",
    marginRight: 0,
  },
  actionButtonText: {
    color: "#74b72e", // pale purple for "View Details"
    fontSize: 15,
    fontFamily: "FrancaDemo-SemiBold",
    textAlign: "center",
  },
  actionButtonTextSecondary: {
    color: "#fff",
  },
  groceryButton: {
    backgroundColor: "#74b72e",
    borderRadius: 24,
    paddingVertical: 8,
    paddingHorizontal: 25,
    minWidth: 100,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#74b72e",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
    marginLeft: 8,
  },
  groceryButtonText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "FrancaDemo-SemiBold",
    letterSpacing: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.18)",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    width: "85%",
    maxWidth: 500,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    overflow: "hidden",
    zIndex: 1,
  },
  modalScroll: {
    width: "100%",
    flexGrow: 0,
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
  },
  modalCloseText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "FrancaDemo-SemiBold",
    textAlign: "center",
  },
  modalInput: {
    backgroundColor: "#eaf0eb",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: "Franca-Light",
    color: "#222",
    marginBottom: 12,
    width: "100%",
  },
  dropdownOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  dropdownMenu: {
    backgroundColor: "#fff",
    borderColor: "#2e6930",
    borderWidth: 1.5,
    borderRadius: 12,
    shadowColor: "#222",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 10000,
    overflow: "hidden",
  },
  dropdownMenuItem: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eaeaea",
  },
  searchResultItem: {
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  searchResultTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#2e6930",
    marginBottom: 4,
  },
  searchResultSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  viewDetailsButton: {
    fontSize: 14,
    color: "#2e6930",
    fontWeight: "bold",
    textAlign: "right",
  },
  publicPlanSection: {
    marginBottom: 16,
    padding: 8,
  },
  publicPlanCreator: {
    fontSize: 15,
    color: "#666",
    fontStyle: "italic",
  },
  memberSection: {
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    width: '100%',
  },
  memberType: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2e6930",
    marginBottom: 8,
  },
  publicPlanMealRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    width: '100%',
    paddingVertical: 2,
  },
  mealLabel: {
    width: 80,
    fontWeight: "bold",
    color: "#444",
  },
  mealValue: {
    flex: 1,
    color: "#222",
    flexWrap: 'wrap',
  },
});

// Helper to get dietary conflicts
function getDietaryConflicts(dish: MealDish | undefined, preferences: string[]): string[] {
  if (!dish || !preferences?.length) return [];
  const conflicts: string[] = [];
  preferences.forEach(pref => {
    if (pref === "Vegetarian" && !dish.dietaryNotes.vegetarian) conflicts.push("not vegetarian");
    if (pref === "Vegan" && !dish.dietaryNotes.vegan) conflicts.push("not vegan");
    if (pref === "Gluten-free" && !dish.dietaryNotes.glutenFree) conflicts.push("contains gluten");
    if (pref === "Dairy-free" && !dish.dietaryNotes.dairyFree) conflicts.push("contains dairy");
    if (pref === "Nut-free" && !dish.dietaryNotes.nutFree) conflicts.push("contains nuts");
  });
  return conflicts;
}

// Create a self-contained dropdown component for reliable positioning
const MealDropdown = ({ 
  value, 
  placeholder, 
  onSelect, 
  options,
  preferences = [],
  getDietaryConflicts,
  getDishDetails
}: { 
  value: string;
  placeholder: string;
  onSelect: (value: string) => void;
  options: string[];
  preferences?: string[];
  getDietaryConflicts: any;
  getDishDetails: any;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <View style={{ marginBottom: 6, zIndex: 1 }}>
      {/* Dropdown trigger button */}
      <TouchableOpacity
        style={[styles.modalInput, { flexDirection: "row", alignItems: "center" }]}
        onPress={() => setIsOpen(!isOpen)}
        activeOpacity={0.8}
      >
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>
          <Text style={{ color: value ? "#222" : "#aaa" }}>
            {value || placeholder}
          </Text>
          {value ? (() => {
            const dish = getDishDetails(value);
            const conflicts = getDietaryConflicts(dish, preferences);
            if (conflicts.length) {
              return (
                <Text style={{ color: "#e67e22", marginLeft: 6, fontSize: 13 }}>
                  ⚠️ {conflicts.join(", ")}
                </Text>
              );
            }
            return null;
          })() : null}
        </View>
        <Ionicons
          name={isOpen ? "chevron-up" : "chevron-down"}
          size={18}
          color="#2e6930"
        />
      </TouchableOpacity>

      {/* Dropdown options - fixed position below trigger button */}
      {isOpen && (
        <View style={{
          position: "relative",
          zIndex: 1000,
          marginTop: 2,
          backgroundColor: "#fff",
          borderColor: "#2e6930",
          borderWidth: 1.5,
          borderRadius: 12,
          maxHeight: 200,
          shadowColor: "#222",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 8,
        }}>
          <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled={true}>
            {options.map((option, i) => (
              <TouchableOpacity
                key={option}
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 20,
                  backgroundColor: "#fff",
                  borderBottomWidth: i === options.length - 1 ? 0 : 1,
                  borderBottomColor: "#eaeaea",
                }}
                onPress={() => {
                  onSelect(option);
                  setIsOpen(false);
                }}
              >
                <Text style={{ color: "#2e6930" }}>{option}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

export default function MealPlansScreen() {
  const [search, setSearch] = useState("");
  const [modalVisible, setModalVisible] = useState(false);

  // Modal form state
  const [planName, setPlanName] = useState("");
  const [familyMembers, setFamilyMembers] = useState<{ name: string; type: string; preferences?: string[] }[]>([]);
  const [meals, setMeals] = useState<{ 
    [person: string]: { 
      breakfast: string; 
      lunch: string; 
      dinner: string;
    } 
  }>({});
  const [savedMealPlans, setSavedMealPlans] = useState<any[]>([]);
  const [detailsModal, setDetailsModal] = useState<{
    open: boolean;
    plan?: any;
  }>({ open: false });
  const [groceryModal, setGroceryModal] = useState<{
    open: boolean;
    plan?: any;
  }>({ open: false });
  const [confirmDelete, setConfirmDelete] = useState<{
    open: boolean;
    planId: string | null;
    planName: string | null;
  }>({ open: false, planId: null, planName: null });

  const [modalOffset, setModalOffset] = useState({ x: 0, y: 0 });

  // New state for public meal plans search
  const [publicMealPlans, setPublicMealPlans] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchResultsVisible, setSearchResultsVisible] = useState(false);
  const [selectedPublicPlan, setSelectedPublicPlan] = useState<any>(null);
  const [publicPlanDetailsVisible, setPublicPlanDetailsVisible] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // New state for search suggestions
  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchInputRef = useRef<TextInput>(null);

  // Get safe area insets to avoid system bars
  const insets = useSafeAreaInsets();

  // Helper to get meal options by type
  const getMealOptions = (type: "breakfast" | "lunch" | "dinner") =>
    mealDishes
      .filter(dish =>
        type === "breakfast"
          ? dish.type === "breakfast"
          : dish.type === "lunch" || dish.type === "dinner"
      )
      .map(dish => dish.name);

  // Helper to get dish details by name
  const getDishDetails = (dishName: string): MealDish | undefined =>
    mealDishes.find(d => d.name === dishName);

  useEffect(() => {
    if (!modalVisible) return;
    const fetchFamily = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          const adults = (data.adults || []).map((a: any) => ({ name: a.name, type: "Adult", preferences: a.preferences || [] })).filter((a: any) => a.name);
          const children = (data.children || []).map((c: any) => ({ name: c.name, type: "Child", preferences: c.preferences || [] })).filter((c: any) => c.name);
          const members = [...adults, ...children];
          setFamilyMembers(members);
          // Initialize meals state for each person if not already set
          setMeals((prev) => {
            const updated = { ...prev };
            members.forEach((m) => {
              if (!updated[m.name]) {
                updated[m.name] = { 
                  breakfast: "", 
                  lunch: "", 
                  dinner: ""
                };
              }
            });
            return updated;
          });
        } else {
          setFamilyMembers([]);
        }
      } catch {
        setFamilyMembers([]);
      }
    };
    fetchFamily();
  }, [modalVisible]);

  // Fetch saved meal plans on mount and when modal closes
  useEffect(() => {
    const fetchMealPlans = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;
        const mealPlansRef = collection(db, "users", user.uid, "mealPlans");
        const q = query(mealPlansRef, orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        const plans = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setSavedMealPlans(plans);
      } catch {
        setSavedMealPlans([]);
      }
    };
    fetchMealPlans();
  }, [modalVisible]);

  // Fetch all public meal plans when component mounts
  useEffect(() => {
    fetchPublicMealPlans();
  }, []);

  // Function to fetch all public meal plans for suggestions
  const fetchPublicMealPlans = async () => {
    try {
      const publicPlansRef = collection(db, "publicMealPlans");
      const snapshot = await getDocs(publicPlansRef);

      if (!snapshot.empty) {
        const plans = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setPublicMealPlans(plans);
      }
    } catch (error) {
      console.error("Error fetching public meal plans:", error);
    }
  };

  const handleMealSelect = (person: string, mealType: "breakfast" | "lunch" | "dinner", value: string) => {
    setMeals((prev) => ({
      ...prev,
      [person]: {
        ...prev[person],
        [mealType]: value
      },
    }));
  };

  // Save meal plan to Firestore
  const handleSaveMealPlan = async () => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");
      const mealPlansRef = collection(db, "users", user.uid, "mealPlans");
      // Ensure serializable data
      const serializableFamilyMembers = familyMembers.map(m => ({ ...m }));
      const serializableMeals = JSON.parse(JSON.stringify(meals));
      await addDoc(mealPlansRef, {
        planName,
        meals: serializableMeals,
        familyMembers: serializableFamilyMembers,
        createdAt: new Date(),
      });
      setPlanName("");
      setMeals({});
      await new Promise(res => setTimeout(res, 100)); // ensure modal closes after save
      setModalVisible(false);
    } catch (err) {
      console.error("Failed to save meal plan:", err);
      setModalVisible(false);
    }
  };

  const handleDeleteMealPlan = async (planId: string) => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      
      // Reference to the specific document
      const mealPlanRef = doc(db, "users", user.uid, "mealPlans", planId);
      
      // Delete the document
      await deleteDoc(mealPlanRef);
      
      // Update the UI by removing the deleted plan from the state
      setSavedMealPlans(prev => prev.filter(plan => plan.id !== planId));
    } catch (error) {
      console.error("Error deleting meal plan:", error);
    }
  };

  // Function to fetch public meal plans that match the search query
  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearchResultsVisible(false);
      return;
    }

    setIsSearching(true);
    try {
      const publicPlansRef = collection(db, "publicMealPlans");
      
      // Convert searchQuery to lowercase for case-insensitive search
      const lowerCaseQuery = searchQuery.toLowerCase();
      
      // Get all plans since we can't do case-insensitive search directly in Firestore
      const snapshot = await getDocs(publicPlansRef);
      
      if (!snapshot.empty) {
        // Filter plans client-side using lowercase comparison
        const results = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as { id: string; planName?: string; userName?: string; familyMembers?: any[]; meals?: any }))
          .filter(plan => {
            const planName = String(plan.planName || "").toLowerCase();
            return planName.includes(lowerCaseQuery);
          });
          
        setSearchResults(results);
        setSearchResultsVisible(true);
      } else {
        setSearchResults([]);
        setSearchResultsVisible(true); // Still show "no results" message
      }
    } catch (error) {
      console.error("Error searching public meal plans:", error);
    } finally {
      setIsSearching(false);
    }
  };

  // Update suggestions when search text changes
  const handleSearchChange = (text: string) => {
    setSearch(text);

    if (!text.trim()) {
      setSearchSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Filter public meal plans for suggestions
    const query = text.toLowerCase();
    const matchingPlans = publicMealPlans.filter(plan => {
      const planName = String(plan.planName || "").toLowerCase();
      return planName.includes(query);
    });

    setSearchSuggestions(matchingPlans);
    setShowSuggestions(true);
  };

  // Handle suggestion selection
  const handleSelectSuggestion = (plan: any) => {
    setSearch(plan.planName);
    setShowSuggestions(false);
    handleViewPublicPlan(plan);
  };

  // Handle viewing details of a public meal plan
  const handleViewPublicPlan = (plan: any) => {
    setSelectedPublicPlan(plan);
    setSearchResultsVisible(false);
    setPublicPlanDetailsVisible(true);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor="#2e6930" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Meal Plans</Text>
      </View>
      <ScrollView
        style={styles.content}
        contentContainerStyle={{
          paddingBottom: 100, // Increase bottom padding to ensure content is not hidden behind UserDock
          justifyContent: "flex-start",
        }}
        keyboardShouldPersistTaps="handled" // This is important for suggestions to work
        showsVerticalScrollIndicator={false}
      >
        {/* Search Bar with Suggestions */}
        <View style={styles.searchBarContainer}>
          <View style={styles.searchBarWrapper}>
            <Ionicons name="search" size={20} color="#aaa" style={styles.searchIcon} />
            <TextInput
              ref={searchInputRef}
              style={styles.searchBar}
              placeholder="Search for public meal plans..."
              placeholderTextColor="#aaa"
              value={search}
              onChangeText={handleSearchChange}
              onSubmitEditing={() => handleSearch(search)}
              returnKeyType="search"
            />
            {search ? (
              <TouchableOpacity onPress={() => {
                setSearch("");
                setShowSuggestions(false);
                setSearchSuggestions([]);
              }}>
                <Ionicons name="close-circle" size={18} color="#aaa" />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Search Suggestions - Now always rendered with conditional visibility */}
          <View style={[
            styles.suggestionsContainer, 
            { 
              display: showSuggestions && searchSuggestions.length > 0 ? 'flex' : 'none' 
            }
          ]}>
            {searchSuggestions.map((plan) => (
              <TouchableOpacity 
                key={plan.id} 
                style={styles.suggestionItem}
                onPress={() => handleSelectSuggestion(plan)}
              >
                <Text style={styles.suggestionText}>{plan.planName}</Text>
                <Text style={styles.suggestionSubtext}>
                  by {plan.userName} • {plan.familyMembers?.length || 0} family members
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={styles.plannerCard}>
          <Text style={styles.plannerTitle}>Family Meal Planner</Text>
          <Text style={styles.plannerSubtitle}>
            Customized meals based on your family's preferences
          </Text>
          <TouchableOpacity style={styles.createButton} onPress={() => setModalVisible(true)}>
            <Text style={styles.createButtonText}>Create New Plan</Text>
          </TouchableOpacity>
        </View>
        {/* Your Meal Plans Section */}
        <Text style={styles.sectionTitle}>Your Meal Plans</Text>
        {savedMealPlans.length === 0 ? (
          <Text style={{ color: "#888", fontFamily: "Franca-Light", marginBottom: 16 }}>
            No meal plans yet. Create one!
          </Text>
        ) : (
          savedMealPlans.map(plan => (
            <View key={plan.id} style={styles.mealPlanCard}>
              <View style={styles.mealPlanHeader}>
                <Text style={styles.mealPlanTitle}>{plan.planName}</Text>
                <TouchableOpacity 
                  onPress={() => setConfirmDelete({ 
                    open: true, 
                    planId: plan.id,
                    planName: plan.planName 
                  })}
                  style={{ padding: 5 }}
                >
                  <Ionicons name="trash-outline" size={20} color="#e74c3c" />
                </TouchableOpacity>
              </View>
              {plan.familyMembers &&
                plan.familyMembers.map((member: any) => (
                  <View key={member.name} style={{ marginBottom: 8 }}>
                    <Text style={{ color: "#2e6930", fontWeight: "bold" }}>
                      {member.type}: {member.name}
                    </Text>
                    <View style={styles.mealRow}>
                      <Text style={styles.mealRowTitle}>Breakfast</Text>
                      <Text style={styles.mealRowDesc}>
                        {typeof plan.meals?.[member.name]?.breakfast === 'object' 
                          ? plan.meals[member.name].breakfast.meal || "-"
                          : plan.meals?.[member.name]?.breakfast || "-"}
                      </Text>
                    </View>
                    <View style={styles.mealRow}>
                      <Text style={styles.mealRowTitle}>Lunch</Text>
                      <Text style={styles.mealRowDesc}>
                        {typeof plan.meals?.[member.name]?.lunch === 'object' 
                          ? plan.meals[member.name].lunch.meal || "-"
                          : plan.meals?.[member.name]?.lunch || "-"}
                      </Text>
                    </View>
                    <View style={styles.mealRow}>
                      <Text style={styles.mealRowTitle}>Dinner</Text>
                      <Text style={styles.mealRowDesc}>
                        {typeof plan.meals?.[member.name]?.dinner === 'object' 
                          ? plan.meals[member.name].dinner.meal || "-"
                          : plan.meals?.[member.name]?.dinner || "-"}
                      </Text>
                    </View>
                  </View>
                ))}
              <View style={styles.mealPlanActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => setDetailsModal({ open: true, plan })}
                >
                  <Text style={styles.actionButtonText}>View Details</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.groceryButton}
                  onPress={() => setGroceryModal({ open: true, plan })}
                >
                  <Text style={styles.groceryButtonText}>Grocery List</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
        <View style={{ height: 30 }} />
      </ScrollView>
      <Modal
        visible={modalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={[
          styles.modalOverlay, 
          { 
            paddingTop: insets.top || 20,
            paddingBottom: insets.bottom || 20 
          }
        ]}>
          <View 
            style={[
              styles.modalContent,
              { maxHeight: Dimensions.get('window').height - 120 }
            ]}
          >
            <ScrollView 
              style={styles.modalScroll} 
              contentContainerStyle={{ paddingBottom: 24, paddingHorizontal: 8 }}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
            >
              <Text style={styles.modalTitle}>Create New Meal Plan</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Plan Name (e.g. Weekly Family Plan)"
                placeholderTextColor="#aaa"
                value={planName}
                onChangeText={setPlanName}
              />
              
              {familyMembers.map((member) => {
                const preferences = member.preferences || [];
                return (
                  <View key={member.name} style={{ marginBottom: 18 }}>
                    <Text style={{ fontWeight: "bold", color: "#2e6930", marginBottom: 6 }}>
                      {member.type}: {member.name}
                    </Text>
                    
                    {/* Breakfast Dropdown - now using the standalone component */}
                    <Text style={{ color: "#2e6930", marginBottom: 2 }}>Breakfast</Text>
                    <MealDropdown
                      value={meals[member.name]?.breakfast || ""}
                      placeholder="Select breakfast"
                      onSelect={(value) => handleMealSelect(member.name, "breakfast", value)}
                      options={getMealOptions("breakfast")}
                      preferences={preferences}
                      getDietaryConflicts={getDietaryConflicts}
                      getDishDetails={getDishDetails}
                    />
                    
                    {/* Lunch Dropdown */}
                    <Text style={{ color: "#2e6930", marginBottom: 2 }}>Lunch</Text>
                    <MealDropdown
                      value={meals[member.name]?.lunch || ""}
                      placeholder="Select lunch"
                      onSelect={(value) => handleMealSelect(member.name, "lunch", value)}
                      options={getMealOptions("lunch")}
                      preferences={preferences}
                      getDietaryConflicts={getDietaryConflicts}
                      getDishDetails={getDishDetails}
                    />
                    
                    {/* Dinner Dropdown */}
                    <Text style={{ color: "#2e6930", marginBottom: 2 }}>Dinner</Text>
                    <MealDropdown
                      value={meals[member.name]?.dinner || ""}
                      placeholder="Select dinner"
                      onSelect={(value) => handleMealSelect(member.name, "dinner", value)}
                      options={getMealOptions("dinner")}
                      preferences={preferences}
                      getDietaryConflicts={getDietaryConflicts}
                      getDishDetails={getDishDetails}
                    />
                  </View>
                );
              })}

              {/* Save and Close buttons */}
              <Pressable style={styles.modalCloseBtn} onPress={handleSaveMealPlan}>
                <Text style={styles.modalCloseText}>Save</Text>
              </Pressable>
              <Pressable
                style={[styles.modalCloseBtn, { backgroundColor: "#888", marginTop: 8 }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalCloseText}>Close</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
      {/* Details Modal */}
      <Modal
        visible={detailsModal.open}
        animationType="fade"
        transparent
        onRequestClose={() => setDetailsModal({ open: false })}
      >
        <View style={[
          styles.modalOverlay,
          { 
            paddingTop: insets.top || 20,
            paddingBottom: insets.bottom || 20 
          }
        ]}>
          <View style={[
            styles.modalContent, 
            { maxHeight: Dimensions.get('window').height * 0.7 }
          ]}>
            <ScrollView 
              style={[styles.modalScroll, { width: '100%' }]} 
              contentContainerStyle={{ paddingBottom: 20 }}
              showsVerticalScrollIndicator={true}
            >
              <Text style={styles.modalTitle}>Meal Plan Details</Text>
              {detailsModal.plan?.familyMembers?.map((member: any) => (
                <View key={member.name} style={{ marginBottom: 18 }}>
                  <Text style={{ fontWeight: "bold", color: "#2e6930", marginBottom: 6 }}>
                    {member.type}: {member.name}
                  </Text>
                  {["breakfast", "lunch", "dinner"].map(mealType => {
                    const mealData = detailsModal.plan.meals?.[member.name]?.[mealType];
                    const mealName = mealData?.meal || mealData; // Support both new and old format
                    const dish = mealName ? getDishDetails(mealName) : undefined;
                    return (
                      <View key={mealType} style={{ marginBottom: 10 }}>
                        <Text style={{ color: "#2e6930", fontWeight: "600" }}>
                          {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
                        </Text>
                        <Text style={{ color: "#222", marginBottom: 2 }}>
                          {mealName || "-"}
                        </Text>
                        {dish && (
                          <View style={{ marginLeft: 8, marginBottom: 6 }}>
                            <Text style={{ color: "#888", fontSize: 13 }}>
                              Servings: {dish.servings}
                            </Text>
                            <Text style={{ color: "#888", fontSize: 13 }}>
                              Nutrition:
                              {"\n"}Calories: {dish.nutrition.calories} kcal
                              {dish.nutrition.protein && `, Protein: ${dish.nutrition.protein}`}
                              {dish.nutrition.carbohydrates && `, Carbs: ${dish.nutrition.carbohydrates}`}
                              {dish.nutrition.fat && `, Fat: ${dish.nutrition.fat}`}
                            </Text>
                            {dish.nutrition.vitamins && (
                              <Text style={{ color: "#888", fontSize: 13 }}>
                                Vitamins:{" "}
                                {Object.entries(dish.nutrition.vitamins)
                                  .map(([k, v]) => `${k}: ${v}`)
                                  .join(", ")}
                              </Text>
                            )}
                            {dish.nutrition.minerals && (
                              <Text style={{ color: "#888", fontSize: 13 }}>
                                Minerals:{" "}
                                {Object.entries(dish.nutrition.minerals)
                                  .map(([k, v]) => `${k}: ${v}`)
                                  .join(", ")}
                              </Text>
                            )}
                            <Text style={{ color: "#888", fontSize: 13 }}>
                              Dietary Notes:
                              {dish.dietaryNotes.vegetarian ? " Vegetarian," : ""}
                              {dish.dietaryNotes.vegan ? " Vegan," : ""}
                              {dish.dietaryNotes.glutenFree ? " Gluten-free," : ""}
                              {dish.dietaryNotes.dairyFree ? " Dairy-free," : ""}
                              {dish.dietaryNotes.nutFree ? " Nut-free," : ""}
                              {dish.dietaryNotes.notes ? ` ${dish.dietaryNotes.notes}` : ""}
                            </Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              ))}
              <Pressable style={styles.modalCloseBtn} onPress={() => setDetailsModal({ open: false })}>
                <Text style={styles.modalCloseText}>Close</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
      {/* Grocery List Modal */}
      <Modal
        visible={groceryModal.open}
        animationType="fade"
        transparent
        onRequestClose={() => setGroceryModal({ open: false })}
      >
        <View style={[
          styles.modalOverlay,
          { 
            paddingTop: insets.top || 20,
            paddingBottom: insets.bottom || 20 
          }
        ]}>
          <View style={[
            styles.modalContent, 
            { maxHeight: Dimensions.get('window').height * 0.7 }
          ]}>
            <ScrollView
              style={[styles.modalScroll, { width: '100%' }]}
              contentContainerStyle={{ paddingRight: 16, paddingBottom: 20 }}
              showsVerticalScrollIndicator={true}
            >
              <Text style={styles.modalTitle}>Grocery List</Text>
              {groceryModal.plan?.familyMembers?.map((member: any) => (
                <View key={member.name} style={{ marginBottom: 18 }}>
                  <Text style={{ fontWeight: "bold", color: "#2e6930", marginBottom: 6 }}>
                    {member.type}: {member.name}
                  </Text>
                  {["breakfast", "lunch", "dinner"].map(mealType => {
                    const mealData = groceryModal.plan.meals?.[member.name]?.[mealType];
                    const mealName = mealData?.meal || mealData; // Support both new and old format
                    const dish = mealName ? mealDishes.find(d => d.name === mealName) : undefined;
                    if (!dish) return (
                      <View key={mealType} style={{ marginBottom: 10 }}>
                        <Text style={{ color: "#2e6930", fontWeight: "600" }}>
                          {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
                        </Text>
                        <Text style={{ color: "#888" }}>-</Text>
                      </View>
                    );
                    return (
                      <View key={mealType} style={{ marginBottom: 10 }}>
                        <Text style={{ color: "#2e6930", fontWeight: "600" }}>
                          {mealType.charAt(0).toUpperCase() + mealType.slice(1)}: {dish.name}
                        </Text>
                        {dish.ingredients.map((ing, idx) => (
                          <View key={idx} style={{ flexDirection: "row", justifyContent: "space-between", marginLeft: 8 }}>
                            <Text style={{ color: "#222", fontSize: 14, flex: 1 }}>{ing.name}</Text>
                            <Text style={{ color: "#888", fontSize: 13, flex: 1 }}>{ing.amount}</Text>
                            <Text style={{ color: "#888", fontSize: 13, flex: 1, textAlign: "right" }}>₱{ing.cost}</Text>
                          </View>
                        ))}
                        <Text style={{ color: "#2e6930", fontWeight: "bold", marginLeft: 8, marginTop: 2 }}>
                          Total: ₱{dish.totalCost}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ))}
              <Pressable style={styles.modalCloseBtn} onPress={() => setGroceryModal({ open: false })}>
                <Text style={styles.modalCloseText}>Close</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
      {/* Confirmation Delete Modal */}
      <Modal
        visible={confirmDelete.open}
        animationType="fade"
        transparent
        onRequestClose={() => setConfirmDelete({ open: false, planId: null, planName: null })}
      >
        <View style={[
          styles.modalOverlay,
          { 
            paddingTop: insets.top || 20,
            paddingBottom: insets.bottom || 20 
          }
        ]}>
          <View style={[styles.modalContent, { width: "80%" }]}>
            <Text style={styles.modalTitle}>Delete Meal Plan</Text>
            <Text style={styles.modalText}>
              Are you sure you want to delete "{confirmDelete.planName}"? This action cannot be undone.
            </Text>
            <View style={{ flexDirection: "row", justifyContent: "space-between", width: "100%" }}>
              <Pressable
                style={[styles.modalCloseBtn, { backgroundColor: "#888", flex: 1, marginRight: 8 }]}
                onPress={() => setConfirmDelete({ open: false, planId: null, planName: null })}
              >
                <Text style={styles.modalCloseText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalCloseBtn, { backgroundColor: "#e74c3c", flex: 1 }]}
                onPress={() => {
                  if (confirmDelete.planId) {
                    handleDeleteMealPlan(confirmDelete.planId);
                    setConfirmDelete({ open: false, planId: null, planName: null });
                  }
                }}
              >
                <Text style={styles.modalCloseText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      {/* Search Results Modal */}
      <Modal
        visible={searchResultsVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setSearchResultsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: "90%" }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <Text style={styles.modalTitle}>Search Results</Text>
              <TouchableOpacity onPress={() => setSearchResultsVisible(false)}>
              </TouchableOpacity>
            </View>
            
            {isSearching ? (
              <Text style={{ textAlign: "center", padding: 20 }}>Searching...</Text>
            ) : searchResults.length > 0 ? (
              <ScrollView style={{ maxHeight: 400 }}>
                {searchResults.map((plan) => (
                  <TouchableOpacity
                    key={plan.id}
                    style={styles.searchResultItem}
                    onPress={() => handleViewPublicPlan(plan)}
                  >
                    <Text style={styles.searchResultTitle}>{plan.planName}</Text>
                    <Text style={styles.searchResultSubtitle}>
                      by {plan.userName} • {plan.familyMembers?.length || 0} family members
                    </Text>
                    <Text style={styles.viewDetailsButton}>View Details →</Text>
                  </TouchableOpacity>
                ))}
                <Pressable
  style={[styles.modalCloseBtn, { marginTop: 16 }]}
  onPress={() => setSearchResultsVisible(false)}
>
  <Text style={styles.modalCloseText}>Close</Text>
</Pressable>
              </ScrollView>
            ) : (
              <Text style={{ textAlign: "center", padding: 20, color: "#666" }}>
                No meal plans found matching "{search}"
              </Text>
            )}
          </View>
        </View>
      </Modal>
      
      {/* Public Plan Details Modal */}
      <Modal
        visible={publicPlanDetailsVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setPublicPlanDetailsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: "90%", maxHeight: "80%" }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <Text style={styles.modalTitle}>
                {selectedPublicPlan?.planName || "Meal Plan"}
              </Text>
              <TouchableOpacity onPress={() => setPublicPlanDetailsVisible(false)}>
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              style={{ width: '100%', maxHeight: Dimensions.get('window').height * 0.6 }}
              contentContainerStyle={{ paddingBottom: 20 }}
              showsVerticalScrollIndicator={true}
            >
              {/* Plan Creator */}
              <View style={[styles.publicPlanSection, { marginTop: 0 }]}>
                <Text style={styles.publicPlanCreator}>
                  Created by {selectedPublicPlan?.userName || "Unknown"}
                </Text>
              </View>
              
              {/* Family Members */}
              {selectedPublicPlan?.familyMembers?.map((member: any, idx: number) => (
                <View key={idx} style={styles.memberSection}>
                  <Text style={styles.memberType}>{member.name} ({member.type})</Text>
                  
                  {/* Meals for this member */}
                  {selectedPublicPlan?.meals && member?.name && selectedPublicPlan.meals[member.name] ? (
                    <>
                      <View style={styles.publicPlanMealRow}>
                        <Text style={styles.mealLabel}>Breakfast:</Text>
                        <Text style={styles.mealValue}>
                          {(() => {
                            const breakfast = selectedPublicPlan.meals[member.name].breakfast;
                            if (!breakfast) return "-";
                            if (typeof breakfast === 'object' && breakfast.meal) return breakfast.meal;
                            return String(breakfast);
                          })()}
                        </Text>
                      </View>
                      
                      <View style={styles.publicPlanMealRow}>
                        <Text style={styles.mealLabel}>Lunch:</Text>
                        <Text style={styles.mealValue}>
                          {(() => {
                            const lunch = selectedPublicPlan.meals[member.name].lunch;
                            if (!lunch) return "-";
                            if (typeof lunch === 'object' && lunch.meal) return lunch.meal;
                            return String(lunch);
                          })()}
                        </Text>
                      </View>
                      
                      <View style={styles.publicPlanMealRow}>
                        <Text style={styles.mealLabel}>Dinner:</Text>
                        <Text style={styles.mealValue}>
                          {(() => {
                            const dinner = selectedPublicPlan.meals[member.name].dinner;
                            if (!dinner) return "-";
                            if (typeof dinner === 'object' && dinner.meal) return dinner.meal;
                            return String(dinner);
                          })()}
                        </Text>
                      </View>
                    </>
                  ) : (
                    <Text style={{ fontStyle: "italic", color: "#888" }}>No meals planned</Text>
                  )}
                </View>
              ))}
            </ScrollView>
            
            <Pressable
              style={[styles.modalCloseBtn, { marginTop: 12 }]}
              onPress={() => setPublicPlanDetailsVisible(false)}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <UserDock activeTab="mealplans" />
    </View>
  );
}
