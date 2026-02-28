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
    <main className="flex-1 overflow-y-auto bg-emerald-950 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white">Product Management</h1>
          <button
            onClick={() => {
              setShowForm(!showForm);
              setEditingId(null);
              setFormData({});
            }}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 transition-colors"
          >
            {showForm ? "Cancel" : "Add Product"}
          </button>
        </div>

        {status && (
          <div
            className={`mb-4 rounded-lg p-4 ${
              status.includes("success")
                ? "bg-green-900/30 text-green-200 border border-green-800"
                : "bg-red-900/30 text-red-200 border border-red-800"
            }`}
          >
            {status}
          </div>
        )}

        {showForm && (
          <div className="mb-6 rounded-lg bg-emerald-900 border border-emerald-800 p-6">
            <h2 className="text-xl font-semibold text-white mb-4">{editingId ? "Edit Product" : "New Product"}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Product Name"
                value={formData.name || ""}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="rounded-lg border border-emerald-700 bg-emerald-800 px-3 py-2 text-white placeholder-emerald-500"
              />
              <input
                type="text"
                placeholder="Brand"
                value={formData.brand || ""}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                className="rounded-lg border border-emerald-700 bg-emerald-800 px-3 py-2 text-white placeholder-emerald-500"
              />
              <input
                type="number"
                placeholder="Price"
                value={formData.price || ""}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                className="rounded-lg border border-emerald-700 bg-emerald-800 px-3 py-2 text-white placeholder-emerald-500"
              />
              <input
                type="number"
                placeholder="Stock"
                value={formData.stock || ""}
                onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) })}
                className="rounded-lg border border-emerald-700 bg-emerald-800 px-3 py-2 text-white placeholder-emerald-500"
              />
              <input
                type="url"
                placeholder="Image URL"
                value={formData.image_url || ""}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                className="rounded-lg border border-emerald-700 bg-emerald-800 px-3 py-2 text-white placeholder-emerald-500 md:col-span-2"
              />
              {/* risk level removed; safety score auto-calculated */}
              <textarea
                placeholder="Allergens (comma-separated)"
                value={(formData.allergens || []).join(", ")}
                onChange={(e) => {
                  const arr = e.target.value.split(",").map((a) => a.trim());
                  setFormData({ ...formData, allergens: arr });
                }}
                className="rounded-lg border border-emerald-700 bg-emerald-800 px-3 py-2 text-white placeholder-emerald-500 md:col-span-2"
                rows={2}
              />
              <textarea
                placeholder="Certifications (comma-separated)"
                value={(formData.certifications || []).join(", ")}
                onChange={(e) => setFormData({ ...formData, certifications: e.target.value.split(",").map((c) => c.trim()) })}
                className="rounded-lg border border-emerald-700 bg-emerald-800 px-3 py-2 text-white placeholder-emerald-500 md:col-span-2"
                rows={2}
              />
              <textarea
                placeholder="Ingredients (full ingredients list as text)"
                value={formData.ingredients || ""}
                onChange={(e) => setFormData({ ...formData, ingredients: e.target.value })}
                className="rounded-lg border border-emerald-700 bg-emerald-800 px-3 py-2 text-white placeholder-emerald-500 md:col-span-2"
                rows={3}
              />
              <div className="md:col-span-2 text-sm text-emerald-200">
                Safety score: {formData.safety_score ?? computeSafetyScore(formData.allergens)} / 100
              </div>

              {/* ── Promotion & Merchandising ── */}
              <div className="md:col-span-2 border-t border-emerald-700 pt-4 mt-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-3">Promotion &amp; Merchandising</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="number"
                    placeholder="Sales Count (for Top Sellers ranking)"
                    value={formData.salesCount ?? ""}
                    onChange={(e) => setFormData({ ...formData, salesCount: e.target.value === "" ? undefined : parseInt(e.target.value) })}
                    className="rounded-lg border border-emerald-700 bg-emerald-800 px-3 py-2 text-white placeholder-emerald-500"
                    min={0}
                  />
                  <input
                    type="number"
                    placeholder="Promotion Price (leave blank if not on sale)"
                    value={formData.promotionPrice ?? ""}
                    onChange={(e) => setFormData({ ...formData, promotionPrice: e.target.value === "" ? undefined : parseFloat(e.target.value) })}
                    className="rounded-lg border border-emerald-700 bg-emerald-800 px-3 py-2 text-white placeholder-emerald-500"
                    min={0}
                    step={0.01}
                  />
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
                      <p className="text-sm font-medium text-white">On Promotion</p>
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
                      <p className="text-sm font-medium text-white">Featured</p>
                      <p className="text-xs text-emerald-400">Manually highlight this product</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="mt-4 rounded-lg bg-green-600 px-6 py-2 text-white hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (editingId ? "Updating..." : "Creating...") : (editingId ? "Update Product" : "Create Product")}
            </button>
          </div>
        )}

        {loading ? (
          <p className="text-emerald-200">Loading products...</p>
        ) : products.length === 0 ? (
          <p className="text-emerald-200">No products found</p>
        ) : (
          <div className="rounded-lg bg-emerald-900 border border-emerald-800 overflow-hidden">
            <table className="w-full">
              <thead className="bg-emerald-800">
                <tr>
                  <th className="px-4 py-3 text-left text-white font-semibold">Name</th>
                  <th className="px-4 py-3 text-left text-white font-semibold">Brand</th>
                  <th className="px-4 py-3 text-left text-white font-semibold">Price</th>
                  <th className="px-4 py-3 text-left text-white font-semibold">Stock</th>
                  <th className="px-4 py-3 text-left text-white font-semibold">Safety</th>
                  <th className="px-4 py-3 text-left text-white font-semibold">Labels</th>
                  <th className="px-4 py-3 text-left text-white font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-800">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-emerald-800/50 transition-colors">
                    <td className="px-4 py-3 text-emerald-100">{product.name}</td>
                    <td className="px-4 py-3 text-emerald-100">{product.brand || "-"}</td>
                    <td className="px-4 py-3 text-emerald-100">R{product.price.toFixed(2)}</td>
                    <td className="px-4 py-3 text-emerald-100">{product.stock || 0}</td>
                    <td className="px-4 py-3 text-emerald-100">
                      {product.safety_score != null ? product.safety_score : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {product.isOnPromotion && (
                          <span className="rounded-full bg-amber-500/20 border border-amber-600 text-amber-300 text-xs px-2 py-0.5 font-medium">Sale</span>
                        )}
                        {product.isFeatured && (
                          <span className="rounded-full bg-emerald-500/20 border border-emerald-600 text-emerald-300 text-xs px-2 py-0.5 font-medium">Featured</span>
                        )}
                        {(product.salesCount ?? 0) > 0 && (
                          <span className="rounded-full bg-emerald-800 border border-emerald-700 text-emerald-400 text-xs px-2 py-0.5">{product.salesCount} sold</span>
                        )}
                        {!product.isOnPromotion && !product.isFeatured && !product.salesCount && (
                          <span className="text-emerald-600 text-xs">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 space-x-2">
                      <button
                        onClick={() => {
                          setFormData(product);
                          setEditingId(product.id);
                          setShowForm(true);
                        }}
                        className="text-blue-400 hover:text-blue-300 text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        Delete
                      </button>
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
