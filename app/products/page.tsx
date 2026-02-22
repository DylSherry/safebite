"use client";

import React, { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useCart } from "../context/CartContext";

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
  risk_level?: string;
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());
  const { addToCart } = useCart();

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, "products"), orderBy("name"));
        const snap = await getDocs(q);
        const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Product[];
        setProducts(items);
      } catch (err: any) {
        setError(err?.message || "Error fetching products");
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  function riskClass(level?: string) {
    switch ((level || "").toLowerCase()) {
      case "high":
        return "bg-red-500/20 text-red-400";
      case "medium":
        return "bg-yellow-500/20 text-yellow-400";
      case "low":
        return "bg-green-500/20 text-green-400";
      default:
        return "bg-zinc-700 text-zinc-300";
    }
  }

  const handleQuickAdd = (product: Product) => {
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      image_url: product.image_url,
      brand: product.brand,
    });
    
    // Show visual feedback
    setAddedItems((prev) => new Set(prev).add(product.id));
    setTimeout(() => {
      setAddedItems((prev) => {
        const next = new Set(prev);
        next.delete(product.id);
        return next;
      });
    }, 2000);
  };

  if (loading) {
    return (
      <main className="p-8">
        <h1 className="text-3xl font-semibold mb-6 text-white">Products</h1>
        <p className="text-emerald-200">Loading products…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="p-8">
        <h1 className="text-3xl font-semibold mb-6 text-white">Products</h1>
        <p className="text-red-600">{error}</p>
      </main>
    );
  }

  return (
    <main className="p-8">
      <h1 className="text-3xl font-semibold mb-6 text-white">Products</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {products.map((p) => (
          <article key={p.id} className="flex flex-col bg-emerald-900 rounded-lg shadow p-4 hover:shadow-emerald-800/50 hover:shadow-lg border border-emerald-800">
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
              {p.certifications?.map((c) => (
                <span
                  key={c}
                  className="inline-flex items-center gap-2 text-xs rounded-full bg-emerald-800 text-emerald-100 px-2 py-1 shadow-sm"
                >
                  {c}
                </span>
              ))}
            </div>

            <div className="flex items-center justify-between mt-auto">
              <div className={`rounded-full px-2 py-1 text-xs ${riskClass(p.risk_level)}`}>{p.risk_level || "Unknown"}</div>
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
    </main>
  );
}
