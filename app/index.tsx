import { useEffect } from "react";
import { router } from "expo-router";
import { auth, db } from "../firebaseConfig";
import { doc, getDoc } from "firebase/firestore";

export default function Index() {
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const isAdmin = userDoc.exists() ? userDoc.data().isAdmin : false;

        if (isAdmin) {
          router.replace("/admin/AdminDashboard");
        } else {
          router.replace("/dashboard");
        }
      } else {
        router.replace("/login");
      }
    });
    return unsubscribe;
  }, []);

  return null;
}