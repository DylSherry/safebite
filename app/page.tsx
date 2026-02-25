"use client";

import React, { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useCart } from "./context/CartContext";

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
};

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    nutFree: false,
    dairyFree: false,
    glutenFree: false,
  });
  const { addToCart } = useCart();
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

  const handleQuickAdd = (product: Product) => {
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      image_url: product.image_url,
      brand: product.brand,
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

  const filteredProducts = products.filter((product) => {
    // normalize allergens: lowercase and drop 'none' entries from database
    const allergens = (product.allergens || [])
      .map((a) => a.toLowerCase())
      .filter((a) => a !== "none");

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

  const toggleFilter = (key: keyof typeof filters) => {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };


  return (
    <>
      {/* Left Sidebar for filters */}
      <aside className="w-64 shrink-0 border-r border-emerald-800 bg-emerald-900 p-6 overflow-y-auto hidden md:block">
        <h2 className="text-lg font-semibold mb-4 text-white">Filters</h2>
        <div className="space-y-6">
          <div>
            <h3 className="font-medium text-sm text-emerald-100 mb-2">Allergens</h3>
            <div className="space-y-2">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.nutFree}
                  onChange={() => toggleFilter("nutFree")}
                  className="h-4 w-4 rounded border-emerald-600 bg-emerald-800 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="ml-2 text-sm text-emerald-200">Nut-free</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.dairyFree}
                  onChange={() => toggleFilter("dairyFree")}
                  className="h-4 w-4 rounded border-emerald-600 bg-emerald-800 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="ml-2 text-sm text-emerald-200">Dairy-free</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.glutenFree}
                  onChange={() => toggleFilter("glutenFree")}
                  className="h-4 w-4 rounded border-emerald-600 bg-emerald-800 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="ml-2 text-sm text-emerald-200">Gluten-free</span>
              </label>
            </div>
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

      {/* Right Sidebar for safety monitor */}
      <aside className="w-72 shrink-0 border-l border-emerald-800 bg-emerald-900 p-6 overflow-y-auto hidden lg:block">
        <h2 className="text-lg font-semibold mb-4 text-white">Safety Monitor</h2>
        <div className="space-y-4">
          <div className="rounded-lg bg-emerald-800 p-4">
            <h3 className="font-semibold text-white">All Good!</h3>
            <p className="text-sm text-emerald-200">Your cart items are safe for your profile.</p>
          </div>
        </div>
      </aside>
    </>
  );
}
