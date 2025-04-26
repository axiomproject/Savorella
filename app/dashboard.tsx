import React, { useState, useRef, useEffect, ReactNode, Fragment } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Platform, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import UserDock from "../components/UserDock";
import { StatusBar } from "expo-status-bar";
import { auth, db } from "../firebaseConfig";
import { doc, getDoc, updateDoc, collection, getDocs, query, orderBy } from "firebase/firestore";
import { mealDishes } from "../data/mealDishes";
import * as Progress from "react-native-progress";

const HEADER_HEIGHT = 150; // Increased height

// SafeView component to prevent text nodes
const SafeView: React.FC<{children?: ReactNode; style?: any; [key: string]: any}> = ({children, style, ...props}) => {
  // Filter out text nodes, only allow real components
  const safeChildren = React.Children.toArray(children).filter(
    child => typeof child !== 'string' && child !== null
  );
  
  return <View style={style} {...props}>{safeChildren}</View>;
};

// Add error boundary component
const ErrorBoundary = ({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) => {
  const [hasError, setHasError] = useState(false);
  
  if (hasError) {
    return fallback || <View style={{padding: 20}}><Text>Something went wrong</Text></View>;
  }
  
  try {
    return children;
  } catch (error) {
    console.error("ErrorBoundary caught an error:", error);
    setHasError(true);
    return fallback || <View style={{padding: 20}}><Text>Something went wrong</Text></View>;
  }
};

// Create a platform-specific progress component
const SafeProgressCircle = ({ size, progress, thickness, color, unfilledColor }: { size: number; progress: number; thickness: number; color: string; unfilledColor: string }) => {
  // Try-catch to prevent crashes in production
  try {
    // For web, use the standard Progress.Circle
    if (Platform.OS === 'web') {
      return (
        <Progress.Circle
          size={size}
          progress={progress}
          thickness={thickness}
          color={color}
          unfilledColor={unfilledColor}
          borderWidth={0}
          showsText={false}
          animated={true}
        />
      );
    }
    
    // For native platforms, use a simpler custom implementation
    // that's less likely to crash
    return (
      <View style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: unfilledColor,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden'
      }}>
        <View style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: color,
          height: `${progress * 100}%`,
        }} />
      </View>
    );
  } catch (error) {
    console.error("SafeProgressCircle error:", error);
    // Return a fallback UI
    return (
      <View style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: unfilledColor,
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <View style={{ width: '70%', height: '70%', borderRadius: size/2, backgroundColor: color }} />
      </View>
    );
  }
};

// Type definitions for user data
type Adult = {
  name: string;
  preferences: string[];
  height: string;
  weight: string;
  mealReminders?: any[];
};

type Child = {
  name: string;
  age: string;
  preferences: string[];
  height: string;
  weight: string;
  mealReminders?: any[];
};

type UserData = {
  adults: Adult[];
  children: Child[];
  familyInfoCompleted: boolean;
  parentName: string;
};

