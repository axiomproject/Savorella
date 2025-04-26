import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, Modal, Pressable, ScrollView, Image, Alert, ActivityIndicator, Platform, StatusBar as RNStatusBar } from "react-native";
import UserDock from "../components/UserDock";
import AdminDock from "./admin/AdminDock";
import AdminHeader from "./admin/AdminHeader";
import { StatusBar } from "expo-status-bar";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { auth } from "../firebaseConfig";
import { db } from "../firebaseConfig";
import {
  collection,
  addDoc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  doc,
  arrayUnion,
  serverTimestamp,
  getDoc,
  deleteDoc,
  getDocs,
} from "firebase/firestore";

const HEADER_HEIGHT = 100;

const CATEGORIES = [
  "All",
  "General",
  "Recipes",
  "Tips",
  "Questions",
];

const AVATAR_COLORS = [
  "#2e6930", "#f7c948", "#e67e22", "#8e44ad", "#2980b9", "#c0392b", "#16a085"
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7f3ff",
    paddingTop: HEADER_HEIGHT, // Move paddingTop here
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
    fontSize: 26,
    fontFamily: "FrancaDemo-Bold",
    textAlign: "center",
    letterSpacing: 1,
    marginBottom: 10,
  },
  content: {
    flex: 1,
    paddingHorizontal: 0,
    paddingBottom: 0,
  },
  categoryBar: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 2,
    backgroundColor: "#f7f3ff",
    // Drop shadow for iOS
    shadowColor: "#2e6930",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    // Drop shadow for Android
    elevation: 3,
    zIndex: 10,
  },
  categoryBtn: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginRight: 8,
    backgroundColor: "#eee",
  },
  categoryBtnActive: {
    backgroundColor: "#2e6930",
  },
  categoryText: {
    fontSize: 13,
    color: "#2e6930",
    fontFamily: "FrancaDemo-SemiBold",
  },
  categoryTextActive: {
    color: "#fff",
  },
  postList: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  postContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#fff",
    borderRadius: 14,
    marginBottom: 14,
    padding: 14,
    shadowColor: "#2e6930",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  voteColumn: {
    alignItems: "center",
    marginRight: 12,
    width: 32,
  },
  voteButton: {
    padding: 2,
  },
  voteCount: {
    fontSize: 15,
    fontFamily: "FrancaDemo-SemiBold",
    color: "#2e6930",
    marginVertical: 2,
  },
  postContent: {
    flex: 1,
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  postAuthor: {
    fontSize: 13,
    color: "#2e6930",
    fontFamily: "FrancaDemo-SemiBold",
    marginRight: 8,
  },
  postTime: {
    fontSize: 12,
    color: "#aaa",
    fontFamily: "Franca-Light",
  },
  postText: {
    fontSize: 15,
    color: "#222",
    fontFamily: "Franca-Light",
    marginBottom: 2,
    marginTop: 2,
  },
  replyBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "#eaf0eb",
  },
  replyBtnText: {
    color: "#2e6930",
    fontSize: 13,
    fontFamily: "FrancaDemo-SemiBold",
    marginLeft: 4,
  },
  repliesContainer: {
    marginTop: 8,
    marginLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: "#eee",
    paddingLeft: 10,
  },
  replyItem: {
    backgroundColor: "#f7f3ff",
    borderRadius: 10,
    padding: 8,
    marginBottom: 6,
    marginRight: 16,
  },
  replyHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  replyAuthor: {
    fontSize: 12,
    color: "#2e6930",
    fontFamily: "FrancaDemo-SemiBold",
    marginRight: 6,
  },
  replyTime: {
    fontSize: 11,
    color: "#aaa",
    fontFamily: "Franca-Light",
  },
  replyText: {
    fontSize: 14,
    color: "#222",
    fontFamily: "Franca-Light",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.18)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 18,
    width: "85%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: "FrancaDemo-SemiBold",
    color: "#2e6930",
    marginBottom: 10,
    textAlign: "center",
  },
  modalInput: {
    backgroundColor: "#eaf0eb",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    fontFamily: "Franca-Light",
    color: "#222",
    marginBottom: 12,
  },
  modalBtnRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
    gap: 12, // for RN >= 0.71, otherwise use marginRight below
  },
  modalSendBtn: {
    backgroundColor: "#2e6930",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 24,
    marginRight: 8, // fallback for gap if needed
  },
  modalSendText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "FrancaDemo-SemiBold",
  },
  modalCloseBtn: {
    backgroundColor: "#eaf0eb",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 24,
  },
  modalCloseText: {
    color: "#2e6930",
    fontSize: 14,
    fontFamily: "FrancaDemo-SemiBold",
  },
  fab: {
    position: "absolute",
    right: 24,
    bottom: 105, // move above the dock (increase from 32)
    backgroundColor: "#2e6930",
    borderRadius: 28,
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    elevation: 10, // increase elevation for Android
    shadowColor: "#2e6930",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    zIndex: 999, // ensure it's above other elements
  },
  reportsSection: {
    backgroundColor: "#fffbe7",
    padding: 16,
    margin: 12,
    borderRadius: 12,
    marginBottom: 0,
    elevation: 2,
  },
  reportsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#c0392b",
    marginBottom: 8,
  },
  reportItem: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#f7c948",
  },
  reportLabel: {
    fontSize: 14,
    color: "#2e6930",
    fontWeight: "bold",
    marginBottom: 2,
  },
  reportContent: {
    fontSize: 14,
    color: "#222",
    marginBottom: 2,
  },
  reportReason: {
    fontSize: 13,
    color: "#c0392b",
    marginBottom: 2,
  },
  dismissBtn: {
    backgroundColor: "#2e6930",
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 16,
    alignSelf: "flex-start",
  },
});

