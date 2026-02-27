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
  });



  return (
    <>


      {/* Left Sidebar with Safe for me toggle */}
      <aside className="w-64 shrink-0 border-r border-emerald-800 bg-emerald-900 p-6 overflow-y-auto hidden md:block">
        <h2 className="text-lg font-semibold mb-4 text-white">Options</h2>
        <div className="space-y-6">
          <div>
            <label className="flex items-center justify-between cursor-pointer select-none group">
              <span className="text-sm font-medium text-emerald-200 group-hover:text-white transition-colors">
                Safe for me
              </span>
              <span className="relative ml-3 flex-shrink-0">
                <input
                  type="checkbox"
                  checked={safeForMe}
                  onChange={() => setSafeForMe((v) => !v)}
                  className="sr-only peer"
                />
                {/* track */}
                <span className="block w-10 h-6 rounded-full bg-emerald-800 border border-emerald-700 peer-checked:bg-emerald-500 peer-checked:border-emerald-400 transition-colors duration-200" />
                {/* thumb */}
                <span className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-200 peer-checked:translate-x-4" />
              </span>
            </label>
            {safeForMe && (
              <div className="mt-4 text-sm text-emerald-200">
                <p>Your allergies:</p>
                {profile && (profile.allergies || profile.dietary?.allergies || []).length ? (
                  <ul className="list-disc list-inside">
                    {(profile.allergies || profile.dietary?.allergies || []).map((a) => (
                      <li key={a}>{a}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1">None listed</p>
                )}
                <Link href="/profile" className="mt-2 inline-block text-xs text-emerald-400 hover:text-emerald-200">
                  Edit allergies
                </Link>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main middle section with all products */}
      <main className="flex-1 p-6 overflow-y-auto bg-emerald-950">
        <h1 className="text-3xl font-bold mb-6 text-white">All Products</h1>

        {loading ? (
          <p className="text-emerald-200">Loading products…</p>
        ) : filteredProducts.length === 0 ? (
          <p className="text-emerald-200">No products match your filters.</p>
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

                <div className="flex gap-2 mb-3">
                  {/* show allergens unless the only value is "none" or the list is empty */}
                  {p.allergens && p.allergens.some((a) => a.toLowerCase() !== "none") ? (
                    p.allergens
                      .filter((a) => a.toLowerCase() !== "none")
                      .map((a) => (
                        <span
                          key={a}
                          className="inline-flex items-center gap-2 text-xs rounded-full bg-red-900 text-red-100 px-2 py-1 shadow-sm"
                        >
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
