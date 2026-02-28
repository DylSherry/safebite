"use client";

import React, { useState, useEffect } from "react";
import { useUserProfile } from "@/app/hooks/useUserProfile";
import { useAuthRequired } from "@/app/hooks/useAuthRequired";
import { signOut } from "firebase/auth";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase";

export default function ProfileManager() {
  const { user, loading: authLoading } = useAuthRequired();
  const { profile, loading, error, updateProfile } = useUserProfile();
  const [isEditing, setIsEditing] = useState(false);

  // allergies managed as array of strings
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);
  const [availableAllergies, setAvailableAllergies] = useState<string[]>([]);

  React.useEffect(() => {
    if (profile) {

      setSelectedAllergies(profile.allergies || profile.dietary?.allergies || []);
    }
  }, [profile]);

  // fetch unique allergens from products for selection options
  useEffect(() => {
    const loadAllergens = async () => {
      try {
        const snap = await getDocs(collection(db, "products"));
        const list: string[] = [];
        snap.docs.forEach((doc) => {
          const data: any = doc.data();
          if (Array.isArray(data.allergens)) {
            data.allergens.forEach((a: string) => {
              const low = a.toLowerCase().trim();
              if (low && low !== "none" && !list.includes(low)) list.push(low);
            });
          }
        });
        setAvailableAllergies(list.sort());
      } catch (err) {
        console.error("Failed to load allergens:", err);
      }
    };

    loadAllergens();
  }, []);

  const handleSignOut = async () => {
    try {
      const { auth } = await import("../../lib/firebase");
      await signOut(auth);
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  const handleSave = async () => {
    try {
      await updateProfile({
        allergies: selectedAllergies,
        dietary: {
          ...profile?.dietary,
          allergies: selectedAllergies,
        },
        lastLoginAt: new Date(),
      });
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to update profile:", err);
    }
  };

  if (authLoading || loading) return <div className="p-4 text-emerald-200">Loading profile...</div>;
  if (!user) return <div className="p-4 text-red-400">You must be signed in to view your profile</div>;
  if (error) return <div className="p-4 text-red-400">Error: {error}</div>;
  if (!profile) return <div className="p-4 text-emerald-200">No profile found</div>;

  return (
    <main className="flex-1 overflow-y-auto bg-emerald-950 p-6">
      <div className="max-w-2xl mx-auto rounded-lg bg-emerald-900 p-6 shadow border border-emerald-800">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Your Profile</h2>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 transition-colors"
          >
            {isEditing ? "Cancel" : "Edit"}
          </button>
        </div>

        {/* Basic Info */}
        <div className="mb-6">
          <h3 className="mb-4 font-semibold text-white text-lg">Basic Information</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-emerald-100">Email</label>
              <p className="mt-1 rounded bg-emerald-800 px-3 py-2 text-emerald-100">{profile.email}</p>
            </div>


          </div>
        </div>

        {/* Allergies */}
        <div className="mb-6">
          <h3 className="mb-1 font-semibold text-white text-lg">Allergies</h3>
          <div>
            {isEditing ? (
              <div>
                <p className="text-xs text-emerald-400 mb-3">Tap an allergen to select or deselect it.</p>
                {/* Pill chip selector */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {availableAllergies.map((a) => {
                    const active = selectedAllergies.includes(a);
                    return (
                      <button
                        key={a}
                        type="button"
                        onClick={() =>
                          setSelectedAllergies((prev) =>
                            active ? prev.filter((x) => x !== a) : [...prev, a]
                          )
                        }
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium border transition-colors ${
                          active
                            ? "bg-amber-900/70 border-amber-600 text-amber-100"
                            : "bg-emerald-800 border-emerald-700 text-emerald-300 hover:border-emerald-500 hover:text-white"
                        }`}
                      >
                        {active && (
                          <svg className="h-3 w-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                        {a}
                      </button>
                    );
                  })}
                </div>

                {selectedAllergies.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedAllergies([])}
                    className="mt-2 text-xs text-emerald-500 hover:text-red-400 transition-colors"
                  >
                    Clear all
                  </button>
                )}
              </div>
            ) : (
              <div className="mt-1 rounded-lg bg-emerald-800 px-3 py-2">
                {selectedAllergies.length ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedAllergies.map((allergy, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 rounded-full bg-amber-900/40 text-amber-200 px-3 py-1 text-sm border border-amber-700"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 inline-block" />
                        {allergy}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-emerald-400">No allergies listed</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Metadata */}
        <div className="mb-6 text-sm text-emerald-400 border-t border-emerald-800 pt-4">
          <p>Created: {profile.createdAt?.toLocaleDateString()}</p>
          <p>Last Updated: {profile.updatedAt?.toLocaleDateString()}</p>
        </div>

        <div className="flex justify-between gap-4">
          {isEditing && (
            <button
              onClick={handleSave}
              className="flex-1 rounded-lg bg-green-600 px-4 py-3 text-white font-medium hover:bg-green-700 transition-colors"
            >
              Save Changes
            </button>
          )}
          <button
            onClick={handleSignOut}
            className="flex-1 rounded-lg bg-red-600 px-4 py-3 text-white font-medium hover:bg-red-700 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </main>
  );
}