// Utility to format relative time
function getRelativeTime(date: Date | number | null | undefined): string {
  if (!date) return "";
  const now = Date.now();
  const d = typeof date === "number" ? date : date.getTime();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return "Now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr${Math.floor(diff / 3600) > 1 ? "s" : ""} ago`;
  if (diff < 172800) return "Yesterday";
  return new Date(d).toLocaleDateString();
}

type Reply = {
  id: string;
  author: string;
  authorId?: string;
  text: string;
  createdAt: Date | null;
};
type Post = {
  id: string;
  author: string;
  authorId?: string;
  text: string;
  createdAt: Date | null;
  votes: number;
  userVote: 0 | 1 | -1;
  category: string;
  replies: Reply[];
};

type AuthorInfo = {
  name: string;
  isAdmin?: boolean;
  isNutritionist?: boolean;
  avatar?: string; // use 'avatar' to match settings.tsx
};

export default function CommunityScreen() {
  const [posts, setPosts] = useState<Post[]>([]); // Start with empty posts
  const [selectedCategory, setSelectedCategory] = useState("General"); // Default to "General"
  const [replyModal, setReplyModal] = useState<{ visible: boolean; postId: string | null }>({ visible: false, postId: null });
  const [replyInput, setReplyInput] = useState("");
  const [postModal, setPostModal] = useState(false);
  const [postModalCategory, setPostModalCategory] = useState("General");
  const [postModalInput, setPostModalInput] = useState("");
  const [userProfile, setUserProfile] = useState<{ isAdmin?: boolean, name?: string } | null>(null);
  const [authorNames, setAuthorNames] = useState<{ [uid: string]: AuthorInfo }>({});
  const [deleteModal, setDeleteModal] = useState<{ visible: boolean; postId: string | null }>({ visible: false, postId: null });
  const [reportModal, setReportModal] = useState<{ visible: boolean; postId: string | null; replyId?: string | null }>({ visible: false, postId: null, replyId: null });
  const [reportReason, setReportReason] = useState("");
  const [reports, setReports] = useState<any[]>([]);
  const [reportsModalVisible, setReportsModalVisible] = useState(false);
  const [loadingAuthors, setLoadingAuthors] = useState(false); // New state to track author data loading
  const [initialLoading, setInitialLoading] = useState(true); // Add this new loading state

  // Get current user info
  const currentUser = auth.currentUser;
  const userName =
    currentUser?.displayName ||
    currentUser?.email?.split("@")[0] ||
    "you";

  // Fetch user profile from Firestore to get isAdmin
  useEffect(() => {
    if (!currentUser) {
      setInitialLoading(false); // Not logged in, no need to wait
      return;
    }
    const unsub = onSnapshot(
      doc(db, "users", currentUser.uid),
      (docSnap) => {
        setUserProfile(docSnap.exists() ? docSnap.data() : {});
        setInitialLoading(false); // Set loading to false once we have profile info
      }
    );
    return unsub;
  }, [currentUser]);

  const isAdmin = userProfile?.isAdmin === true;

  // Fetch posts from Firestore in real-time
  React.useEffect(() => {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      setPosts(
        snapshot.docs.map((doc) => {
          const data = doc.data();
          // Use Firestore Timestamp for createdAt
          const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt || new Date());
          // For replies, also parse createdAt if present
          const replies = (data.replies || []).map((r: any) => ({
            ...r,
            createdAt: r.createdAt?.toDate ? r.createdAt.toDate() : (r.createdAt || null),
          }));
          return {
            id: doc.id,
            author: data.author,
            authorId: data.authorId,
            text: data.text,
            createdAt,
            votes: data.votes,
            userVote: data.userVote || 0,
            category: data.category,
            replies,
          };
        })
      );
    });
    return unsub;
  }, []);

  // Fetch author names, isAdmin, isNutritionist, and avatar when posts change
  useEffect(() => {
    const fetchNames = async () => {
      if (posts.length === 0) return;
      
      setLoadingAuthors(true); // Start loading authors
      
      // Collect all authorIds from posts and replies
      const postAuthorIds = posts.map((p) => p.authorId).filter(Boolean);
      const replyAuthorIds = posts
        .flatMap((p) => (p.replies || []).map((r) => (r as any).authorId))
        .filter(Boolean);
      const ids = Array.from(new Set([...postAuthorIds, ...replyAuthorIds])) as string[];
      const names: { [uid: string]: AuthorInfo } = {};
      await Promise.all(
        ids.map(async (uid) => {
          const userDoc = await getDoc(doc(db, "users", uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            names[uid] = {
              name: data.name || "",
              isAdmin: data.isAdmin || false,
              isNutritionist: data.isNutritionist || false,
              avatar: data.avatar || "", // fetch avatar
            };
          }
        })
      );
      setAuthorNames(names);
      setLoadingAuthors(false); // Finished loading authors
    };
    if (posts.length > 0) fetchNames();
  }, [posts]);

  // Fetch reports for admin
  useEffect(() => {
    if (!isAdmin) return;
    const unsub = onSnapshot(collection(db, "reports"), (snapshot) => {
      setReports(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return unsub;
  }, [isAdmin]);

  const handleVote = async (id: string, direction: 1 | -1) => {
    const post = posts.find((p) => p.id === id);
    if (!post) return;
    let newVote = post.userVote === direction ? 0 : direction;
    let voteDiff = newVote - post.userVote;
    const postRef = doc(db, "posts", id);
    await updateDoc(postRef, {
      votes: post.votes + voteDiff,
      userVote: newVote,
    });
  };

  const handleSend = async () => {
    if (postModalInput.trim().length === 0) return;
    const post = {
      author: userProfile?.name || userName, // Use latest name from userProfile
      authorId: currentUser?.uid,
      text: postModalInput,
      votes: 1,
      userVote: 1,
      category: postModalCategory,
      replies: [],
      createdAt: serverTimestamp(),
    };
    await addDoc(collection(db, "posts"), post);
    setPostModalInput("");
    setPostModal(false);
    setPostModalCategory("General");
  };

  const handleReplySend = async () => {
    if (!replyInput.trim() || !replyModal.postId) return;
    const reply = {
      id: Date.now().toString(),
      author: userName,
      authorId: currentUser?.uid,
      text: replyInput,
      createdAt: new Date(),
    };
    const postRef = doc(db, "posts", replyModal.postId);
    await updateDoc(postRef, {
      replies: arrayUnion(reply),
    });
    setReplyInput("");
    setReplyModal({ visible: false, postId: null });
  };

  const handleDeletePost = async (postId: string) => {
    setDeleteModal({ visible: true, postId });
  };

  const confirmDeletePost = async () => {
    if (!deleteModal.postId) return;
    try {
      await deleteDoc(doc(db, "posts", deleteModal.postId));
    } catch (err) {
      console.error("Failed to delete post:", err);
    }
    setDeleteModal({ visible: false, postId: null });
  };

  const handleReportPost = (postId: string, replyId?: string | null) => {
    setReportModal({ visible: true, postId, replyId: replyId || null });
    setReportReason("");
  };

  const submitReport = async () => {
    if (!reportReason.trim() || !reportModal.postId) return;
    if (!currentUser) {
      Alert.alert("Not signed in", "You must be signed in to report.");
      return;
    }
    try {
      await addDoc(collection(db, "reports"), {
        postId: reportModal.postId,
        replyId: reportModal.replyId || null,
        reason: reportReason,
        reportedBy: currentUser.uid,
        createdAt: serverTimestamp(),
      });
      setReportModal({ visible: false, postId: null, replyId: null });
      setReportReason("");
      Alert.alert("Report submitted", "Thank you for your feedback!");
    } catch (e: any) {
      Alert.alert(
        "Failed to submit report",
        e?.message || "Please try again later. Make sure you are logged in and have permission to report."
      );
    }
  };

  const getReportedContent = (report: any) => {
    const post = posts.find((p) => p.id === report.postId);
    if (!post) return "[Deleted Post]";
    if (report.replyId) {
      const reply = post.replies?.find((r) => r.id === report.replyId);
      return reply ? reply.text : "[Deleted Reply]";
    }
    return post.text;
  };

  const getReportedAuthor = (report: any) => {
    const post = posts.find((p) => p.id === report.postId);
    if (!post) return "";
    if (report.replyId) {
      const reply = post.replies?.find((r) => r.id === report.replyId);
      return reply?.author || "";
    }
    return post.author;
  };

  const handleDismissReport = async (reportId: string) => {
    await deleteDoc(doc(db, "reports", reportId));
  };

  // Delete the reported post or reply
  const handleDeleteReported = async (report: any) => {
    if (report.replyId) {
      // Delete reply from post
      const post = posts.find((p) => p.id === report.postId);
      if (!post) return;
      const updatedReplies = post.replies.filter((r) => r.id !== report.replyId);
      await updateDoc(doc(db, "posts", report.postId), { replies: updatedReplies });
    } else {
      // Delete the whole post
      await deleteDoc(doc(db, "posts", report.postId));
    }
    // Dismiss the report after deleting content
    await handleDismissReport(report.id);
  };

  const filteredPosts =
    selectedCategory === "All"
      ? posts
      : posts.filter((p) => p.category === selectedCategory);

  // Helper for avatar (now uses Image and 'avatar' field)
  function renderAvatar(authorId?: string, name?: string, size = 36) {
    let uri = authorId && authorNames[authorId]?.avatar;
    let displayName = authorId && authorNames[authorId]?.name
      ? authorNames[authorId].name
      : name || "";
    let initial = displayName ? displayName[0].toUpperCase() : "?";
    let colorIdx = authorId
      ? authorId.charCodeAt(0) % AVATAR_COLORS.length
      : 0;
    let bgColor = AVATAR_COLORS[colorIdx];
    if (uri) {
      return (
        <Image
          source={{ uri }}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            marginRight: 10,
            backgroundColor: "#eee",
          }}
        />
      );
    }
    return (
      <View style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bgColor,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 10,
      }}>
        <Text style={{ color: "#fff", fontWeight: "bold", fontSize: size * 0.48 }}>{initial}</Text>
      </View>
    );
  }

  // Add this function to get status bar height
  const getStatusBarHeight = () => {
    if (Platform.OS === 'ios') {
      return 44; // iOS status bar height
    } else {
      return RNStatusBar.currentHeight || 0;
    }
  };

  // Full-screen loading spinner during initial load
  if (initialLoading) {
    return (
      <View style={[styles.container, { backgroundColor: "#f7f3ff" }]}>
        <StatusBar style="light" backgroundColor="#2e6930" />
        <View style={{ 
          position: "absolute", 
          top: 0, 
          left: 0, 
          right: 0, 
          height: HEADER_HEIGHT, 
          backgroundColor: "#2e6930" 
        }} />
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#2e6930" />
          <Text style={{ 
            marginTop: 10, 
            color: "#2e6930", 
            fontFamily: "FrancaDemo-SemiBold" 
          }}>
            Loading...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container} pointerEvents="box-none">
      <StatusBar style={isAdmin ? "dark" : "light"} backgroundColor={isAdmin ? "#f8f8f8" : "#2e6930"} translucent />
      {isAdmin ? (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 100,
            backgroundColor: "#f8f8f8",
            paddingTop: getStatusBarHeight(), // Add padding for status bar
          }}
        >
          <AdminHeader onReports={() => setReportsModalVisible(true)} noTopPadding={true} />
        </View>
      ) : (
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Nutrition Community</Text>
        </View>
      )}
      {/* Reports Modal for Admin */}
      {isAdmin && (
        <Modal
          visible={reportsModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setReportsModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { maxHeight: "80%" }]}>
              <Text style={styles.reportsTitle}>Reports</Text>
              {reports.length === 0 ? (
                <Text style={{ color: "#888", fontSize: 14, marginBottom: 8 }}>No reports.</Text>
              ) : (
                <ScrollView style={{ maxHeight: 400 }}>
                  {reports.map((report) => (
                    <View key={report.id} style={styles.reportItem}>
                      <Text style={styles.reportLabel}>
                        {report.replyId ? "Reply" : "Post"} by {getReportedAuthor(report)}
                      </Text>
                      <Text style={styles.reportContent}>{getReportedContent(report)}</Text>
                      <Text style={styles.reportReason}>Reason: {report.reason}</Text>
                      <View style={{ flexDirection: "row", marginTop: 6 }}>
                        <TouchableOpacity
                          style={styles.dismissBtn}
                          onPress={() => handleDismissReport(report.id)}
                        >
                          <Text style={{ color: "#fff", fontWeight: "bold" }}>Dismiss</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.dismissBtn, { backgroundColor: "#c0392b", marginLeft: 10 }]}
                          onPress={() => handleDeleteReported(report)}
                        >
                          <Text style={{ color: "#fff", fontWeight: "bold" }}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              )}
              <Pressable style={styles.modalCloseBtn} onPress={() => setReportsModalVisible(false)}>
                <Text style={styles.modalCloseText}>Close</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryBar}
        style={{ flexGrow: 0 }}
      >
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[
              styles.categoryBtn,
              selectedCategory === cat && styles.categoryBtnActive,
            ]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text
              style={[
                styles.categoryText,
                selectedCategory === cat && styles.categoryTextActive,
              ]}
            >
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <View style={styles.content}>
        {/* Show loading spinner when fetching author data */}
        {loadingAuthors ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingBottom: 50 }}>
            <ActivityIndicator size="large" color="#2e6930" />
            <Text style={{ marginTop: 10, color: "#2e6930", fontFamily: "FrancaDemo-SemiBold" }}>
              Loading community...
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredPosts}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.postList}
            inverted
            renderItem={({ item }) => {
              // Determine post background color
              let postBg = "#fff";
              if (item.authorId && authorNames[item.authorId]?.isAdmin) {
                postBg = "#eaf0eb"; // greenish for admin
              } else if (item.authorId && authorNames[item.authorId]?.isNutritionist) {
                postBg = "#fff6e0"; // orange-ish for nutritionist
              }
              const isPostByAdmin = item.authorId && authorNames[item.authorId]?.isAdmin;
              const isOwnPost = item.authorId && currentUser && item.authorId === currentUser.uid;
              return (
                <View style={[styles.postContainer, { backgroundColor: postBg }]}>
                  {/* Avatar for post */}
                  {renderAvatar(item.authorId, item.author, 38)}
                  <View style={styles.voteColumn}>
                    <TouchableOpacity
                      style={styles.voteButton}
                      onPress={() => handleVote(item.id, 1)}
                    >
                      <MaterialCommunityIcons
                        name="arrow-up-bold"
                        size={22}
                        color={item.userVote === 1 ? "#2e6930" : "#bbb"}
                      />
                    </TouchableOpacity>
                    <Text style={styles.voteCount}>{item.votes}</Text>
                    <TouchableOpacity
                      style={styles.voteButton}
                      onPress={() => handleVote(item.id, -1)}
                    >
                      <MaterialCommunityIcons
                        name="arrow-down-bold"
                        size={22}
                        color={item.userVote === -1 ? "#2e6930" : "#bbb"}
                      />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.postContent}>
                    <View style={styles.postHeader}>
                      <Text style={styles.postAuthor}>
                        {item.authorId && authorNames[item.authorId]?.name
                          ? authorNames[item.authorId].name
                          : item.author}
                      </Text>
                      {/* Admin badge */}
                      {item.authorId && authorNames[item.authorId]?.isAdmin && (
                        <View style={{
                          backgroundColor: "#2e6930",
                          borderRadius: 6,
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          marginLeft: 1,
                          marginRight: 6,
                          alignSelf: "center",
                        }}>
                          <Text style={{
                            color: "#fff",
                            fontSize: 10,
                            fontFamily: "FrancaDemo-SemiBold",
                            letterSpacing: 0.5,
                          }}>
                            Admin
                          </Text>
                        </View>
                      )}
                      {/* Nutritionist badge */}
                      {item.authorId && authorNames[item.authorId]?.isNutritionist && (
                        <View style={{
                          backgroundColor: "#f7c948",
                          borderRadius: 6,
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          marginLeft: 1,
                          marginRight: 6,
                          alignSelf: "center",
                        }}>
                          <Text style={{
                            color: "#2e6930",
                            fontSize: 10,
                            fontFamily: "FrancaDemo-SemiBold",
                            letterSpacing: 0.5,
                          }}>
                            Nutritionist
                          </Text>
                        </View>
                      )}
                      <Text style={styles.postTime}>
                        {getRelativeTime(item.createdAt)}
                      </Text>
                      {/* Admin delete button */}
                      {isAdmin && (
                        <TouchableOpacity
                          onPress={() => handleDeletePost(item.id)}
                          style={{ marginLeft: 8, padding: 2 }}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <MaterialCommunityIcons name="trash-can-outline" size={18} color="#c0392b" />
                        </TouchableOpacity>
                      )}
                      {/* Report button for non-admins, not own post, not admin post */}
                      {!isAdmin && !isOwnPost && !isPostByAdmin && (
                        <TouchableOpacity
                          onPress={() => handleReportPost(item.id)}
                          style={{ marginLeft: 8, padding: 2 }}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#e67e22" />
                        </TouchableOpacity>
                      )}
                      {/* Show category if in "All" */}
                      {selectedCategory === "All" && (
                        <View
                          style={{
                            backgroundColor: "#eaf0eb",
                            borderRadius: 8,
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                            marginLeft: 8,
                            alignSelf: "flex-start",
                          }}
                        >
                          <Text
                            style={{
                              color: "#2e6930",
                              fontSize: 12,
                              fontFamily: "FrancaDemo-SemiBold",
                            }}
                          >
                            {item.category}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.postText}>{item.text}</Text>
                    <TouchableOpacity
                      style={styles.replyBtn}
                      onPress={() => setReplyModal({ visible: true, postId: item.id })}
                    >
                      <Ionicons name="chatbubble-outline" size={16} color="#2e6930" />
                      <Text style={styles.replyBtnText}>Reply</Text>
                    </TouchableOpacity>
                    {item.replies.length > 0 && (
                      <View style={styles.repliesContainer}>
                        {item.replies.map((reply) => {
                          // Determine reply background color
                          let replyBg = "#f7f3ff";
                          if (reply.authorId && authorNames[reply.authorId]?.isAdmin) {
                            replyBg = "#eaf0eb";
                          } else if (reply.authorId && authorNames[reply.authorId]?.isNutritionist) {
                            replyBg = "#fff6e0";
                          }
                          const isReplyByAdmin = reply.authorId && authorNames[reply.authorId]?.isAdmin;
                          const isOwnReply = reply.authorId && currentUser && reply.authorId === currentUser.uid;
                          return (
                            <View key={reply.id} style={[styles.replyItem, { backgroundColor: replyBg, flexDirection: "row", alignItems: "flex-start" }]}>
                              {/* Avatar for reply */}
                              {renderAvatar(reply.authorId, reply.author, 28)}
                              <View style={{ flex: 1 }}>
                                <View style={styles.replyHeader}>
                                  <Text style={styles.replyAuthor}>
                                    {reply.authorId && authorNames[reply.authorId]?.name
                                      ? authorNames[reply.authorId].name
                                      : reply.author}
                                  </Text>
                                  {/* Nutritionist badge for replies */}
                                  {reply.authorId && authorNames[reply.authorId]?.isNutritionist && (
                                    <View style={{
                                      backgroundColor: "#f7c948",
                                      borderRadius: 6,
                                      paddingHorizontal: 6,
                                      paddingVertical: 2,
                                      marginLeft: 1,
                                      marginRight: 6,
                                      alignSelf: "center",
                                    }}>
                                      <Text style={{
                                        color: "#2e6930",
                                        fontSize: 10,
                                        fontFamily: "FrancaDemo-SemiBold",
                                        letterSpacing: 0.5,
                                      }}>
                                        Nutritionist
                                      </Text>
                                    </View>
                                  )}
                                  <Text style={styles.replyTime}>
                                    {getRelativeTime(reply.createdAt)}
                                  </Text>
                                  {/* Report button for replies (not admin, not own, not admin user) */}
                                  {!isAdmin && !isOwnReply && !isReplyByAdmin && (
                                    <TouchableOpacity
                                      onPress={() => handleReportPost(item.id, reply.id)}
                                      style={{ marginLeft: 8, padding: 2 }}
                                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    >
                                      <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#e67e22" />
                                    </TouchableOpacity>
                                  )}
                                </View>
                                <Text style={styles.replyText}>{reply.text}</Text>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>
                </View>
              );
            }}
          />
        )}
      </View>
      {/* Place FAB just before dock */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setPostModal(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>
      {/* Post Modal */}
      <Modal
        visible={postModal}
        transparent
        animationType="fade"
        onRequestClose={() => setPostModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Post</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ flexDirection: "row", marginBottom: 10 }}
              style={{ marginBottom: 10 }}
            >
              {CATEGORIES.filter((c) => c !== "All").map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryBtn,
                    postModalCategory === cat && styles.categoryBtnActive,
                    { marginRight: 6, paddingHorizontal: 10, paddingVertical: 4 },
                  ]}
                  onPress={() => setPostModalCategory(cat)}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      postModalCategory === cat && styles.categoryTextActive,
                      { fontSize: 12 },
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TextInput
              style={styles.modalInput}
              placeholder="Share something about nutrition..."
              placeholderTextColor="#aaa"
              value={postModalInput}
              onChangeText={setPostModalInput}
              multiline
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalSendBtn} onPress={handleSend}>
                <Text style={styles.modalSendText}>Post</Text>
              </TouchableOpacity>
              <Pressable
                style={styles.modalCloseBtn}
                onPress={() => setPostModal(false)}
              >
                <Text style={styles.modalCloseText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        visible={replyModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setReplyModal({ visible: false, postId: null })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reply</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Write your reply..."
              placeholderTextColor="#aaa"
              value={replyInput}
              onChangeText={setReplyInput}
              multiline
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalSendBtn} onPress={handleReplySend}>
                <Text style={styles.modalSendText}>Send</Text>

              </TouchableOpacity>
              <Pressable
                style={styles.modalCloseBtn}
                onPress={() => setReplyModal({ visible: false, postId: null })}
              >
                <Text style={styles.modalCloseText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      {/* Delete confirmation modal */}
      <Modal
        visible={deleteModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModal({ visible: false, postId: null })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delete Post</Text>
            <Text style={{ color: "#222", fontSize: 15, marginBottom: 18, textAlign: "center" }}>
              Are you sure you want to delete this post? This action cannot be undone.
            </Text>
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalSendBtn, { backgroundColor: "#c0392b" }]}
                onPress={confirmDeletePost}
              >
                <Text style={styles.modalSendText}>Delete</Text>
              </TouchableOpacity>
              <Pressable
                style={styles.modalCloseBtn}
                onPress={() => setDeleteModal({ visible: false, postId: null })}
              >
                <Text style={styles.modalCloseText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      {/* Report Modal */}
      <Modal
        visible={reportModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setReportModal({ visible: false, postId: null, replyId: null })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {reportModal.replyId ? "Report Reply" : "Report Post"}
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Reason for reporting (required)"
              placeholderTextColor="#aaa"
              value={reportReason}
              onChangeText={setReportReason}
              multiline
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalSendBtn}
                onPress={submitReport}
                disabled={!reportReason.trim()}
              >
                <Text style={styles.modalSendText}>Submit</Text>
              </TouchableOpacity>
              <Pressable
                style={styles.modalCloseBtn}
                onPress={() => setReportModal({ visible: false, postId: null, replyId: null })}
              >
                <Text style={styles.modalCloseText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      {isAdmin ? (
        <AdminDock activeTab="community" />
      ) : (
        <UserDock activeTab="community" />
      )}
    </View>
  );
}