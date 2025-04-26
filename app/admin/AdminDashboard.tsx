import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, StatusBar as RNStatusBar, Dimensions } from "react-native";
import { StatusBar } from "expo-status-bar";
import AdminHeader from "./AdminHeader";
import AdminDock from "./AdminDock";
import { collection, getDocs, onSnapshot, query, orderBy } from "firebase/firestore";
import { db, auth } from "../../firebaseConfig";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";

interface User {
  id: string;
  name: string;
  email: string;
  createdAt?: any;
  isAdmin?: boolean;
}

interface MealFrequency {
  mealName: string;
  count: number;
}

const FILTERS = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
];

export default function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [filterDays, setFilterDays] = useState(7);
  const [adminName, setAdminName] = useState<string>("Admin");
  const [popularMeals, setPopularMeals] = useState<MealFrequency[]>([]);
  const [loadingMeals, setLoadingMeals] = useState(true);

  const getStatusBarHeight = () => {
    if (Platform.OS === 'ios') {
      return 44;
    } else {
      return RNStatusBar.currentHeight || 0;
    }
  };

  useEffect(() => {
    const usersCol = collection(db, "users");
    const q = query(usersCol, orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (userSnapshot) => {
      const userList: User[] = [];
      userSnapshot.forEach((docSnap) => {
        const data = docSnap.data() as User;
        if (!data.isAdmin) {
          userList.push({ ...data, id: docSnap.id });
        }
      });
      setUsers(userList);
      setTotalUsers(userList.length);
    });

    const fetchAdminName = async () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const userDoc = await getDocs(collection(db, "users"));
        let found = false;
        userDoc.forEach((docSnap) => {
          if (docSnap.id === currentUser.uid) {
            const data = docSnap.data();
            if (data.name) setAdminName(data.name);
            else if (currentUser.displayName) setAdminName(currentUser.displayName);
            found = true;
          }
        });
        if (!found && currentUser.displayName) setAdminName(currentUser.displayName);
      }
    };
    fetchAdminName();

    fetchPopularMeals();

    return () => unsubscribe();
  }, []);

  const fetchPopularMeals = async () => {
    setLoadingMeals(true);
    try {
      const usersSnapshot = await getDocs(collection(db, "users"));
      const mealCounts: { [key: string]: number } = {};
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        if (userData.isAdmin) continue;
        const mealPlansSnapshot = await getDocs(collection(db, "users", userDoc.id, "mealPlans"));
        mealPlansSnapshot.forEach((planDoc) => {
          const planData = planDoc.data();
          const meals = planData.meals || {};
          Object.values(meals).forEach((personMeals: any) => {
            ["breakfast", "lunch", "dinner"].forEach((mealType) => {
              if (!personMeals[mealType]) return;
              const mealName =
                typeof personMeals[mealType] === "object"
                  ? personMeals[mealType].meal
                  : personMeals[mealType];
              if (mealName && typeof mealName === "string") {
                mealCounts[mealName] = (mealCounts[mealName] || 0) + 1;
              }
            });
          });
        });
      }
      const sortedMeals = Object.entries(mealCounts)
        .map(([mealName, count]) => ({ mealName, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      setPopularMeals(sortedMeals);
    } catch (error) {
      console.error("Error fetching popular meals:", error);
    } finally {
      setLoadingMeals(false);
    }
  };

  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(now.getDate() - filterDays + 1);

  const dateMap: { [date: string]: number } = {};
  for (let i = 0; i < filterDays; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    dateMap[format(d, "yyyy-MM-dd")] = 0;
  }
  users.forEach((u) => {
    if (u.createdAt && u.createdAt.seconds) {
      const d = new Date(u.createdAt.seconds * 1000);
      const key = format(d, "yyyy-MM-dd");
      if (key in dateMap) dateMap[key]++;
    }
  });
  const chartDates = Object.keys(dateMap);
  const chartData = chartDates.map((d) => dateMap[d]);

  const chartBarData = chartDates.map((d, idx) => ({
    x: filterDays <= 7
      ? format(new Date(chartDates[idx]), "MM/dd")
      : idx % Math.ceil(filterDays / 7) === 0
      ? format(new Date(chartDates[idx]), "MM/dd")
      : "",
    y: chartData[idx],
  }));

  const newUsers = [...users]
    .filter((u) => u.createdAt)
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
    .slice(0, 5);

  return (
    <View style={[styles.container, { marginTop: 0, paddingTop: getStatusBarHeight() }]}>
      <StatusBar style="dark" backgroundColor="#f8f8f8" translucent />
      <AdminHeader noTopPadding={true} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 90 }}>
        <View style={styles.content}>
          <Text style={styles.title}>Admin Dashboard</Text>
          <Text style={styles.subtitle}>Welcome, {adminName}!</Text>
          <View style={styles.graphCard}>
            <View style={styles.graphHeader}>
              <Text style={styles.graphTitle}>User Signups</Text>
              <View style={styles.filterRow}>
                {FILTERS.map((f) => (
                  <TouchableOpacity
                    key={f.label}
                    style={[
                      styles.filterBtn,
                      filterDays === f.days && styles.filterBtnActive,
                    ]}
                    onPress={() => setFilterDays(f.days)}
                  >
                    <Text
                      style={[
                        styles.filterBtnText,
                        filterDays === f.days && styles.filterBtnTextActive,
                      ]}
                    >
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            {/* Replace the chart with a simple React Native bar visualization */}
            <View style={styles.barChartContainer}>
              {chartBarData.map((data, index) => {
                // Calculate the height based on the maximum value
                const maxValue = Math.max(...chartBarData.map(item => item.y));
                const barHeight = maxValue > 0 ? (data.y / maxValue) * 100 : 0;
                
                return (
                  <View key={index} style={styles.barColumn}>
                    <View style={styles.barValueContainer}>
                      <Text style={styles.barValue}>{data.y}</Text>
                    </View>
                    <View style={[styles.bar, { height: barHeight > 0 ? `${barHeight}%` : 1 }]} />
                    <Text style={styles.barLabel}>{data.x}</Text>
                  </View>
                );
              })}
            </View>
            
            <Text style={styles.graphValue}>Total: {totalUsers}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Most Popular Meals</Text>
            {loadingMeals ? (
              <Text style={styles.sectionText}>Loading meal data...</Text>
            ) : popularMeals.length === 0 ? (
              <Text style={styles.sectionText}>No meal data available.</Text>
            ) : (
              <View style={styles.mealStatsContainer}>
                <View style={styles.mealHeaderRow}>
                  <Text style={styles.mealHeaderRank}>#</Text>
                  <Text style={styles.mealHeaderName}>Meal</Text>
                  <Text style={styles.mealHeaderCount}>Usage</Text>
                </View>
                {popularMeals.map((item, index) => (
                  <View key={item.mealName} style={styles.mealRow}>
                    <View style={styles.mealRank}>
                      <Text style={styles.mealRankText}>{index + 1}</Text>
                    </View>
                    <Text style={styles.mealName} numberOfLines={1} ellipsizeMode="tail">
                      {item.mealName}
                    </Text>
                    <View style={styles.mealCountBadge}>
                      <Text style={styles.mealCount}>{item.count}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>New Users</Text>
            {newUsers.length === 0 ? (
              <Text style={styles.sectionText}>No new users found.</Text>
            ) : (
              <View>
                {newUsers.map((item) => (
                  <View key={item.id} style={styles.userRow}>
                    <Ionicons
                      name="person-circle-outline"
                      size={28}
                      color="#2e6930"
                      style={{ marginRight: 10 }}
                    />
                    <View>
                      <Text style={styles.userName}>{item.name || "No Name"}</Text>
                      <Text style={styles.userEmail}>{item.email}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
      <AdminDock activeTab="dashboard" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    flex: 0,
    alignItems: "center",
    padding: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#2e6930",
  },
  subtitle: {
    fontSize: 20,
    marginBottom: 24,
    color: "#333",
  },
  graphCard: {
    width: "100%",
    backgroundColor: "#f4f4f4",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    marginBottom: 24,
    elevation: 2,
  },
  graphHeader: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  graphTitle: {
    fontSize: 18,
    color: "#2e6930",
    fontWeight: "bold",
    flex: 1,
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  filterBtn: {
    paddingVertical: 2,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#e0e0e0",
    marginLeft: 6,
  },
  filterBtnActive: {
    backgroundColor: "#2e6930",
  },
  filterBtnText: {
    color: "#2e6930",
    fontWeight: "bold",
    fontSize: 13,
  },
  filterBtnTextActive: {
    color: "#fff",
  },
  graphValue: {
    fontSize: 16,
    color: "#2e6930",
    fontWeight: "bold",
    marginTop: 8,
  },
  section: {
    width: "100%",
    backgroundColor: "#f8f8f8",
    borderRadius: 16,
    padding: 18,
    marginTop: 8,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 17,
    color: "#2e6930",
    fontWeight: "bold",
    marginBottom: 10,
  },
  sectionText: {
    fontSize: 16,
    color: "#555",
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  userName: {
    fontSize: 15,
    color: "#222",
    fontWeight: "bold",
  },
  userEmail: {
    fontSize: 13,
    color: "#555",
  },
  mealStatsContainer: {
    marginTop: 10,
  },
  mealHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  mealHeaderRank: {
    width: "10%",
    fontWeight: "bold",
    color: "#2e6930",
  },
  mealHeaderName: {
    width: "60%",
    fontWeight: "bold",
    color: "#2e6930",
  },
  mealHeaderCount: {
    width: "30%",
    fontWeight: "bold",
    color: "#2e6930",
    textAlign: "right",
  },
  mealRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  mealRank: {
    width: "10%",
  },
  mealRankText: {
    fontWeight: "bold",
    color: "#555",
  },
  mealName: {
    width: "60%",
    color: "#555",
  },
  mealCountBadge: {
    width: "30%",
    alignItems: "flex-end",
  },
  mealCount: {
    fontWeight: "bold",
    color: "#555",
  },
  mobileChartFallback: {
    padding: 15,
    backgroundColor: "#eef5ee",
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
  },
  mobileChartText: {
    fontSize: 14,
    fontStyle: "italic",
    color: "#666",
    marginBottom: 10,
  },
  mobileChartSubText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#2e6930",
    marginBottom: 8,
  },
  mobileDataRow: {
    fontSize: 13,
    color: "#555",
    marginBottom: 4,
  },
  barChartContainer: {
    width: '100%',
    height: 180,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginVertical: 16,
  },
  barColumn: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginHorizontal: 2,
  },
  bar: {
    width: '70%',
    backgroundColor: '#2e6930',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    minHeight: 1,
  },
  barLabel: {
    fontSize: 10,
    marginTop: 5,
    textAlign: 'center',
    color: '#333',
  },
  barValueContainer: {
    marginBottom: 5,
  },
  barValue: {
    fontSize: 10,
    color: '#555',
  },
});
