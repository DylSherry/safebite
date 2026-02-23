import { db, auth } from "./firebase";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { UserProfile, PermissionSet, UserRole } from "./types";

export async function createUserProfile(
  uid: string,
  email: string,
  displayName?: string
): Promise<UserProfile> {
  const now = new Date();
  const profile: UserProfile = {
    uid,
    email,
    displayName: displayName || email.split("@")[0],
    role: "user",
    preferences: {
      emailNotifications: true,
      marketingEmails: false,
      theme: "light",
    },
    allergies: [],
    dietary: {
      allergies: [],
      restrictions: [],
      cuisinePreferences: [],
    },
    createdAt: now,
    updatedAt: now,
    isActive: true,
  };

  await setDoc(doc(db, "users", uid), {
    ...profile,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return profile;
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const docSnap = await getDoc(doc(db, "users", uid));
  if (!docSnap.exists()) {
    return null;
  }

  const data = docSnap.data();
  return {
    uid, // Explicitly include uid from parameter
    ...data,
    createdAt: data.createdAt?.toDate?.() || new Date(),
    updatedAt: data.updatedAt?.toDate?.() || new Date(),
    lastLoginAt: data.lastLoginAt?.toDate?.() || undefined,
  } as UserProfile;
}

export async function updateUserProfile(
  uid: string,
  updates: Partial<Omit<UserProfile, "uid" | "createdAt">>
): Promise<void> {
  await updateDoc(doc(db, "users", uid), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export function getPermissions(role: UserRole): PermissionSet {
  const basePermissions: PermissionSet = {
    canEdit: true,
    canDelete: false,
    canViewAnalytics: false,
    canManageUsers: false,
    canModerateContent: false,
    canManageProducts: false,
  };

  const rolePermissions: Record<UserRole, PermissionSet> = {
    user: basePermissions,
    moderator: {
      ...basePermissions,
      canDelete: true,
      canModerateContent: true,
    },
    admin: {
      ...basePermissions,
      canDelete: true,
      canViewAnalytics: true,
      canManageUsers: true,
      canModerateContent: true,
      canManageProducts: true,
    },
  };

  return rolePermissions[role];
}

export async function updateUserRole(
  uid: string,
  newRole: UserRole
): Promise<void> {
  await updateDoc(doc(db, "users", uid), {
    role: newRole,
    updatedAt: serverTimestamp(),
  });
}

export async function updateLastLogin(uid: string): Promise<void> {
  await updateDoc(doc(db, "users", uid), {
    lastLoginAt: serverTimestamp(),
  });
}
