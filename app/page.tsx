"use client";


import React, { useState, useEffect } from "react";
import Link from "next/link";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useCart } from "./context/CartContext";
import { useUserProfile } from "./hooks/useUserProfile";
import dynamic from "next/dynamic";
const ScanAllergens = dynamic(() => import("./components/ScanAllergens"), { ssr: false });

type Product = {
  id: string;
  name: string;
  brand?: string;
  price: number;
  stock?: number;
  image_url?: string;
  allergens?: string[];
  certifications?: string[];
  ingredients?: string;
  safety_score?: number;
};

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    nutFree: false,
    dairyFree: false,
    glutenFree: false,
  });
  const [safeForMe, setSafeForMe] = useState(false);
  const [search, setSearch] = useState("");
  const { profile } = useUserProfile();
  const { addToCart, cart, total } = useCart();
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, "products"), orderBy("name"));
        const snap = await getDocs(q);
        const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Product[];
        setProducts(items);
      } catch (err) {
        console.error("Error fetching products:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const computeScore = (allergens?: string[]) => {
    if (!allergens) return 100;
    const count = allergens.filter((a) => a.toLowerCase() !== "none").length;
    return Math.max(0, 100 - count * 10);
  };

  const handleQuickAdd = (product: Product) => {
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      image_url: product.image_url,
      brand: product.brand,
      allergens: product.allergens,
      safety_score: product.safety_score ?? computeScore(product.allergens),
    });

    setAddedItems((prev) => new Set(prev).add(product.id));
    setTimeout(() => {
      setAddedItems((prev) => {
        const next = new Set(prev);
        next.delete(product.id);
        return next;
      });
    }, 2000);
  };

  // calculate cart safety metrics
  const cartSafetyScore = (() => {
    // average safety score across distinct products (ignore quantity)
    if (cart.length === 0) return 0;
    const sum = cart.reduce((acc, i) => acc + (i.safety_score || 0), 0);
    return sum / cart.length;
  })();

  const activeCartAllergens = Array.from(
    new Set(
      cart
        .flatMap((i) => i.allergens || [])
        .map((a) => a.toLowerCase())
        .filter((a) => a && a !== "none")
    )
  );

  const filteredProducts = products.filter((product) => {
    // normalize allergens: lowercase and drop 'none' entries from database
    const allergens = (product.allergens || [])
      .map((a) => a.toLowerCase())
      .filter((a) => a !== "none");

    // filter by safety toggle
    if (safeForMe && profile) {
      const userAllergies = (profile.allergies || profile.dietary?.allergies || []).map((a) => a.toLowerCase());
      if (userAllergies.some((ua) => allergens.includes(ua))) {
        return false;
      }
    }

    if (filters.nutFree) {
      if (
        allergens.some(
          (a) =>
            a.includes("nut") ||
            a.includes("peanut") ||
            a.includes("almond") ||
            a.includes("cashew") ||
            a.includes("pecan") ||
            a.includes("walnut")
        )
      )
        return false;
    }

    if (filters.dairyFree) {
      if (
        allergens.some(
          (a) =>
            a.includes("milk") ||
            a.includes("dairy") ||
            a.includes("cheese") ||
            a.includes("cream") ||
            a.includes("yogurt") ||
            a.includes("whey") ||
            a.includes("casein")
        )
      )
        return false;
    }

    if (filters.glutenFree) {
      if (allergens.some((a) => a.includes("wheat") || a.includes("gluten") || a.includes("barley") || a.includes("rye")))
        return false;
    }

    return true;
  }).filter((product) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      product.name.toLowerCase().includes(q) ||
      (product.brand ?? "").toLowerCase().includes(q)
    );
  });



  return (
    <>


      {/* Left Sidebar – filters */}
      <aside className="w-64 shrink-0 border-r border-emerald-800 bg-emerald-900 p-5 overflow-y-auto hidden md:flex md:flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-500 px-1">Filters</p>

        {/* Safe-for-me card */}
        <div className={`rounded-2xl border p-4 transition-colors ${safeForMe ? "bg-emerald-800/60 border-emerald-600" : "bg-emerald-950/40 border-emerald-800"}`}>
          <label className="flex items-center justify-between cursor-pointer select-none group">
            <div>
              <p className="text-sm font-semibold text-white group-hover:text-emerald-100 transition-colors">
                Safe for me
              </p>
              <p className="text-xs text-emerald-400 mt-0.5">Hide products with your allergens</p>
            </div>
            <span className="relative ml-3 flex-shrink-0">
              <input
                type="checkbox"
                checked={safeForMe}
                onChange={() => setSafeForMe((v) => !v)}
                className="sr-only peer"
              />
              <span className="block w-10 h-6 rounded-full bg-emerald-800 border border-emerald-700 peer-checked:bg-emerald-500 peer-checked:border-emerald-400 transition-colors duration-200" />
              <span className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-200 peer-checked:translate-x-4" />
            </span>
          </label>

          {safeForMe && (
            <div className="mt-4 pt-4 border-t border-emerald-700/60">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-2">Your allergens</p>
              {(profile?.allergies || profile?.dietary?.allergies || []).length ? (
                <div className="flex flex-wrap gap-1.5">
                  {(profile?.allergies || profile?.dietary?.allergies || []).map((a) => (
                    <span
                      key={a}
                      className="inline-flex items-center gap-1 rounded-full bg-amber-900/50 border border-amber-700 text-amber-200 text-xs px-2.5 py-1 font-medium"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                      {a}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-emerald-400 italic">None listed yet.</p>
              )}
              <Link
                href="/profile"
                className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-emerald-400 hover:text-white transition-colors"
              >
                Edit allergies
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          )}
        </div>
      </aside>

      {/* Main middle section with all products */}
      <main className="flex-1 p-6 overflow-y-auto bg-emerald-950">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h1 className="text-3xl font-bold text-white">All Products</h1>
          <div className="relative w-full sm:w-72">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-400 pointer-events-none"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search products or brands…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-emerald-700 bg-emerald-900 pl-9 pr-4 py-2 text-sm text-white placeholder-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400 hover:text-white"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex flex-col bg-emerald-900 rounded-lg border border-emerald-800 p-4 animate-pulse">
                <div className="h-40 w-full mb-4 rounded bg-emerald-800" />
                <div className="h-4 w-3/4 rounded bg-emerald-800 mb-2" />
                <div className="h-3 w-1/2 rounded bg-emerald-800 mb-2" />
                <div className="h-3 w-1/4 rounded bg-emerald-800 mb-4" />
                <div className="flex gap-2 mb-4">
                  <div className="h-5 w-16 rounded-full bg-emerald-800" />
                  <div className="h-5 w-16 rounded-full bg-emerald-800" />
                </div>
                <div className="mt-auto flex justify-end">
                  <div className="h-9 w-24 rounded bg-emerald-800" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <svg className="h-12 w-12 text-emerald-700 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <p className="text-emerald-200 font-medium mb-1">No products match your filters.</p>
            <p className="text-emerald-500 text-sm mb-4">Try adjusting your search or dietary filters.</p>
            <button
              onClick={() => { setSearch(""); setFilters({ nutFree: false, dairyFree: false, glutenFree: false }); setSafeForMe(false); }}
              className="rounded-lg border border-emerald-600 px-4 py-2 text-sm text-emerald-300 hover:bg-emerald-800 transition-colors"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {filteredProducts.map((p) => (
              <article
                key={p.id}
                className="flex flex-col bg-emerald-900 rounded-lg shadow p-4 hover:shadow-emerald-800/50 hover:shadow-lg border border-emerald-800"
              >
                <div className="h-40 w-full mb-4 rounded overflow-hidden bg-emerald-800 flex items-center justify-center">
                  {p.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="text-emerald-400">No image</div>
                  )}
                </div>

                <div className="mb-2">
                  <h2 className="text-lg font-medium text-white">{p.name}</h2>
                  {p.brand && <p className="text-sm text-emerald-300">{p.brand}</p>}
                  <p className="text-sm text-emerald-300">R{p.price.toFixed(2)}</p>
                </div>

                <div className="flex flex-wrap gap-2 mb-3">
                  {/* show allergens unless the only value is "none" or the list is empty */}
                  {p.allergens && p.allergens.some((a) => a.toLowerCase() !== "none") ? (
                    p.allergens
                      .filter((a) => a.toLowerCase() !== "none")
                      .map((a) => (
                        <span
                          key={a}
                          className="inline-flex items-center gap-2 text-xs rounded-full bg-emerald-800 border border-emerald-600 text-white px-2.5 py-1 font-medium"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                          {a}
                        </span>
                      ))
                  ) : (
                    <span
                      className="inline-flex items-center gap-2 text-xs rounded-full bg-green-900 text-green-100 px-2 py-1 shadow-sm"
                    >
                      No allergens
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-end mt-auto">
                  <button
                    onClick={() => handleQuickAdd(p)}
                    className={`ml-3 rounded px-4 py-2 text-white font-medium transition-colors ${
                      addedItems.has(p.id) ? "bg-green-500 hover:bg-green-600" : "bg-emerald-600 hover:bg-emerald-700"
                    }`}
                    aria-label={`Quick add ${p.name}`}
                  >
                    {addedItems.has(p.id) ? "✓ Added" : "Quick Add"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {/* Right Sidebar – cart safety monitor */}
      <aside className="w-72 shrink-0 border-l border-emerald-800 bg-emerald-900 p-5 overflow-y-auto hidden lg:flex lg:flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-500 px-1">Cart Monitor</p>

        {cart.length === 0 ? (
          <div className="rounded-2xl border border-emerald-800 bg-emerald-950/40 p-5 flex flex-col items-center text-center gap-2">
            <div className="h-10 w-10 rounded-full bg-emerald-800 flex items-center justify-center mb-1">
              <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-white">Your cart is empty</p>
            <p className="text-xs text-emerald-400">Add products to see safety information here.</p>
          </div>
        ) : (
          <>
            {/* Safety score card */}
            {(() => {
              const score = cartSafetyScore;
              const pct = Math.round(score);
              const scoreColor = pct >= 80 ? "text-emerald-300" : pct >= 50 ? "text-amber-300" : "text-red-300";
              const barColor = pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500";
              return (
                <div className="rounded-2xl border border-emerald-800 bg-emerald-950/40 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-500 mb-3">General Safety Score</p>
                  <div className="flex items-end justify-between mb-2">
                    <p className={`text-4xl font-bold leading-none ${scoreColor}`}>{pct}</p>
                    <p className="text-xs text-emerald-500 mb-1">/ 100</p>
                  </div>
                  <div className="h-2 w-full rounded-full bg-emerald-800 overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-emerald-500 mt-2">
                    {pct >= 80 ? "Safe for most dietary needs" : pct >= 50 ? "Contains some allergens" : "High allergen content"}
                  </p>
                </div>
              );
            })()}

            {/* Active allergens card */}
            <div className="rounded-2xl border border-emerald-800 bg-emerald-950/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-500 mb-3">Active Allergens</p>
              {activeCartAllergens.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {activeCartAllergens.map((a) => (
                    <span key={a} className="inline-flex items-center gap-1 rounded-full bg-amber-900/50 border border-amber-700 text-amber-200 text-xs px-2.5 py-1 font-medium">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                      {a}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded-full bg-emerald-700 flex items-center justify-center flex-shrink-0">
                    <svg className="h-3 w-3 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-sm text-emerald-300 font-medium">None detected</p>
                </div>
              )}
            </div>

            {/* Safe for you card */}
            {(() => {
              const userAllergies = (profile?.allergies || profile?.dietary?.allergies || []).map((a) => a.toLowerCase());
              if (!profile) {
                return (
                  <div className="rounded-2xl border border-emerald-800 bg-emerald-950/40 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-emerald-500 mb-3">Safe for You</p>
                    <p className="text-xs text-emerald-400">
                      <Link href="/login" className="text-emerald-300 hover:text-white underline underline-offset-2 transition-colors">Sign in</Link> to see personalised safety.
                    </p>
                  </div>
                );
              }
              if (userAllergies.length === 0) {
                return (
                  <div className="rounded-2xl border border-emerald-800 bg-emerald-950/40 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-emerald-500 mb-3">Safe for You</p>
                    <p className="text-xs text-emerald-400">
                      No allergies on your profile.{" "}
                      <Link href="/profile" className="text-emerald-300 hover:text-white underline underline-offset-2 transition-colors">Add them</Link> for a personalised check.
                    </p>
                  </div>
                );
              }
              const triggered = userAllergies.filter((ua) => activeCartAllergens.includes(ua));
              const safe = triggered.length === 0;
              return (
                <div className={`rounded-2xl border p-4 ${safe ? "border-emerald-700 bg-emerald-800/40" : "border-amber-700/60 bg-amber-900/20"}`}>
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-500 mb-3">Safe for You</p>
                  {safe ? (
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-emerald-700 flex items-center justify-center flex-shrink-0">
                        <svg className="h-4 w-4 text-emerald-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-emerald-200">Looks safe!</p>
                        <p className="text-xs text-emerald-400">No conflicts with your allergens.</p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-2.5 mb-3">
                        <div className="h-8 w-8 rounded-full bg-amber-900/60 border border-amber-700 flex items-center justify-center flex-shrink-0">
                          <svg className="h-4 w-4 text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-amber-200">Allergen conflict</p>
                          <p className="text-xs text-amber-400/80">Your cart contains:</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {triggered.map((a) => (
                          <span key={a} className="inline-flex items-center gap-1 rounded-full bg-amber-900/50 border border-amber-700 text-amber-200 text-xs px-2.5 py-1 font-medium">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                            {a}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Cart total + checkout card */}
            <div className="rounded-2xl border border-emerald-700 bg-emerald-800/50 p-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Cart Total</p>
                <p className="text-2xl font-bold text-white">R{total.toFixed(2)}</p>
              </div>
              <Link
                href="/checkout"
                className="block w-full rounded-xl bg-emerald-500 px-4 py-2.5 text-center text-white font-semibold hover:bg-emerald-400 transition-colors shadow-md shadow-emerald-900/50"
              >
                Proceed to Checkout
              </Link>
              <Link
                href="/cart"
                className="block w-full mt-2 rounded-xl border border-emerald-700 px-4 py-2 text-center text-emerald-300 text-sm font-medium hover:bg-emerald-800 hover:text-white transition-colors"
              >
                View Cart
              </Link>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
