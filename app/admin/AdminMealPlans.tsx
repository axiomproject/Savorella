import React, { useEffect, useState, useRef } from "react";
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Modal, TextInput, Alert, StatusBar as RNStatusBar, Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import { collection, query, getDocs, doc, getDoc, deleteDoc, orderBy, where, Timestamp, updateDoc, setDoc } from "firebase/firestore";
import { db, auth } from "../../firebaseConfig";
import AdminHeader from "./AdminHeader";
import AdminDock from "./AdminDock";
import { Ionicons } from "@expo/vector-icons";
import { ScrollView, GestureHandlerRootView } from "react-native-gesture-handler";
import { mealDishes } from "../../data/mealDishes";

interface MealPlan {
  id: string;
  userId: string;
  userName: string;
  planName: string;
  createdAt: Date;
  isPublic?: boolean;
  meals: Record<string, {
    breakfast: string | { meal: string };
    lunch: string | { meal: string };
    dinner: string | { meal: string };
  }>;
  familyMembers: { name: string; type: string }[];
}

export default function AdminMealPlans() {
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<MealPlan | null>(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [permissionError, setPermissionError] = useState(false);
  const [updatingPlanId, setUpdatingPlanId] = useState<string | null>(null);

  const detailsModalRef = useRef(null);
  const deleteModalRef = useRef(null);

  const getMealName = (mealData: string | { meal: string } | undefined): string => {
    if (!mealData) return "-";

    if (typeof mealData === "string") {
      return mealData || "-";
    }

    if (typeof mealData === "object" && mealData !== null && "meal" in mealData) {
      return mealData.meal || "-";
    }

    return "-";
  };

  const verifyAdminStatus = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.error("No user is signed in");
        return false;
      }

      console.log(`Verifying admin status for user: ${user.uid}`);

      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists()) {
        console.error("User document not found");
        return false;
      }

      const userData = userDoc.data();
      const isAdmin = userData.isAdmin === true;

      console.log(`User admin status: ${isAdmin ? "Yes" : "No"}`);

      return isAdmin;
    } catch (error) {
      console.error("Error verifying admin status:", error);
      return false;
    }
  };

  const togglePlanVisibility = async (plan: MealPlan) => {
    try {
      setUpdatingPlanId(plan.id);

      const isPublic = !plan.isPublic;

      const planRef = doc(db, "users", plan.userId, "mealPlans", plan.id);
      await updateDoc(planRef, { isPublic });

      if (isPublic) {
        const publicPlanRef = doc(db, "publicMealPlans", plan.id);

        await setDoc(publicPlanRef, {
          originalId: plan.id,
          userId: plan.userId,
          userName: plan.userName,
          planName: plan.planName,
          createdAt: plan.createdAt,
          meals: plan.meals,
          familyMembers: plan.familyMembers,
          publishedAt: new Date()
        });

        Alert.alert("Success", "Meal plan is now public and searchable");
      } else {
        const publicPlanRef = doc(db, "publicMealPlans", plan.id);
        await deleteDoc(publicPlanRef);

        Alert.alert("Success", "Meal plan is now private");
      }

      setMealPlans(prevPlans =>
        prevPlans.map(p =>
          p.id === plan.id && p.userId === plan.userId
            ? { ...p, isPublic }
            : p
        )
      );

    } catch (error) {
      console.error("Error updating meal plan visibility:", error);
      Alert.alert("Error", "Failed to update meal plan visibility");
    } finally {
      setUpdatingPlanId(null);
    }
  };

  const fetchAllMealPlans = async () => {
    setLoading(true);
    setPermissionError(false);

    try {
      const isAdmin = await verifyAdminStatus();
      if (!isAdmin) {
        console.error("Current user is not an admin");
        setPermissionError(true);
        setLoading(false);
        return;
      }

      console.log("Admin status verified, proceeding to fetch user data");

      try {
        const usersQuery = query(collection(db, "users"));
        const userSnapshots = await getDocs(usersQuery);
        console.log(`Found ${userSnapshots.docs.length} user documents`);

        let allPlans: MealPlan[] = [];

        for (const userDoc of userSnapshots.docs) {
          try {
            const userData = userDoc.data();
            const userId = userDoc.id;

            const userName = userData.parentName || "Unknown User";

            console.log(`Fetching meal plans for user: ${userName} (${userId})`);

            const mealPlansRef = collection(db, "users", userId, "mealPlans");
            const mealPlansQuery = query(mealPlansRef, orderBy("createdAt", "desc"));

            const mealPlanSnapshots = await getDocs(mealPlansQuery);
            console.log(`Found ${mealPlanSnapshots.docs.length} meal plans for ${userName}`);

            mealPlanSnapshots.forEach(planDoc => {
              try {
                const planData = planDoc.data();

                let createdAtDate: Date;
                if (planData.createdAt) {
                  if (planData.createdAt instanceof Timestamp) {
                    createdAtDate = planData.createdAt.toDate();
                  } else if (planData.createdAt.seconds) {
                    createdAtDate = new Date(planData.createdAt.seconds * 1000);
                  } else {
                    createdAtDate = new Date();
                  }
                } else {
                  createdAtDate = new Date();
                }

                allPlans.push({
                  id: planDoc.id,
                  userId,
                  userName,
                  planName: planData.planName || "Unnamed Plan",
                  createdAt: createdAtDate,
                  isPublic: planData.isPublic || false,
                  meals: planData.meals || {},
                  familyMembers: planData.familyMembers || [],
                });

                console.log(`Added plan: ${planData.planName}`);
              } catch (err) {
                console.error(`Error processing meal plan document: ${err}`);
              }
            });
          } catch (error) {
            console.error(`Error fetching meal plans for specific user: ${error}`);
          }
        }

        allPlans.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        console.log(`Total meal plans found: ${allPlans.length}`);

        const processedPlans = allPlans.map(plan => {
          if (plan.meals) {
            (plan.familyMembers || []).forEach(member => {
              if (plan.meals[member.name]) {
                const meals = plan.meals[member.name];
                if (!meals.breakfast) meals.breakfast = "-";
                if (!meals.lunch) meals.lunch = "-";
                if (!meals.dinner) meals.dinner = "-";
              }
            });
          }
          return plan;
        });

        setMealPlans(processedPlans);
      } catch (error) {
        console.error("Error fetching users collection:", error);
        throw error;
      }
    } catch (error) {
      console.error("Error fetching meal plans:", error);
      setPermissionError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllMealPlans();
  }, []);

  const handleViewDetails = (plan: MealPlan) => {
    try {
      console.log("Opening details for plan:", plan.id);
      const planCopy = JSON.parse(JSON.stringify(plan));
      setSelectedPlan(planCopy);
      setDetailsModalVisible(true);
    } catch (error) {
      console.error("Error preparing plan details:", error);
      Alert.alert("Error", "Failed to load meal plan details");
    }
  };

  const getDishDetails = (mealName: string) => {
    try {
      return mealDishes.find(dish => dish.name === mealName) || null;
    } catch (error) {
      console.error("Error finding dish details:", error);
      return null;
    }
  };

  const handleDelete = async (plan: MealPlan) => {
    try {
      await deleteDoc(doc(db, "users", plan.userId, "mealPlans", plan.id));
      setMealPlans(mealPlans.filter(p => p.id !== plan.id || p.userId !== plan.userId));
      Alert.alert("Success", "Meal plan deleted");
    } catch (error) {
      console.error("Error deleting meal plan:", error);
      Alert.alert("Error", "Failed to delete meal plan");
    }
  };

  const filteredPlans = mealPlans.filter(
    plan =>
      plan.planName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plan.userName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBarHeight = () => {
    if (Platform.OS === 'ios') {
      return 44; // iOS status bar height
    } else {
      return RNStatusBar.currentHeight || 0;
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" backgroundColor="#f8f8f8" translucent />
      <View style={[styles.container, { marginTop: 0, paddingTop: getStatusBarHeight() }]}>
        <AdminHeader noTopPadding={true} />
        
        <View style={{ flex: 1, paddingTop: 10 }}>
          <Text style={styles.title}>Meal Plans</Text>

          <View style={styles.searchContainer}>
            <Ionicons name="search" size={18} color="#777" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by plan name or user"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={18} color="#777" />
              </TouchableOpacity>
            ) : null}
          </View>

          {permissionError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorTitle}>Permission Error</Text>
              <Text style={styles.errorText}>
                You don't have permission to access meal plans. Please verify that:
              </Text>
              <Text style={styles.errorBullet}>• Your account has admin privileges</Text>
              <Text style={styles.errorBullet}>• Firebase security rules are configured correctly</Text>
              <Text style={styles.errorBullet}>• You're properly authenticated</Text>

              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => fetchAllMealPlans()}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {mealPlans.length === 0 && !loading && !permissionError && (
            <View style={{ padding: 10, backgroundColor: '#f8f8f8', borderRadius: 10, marginBottom: 10 }}>
              <Text style={{ color: '#555' }}>Debug info: No meal plans found in database</Text>
              <TouchableOpacity
                style={{ marginTop: 10, padding: 8, backgroundColor: '#ddd', borderRadius: 8 }}
                onPress={() => fetchAllMealPlans()}
              >
                <Text style={{ textAlign: 'center' }}>Retry Loading</Text>
              </TouchableOpacity>
            </View>
          )}

          {loading ? (
            <ActivityIndicator size="large" color="#2e6930" style={{ marginTop: 20 }} />
          ) : (
            !permissionError && (
              <FlatList
                data={filteredPlans}
                keyExtractor={(item) => `${item.userId}-${item.id}`}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>
                    {searchQuery ? "No matching meal plans found" : "No meal plans available"}
                  </Text>
                }
                renderItem={({ item }) => (
                  <View style={styles.planCard}>
                    <View style={styles.planCardHeader}>
                      <Text style={styles.planName}>{item.planName}</Text>
                      <Text style={styles.userName}>by {item.userName}</Text>
                    </View>

                    <View style={styles.planCardStats}>
                      <Text style={styles.statText}>
                        Family Members: {item.familyMembers?.length || 0}
                      </Text>
                      <Text style={styles.statText}>
                        Created: {item.createdAt.toLocaleDateString()}
                      </Text>

                      {item.isPublic && (
                        <View style={styles.publicBadge}>
                          <Text style={styles.publicBadgeText}>Public</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.planCardActions}>
                      <TouchableOpacity
                        style={styles.viewButton}
                        onPress={() => handleViewDetails(item)}
                      >
                        <Text style={styles.viewButtonText}>View Details</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.publicButton,
                          item.isPublic ? styles.privateButton : null,
                          updatingPlanId === item.id ? { opacity: 0.7 } : null
                        ]}
                        onPress={() => togglePlanVisibility(item)}
                        disabled={updatingPlanId === item.id}
                      >
                        <Text style={styles.viewButtonText}>
                          {updatingPlanId === item.id
                            ? "Updating..."
                            : item.isPublic
                              ? "Make Private"
                              : "Make Public"}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => {
                          setSelectedPlan(item);
                          setDeleteModalVisible(true);
                        }}
                      >
                        <Text style={styles.deleteButtonText}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              />
            )
          )}

          <Modal
            ref={detailsModalRef}
            visible={detailsModalVisible}
            animationType="fade"
            transparent={true}
            onRequestClose={() => setDetailsModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    {selectedPlan?.planName || "Meal Plan Details"}
                  </Text>
                  <TouchableOpacity onPress={() => setDetailsModalVisible(false)}>
                    <Ionicons name="close" size={24} color="#333" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody}>
                  {(() => {
                    try {
                      return (
                        <>
                          {selectedPlan?.familyMembers?.map((member, idx) => (
                            <View key={idx} style={[styles.memberSection, idx === 0 ? { marginTop: 0 } : {}]}>
                              <Text style={styles.memberName}>
                                {member.type}
                              </Text>

                              {selectedPlan?.meals?.[member.name] ? (
                                <>
                                  <View style={styles.mealRow}>
                                    <Text style={styles.mealType}>Breakfast:</Text>
                                    <Text style={styles.mealName}>
                                      {getMealName(selectedPlan.meals[member.name].breakfast)}
                                    </Text>
                                  </View>

                                  <View style={styles.mealRow}>
                                    <Text style={styles.mealType}>Lunch:</Text>
                                    <Text style={styles.mealName}>
                                      {getMealName(selectedPlan.meals[member.name].lunch)}
                                    </Text>
                                  </View>

                                  <View style={styles.mealRow}>
                                    <Text style={styles.mealType}>Dinner:</Text>
                                    <Text style={styles.mealName}>
                                      {getMealName(selectedPlan.meals[member.name].dinner)}
                                    </Text>
                                  </View>

                                  <View style={styles.divider} />
                                </>
                              ) : (
                                <Text style={styles.noMealText}>No meals planned</Text>
                              )}
                            </View>
                          ))}

                          <Text style={styles.sectionTitle}>Nutrition Summary</Text>
                          <View style={styles.nutritionSummary}>
                            {selectedPlan?.familyMembers?.map((member, idx) => {
                              if (!selectedPlan.meals?.[member.name]) return null;

                              let totalCalories = 0;
                              let totalProtein = 0;
                              let totalCarbs = 0;
                              let totalFat = 0;

                              const breakfastMealName = getMealName(selectedPlan.meals[member.name].breakfast);
                              if (breakfastMealName !== "-") {
                                const dish = getDishDetails(breakfastMealName);
                                if (dish) {
                                  totalCalories += dish.nutrition.calories || 0;
                                  totalProtein += parseInt(dish.nutrition.protein) || 0;
                                  totalCarbs += parseInt(dish.nutrition.carbohydrates) || 0;
                                  totalFat += parseInt(dish.nutrition.fat) || 0;
                                }
                              }

                              const lunchMealName = getMealName(selectedPlan.meals[member.name].lunch);
                              if (lunchMealName !== "-") {
                                const dish = getDishDetails(lunchMealName);
                                if (dish) {
                                  totalCalories += dish.nutrition.calories || 0;
                                  totalProtein += parseInt(dish.nutrition.protein) || 0;
                                  totalCarbs += parseInt(dish.nutrition.carbohydrates) || 0;
                                  totalFat += parseInt(dish.nutrition.fat) || 0;
                                }
                              }

                              const dinnerMealName = getMealName(selectedPlan.meals[member.name].dinner);
                              if (dinnerMealName !== "-") {
                                const dish = getDishDetails(dinnerMealName);
                                if (dish) {
                                  totalCalories += dish.nutrition.calories || 0;
                                  totalProtein += parseInt(dish.nutrition.protein) || 0;
                                  totalCarbs += parseInt(dish.nutrition.carbohydrates) || 0;
                                  totalFat += parseInt(dish.nutrition.fat) || 0;
                                }
                              }

                              return (
                                <View key={idx} style={styles.memberNutrition}>
                                  <Text style={styles.memberNutritionName}>{member.type}</Text>
                                  <Text style={styles.nutritionDetail}>Calories: {totalCalories}</Text>
                                  <Text style={styles.nutritionDetail}>Protein: {totalProtein}g</Text>
                                  <Text style={styles.nutritionDetail}>Carbs: {totalCarbs}g</Text>
                                  <Text style={styles.nutritionDetail}>Fat: {totalFat}g</Text>
                                  <View style={styles.divider} />
                                </View>
                              );
                            })}
                          </View>
                        </>
                      );
                    } catch (error) {
                      console.error("Error rendering meal plan details:", error);
                      return (
                        <View style={styles.errorContainer}>
                          <Text style={styles.errorTitle}>Error Loading Details</Text>
                          <Text style={styles.errorText}>There was a problem loading the meal plan details.</Text>
                        </View>
                      );
                    }
                  })()}
                </ScrollView>

                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setDetailsModalVisible(false)}
                >
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          <Modal
            ref={deleteModalRef}
            visible={deleteModalVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setDeleteModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.deleteModalContent}>
                <Text style={styles.deleteModalTitle}>Delete Meal Plan</Text>
                <Text style={styles.deleteModalText}>
                  Are you sure you want to delete "{selectedPlan?.planName}" from {selectedPlan?.userName}?
                </Text>
                <View style={styles.deleteModalButtons}>
                  <TouchableOpacity
                    style={[styles.deleteModalButton, styles.cancelButton]}
                    onPress={() => setDeleteModalVisible(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.deleteModalButton, styles.confirmButton]}
                    onPress={() => {
                      setDeleteModalVisible(false);
                      if (selectedPlan) handleDelete(selectedPlan);
                    }}
                  >
                    <Text style={styles.confirmButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </View>
        <AdminDock activeTab="mealPlans" />
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2e6930",
    marginBottom: 16,
    textAlign: "center",
  },
  searchContainer: {
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
    borderRadius: 20,
    padding: 10,
    marginBottom: 16,
    alignItems: "center",
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  emptyText: {
    textAlign: "center",
    color: "#777",
    marginTop: 40,
    fontSize: 16,
  },
  planCard: {
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  planCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    alignItems: "center",
  },
  planName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2e6930",
  },
  userName: {
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
  },
  planCardStats: {
    marginBottom: 12,
  },
  statText: {
    fontSize: 14,
    color: "#444",
    marginBottom: 4,
  },
  planCardActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  viewButton: {
    backgroundColor: "#2e6930",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  viewButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
  },
  deleteButton: {
    backgroundColor: "#e74c3c",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  deleteButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    width: "90%",
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2e6930",
  },
  modalBody: {
    maxHeight: 400,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#444",
    marginTop: 12,
    marginBottom: 8,
  },
  memberSection: {
    marginBottom: 12,
  },
  memberName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2e6930",
    marginBottom: 6,
  },
  mealRow: {
    flexDirection: "row",
    marginBottom: 4,
    paddingLeft: 10,
  },
  mealType: {
    width: 80,
    fontWeight: "bold",
    color: "#666",
  },
  mealName: {
    flex: 1,
    color: "#333",
  },
  divider: {
    height: 1,
    backgroundColor: "#ddd",
    marginVertical: 10,
  },
  noMealText: {
    color: "#888",
    fontStyle: "italic",
    paddingLeft: 10,
  },
  closeButton: {
    backgroundColor: "#2e6930",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 16,
  },
  closeButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  nutritionSummary: {
    marginBottom: 20,
  },
  memberNutrition: {
    marginBottom: 12,
  },
  memberNutritionName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2e6930",
    marginBottom: 4,
  },
  nutritionDetail: {
    fontSize: 14,
    color: "#555",
    paddingLeft: 10,
  },
  deleteModalContent: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    width: "80%",
    alignItems: "center",
  },
  deleteModalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#e74c3c",
    marginBottom: 16,
  },
  deleteModalText: {
    fontSize: 16,
    color: "#444",
    textAlign: "center",
    marginBottom: 20,
  },
  deleteModalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  deleteModalButton: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    width: "45%",
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#95a5a6",
  },
  cancelButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  confirmButton: {
    backgroundColor: "#e74c3c",
  },
  confirmButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  errorContainer: {
    backgroundColor: "#fee8e6",
    borderRadius: 8,
    padding: 16,
    marginVertical: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#e74c3c",
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#c0392b",
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: "#555",
    marginBottom: 8,
  },
  errorBullet: {
    fontSize: 14,
    color: "#555",
    marginLeft: 8,
    marginBottom: 4,
  },
  retryButton: {
    backgroundColor: "#2e6930",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignSelf: "center",
    marginTop: 16,
  },
  retryButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  publicBadge: {
    backgroundColor: "#74b72e",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginTop: 8,
  },
  publicBadgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  publicButton: {
    backgroundColor: "#74b72e",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  privateButton: {
    backgroundColor: "#f39c12",
  },
});
