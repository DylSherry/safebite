"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useUserProfile } from "@/app/hooks/useUserProfile";
import { useAuthRequired } from "@/app/hooks/useAuthRequired";
import { signOut } from "firebase/auth";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase";

type WishlistProduct = {
  id: string;
  name: string;
  brand?: string;
  price: number;
  image_url?: string;
  isOnPromotion?: boolean;
  promotionPrice?: number;
  category?: string;
};

export default function ProfileManager() {
  const { user, loading: authLoading } = useAuthRequired();
  const { profile, loading, error, updateProfile } = useUserProfile();
  const [activeTab, setActiveTab] = useState<"profile" | "wishlist">("profile");
  const [isEditing, setIsEditing] = useState(false);
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);
  const [availableAllergies, setAvailableAllergies] = useState<string[]>([]);
  const [allProducts, setAllProducts] = useState<WishlistProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);

  React.useEffect(() => {
    if (profile) {
      setSelectedAllergies(profile.allergies || profile.dietary?.allergies || []);
    }
  }, [profile]);

  // Fetch all products once — used for allergen list and wishlist display
  useEffect(() => {
    const load = async () => {
      setProductsLoading(true);
      try {
        const snap = await getDocs(collection(db, "products"));
        const items: WishlistProduct[] = [];
        const allergenList: string[] = [];
        snap.docs.forEach((doc) => {
          const data: any = doc.data();
          items.push({ id: doc.id, name: data.name, brand: data.brand, price: data.price, image_url: data.image_url, isOnPromotion: data.isOnPromotion, promotionPrice: data.promotionPrice, category: data.category });
          if (Array.isArray(data.allergens)) {
            data.allergens.forEach((a: string) => {
              const low = a.toLowerCase().trim();
              if (low && low !== "none" && !allergenList.includes(low)) allergenList.push(low);
            });
          }
        });
        setAllProducts(items);
        setAvailableAllergies(allergenList.sort());
      } catch (err) {
        console.error("Failed to load products:", err);
      } finally {
        setProductsLoading(false);
      }
    };
    load();
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
        dietary: { ...profile?.dietary, allergies: selectedAllergies },
        lastLoginAt: new Date(),
      });
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to update profile:", err);
    }
  };

  const handleRemoveWishlist = async (productId: string) => {
    const current = profile?.wishlist ?? [];
    await updateProfile({ wishlist: current.filter((id) => id !== productId) });
  };

  if (authLoading || loading) return <div className="p-4 text-emerald-200">Loading profile...</div>;
  if (!user) return <div className="p-4 text-red-400">You must be signed in to view your profile</div>;
  if (error) return <div className="p-4 text-red-400">Error: {error}</div>;
  if (!profile) return <div className="p-4 text-emerald-200">No profile found</div>;

  const wishlistIds = profile.wishlist ?? [];
  const wishlistProducts = allProducts.filter((p) => wishlistIds.includes(p.id));

  return (
    <main className="flex-1 overflow-y-auto bg-emerald-950 p-6">
      <div className="max-w-2xl mx-auto">

        {/* Tab switcher */}
        <div className="flex gap-1 mb-6 rounded-xl bg-emerald-900 border border-emerald-800 p-1">
          {(["profile", "wishlist"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-colors ${
                activeTab === tab ? "bg-emerald-700 text-white shadow" : "text-emerald-400 hover:text-white"
              }`}
            >
              {tab === "wishlist" ? (
                <>
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill={activeTab === "wishlist" ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
                  </svg>
                  Wishlist
                  {wishlistIds.length > 0 && (
                    <span className="rounded-full bg-rose-600 text-white text-xs px-1.5 py-0.5 leading-none">{wishlistIds.length}</span>
                  )}
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                  </svg>
                  Profile
                </>
              )}
            </button>
          ))}
        </div>

        {/* ── Profile Tab ── */}
        {activeTab === "profile" && (
          <div className="rounded-xl bg-emerald-900 border border-emerald-800 p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Your Profile</h2>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="rounded-lg bg-emerald-700 px-4 py-2 text-sm text-white hover:bg-emerald-600 transition-colors"
              >
                {isEditing ? "Cancel" : "Edit"}
              </button>
            </div>

            {/* Basic Info */}
            <div className="mb-6">
              <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wide mb-3">Basic Information</p>
              <label className="block text-xs font-medium text-emerald-400 mb-1">Email</label>
              <p className="rounded-lg bg-emerald-800 px-3 py-2.5 text-emerald-100 text-sm">{profile.email}</p>
            </div>

            {/* Allergies */}
            <div className="mb-6">
              <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wide mb-3">Allergen Restrictions</p>
              {isEditing ? (
                <div>
                  <p className="text-xs text-emerald-400 mb-3">Tap an allergen to select or deselect. Products containing selected allergens will be flagged.</p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {availableAllergies.map((a) => {
                      const active = selectedAllergies.includes(a);
                      return (
                        <button
                          key={a}
                          type="button"
                          onClick={() => setSelectedAllergies((prev) => active ? prev.filter((x) => x !== a) : [...prev, a])}
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium border transition-colors ${
                            active ? "bg-amber-900/70 border-amber-600 text-amber-100" : "bg-emerald-800 border-emerald-700 text-emerald-300 hover:border-emerald-500 hover:text-white"
                          }`}
                        >
                          {active && (
                            <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                          {a}
                        </button>
                      );
                    })}
                  </div>
                  {selectedAllergies.length > 0 && (
                    <button type="button" onClick={() => setSelectedAllergies([])} className="text-xs text-emerald-500 hover:text-red-400 transition-colors">
                      Clear all
                    </button>
                  )}
                </div>
              ) : (
                <div className="rounded-lg bg-emerald-800 px-3 py-2.5">
                  {selectedAllergies.length ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedAllergies.map((allergy) => (
                        <span key={allergy} className="inline-flex items-center gap-1.5 rounded-full bg-amber-900/40 text-amber-200 px-3 py-1 text-sm border border-amber-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 inline-block" />
                          {allergy}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-emerald-400 text-sm">No allergen restrictions set</p>
                  )}
                </div>
              )}
            </div>

            {/* Metadata */}
            <div className="mb-6 text-xs text-emerald-500 border-t border-emerald-800 pt-4 space-y-1">
              <p>Member since: {profile.createdAt?.toLocaleDateString()}</p>
              <p>Last updated: {profile.updatedAt?.toLocaleDateString()}</p>
            </div>

            <div className="flex gap-3">
              {isEditing && (
                <button onClick={handleSave} className="flex-1 rounded-lg bg-green-600 px-4 py-3 text-white font-medium hover:bg-green-700 transition-colors text-sm">
                  Save Changes
                </button>
              )}
              <button onClick={handleSignOut} className="flex-1 rounded-lg bg-red-700 px-4 py-3 text-white font-medium hover:bg-red-600 transition-colors text-sm">
                Sign out
              </button>
            </div>
          </div>
        )}

        {/* ── Wishlist Tab ── */}
        {activeTab === "wishlist" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">
                Wishlist
                <span className="ml-2 text-sm font-normal text-emerald-400">
                  ({wishlistIds.length} item{wishlistIds.length !== 1 ? "s" : ""})
                </span>
              </h2>
              <Link href="/browse" className="text-xs text-emerald-400 hover:text-emerald-200 transition-colors">
                Browse products →
              </Link>
            </div>

            {productsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-3 rounded-xl bg-emerald-900 border border-emerald-800 p-3 animate-pulse">
                    <div className="h-16 w-16 rounded-lg bg-emerald-800 shrink-0" />
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-3 w-3/4 rounded bg-emerald-800" />
                      <div className="h-3 w-1/2 rounded bg-emerald-800" />
                    </div>
                  </div>
                ))}
              </div>
            ) : wishlistProducts.length === 0 ? (
              <div className="rounded-xl bg-emerald-900 border border-emerald-800 p-10 text-center">
                <svg className="h-10 w-10 text-emerald-700 mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
                </svg>
                <p className="text-emerald-200 font-medium mb-1">No saved items yet</p>
                <p className="text-emerald-500 text-sm mb-5">Tap the ♥ on any product to save it here.</p>
                <Link href="/browse" className="inline-flex items-center gap-2 rounded-full bg-emerald-700 hover:bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors">
                  Browse Products
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {wishlistProducts.map((p) => {
                  const ep = p.isOnPromotion && p.promotionPrice != null ? p.promotionPrice : p.price;
                  return (
                    <div key={p.id} className="flex gap-3 rounded-xl bg-emerald-900 border border-emerald-800 p-3">
                      <div className="h-16 w-16 rounded-lg bg-emerald-800 overflow-hidden shrink-0">
                        {p.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full flex items-center justify-center text-emerald-600 text-xs">No img</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{p.name}</p>
                        {p.brand && <p className="text-emerald-400 text-xs truncate">{p.brand}</p>}
                        <div className="flex items-baseline gap-1.5 mt-0.5">
                          {p.isOnPromotion && p.promotionPrice != null ? (
                            <>
                              <span className="text-amber-300 font-bold text-sm">R{p.promotionPrice.toFixed(2)}</span>
                              <span className="text-emerald-600 text-xs line-through">R{p.price.toFixed(2)}</span>
                            </>
                          ) : (
                            <span className="text-emerald-200 font-semibold text-sm">R{ep.toFixed(2)}</span>
                          )}
                        </div>
                        {p.category && <p className="text-xs text-emerald-500 mt-0.5">{p.category}</p>}
                      </div>
                      <button
                        onClick={() => handleRemoveWishlist(p.id)}
                        title="Remove from wishlist"
                        className="rounded-lg p-1.5 text-emerald-600 hover:text-rose-400 hover:bg-rose-900/30 transition-colors self-start shrink-0"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                          <path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 0 1 3.878.512.75.75 0 1 1-.256 1.478l-.209-.035-1.005 13.07a3 3 0 0 1-2.991 2.77H8.084a3 3 0 0 1-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 0 1-.256-1.478A48.567 48.567 0 0 1 7.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 0 1 3.369 0c1.603.051 2.815 1.387 2.815 2.951Zm-6.136-1.452a51.196 51.196 0 0 1 3.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 0 0-6 0v-.113c0-.794.609-1.428 1.364-1.452Zm-.355 5.945a.75.75 0 1 0-1.5.058l.347 9a.75.75 0 1 0 1.499-.058l-.346-9Zm5.48.058a.75.75 0 1 0-1.498-.058l-.347 9a.75.75 0 0 0 1.5.058l.345-9Z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </main>
  );
}
