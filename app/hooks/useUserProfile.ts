"use client";

import { useEffect, useState, useCallback } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getUserProfile, updateUserProfile, updateLastLogin } from "@/lib/userProfiles";
import { UserProfile, PermissionSet } from "@/lib/types";
import { getPermissions } from "@/lib/userProfiles";

export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [permissions, setPermissions] = useState<PermissionSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setProfile(null);
        setPermissions(null);
        setLoading(false);
        return;
      }

      try {
        const userProfile = await getUserProfile(user.uid);
        if (userProfile) {
          setProfile(userProfile);
          setPermissions(getPermissions(userProfile.role));
          await updateLastLogin(user.uid);
        } else {
          setError("Profile not found");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load profile");
        console.error("Error loading profile:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const updateProfile = useCallback(
    async (updates: Partial<Omit<UserProfile, "uid" | "createdAt">>) => {
      if (!profile) return;
      try {
        await updateUserProfile(profile.uid, updates);
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                ...updates,
                updatedAt: new Date(),
              }
            : null
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update profile");
        throw err;
      }
    },
    [profile]
  );

  return {
    profile,
    permissions,
    loading,
    error,
    updateProfile,
  };
}