export default function DashboardScreen() {
  const [selectedPerson, setSelectedPerson] = useState("Select Family Member");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [familyMembers, setFamilyMembers] = useState<string[]>([]);
  const [userData, setUserData] = useState<UserData | null>(null);

  // New state for meal plans
  const [selectedMealPlan, setSelectedMealPlan] = useState("Select Meal Plan");
  const [mealPlanDropdownOpen, setMealPlanDropdownOpen] = useState(false);
  const [mealPlans, setMealPlans] = useState<{ id: string; planName: string; meals: any }[]>([]);

  // State for custom time picker and meal reminders
  const [timePickerModal, setTimePickerModal] = useState({
    visible: false,
    hours: 12,
    minutes: 0,
    ampm: "AM",
  });
  const [editingMeal, setEditingMeal] = useState<{ index: number; name: string } | null>(null);
  
  // Define the type for meal reminders to include optional mealName property
  type MealReminder = {
    label: string;
    time: string;
    enabled: boolean;
    mealName?: string;
  };
  
  // State for nutrient tracking
  const [nutrientGoals, setNutrientGoals] = useState({
    calories: 2000,
    protein: 50,
    carbohydrates: 275,
    fat: 65,
  });
  
  const [nutrientIntake, setNutrientIntake] = useState({
    calories: 0,
    protein: 0,
    carbohydrates: 0,
    fat: 0,
  });

  // Add state for micronutrients
  const [micronutrients, setMicronutrients] = useState<{
    vitamins: Record<string, { value: string; dv: string }>;
    minerals: Record<string, { value: string; dv: string }>;
  }>({
    vitamins: {},
    minerals: {},
  });
  
  const scales = useRef([new Animated.Value(1), new Animated.Value(1), new Animated.Value(1)]).current;

  // Function to format time from hours/minutes/ampm
  const formatTime = (hours: number, minutes: number, ampm: string): string => {
    return `${hours}:${minutes.toString().padStart(2, "0")} ${ampm}`;
  };

  // Function to parse time string to hours/minutes/ampm
  const parseTime = (timeStr: string): { hours: number; minutes: number; ampm: string } => {
    const timeRegex = /(\d+):(\d+)\s?(AM|PM)?/i;
    const match = timeStr.match(timeRegex);

    if (match) {
      let hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      const ampm = match[3]?.toUpperCase() || "AM";

      // Ensure hours is in 12-hour format
      if (hours > 12) {
        hours = hours % 12;
        if (hours === 0) hours = 12;
      }

      return { hours, minutes, ampm };
    }

    return { hours: 12, minutes: 0, ampm: "AM" };
  };

  // Open time picker for a specific meal
  const openTimePicker = (index: number, mealName: string) => {
    const currentTime = parseTime(mealReminders[index].time);
    setEditingMeal({ index, name: mealName });
    setTimePickerModal({
      visible: true,
      hours: currentTime.hours,
      minutes: currentTime.minutes,
      ampm: currentTime.ampm,
    });
  };

  // Handle saving the time from custom picker
  const handleSaveTime = () => {
    if (editingMeal === null) return;

    const { hours, minutes, ampm } = timePickerModal;
    const formattedTime = formatTime(hours, minutes, ampm);

    const updatedReminders = [...mealReminders];
    updatedReminders[editingMeal.index].time = formattedTime;
    setMealReminders(updatedReminders);

    // Save to Firebase if a person is selected
    if (selectedPerson !== "Select Family Member") {
      saveMealReminderToFirebase(selectedPerson, updatedReminders);
    }

    // Close the picker
    setTimePickerModal((prev) => ({ ...prev, visible: false }));
    setEditingMeal(null);
  };

  // Adjust hours up/down
  const adjustHours = (increment: boolean) => {
    setTimePickerModal((prev) => {
      let newHours = increment ? prev.hours + 1 : prev.hours - 1;
      if (newHours > 12) newHours = 1;
      if (newHours < 1) newHours = 12;
      return { ...prev, hours: newHours };
    });
  };

  // Adjust minutes up/down
  const adjustMinutes = (increment: boolean) => {
    setTimePickerModal((prev) => {
      let newMinutes = increment ? prev.minutes + 5 : prev.minutes - 5;
      if (newMinutes >= 60) newMinutes = 0;
      if (newMinutes < 0) newMinutes = 55;
      return { ...prev, minutes: newMinutes };
    });
  };

  // Toggle AM/PM
  const toggleAmPm = () => {
    setTimePickerModal((prev) => ({
      ...prev,
      ampm: prev.ampm === "AM" ? "PM" : "AM",
    }));
  };

  // Toggle meal reminder enabled state
  const handleToggleMeal = (idx: number) => {
    Animated.sequence([
      Animated.timing(scales[idx], {
        toValue: 1.2,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(scales[idx], {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();

    const updatedReminders = [...mealReminders];
    updatedReminders[idx].enabled = !updatedReminders[idx].enabled;
    setMealReminders(updatedReminders);

    // Save to Firebase if a person is selected
    if (selectedPerson !== "Select Family Member") {
      saveMealReminderToFirebase(selectedPerson, updatedReminders);
    }
  };

  // Save meal reminders to Firebase
  const saveMealReminderToFirebase = async (person: string, reminderData: any[]) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const data = userDoc.data();
        const adults = data.adults || [];
        const children = data.children || [];

        // Find if the person is an adult or child
        const adultIndex = adults.findIndex((a: any) => a.name === person);
        const childIndex = children.findIndex((c: any) => c.name === person);

        if (adultIndex !== -1) {
          // Update adult's meal reminders
          const updatedAdults = [...adults];
          updatedAdults[adultIndex] = {
            ...updatedAdults[adultIndex],
            mealReminders: reminderData.map((r) => ({
              label: r.label,
              time: r.time,
              enabled: r.enabled,
            })),
          };

          await updateDoc(userDocRef, { adults: updatedAdults });
        } else if (childIndex !== -1) {
          // Update child's meal reminders
          const updatedChildren = [...children];
          updatedChildren[childIndex] = {
            ...updatedChildren[childIndex],
            mealReminders: reminderData.map((r) => ({
              label: r.label,
              time: r.time,
              enabled: r.enabled,
            })),
          };

          await updateDoc(userDocRef, { children: updatedChildren });
        }
      }
    } catch (error) {
      console.error("Error saving meal reminders:", error);
    }
  };

  // Fetch saved meal plans
  const fetchMealPlans = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const mealPlansRef = collection(db, "users", user.uid, "mealPlans");
      const q = query(mealPlansRef, orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const plans = snapshot.docs.map((doc) => ({
        id: doc.id,
        planName: doc.data().planName,
        meals: doc.data().meals || {},
      }));
      setMealPlans([{ id: "default", planName: "Select Meal Plan", meals: {} }, ...plans]);
    } catch (error) {
      console.error("Error fetching meal plans:", error);
      setMealPlans([{ id: "default", planName: "Select Meal Plan", meals: {} }]);
    }
  };

  // Nutrition recommendation calculation
  const calculateDailyNutrients = (person: { height?: string; weight?: string; age?: string; }) => {
    // Default values if metrics are missing
    const defaultRecommendations = {
      calories: 2000,
      protein: 50,
      carbohydrates: 275,
      fat: 65,
    };
    
    if (!person || !person.height || !person.weight) {
      return defaultRecommendations;
    }
    
    const height = parseFloat(person.height);
    const weight = parseFloat(person.weight);
    
    if (isNaN(height) || isNaN(weight) || height <= 0 || weight <= 0) {
      return defaultRecommendations;
    }
    
    // Calculate BMI
    const heightInMeters = height / 100;
    const bmi = weight / (heightInMeters * heightInMeters);
    
    // If it's a child, adjust based on age
    if (person.age) {
      const age = parseInt(person.age);
      if (!isNaN(age)) {
        // Simple calculation for children based on age and weight
        const caloriesPerKg = age <= 3 ? 100 : age <= 10 ? 75 : 60;
        const calories = weight * caloriesPerKg;
        
        return {
          calories: Math.round(calories),
          protein: Math.round(calories * 0.15 / 4), // 15% of calories from protein
          carbohydrates: Math.round(calories * 0.55 / 4), // 55% of calories from carbs
          fat: Math.round(calories * 0.30 / 9), // 30% of calories from fat
        };
      }
    }
    
    // For adults
    let bmr;
    // Basic BMR calculation (Mifflin-St Jeor equation)
    bmr = 10 * weight + 6.25 * height - 5 * 35 + 5; // Assuming average age of 35
    
    // Adjust based on BMI
    let activityFactor = 1.2; // Sedentary
    if (bmi < 18.5) activityFactor = 1.3; // Underweight
    else if (bmi >= 25) activityFactor = 1.1; // Overweight
    
    const calories = Math.round(bmr * activityFactor);
    
    return {
      calories: calories,
      protein: Math.round(calories * 0.20 / 4), // 20% of calories from protein
      carbohydrates: Math.round(calories * 0.50 / 4), // 50% of calories from carbs
      fat: Math.round(calories * 0.30 / 9), // 30% of calories from fat
    };
  };

  // Parse numeric values from nutrition strings like "28g"
  const parseNutritionValue = (value: string): number => {
    if (!value) return 0;
    const match = value.match(/^(\d+(\.\d+)?)([a-z]+)?/i);
    return match ? parseFloat(match[1]) : 0;
  };

  // Extract percentage value from DV string
  const extractDVPercentage = (dvString: string): number => {
    const match = dvString.match(/\((\d+)%\s*DV\)/);
    return match ? parseInt(match[1]) : 0;
  };

  // Parse micronutrients (vitamins and minerals) from meal data
  const parseMicronutrients = (
    nutrition: any
  ): { vitamins: Record<string, { value: string; dv: string }>; minerals: Record<string, { value: string; dv: string }> } => {
    const result = {
      vitamins: {} as Record<string, { value: string; dv: string }>,
      minerals: {} as Record<string, { value: string; dv: string }>,
    };
    
    if (nutrition.vitamins) {
      Object.entries(nutrition.vitamins).forEach(([name, valueWithDv]) => {
        const valueStr = String(valueWithDv);
        const match = valueStr.match(/^([\d.]+[a-zA-Z]+)\s*(\(.*?\))?/);
        
        if (match) {
          result.vitamins[name] = {
            value: match[1] || valueStr,
            dv: match[2] || "",
          };
        }
      });
    }
    
    if (nutrition.minerals) {
      Object.entries(nutrition.minerals).forEach(([name, valueWithDv]) => {
        const valueStr = String(valueWithDv);
        const match = valueStr.match(/^([\d.]+[a-zA-Z]+)\s*(\(.*?\))?/);
        
        if (match) {
          result.minerals[name] = {
            value: match[1] || valueStr,
            dv: match[2] || "",
          };
        }
      });
    }
    
    return result;
  };

  // Calculate nutrient intake based on selected meal plan
  const calculateNutrientIntake = (personName: string, selectedPlan: any) => {
    if (!personName || personName === "Select Family Member" || !selectedPlan || !selectedPlan.meals) {
      setNutrientIntake({ calories: 0, protein: 0, carbohydrates: 0, fat: 0 });
      setMicronutrients({ vitamins: {}, minerals: {} });
      return;
    }
    
    const personMeals = selectedPlan.meals[personName];
    if (!personMeals) {
      setNutrientIntake({ calories: 0, protein: 0, carbohydrates: 0, fat: 0 });
      setMicronutrients({ vitamins: {}, minerals: {} });
      return;
    }
    
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    
    // Track micronutrients
    const allVitamins: Record<string, { value: string; dv: string }> = {};
    const allMinerals: Record<string, { value: string; dv: string }> = {};
    
    // Process breakfast
    if (personMeals.breakfast) {
      const mealName = typeof personMeals.breakfast === "object"
        ? personMeals.breakfast.meal || "" : personMeals.breakfast || "";
      
      const mealData = mealDishes.find(dish => dish.name === mealName);
      if (mealData) {
        totalCalories += mealData.nutrition.calories;
        totalProtein += parseNutritionValue(mealData.nutrition.protein);
        totalCarbs += parseNutritionValue(mealData.nutrition.carbohydrates);
        totalFat += parseNutritionValue(mealData.nutrition.fat);
        
        // Add micronutrients
        const { vitamins, minerals } = parseMicronutrients(mealData.nutrition);
        Object.assign(allVitamins, vitamins);
        Object.assign(allMinerals, minerals);
      }
    }
    
    // Process lunch
    if (personMeals.lunch) {
      const mealName = typeof personMeals.lunch === "object"
        ? personMeals.lunch.meal || "" : personMeals.lunch || "";
      
      const mealData = mealDishes.find(dish => dish.name === mealName);
      if (mealData) {
        totalCalories += mealData.nutrition.calories;
        totalProtein += parseNutritionValue(mealData.nutrition.protein);
        totalCarbs += parseNutritionValue(mealData.nutrition.carbohydrates);
        totalFat += parseNutritionValue(mealData.nutrition.fat);
        
        // Add micronutrients
        const { vitamins, minerals } = parseMicronutrients(mealData.nutrition);
        Object.assign(allVitamins, vitamins);
        Object.assign(allMinerals, minerals);
      }
    }
    
    // Process dinner
    if (personMeals.dinner) {
      const mealName = typeof personMeals.dinner === "object"
        ? personMeals.dinner.meal || "" : personMeals.dinner || "";
      
      const mealData = mealDishes.find(dish => dish.name === mealName);
      if (mealData) {
        totalCalories += mealData.nutrition.calories;
        totalProtein += parseNutritionValue(mealData.nutrition.protein);
        totalCarbs += parseNutritionValue(mealData.nutrition.carbohydrates);
        totalFat += parseNutritionValue(mealData.nutrition.fat);
        
        // Add micronutrients
        const { vitamins, minerals } = parseMicronutrients(mealData.nutrition);
        Object.assign(allVitamins, vitamins);
        Object.assign(allMinerals, minerals);
      }
    }
    
    setNutrientIntake({
      calories: totalCalories,
      protein: totalProtein,
      carbohydrates: totalCarbs,
      fat: totalFat,
    });
    
    setMicronutrients({
      vitamins: allVitamins,
      minerals: allMinerals,
    });
  };

  // Calculate total progress percentage
  const calculateTotalProgress = (): number => {
    if (nutrientGoals.calories === 0) return 0;
    return Math.min(100, (nutrientIntake.calories / nutrientGoals.calories) * 100);
  };

  // Load user's family members and meal reminders
  useEffect(() => {
    const fetchFamily = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data() as UserData;
          setUserData(data);
          
          const adults = (data.adults || []).map((a: any) => a.name).filter(Boolean);
          const children = (data.children || []).map((c: any) => c.name).filter(Boolean);
          setFamilyMembers(["Select Family Member", ...adults, ...children]);

          // Also fetch meal plans when loading family members
          fetchMealPlans();
        } else {
          setFamilyMembers(["Select Family Member"]);
        }
      } catch {
        setFamilyMembers(["Select Family Member"]);
      }
    };
    fetchFamily();
  }, []);

  // Update nutrient goals when person changes
  useEffect(() => {
    if (userData && selectedPerson !== "Select Family Member") {
      // Find the selected person in userData
      const adult = userData.adults.find(a => a.name === selectedPerson);
      const child = userData.children.find(c => c.name === selectedPerson);
      
      const person = adult || child;
      if (person) {
        const goals = calculateDailyNutrients(person);
        setNutrientGoals(goals);
      }
    }
  }, [selectedPerson, userData]);

  // Update nutrient intake when meal plan changes
  useEffect(() => {
    if (selectedPerson !== "Select Family Member" && selectedMealPlan !== "Select Meal Plan") {
      const selectedPlan = mealPlans.find(plan => plan.planName === selectedMealPlan);
      if (selectedPlan) {
        calculateNutrientIntake(selectedPerson, selectedPlan);
      }
    } else {
      setNutrientIntake({ calories: 0, protein: 0, carbohydrates: 0, fat: 0 });
      setMicronutrients({ vitamins: {}, minerals: {} });
    }
  }, [selectedPerson, selectedMealPlan, mealPlans]);

  // Update meal display when meal plan is selected
  useEffect(() => {
    if (selectedPerson !== "Select Family Member" && selectedMealPlan !== "Select Meal Plan") {
      const selectedPlan = mealPlans.find((plan) => plan.planName === selectedMealPlan);
      if (selectedPlan && selectedPlan.meals && selectedPlan.meals[selectedPerson]) {
        const personMeals = selectedPlan.meals[selectedPerson];

        // Create new meal reminders with selected plan's meal info
        const updatedReminders = [...mealReminders];

        // Update breakfast
        if (personMeals.breakfast) {
          const mealName =
            typeof personMeals.breakfast === "object"
              ? personMeals.breakfast.meal || ""
              : personMeals.breakfast || "";

          updatedReminders[0] = {
            ...updatedReminders[0],
            mealName: mealName,
          };
        }

        // Update lunch
        if (personMeals.lunch) {
          const mealName =
            typeof personMeals.lunch === "object"
              ? personMeals.lunch.meal || ""
              : personMeals.lunch || "";

          updatedReminders[1] = {
            ...updatedReminders[1],
            mealName: mealName,
          };
        }

        // Update dinner
        if (personMeals.dinner) {
          const mealName =
            typeof personMeals.dinner === "object"
              ? personMeals.dinner.meal || ""
              : personMeals.dinner || "";

          updatedReminders[2] = {
            ...updatedReminders[2],
            mealName: mealName,
          };
        }

        // Update state with the new meal names included
        setMealReminders(updatedReminders);
      }
    }
  }, [selectedPerson, selectedMealPlan, mealPlans]);

  // Define nutrients array with values
  const nutrients = [
    { label: "Protein", color: "#f57c00", value: nutrientIntake.protein, goal: nutrientGoals.protein },
    { label: "Carbs", color: "#7cb342", value: nutrientIntake.carbohydrates, goal: nutrientGoals.carbohydrates },
    { label: "Fats", color: "#ffa000", value: nutrientIntake.fat, goal: nutrientGoals.fat },
  ];

  // Improved SafeText component to handle text nodes in all scenarios
  const SafeText = ({ children }: { children: React.ReactNode }) => {
    // Handle null or undefined
    if (children == null) return null;
    
    // Handle string or number
    if (typeof children === 'string' || typeof children === 'number') {
      return <Text>{children}</Text>;
    }
    
    // Return React elements as they are
    return children as React.ReactElement;
  };

  // Simple and safe icon component that won't generate text nodes
  const MealIcon = ({ mealType }: { mealType: string }) => {
    // Define icon type that matches what Ionicons accepts
    type IconName = React.ComponentProps<typeof Ionicons>["name"];
    
    let iconName: IconName = "nutrition-outline";
    let color = "#2e6930";

    switch (mealType) {
      case "Breakfast":
        iconName = "cafe-outline";
        break;
      case "Lunch":
        iconName = "restaurant-outline";
        break;
      case "Dinner":
        iconName = "moon-outline";
        break;
    }

    return <Ionicons name={iconName} size={24} color={color} />;
  };

  // Updated meal reminders state
  const [mealReminders, setMealReminders] = useState<MealReminder[]>([
    {
      label: "Breakfast",
      time: "7:30 AM",
      enabled: false,
    },
    {
      label: "Lunch",
      time: "12:00 PM",
      enabled: false,
    },
    {
      label: "Dinner",
      time: "6:30 PM",
      enabled: false,
    },
  ]);

  return (
    <ErrorBoundary fallback={
      <View style={styles.container}>
        <StatusBar style="light" backgroundColor="#2e6930" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Something went wrong loading your dashboard.</Text>
          <TouchableOpacity 
            style={styles.errorButton}
            onPress={() => window.location.reload()}
          >
            <Text style={styles.errorButtonText}>Reload</Text>
          </TouchableOpacity>
        </View>
        <UserDock activeTab="dashboard" />
      </View>
    }>
      <SafeView style={styles.container}>
        <StatusBar style="light" backgroundColor="#2e6930" />
        {/* Fixed Header */}
        <SafeView style={[styles.header, { height: HEADER_HEIGHT }]}>
          <Text style={styles.savorella}>Savorella</Text>
          <SafeView style={styles.dashboardRow}>
            <SafeView style={{ flex: 1 }} /> {/* Empty view to maintain layout */}
            <SafeView style={styles.dropdownsContainer}>
              {/* Family Member Dropdown */}
              <SafeView style={styles.dropdownWrapper}>
                <TouchableOpacity
                  style={[
                    styles.dropdownButton,
                    selectedPerson !== "Select Family Member" && styles.dropdownButtonCompact,
                  ]}
                  onPress={() => {
                    setDropdownOpen((open) => !open);
                    setMealPlanDropdownOpen(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.dropdownText,
                      selectedPerson !== "Select Family Member" && { fontSize: 12 },
                    ]}
                    numberOfLines={1}
                  >
                    {selectedPerson}
                  </Text>
                  <Ionicons
                    name={dropdownOpen ? "chevron-up" : "chevron-down"}
                    size={20}
                    color="#2e6930"
                    style={{ marginLeft: 4 }}
                  />
                </TouchableOpacity>
                {dropdownOpen && (
                  <SafeView style={styles.dropdownList}>
                    {familyMembers.map((member) => (
                      <TouchableOpacity
                        key={member}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setSelectedPerson(member);
                          setDropdownOpen(false);
                        }}
                      >
                        <Text style={styles.dropdownItemText}>{member}</Text>
                      </TouchableOpacity>
                    ))}
                  </SafeView>
                )}
              </SafeView>

              {/* Meal Plan Dropdown */}
              <SafeView style={styles.dropdownWrapper}>
                <TouchableOpacity
                  style={[
                    styles.dropdownButton,
                    styles.mealPlanButton,
                    selectedMealPlan !== "Select Meal Plan" && styles.dropdownButtonCompact,
                  ]}
                  onPress={() => {
                    setMealPlanDropdownOpen((open) => !open);
                    setDropdownOpen(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.dropdownText,
                      selectedMealPlan !== "Select Meal Plan" && { fontSize: 12 },
                    ]}
                    numberOfLines={1}
                  >
                    {selectedMealPlan}
                  </Text>
                  <Ionicons
                    name={mealPlanDropdownOpen ? "chevron-up" : "chevron-down"}
                    size={20}
                    color="#2e6930"
                    style={{ marginLeft: 4 }}
                  />
                </TouchableOpacity>
                {mealPlanDropdownOpen && (
                  <SafeView style={styles.dropdownList}>
                    {mealPlans.map((plan) => (
                      <TouchableOpacity
                        key={plan.id}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setSelectedMealPlan(plan.planName);
                          setMealPlanDropdownOpen(false);
                        }}
                      >
                        <Text style={styles.dropdownItemText}>{plan.planName}</Text>
                      </TouchableOpacity>
                    ))}
                  </SafeView>
                )}
              </SafeView>
            </SafeView>
          </SafeView>
        </SafeView>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingTop: HEADER_HEIGHT }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Add Dashboard Title above the Nutrient Goals Card */}
          <Text style={styles.dashboardTitleAboveCard}>Daily Nutrition Dashboard</Text>

          {/* Nutrient Goals Card */}
          <SafeView style={styles.card}>
            <Text style={styles.cardTitle}>Nutrient goals</Text>
            <SafeView style={styles.centerSection}>
              {/* Large Progress Circle */}
              <SafeView style={styles.progressCircleWrapper}>
                <SafeProgressCircle
                  size={110}
                  progress={calculateTotalProgress() / 100}
                  thickness={10}
                  color="#2e6930"
                  unfilledColor="#f3e8ff"
                />
                <Text style={styles.progressPercent}>{Math.round(calculateTotalProgress())}%</Text>
              </SafeView>
              <Text style={styles.dailyGoalLabel}>Daily Goal</Text>
              {/* Small Nutrient Circles */}
              <SafeView style={styles.nutrientRow}>
                {nutrients.map((nutrient) => (
                  <SafeView key={nutrient.label} style={styles.nutrientItem}>
                    <SafeView
                      style={[
                        styles.nutrientCircle,
                        { backgroundColor: nutrient.color },
                      ]}
                    />
                    <Text style={styles.nutrientLabel}>{nutrient.label}</Text>
                    <Text style={styles.nutrientValue}>
                      {Math.round(nutrient.value)}/{nutrient.goal}g
                    </Text>
                  </SafeView>
                ))}
              </SafeView>
            </SafeView>
          </SafeView>

          {/* Vitamins and Minerals Card */}
          {selectedPerson !== "Select Family Member" && selectedMealPlan !== "Select Meal Plan" && (
            <SafeView style={styles.card}>
              <Text style={styles.cardTitle}>Vitamins & Minerals</Text>
              
              {/* Vitamins Section */}
              <Text style={styles.micronutrientSectionTitle}>Vitamins</Text>
              {Object.keys(micronutrients.vitamins).length > 0 ? (
                <SafeView style={styles.micronutrientGrid}>
                  {Object.entries(micronutrients.vitamins).map(([name, data]) => (
                    <SafeView key={name} style={styles.micronutrientItem}>
                      <Text style={styles.micronutrientName}>{name}</Text>
                      <SafeView style={styles.micronutrientValueRow}>
                        <Text style={styles.micronutrientValue}>{data.value}</Text>
                        <Text style={styles.micronutrientDV}>{data.dv}</Text>
                      </SafeView>
                    </SafeView>
                  ))}
                </SafeView>
              ) : (
                <Text style={styles.noDataText}>No vitamin information available</Text>
              )}
              
              {/* Minerals Section */}
              <Text style={[styles.micronutrientSectionTitle, { marginTop: 16 }]}>Minerals</Text>
              {Object.keys(micronutrients.minerals).length > 0 ? (
                <SafeView style={styles.micronutrientGrid}>
                  {Object.entries(micronutrients.minerals).map(([name, data]) => (
                    <SafeView key={name} style={styles.micronutrientItem}>
                      <Text style={styles.micronutrientName}>{name}</Text>
                      <SafeView style={styles.micronutrientValueRow}>
                        <Text style={styles.micronutrientValue}>{data.value}</Text>
                        <Text style={styles.micronutrientDV}>{data.dv}</Text>
                      </SafeView>
                    </SafeView>
                  ))}
                </SafeView>
              ) : (
                <Text style={styles.noDataText}>No mineral information available</Text>
              )}
            </SafeView>
          )}

          {/* Meal Reminders */}
          <Text style={styles.mealRemindersTitle}>Meal Reminders</Text>
          <SafeView style={styles.mealList}>
            {mealReminders.map((meal, idx) => (
              <SafeView key={meal.label} style={styles.mealItem}>
                <SafeView style={styles.mealIcon}>
                  <Ionicons
                    name={
                      meal.label === "Breakfast"
                        ? "cafe-outline"
                        : meal.label === "Lunch"
                        ? "restaurant-outline"
                        : meal.label === "Dinner"
                        ? "moon-outline"
                        : "nutrition-outline"
                    }
                    size={24}
                    color="#2e6930"
                  />
                </SafeView>
                <SafeView style={styles.mealInfo}>
                  <Text style={styles.mealLabel}>{meal.label}</Text>
                  {meal.mealName ? <Text style={styles.mealName}>{meal.mealName}</Text> : null}
                  <SafeView style={{ flexDirection: "row", alignItems: "center" }}>
                    <TouchableOpacity
                      onPress={() =>
                        selectedPerson !== "Select Family Member" ? openTimePicker(idx, meal.label) : null
                      }
                      disabled={selectedPerson === "Select Family Member"}
                    >
                      <Text
                        style={[
                          styles.mealTime,
                          selectedPerson === "Select Family Member" ? styles.mealTimeDisabled : {},
                        ]}
                      >
                        {meal.time}
                      </Text>
                    </TouchableOpacity>
                    {selectedPerson !== "Select Family Member" ? (
                      <TouchableOpacity
                        onPress={() => openTimePicker(idx, meal.label)}
                        style={{ marginLeft: 6 }}
                      >
                        <Ionicons name="pencil-outline" size={14} color="#2e6930" />
                      </TouchableOpacity>
                    ) : null}
                  </SafeView>
                </SafeView>
                <TouchableOpacity
                  style={styles.checkboxWrapper}
                  onPress={() => handleToggleMeal(idx)}
                  activeOpacity={0.7}
                  disabled={selectedPerson === "Select Family Member"}
                >
                  <Animated.View style={{ transform: [{ scale: scales[idx] }] }}>
                    <MaterialCommunityIcons
                      name={meal.enabled ? "checkbox-marked" : "checkbox-blank-outline"}
                      size={26}
                      color={
                        meal.enabled
                          ? "#2e6930"
                          : selectedPerson === "Select Family Member"
                          ? "#ddd"
                          : "#bbb"
                      }
                    />
                  </Animated.View>
                </TouchableOpacity>
              </SafeView>
            ))}

            {/* Instructions message */}
            {selectedPerson === "Select Family Member" ? (
              <Text style={styles.instructionText}>
                Please select a family member to set meal reminders
              </Text>
            ) : null}
          </SafeView>

          {/* Add bottom padding so content is not hidden behind the dock */}
          <SafeView style={{ height: 80 }} />
        </ScrollView>
        
        {/* Custom Time Picker Modal */}
        <Modal
          visible={timePickerModal.visible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setTimePickerModal((prev) => ({ ...prev, visible: false }))}
        >
          <SafeView style={styles.timePickerOverlay}>
            <SafeView style={styles.timePickerContent}>
              <Text style={styles.timePickerTitle}>
                {editingMeal ? `Set ${editingMeal.name} Time` : "Set Time"}
              </Text>
              
              <SafeView style={styles.timePickerControls}>
                {/* Hours */}
                <SafeView style={styles.timePickerColumn}>
                  <TouchableOpacity 
                    style={styles.timePickerButton}
                    onPress={() => adjustHours(true)}
                  >
                    <Ionicons name="chevron-up" size={24} color="#2e6930" />
                  </TouchableOpacity>
                  
                  <Text style={styles.timePickerValue}>
                    {timePickerModal.hours.toString().padStart(2, "0")}
                  </Text>
                  
                  <TouchableOpacity 
                    style={styles.timePickerButton}
                    onPress={() => adjustHours(false)}
                  >
                    <Ionicons name="chevron-down" size={24} color="#2e6930" />
                  </TouchableOpacity>
                </SafeView>
                
                <Text style={styles.timePickerColon}>:</Text>
                
                {/* Minutes */}
                <SafeView style={styles.timePickerColumn}>
                  <TouchableOpacity 
                    style={styles.timePickerButton}
                    onPress={() => adjustMinutes(true)}
                  >
                    <Ionicons name="chevron-up" size={24} color="#2e6930" />
                  </TouchableOpacity>
                  
                  <Text style={styles.timePickerValue}>
                    {timePickerModal.minutes.toString().padStart(2, "0")}
                  </Text>
                  
                  <TouchableOpacity 
                    style={styles.timePickerButton}
                    onPress={() => adjustMinutes(false)}
                  >
                    <Ionicons name="chevron-down" size={24} color="#2e6930" />
                  </TouchableOpacity>
                </SafeView>
                
                {/* AM/PM */}
                <SafeView style={[styles.timePickerColumn, { marginLeft: 15 }]}>
                  <TouchableOpacity 
                    style={styles.timePickerButton}
                    onPress={toggleAmPm}
                  >
                    <Ionicons name="chevron-up" size={24} color="#2e6930" />
                  </TouchableOpacity>
                  
                  <Text style={styles.timePickerValue}>
                    {timePickerModal.ampm}
                  </Text>
                  
                  <TouchableOpacity 
                    style={styles.timePickerButton}
                    onPress={toggleAmPm}
                  >
                    <Ionicons name="chevron-down" size={24} color="#2e6930" />
                  </TouchableOpacity>
                </SafeView>
              </SafeView>
              
              <SafeView style={styles.timePickerActions}>
                <TouchableOpacity 
                  style={[styles.timePickerAction, { backgroundColor: "#ccc" }]}
                  onPress={() => setTimePickerModal((prev) => ({ ...prev, visible: false }))}
                >
                  <Text style={[styles.timePickerActionText, { color: "#444" }]}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.timePickerAction, { backgroundColor: "#2e6930" }]}
                  onPress={handleSaveTime}
                >
                  <Text style={styles.timePickerActionText}>Save</Text>
                </TouchableOpacity>
              </SafeView>
            </SafeView>
          </SafeView>
        </Modal>
        
        <UserDock activeTab="dashboard" />
      </SafeView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  // ...existing styles...

  mealTimeDisabled: {
    color: "#ccc",
  },

  instructionText: {
    textAlign: "center",
    fontSize: 14,
    color: "#888",
    fontFamily: "Franca-Light",
    marginTop: 10,
    marginBottom: 10,
    fontStyle: "italic",
  },

  // Add custom time picker styles
  timePickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  timePickerContent: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    width: "80%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  timePickerTitle: {
    fontSize: 18,
    fontFamily: "FrancaDemo-SemiBold",
    color: "#2e6930",
    marginBottom: 20,
  },
  timePickerControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 20,
  },
  timePickerColumn: {
    alignItems: "center",
    marginHorizontal: 10,
  },
  timePickerButton: {
    padding: 8,
  },
  timePickerValue: {
    fontSize: 24,
    fontFamily: "FrancaDemo-Bold",
    color: "#2e6930",
    marginVertical: 8,
  },
  timePickerColon: {
    fontSize: 24,
    fontFamily: "FrancaDemo-Bold",
    color: "#2e6930",
  },
  timePickerActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 20,
  },
  timePickerAction: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    marginHorizontal: 5,
    alignItems: "center",
  },
  timePickerActionText: {
    color: "white",
    fontFamily: "FrancaDemo-SemiBold",
    fontSize: 16,
  },

  // Updated dropdown styles
  dropdownsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },

  dropdownWrapper: {
    marginLeft: 5,
    position: "relative",
    flexShrink: 0,
    flexGrow: 0,
  },

  mealPlanButton: {
    backgroundColor: "#e0f2e1",
    borderColor: "#74b72e",
  },

  mealName: {
    fontSize: 12,
    color: "#74b72e",
    fontFamily: "FrancaDemo-SemiBold",
    marginTop: 2,
    marginBottom: 2,
  },

  dropdownButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3e8ff",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#b2d8b6",
    minWidth: 110,
  },
  dropdownButtonCompact: {
    minWidth: 0, // Remove minimum width when a person is selected
    paddingHorizontal: 10,
  },
  dropdownText: {
    color: "#2e6930",
    fontFamily: "FrancaDemo-SemiBold",
    fontSize: 10,
    flexShrink: 1,
    maxWidth: 120,
  },

  dropdownList: {
    position: "absolute",
    top: 38,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#b2d8b6",
    zIndex: 10,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  dropdownItemText: {
    color: "#2e6930",
    fontFamily: "FrancaDemo-SemiBold",
    fontSize: 10,
  },

  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    paddingBottom: 16,
  },
  header: {
    backgroundColor: "#2e6930",
    paddingTop: 48,
    paddingBottom: 32,
    alignItems: "center",
    justifyContent: "flex-start",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    // height is now set dynamically
  },
  savorella: {
    color: "#fff",
    fontSize: 36,
    fontFamily: "FrancaDemo-Bold",
    textAlign: "center",
    letterSpacing: 1,
    marginBottom: 20,
  },
  dashboardRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 0,
    marginBottom: 0,
    paddingHorizontal: 24,
    justifyContent: "flex-end", // Changed from space-between to flex-end
    width: "100%",
  },
  dashboardTitleAboveCard: {
    fontSize: 18,
    fontFamily: "FrancaDemo-SemiBold",
    color: "#2e6930",
    marginTop: 12,
    marginBottom: 6,
    paddingHorizontal: 18,
    textAlign: "left",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    marginHorizontal: 18,
    marginTop: 24,
    paddingVertical: 24,
    paddingHorizontal: 18,
    shadowColor: "#2e6930",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: "FrancaDemo-SemiBold",
    color: "#222",
    marginBottom: 18,
    marginLeft: 4,
    textAlign: "left",
  },
  centerSection: {
    alignItems: "center",
    justifyContent: "center",
  },
  progressCircleWrapper: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
    position: "relative",
  },
  progressPercent: {
    position: "absolute",
    top: 38,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 26,
    fontFamily: "FrancaDemo-Bold",
    color: "#000000",
  },
  dailyGoalLabel: {
    fontSize: 15,
    color: "#2e6930",
    fontFamily: "FrancaDemo-SemiBold",
    marginTop: 6,
    marginBottom: 18,
    textAlign: "center",
  },
  nutrientRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    width: "90%",
    alignSelf: "center",
  },
  nutrientItem: {
    alignItems: "center",
    flex: 1,
  },
  nutrientCircle: {
    width: 15,
    height: 15,
    borderRadius: 16,
    marginBottom: 4,
  },
  nutrientLabel: {
    fontSize: 11,
    color: "#444",
    fontFamily: "FrancaDemo-SemiBold",
    textAlign: "center",
  },
  nutrientValue: {
    fontSize: 10,
    color: "#666",
    fontFamily: "FrancaDemo-SemiBold",
    marginTop: 2,
  },
  mealRemindersTitle: {
    fontSize: 18,
    fontFamily: "FrancaDemo-SemiBold",
    color: "#2e6930",
    textAlign: "center",
    marginTop: 32,
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  mealList: {
    marginHorizontal: 18,
    marginBottom: 8,
  },
  mealItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f8ff",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 10,
    shadowColor: "#2e6930",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  mealIcon: {
    marginRight: 14,
  },
  mealInfo: {
    flex: 1,
  },
  mealLabel: {
    fontSize: 16,
    fontFamily: "FrancaDemo-SemiBold",
    color: "#222",
  },
  mealTime: {
    fontSize: 13,
    color: "#888",
    fontFamily: "Franca-Light",
    marginTop: 2,
  },
  checkboxWrapper: {
    marginLeft: 10,
    padding: 4,
  },

  micronutrientSectionTitle: {
    fontSize: 16,
    fontFamily: "FrancaDemo-SemiBold",
    color: "#2e6930",
    marginBottom: 8,
  },
  
  micronutrientGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4,
  },
  
  micronutrientItem: {
    width: "50%", // Two columns
    paddingHorizontal: 4,
    marginBottom: 10,
  },
  
  micronutrientName: {
    fontSize: 14,
    fontFamily: "FrancaDemo-SemiBold",
    color: "#444",
  },
  
  micronutrientValueRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  
  micronutrientValue: {
    fontSize: 12,
    color: "#666",
    marginRight: 4,
  },
  
  micronutrientDV: {
    fontSize: 12,
    color: "#7cb342",
    fontStyle: "italic",
  },
  
  noDataText: {
    fontSize: 14,
    fontFamily: "Franca-Light",
    color: "#888",
    fontStyle: "italic",
    textAlign: "center",
    marginVertical: 10,
  },

  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  errorText: {
    fontSize: 16,
    color: '#555',
    marginBottom: 20,
    textAlign: 'center'
  },
  errorButton: {
    backgroundColor: '#2e6930',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8
  },
  errorButtonText: {
    color: 'white',
    fontWeight: 'bold'
  }
});
