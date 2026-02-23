"use client";

import React, { useState } from "react";
import { useUserProfile } from "@/app/hooks/useUserProfile";
import { useAuthRequired } from "@/app/hooks/useAuthRequired";

export default function ProfileManager() {
  const { user, loading: authLoading } = useAuthRequired();
  const { profile, loading, error, updateProfile } = useUserProfile();
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [allergies, setAllergies] = useState<string>("");
  const [restrictions, setRestrictions] = useState<string>("");

  React.useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || "");
      setTheme(profile.preferences?.theme || "light");
      setAllergies(profile.allergies?.join(", ") || profile.dietary?.allergies?.join(", ") || "");
      setRestrictions(profile.dietary?.restrictions?.join(", ") || "");
    }
  }, [profile]);

  const handleSave = async () => {
    try {
      await updateProfile({
        displayName,
        preferences: {
          ...profile?.preferences,
          theme,
        },
        allergies: allergies
          .split(",")
          .map((a) => a.trim())
          .filter((a) => a),
        dietary: {
          ...profile?.dietary,
          allergies: allergies
            .split(",")
            .map((a) => a.trim())
            .filter((a) => a),
          restrictions: restrictions
            .split(",")
            .map((r) => r.trim())
            .filter((r) => r),
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

            <div>
              <label className="block text-sm font-medium text-emerald-100">Display Name</label>
              {isEditing ? (
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-emerald-700 bg-emerald-800 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                />
              ) : (
                <p className="mt-1 rounded bg-emerald-800 px-3 py-2 text-emerald-100">{displayName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-emerald-100">Role</label>
              <p className="mt-1 inline-block rounded-lg bg-emerald-700 px-3 py-1 text-sm font-medium text-white capitalize">
                {profile.role}
              </p>
            </div>
          </div>
        </div>

        {/* Allergies */}
        <div className="mb-6">
          <h3 className="mb-4 font-semibold text-white text-lg">Allergies</h3>
          <div>
            <label className="block text-sm font-medium text-emerald-100 mb-2">
              Your Allergies (comma-separated)
            </label>
            {isEditing ? (
              <textarea
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
                placeholder="e.g. peanuts, tree nuts, milk"
                className="w-full rounded-lg border border-emerald-700 bg-emerald-800 px-3 py-2 text-white placeholder-emerald-500 focus:border-emerald-500 focus:outline-none rows-3"
                rows={3}
              />
            ) : (
              <div className="mt-1 rounded-lg bg-emerald-800 px-3 py-2">
                {allergies ? (
                  <div className="flex flex-wrap gap-2">
                    {allergies.split(",").map((allergy, idx) => (
                      <span
                        key={idx}
                        className="inline-block rounded-full bg-red-900/30 text-red-200 px-3 py-1 text-sm border border-red-800"
                      >
                        {allergy.trim()}
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

        {/* Dietary Restrictions */}
        <div className="mb-6">
          <h3 className="mb-4 font-semibold text-white text-lg">Dietary Restrictions</h3>
          <div>
            <label className="block text-sm font-medium text-emerald-100 mb-2">
              Restrictions (comma-separated)
            </label>
            {isEditing ? (
              <textarea
                value={restrictions}
                onChange={(e) => setRestrictions(e.target.value)}
                placeholder="e.g. vegetarian, vegan, gluten-free"
                className="w-full rounded-lg border border-emerald-700 bg-emerald-800 px-3 py-2 text-white placeholder-emerald-500 focus:border-emerald-500 focus:outline-none"
                rows={3}
              />
            ) : (
              <div className="mt-1 rounded-lg bg-emerald-800 px-3 py-2">
                {restrictions ? (
                  <div className="flex flex-wrap gap-2">
                    {restrictions.split(",").map((restriction, idx) => (
                      <span
                        key={idx}
                        className="inline-block rounded-full bg-yellow-900/30 text-yellow-200 px-3 py-1 text-sm border border-yellow-800"
                      >
                        {restriction.trim()}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-emerald-400">No restrictions listed</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Preferences */}
        <div className="mb-6">
          <h3 className="mb-4 font-semibold text-white text-lg">Preferences</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-emerald-100 mb-2">Theme</label>
              {isEditing ? (
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as "light" | "dark")}
                  className="w-full rounded-lg border border-emerald-700 bg-emerald-800 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              ) : (
                <p className="mt-1 rounded-lg bg-emerald-800 px-3 py-2 text-emerald-100 capitalize">{theme}</p>
              )}
            </div>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={profile.preferences?.emailNotifications || false}
                disabled={true}
                className="rounded"
              />
              <span className="text-sm text-emerald-100">Email Notifications</span>
            </label>
          </div>
        </div>

        {/* Metadata */}
        <div className="mb-6 text-sm text-emerald-400 border-t border-emerald-800 pt-4">
          <p>Created: {profile.createdAt?.toLocaleDateString()}</p>
          <p>Last Updated: {profile.updatedAt?.toLocaleDateString()}</p>
        </div>

        {isEditing && (
          <button
            onClick={handleSave}
            className="w-full rounded-lg bg-green-600 px-4 py-3 text-white font-medium hover:bg-green-700 transition-colors"
          >
            Save Changes
          </button>
        )}
      </div>
    </main>
  );
}
