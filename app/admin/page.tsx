"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthRequired } from "@/app/hooks/useAuthRequired";
import { useUserProfile } from "@/app/hooks/useUserProfile";
import { Product } from "@/lib/types";

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuthRequired();
  const { profile, loading: profileLoading } = useUserProfile();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Partial<Product>>({});
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile?.role !== "admin") {
      return;
    }
    fetchProducts();
  }, [profile]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const token = await user?.getIdToken();
      const res = await fetch("/api/admin/products", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch products");
      const data = await res.json();
      setProducts(data.products || []);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (productId: string) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;

    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete product");
      setProducts(products.filter((p) => p.id !== productId));
      setStatus("Product deleted successfully");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  function computeSafetyScore(allergens: any) {
    if (!allergens || !Array.isArray(allergens)) return 100;
    const count = allergens.filter((a) => typeof a === "string" && a.toLowerCase() !== "none").length;
    return Math.max(0, 100 - count * 10);
  }

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const token = await user?.getIdToken();
      const method = editingId ? "PUT" : "POST";
      const endpoint = editingId ? `/api/admin/products/${editingId}` : "/api/admin/products";

      // compute safety score locally so the UI can show it immediately
      const payload = { ...formData } as any;
      payload.safety_score = computeSafetyScore(payload.allergens);

      const res = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save product");
      const data = await res.json();

      if (editingId) {
        setProducts(products.map((p) => (p.id === editingId ? data.product : p)));
      } else {
        setProducts([...products, data.product]);
      }

      setFormData({});
      setEditingId(null);
      setShowForm(false);
      setStatus(editingId ? "Product updated successfully" : "Product created successfully");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || profileLoading) return <div className="p-4 text-emerald-200">Loading...</div>;
  if (!user) return <div className="p-4 text-red-400">Unauthorized</div>;
  if (profile?.role !== "admin") {
    return (
      <main className="flex-1 overflow-y-auto bg-emerald-950 p-6">
        <div className="rounded-lg bg-emerald-900 border border-emerald-800 p-6">
          <p className="text-red-400">You do not have permission to access this page</p>
          <Link href="/" className="block mt-4 text-emerald-400 hover:text-emerald-300">
            ← Back to Home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto bg-emerald-950 p-6 sm:p-10">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white">Product Management</h1>
          <button
            onClick={() => {
              setShowForm(!showForm);
              setEditingId(null);
              setFormData({});
            }}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors"
          >
            {showForm ? "Cancel" : "+ Add Product"}
          </button>
        </div>

        {status && (
          <div
            className={`mb-6 rounded-xl px-5 py-4 text-sm font-medium border ${
              status.includes("success")
                ? "bg-green-900/30 text-green-200 border-green-700"
                : "bg-red-900/30 text-red-200 border-red-700"
            }`}
          >
            {status}
          </div>
        )}

        {showForm && (
          <div className="mb-8 rounded-2xl bg-emerald-900 border border-emerald-800 p-7">
            <h2 className="text-xl font-bold text-white mb-6">{editingId ? "Edit Product" : "New Product"}</h2>

            {/* ── Core details ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">Product Name</label>
                <input
                  type="text"
                  placeholder="e.g. Almond Milk"
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="rounded-xl border border-emerald-700 bg-emerald-800 px-4 py-2.5 text-white placeholder-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">Brand</label>
                <input
                  type="text"
                  placeholder="e.g. Woolworths"
                  value={formData.brand || ""}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  className="rounded-xl border border-emerald-700 bg-emerald-800 px-4 py-2.5 text-white placeholder-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">Price (R)</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={formData.price || ""}
                  min={0}
                  step={0.01}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                  className="rounded-xl border border-emerald-700 bg-emerald-800 px-4 py-2.5 text-white placeholder-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">Stock</label>
                <input
                  type="number"
                  placeholder="0"
                  value={formData.stock || ""}
                  min={0}
                  step={1}
                  onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) })}
                  className="rounded-xl border border-emerald-700 bg-emerald-800 px-4 py-2.5 text-white placeholder-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">Image URL</label>
                <input
                  type="url"
                  placeholder="https://…"
                  value={formData.image_url || ""}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  className="rounded-xl border border-emerald-700 bg-emerald-800 px-4 py-2.5 text-white placeholder-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">Allergens <span className="normal-case font-normal text-emerald-500">(comma-separated)</span></label>
                <textarea
                  placeholder="e.g. Milk, Soy, Gluten"
                  value={(formData.allergens || []).join(", ")}
                  onChange={(e) => {
                    const arr = e.target.value.split(",").map((a) => a.trim());
                    setFormData({ ...formData, allergens: arr });
                  }}
                  className="rounded-xl border border-emerald-700 bg-emerald-800 px-4 py-2.5 text-white placeholder-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  rows={2}
                />
              </div>
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">Certifications <span className="normal-case font-normal text-emerald-500">(comma-separated)</span></label>
                <textarea
                  placeholder="e.g. Halaal, Kosher, Organic"
                  value={(formData.certifications || []).join(", ")}
                  onChange={(e) => setFormData({ ...formData, certifications: e.target.value.split(",").map((c) => c.trim()) })}
                  className="rounded-xl border border-emerald-700 bg-emerald-800 px-4 py-2.5 text-white placeholder-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  rows={2}
                />
              </div>
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">Ingredients</label>
                <textarea
                  placeholder="Full ingredients list…"
                  value={formData.ingredients || ""}
                  onChange={(e) => setFormData({ ...formData, ingredients: e.target.value })}
                  className="rounded-xl border border-emerald-700 bg-emerald-800 px-4 py-2.5 text-white placeholder-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  rows={3}
                />
              </div>
              <div className="md:col-span-2 flex items-center gap-2 text-sm text-emerald-300">
                <span className="text-emerald-500">Auto safety score:</span>
                <span className={`font-bold ${
                  (formData.safety_score ?? computeSafetyScore(formData.allergens)) >= 80
                    ? "text-green-400"
                    : (formData.safety_score ?? computeSafetyScore(formData.allergens)) >= 50
                    ? "text-amber-400"
                    : "text-red-400"
                }`}>
                  {formData.safety_score ?? computeSafetyScore(formData.allergens)} / 100
                </span>
              </div>
            </div>

            {/* ── Promotion & Merchandising ── */}
            <div className="border-t border-emerald-700/60 pt-6 mt-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-5">Promotion &amp; Merchandising</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">Promotion Price (R) <span className="normal-case font-normal text-emerald-500">(leave blank if not on sale)</span></label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={formData.promotionPrice ?? ""}
                    min={0}
                    step={0.01}
                    onChange={(e) => setFormData({ ...formData, promotionPrice: e.target.value === "" ? undefined : parseFloat(e.target.value) })}
                    className="rounded-xl border border-emerald-700 bg-emerald-800 px-4 py-2.5 text-white placeholder-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <span className="relative shrink-0">
                    <input
                      type="checkbox"
                      checked={!!formData.isOnPromotion}
                      onChange={(e) => setFormData({ ...formData, isOnPromotion: e.target.checked })}
                      className="sr-only peer"
                    />
                    <span className="block w-10 h-6 rounded-full bg-emerald-800 border border-emerald-700 peer-checked:bg-amber-500 peer-checked:border-amber-400 transition-colors duration-200" />
                    <span className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 peer-checked:translate-x-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">On Promotion</p>
                    <p className="text-xs text-emerald-400">Show in Promotions strip</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <span className="relative shrink-0">
                    <input
                      type="checkbox"
                      checked={!!formData.isFeatured}
                      onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                      className="sr-only peer"
                    />
                    <span className="block w-10 h-6 rounded-full bg-emerald-800 border border-emerald-700 peer-checked:bg-emerald-500 peer-checked:border-emerald-400 transition-colors duration-200" />
                    <span className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 peer-checked:translate-x-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">Featured</p>
                    <p className="text-xs text-emerald-400">Manually highlight this product</p>
                  </div>
                </label>
              </div>
            </div>

            <div className="mt-7 flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-7 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (editingId ? "Updating…" : "Creating…") : (editingId ? "Update Product" : "Create Product")}
              </button>
              <button
                onClick={() => { setShowForm(false); setEditingId(null); setFormData({}); }}
                className="rounded-xl border border-emerald-700 hover:border-emerald-500 px-5 py-2.5 text-sm font-medium text-emerald-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-emerald-400">Loading products…</p>
        ) : products.length === 0 ? (
          <p className="text-emerald-400">No products found. Add one above.</p>
        ) : (
          <div className="rounded-2xl bg-emerald-900 border border-emerald-800 overflow-hidden">
            <table className="w-full">
              <thead className="bg-emerald-800/80">
                <tr>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-emerald-300 uppercase tracking-wide">Name</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-emerald-300 uppercase tracking-wide">Brand</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-emerald-300 uppercase tracking-wide">Price</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-emerald-300 uppercase tracking-wide">Stock</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-emerald-300 uppercase tracking-wide">Safety</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-emerald-300 uppercase tracking-wide">Labels</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-emerald-300 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-800">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-emerald-800/40 transition-colors">
                    <td className="px-5 py-4 text-white font-medium">{product.name}</td>
                    <td className="px-5 py-4 text-emerald-300">{product.brand || "—"}</td>
                    <td className="px-5 py-4 text-emerald-200">R{product.price.toFixed(2)}</td>
                    <td className="px-5 py-4">
                      <span className={`font-semibold ${
                        (product.stock ?? 0) === 0
                          ? "text-red-400"
                          : (product.stock ?? 0) <= 5
                          ? "text-amber-400"
                          : "text-emerald-200"
                      }`}>
                        {product.stock ?? 0}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {product.safety_score != null ? (
                        <span className={`font-semibold ${
                          product.safety_score >= 80 ? "text-green-400" : product.safety_score >= 50 ? "text-amber-400" : "text-red-400"
                        }`}>
                          {product.safety_score}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {product.isOnPromotion && (
                          <span className="rounded-full bg-amber-500/20 border border-amber-600 text-amber-300 text-xs px-2.5 py-0.5 font-medium">Sale</span>
                        )}
                        {product.isFeatured && (
                          <span className="rounded-full bg-emerald-500/20 border border-emerald-600 text-emerald-300 text-xs px-2.5 py-0.5 font-medium">Featured</span>
                        )}
                        {(product.salesCount ?? 0) > 0 && (
                          <span className="rounded-full bg-emerald-800 border border-emerald-700 text-emerald-400 text-xs px-2.5 py-0.5">{product.salesCount} sold</span>
                        )}
                        {!product.isOnPromotion && !product.isFeatured && !(product.salesCount ?? 0) && (
                          <span className="text-emerald-600 text-xs">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setFormData(product);
                            setEditingId(product.id);
                            setShowForm(true);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className="rounded-lg bg-emerald-700 hover:bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="rounded-lg bg-red-600 hover:bg-red-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
