"use client";

import React, { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../../lib/firebase";

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
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-zinc-100 text-zinc-800";
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen p-8 bg-zinc-50">
        <h1 className="text-3xl font-semibold mb-6 text-zinc-900">Products</h1>
        <p className="text-zinc-700">Loading products…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen p-8 bg-zinc-50">
        <h1 className="text-3xl font-semibold mb-6 text-zinc-900">Products</h1>
        <p className="text-red-600">{error}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8 bg-zinc-50">
      <h1 className="text-3xl font-semibold mb-6 text-zinc-900">Products</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {products.map((p) => (
          <article key={p.id} className="flex flex-col bg-white rounded-lg shadow p-4 hover:shadow-md">
            <div className="h-40 w-full mb-4 rounded overflow-hidden bg-zinc-100 flex items-center justify-center">
              {p.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
              ) : (
                <div className="text-zinc-400">No image</div>
              )}
            </div>

            <div className="mb-2">
              <h2 className="text-lg font-medium text-zinc-900">{p.name}</h2>
              {p.brand && <p className="text-sm text-zinc-600">{p.brand}</p>}
              <p className="text-sm text-zinc-600">R{p.price.toFixed(2)}</p>
            </div>

            <div className="flex gap-2 mb-3">
              {p.certifications?.map((c) => (
                <span
                  key={c}
                  className="inline-flex items-center gap-2 text-xs rounded-full bg-zinc-900 text-white px-2 py-1 shadow-sm"
                >
                  {c}
                </span>
              ))}
            </div>

            <div className="flex items-center justify-between mt-auto">
              <div className={`rounded-full px-2 py-1 text-xs ${riskClass(p.risk_level)}`}>{p.risk_level || "Unknown"}</div>
              <button
                onClick={() => alert(`${p.name} added (placeholder)`)}
                className="ml-3 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                aria-label={`Quick add ${p.name}`}
              >
                Quick Add
              </button>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
