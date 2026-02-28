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

      {/* Right Sidebar for cart safety monitor */}
      <aside className="w-72 shrink-0 border-l border-emerald-800 bg-emerald-900 p-6 overflow-y-auto hidden lg:block">
        <h2 className="text-lg font-semibold mb-4 text-white">Cart Safety Monitor</h2>
        {cart.length === 0 ? (
          <div className="rounded-lg bg-emerald-800 p-4">
            <h3 className="font-semibold text-white">Cart empty</h3>
            <p className="text-sm text-emerald-200">Add items to see safety information.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg bg-emerald-800 p-4 text-center">
              <h3 className="font-semibold text-white">Average Safety</h3>
              <p className="text-2xl font-bold text-green-300">{cartSafetyScore.toFixed(0)}</p>
              <p className="text-xs text-emerald-200">out of 100</p>
            </div>
            <div className="rounded-lg bg-emerald-800 p-4">
              <h3 className="font-semibold text-white">Active Allergens</h3>
              {activeCartAllergens.length > 0 ? (
                <ul className="list-disc list-inside text-sm text-amber-200">
                  {activeCartAllergens.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-emerald-200">None detected</p>
              )}
            </div>

            {/* Cart total + checkout */}
            <div className="rounded-lg bg-emerald-800 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-emerald-300">Cart total</span>
                <span className="text-lg font-bold text-white">R{total.toFixed(2)}</span>
              </div>
              <Link
                href="/checkout"
                className="block w-full rounded-lg bg-emerald-600 px-4 py-2 text-center text-white font-semibold hover:bg-emerald-500 transition-colors"
              >
                Proceed to Checkout
              </Link>
              <Link
                href="/cart"
                className="block w-full mt-2 rounded-lg border border-emerald-700 px-4 py-2 text-center text-emerald-300 text-sm hover:bg-emerald-800 transition-colors"
              >
                View Cart
              </Link>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
