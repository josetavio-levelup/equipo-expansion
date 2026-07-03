import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, signInWithEmailAndPassword, GoogleAuthProvider, onAuthStateChanged, signOut, type User } from "firebase/auth";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

/**
 * Checks if the given email is authorized by looking it up in the teamMembers collection.
 * Returns true if a matching team member is found, false otherwise.
 */
export async function checkEmailAuthorized(email: string): Promise<boolean> {
  try {
    const snap = await getDocs(collection(db, "teamMembers"));
    const normalizedEmail = email.toLowerCase().trim();
    return snap.docs.some(doc => {
      const data = doc.data();
      return data.email && data.email.toLowerCase().trim() === normalizedEmail;
    });
  } catch (err) {
    console.error("Error checking email authorization:", err);
    return false;
  }
}

// Google Auth Provider — solo identidad, sin scopes de Drive/Sheets
const provider = new GoogleAuthProvider();

export const initAuth = (
  onAuthSuccess?: (user: User) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, (user: User | null) => {
    if (user) {
      if (onAuthSuccess) onAuthSuccess(user);
    } else {
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<User | null> => {
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error: any) {
    console.error("Error al iniciar sesión con Google:", error);
    throw error;
  }
};

export const logout = async () => {
  await signOut(auth);
};

export const emailSignIn = async (email: string, password: string): Promise<User | null> => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  } catch (error: any) {
    console.error("Error al iniciar sesión con email:", error);
    throw error;
  }
};
