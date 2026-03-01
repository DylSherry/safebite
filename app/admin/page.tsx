"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthRequired } from "@/app/hooks/useAuthRequired";
import { useUserProfile } from "@/app/hooks/useUserProfile";
import { Product } from "@/lib/types";

type OrderItem = { id: string; name: string; quantity: number; price: number; image_url?: string };
type Order = {
  id: string;
  uid: string;
  userEmail: string;
  items: OrderItem[];
  total: number;
  paymentMethod: string;
  delivery: { fullName: string; address: string; city: string; postalCode: string };
  createdAt: string | null;
};

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuthRequired();
  const { profile, loading: profileLoading } = useUserProfile();
  const [activeTab, setActiveTab] = useState<"products" | "orders" | "reports" | "stock">("products");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Partial<Product>>({});
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [stockDraft, setStockDraft] = useState<Record<string, string>>({});
  const [savingStock, setSavingStock] = useState<string | null>(null);
  const [stockSearch, setStockSearch] = useState("");

  useEffect(() => {
    if (profile?.role !== "admin") return;
    fetchProducts();
  }, [profile]);

  useEffect(() => {
    if (profile?.role !== "admin" || activeTab !== "orders") return;
    fetchOrders();
  }, [profile, activeTab]);

  useEffect(() => {
    if (profile?.role !== "admin" || activeTab !== "reports") return;
    // Reports derive from orders + products; fetch both if not yet loaded
    if (orders.length === 0) fetchOrders();
    if (products.length === 0) fetchProducts();
  }, [profile, activeTab]);

  // Seed the stock draft whenever products load or stock tab is opened
  useEffect(() => {
    if (activeTab === "stock" && products.length > 0) {
      setStockDraft(Object.fromEntries(products.map((p) => [p.id, String(p.stock ?? 0)])));
    }
  }, [activeTab, products]);

  const handleSaveStock = async (productId: string) => {
    const newStock = parseInt(stockDraft[productId] ?? "0", 10);
    if (isNaN(newStock) || newStock < 0) return;
    setSavingStock(productId);
    try {
      const token = await user?.getIdToken();
      const product = products.find((p) => p.id === productId);
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...product, stock: newStock }),
      });
      if (!res.ok) throw new Error("Failed to update stock");
      setProducts((prev) => prev.map((p) => p.id === productId ? { ...p, stock: newStock } : p));
      setStatus(`Stock updated for "${product?.name}"`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed to update stock");
    } finally {
      setSavingStock(null);
    }
  };

  const fetchOrders = async () => {
    setOrdersLoading(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/admin/orders", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch orders");
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed to load orders");
    } finally {
      setOrdersLoading(false);
    }
  };

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
        {/* ── Header ── */}
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
          <div className="flex items-center gap-3">
            {activeTab === "products" && (
              <>
                <button
                  onClick={fetchProducts}
                  disabled={loading}
                  className="rounded-xl border border-emerald-700 hover:border-emerald-500 px-4 py-2.5 text-sm font-medium text-emerald-300 hover:text-white transition-colors disabled:opacity-50"
                >
                  {loading ? "Refreshing…" : "↻ Refresh"}
                </button>
                <button
                  onClick={() => { setShowForm(!showForm); setEditingId(null); setFormData({}); }}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors"
                >
                  {showForm ? "Cancel" : "+ Add Product"}
                </button>
              </>
            )}
            {activeTab === "orders" && (
              <button
                onClick={fetchOrders}
                disabled={ordersLoading}
                className="rounded-xl border border-emerald-700 hover:border-emerald-500 px-4 py-2.5 text-sm font-medium text-emerald-300 hover:text-white transition-colors disabled:opacity-50"
              >
                {ordersLoading ? "Refreshing…" : "↻ Refresh"}
              </button>
            )}
            {activeTab === "reports" && (
              <button
                onClick={() => { fetchOrders(); fetchProducts(); }}
                disabled={ordersLoading || loading}
                className="rounded-xl border border-emerald-700 hover:border-emerald-500 px-4 py-2.5 text-sm font-medium text-emerald-300 hover:text-white transition-colors disabled:opacity-50"
              >
                {ordersLoading || loading ? "Refreshing…" : "↻ Refresh"}
              </button>
            )}
            {activeTab === "stock" && (
              <button
                onClick={() => { fetchProducts(); }}
                disabled={loading}
                className="rounded-xl border border-emerald-700 hover:border-emerald-500 px-4 py-2.5 text-sm font-medium text-emerald-300 hover:text-white transition-colors disabled:opacity-50"
              >
                {loading ? "Refreshing…" : "↻ Refresh"}
              </button>
            )}
          </div>
        </div>

        {/* ── Tab switcher ── */}
        <div className="flex gap-1 mb-8 rounded-xl bg-emerald-900 border border-emerald-800 p-1 w-fit">
          <button
            onClick={() => setActiveTab("products")}
            className={`rounded-lg px-5 py-2 text-sm font-semibold transition-colors ${
              activeTab === "products"
                ? "bg-emerald-600 text-white"
                : "text-emerald-300 hover:text-white"
            }`}
          >
            Products
          </button>
          <button
            onClick={() => setActiveTab("orders")}
            className={`rounded-lg px-5 py-2 text-sm font-semibold transition-colors ${
              activeTab === "orders"
                ? "bg-emerald-600 text-white"
                : "text-emerald-300 hover:text-white"
            }`}
          >
            Orders {orders.length > 0 && activeTab !== "orders" && (
              <span className="ml-1.5 rounded-full bg-emerald-700 px-1.5 py-0.5 text-xs">{orders.length}</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("reports")}
            className={`rounded-lg px-5 py-2 text-sm font-semibold transition-colors ${
              activeTab === "reports"
                ? "bg-emerald-600 text-white"
                : "text-emerald-300 hover:text-white"
            }`}
          >
            Reports
          </button>
          <button
            onClick={() => setActiveTab("stock")}
            className={`rounded-lg px-5 py-2 text-sm font-semibold transition-colors ${
              activeTab === "stock"
                ? "bg-emerald-600 text-white"
                : "text-emerald-300 hover:text-white"
            }`}
          >
            Stock
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

        {/* ── Products Tab ── */}
        {activeTab === "products" && (
          <>
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
                <label className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">Allergens <span className="normal-case font-normal text-emerald-400">(comma-separated)</span></label>
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
                <label className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">Certifications <span className="normal-case font-normal text-emerald-400">(comma-separated)</span></label>
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
                <span className="text-emerald-400">Auto safety score:</span>
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
                  <label className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">Promotion Price (R) <span className="normal-case font-normal text-emerald-400">(leave blank if not on sale)</span></label>
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
                          <span className="text-emerald-400 text-xs">—</span>
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
          </>
        )}

        {/* ── Orders Tab ── */}
        {activeTab === "orders" && (
          <>
            {ordersLoading ? (
              <p className="text-emerald-400">Loading orders…</p>
            ) : orders.length === 0 ? (
              <div className="rounded-2xl bg-emerald-900 border border-emerald-800 p-10 text-center">
                <p className="text-emerald-400">No orders yet.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {orders.map((order) => (
                  <div key={order.id} className="rounded-2xl bg-emerald-900 border border-emerald-800 overflow-hidden">
                    {/* Order header row */}
                    <button
                      onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                      className="w-full flex flex-wrap items-center gap-4 px-5 py-4 hover:bg-emerald-800/40 transition-colors text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold text-sm truncate">{order.delivery?.fullName || "Unknown"}</p>
                        <p className="text-emerald-400 text-xs truncate">{order.userEmail}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-white font-semibold text-sm">R{Number(order.total).toFixed(2)}</p>
                        <p className="text-emerald-400 text-xs">
                          {order.createdAt ? new Date(order.createdAt).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                        </p>
                      </div>
                      <svg
                        className={`h-4 w-4 text-emerald-400 shrink-0 transition-transform ${expandedOrder === order.id ? "rotate-180" : ""}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Expanded details */}
                    {expandedOrder === order.id && (
                      <div className="border-t border-emerald-800 px-5 py-5 flex flex-col gap-5">
                        {/* Items list */}
                        <div>
                          <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wide mb-3">Items</p>
                          <div className="flex flex-col gap-2">
                            {(order.items || []).map((item: OrderItem, i: number) => (
                              <div key={i} className="flex items-center gap-3">
                                {item.image_url && (
                                  <img src={item.image_url} alt={item.name} className="h-10 w-10 rounded-lg object-cover shrink-0" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-white text-sm font-medium truncate">{item.name}</p>
                                  <p className="text-emerald-400 text-xs">Qty: {item.quantity} × R{Number(item.price).toFixed(2)}</p>
                                </div>
                                <p className="text-emerald-200 text-sm font-semibold shrink-0">R{(item.quantity * item.price).toFixed(2)}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Delivery & payment */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wide mb-1.5">Delivery</p>
                            <p className="text-white text-sm">{order.delivery?.fullName}</p>
                            <p className="text-emerald-300 text-sm">{order.delivery?.address}</p>
                            <p className="text-emerald-300 text-sm">{order.delivery?.city}, {order.delivery?.postalCode}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wide mb-1.5">Payment</p>
                            <p className="text-white text-sm capitalize">{order.paymentMethod || "—"}</p>
                            <p className="text-xs font-mono text-emerald-400 mt-1">{order.id}</p>
                          </div>
                        </div>


                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        {/* ── Reports Tab ── */}
        {activeTab === "reports" && (() => {
          const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total), 0);
          const avgOrderValue = orders.length ? totalRevenue / orders.length : 0;
          const topProducts = [...products]
            .filter((p) => (p.salesCount ?? 0) > 0)
            .sort((a, b) => (b.salesCount ?? 0) - (a.salesCount ?? 0))
            .slice(0, 5);
          const lowStock = products.filter((p) => typeof p.stock === "number" && p.stock <= 5);
          const recentOrders = [...orders].slice(0, 5);
          const totalSold = products.reduce((sum, p) => sum + (p.salesCount ?? 0), 0);
          const maxSales = Math.max(...topProducts.map((p) => p.salesCount ?? 0), 1);

          return (
            <div className="flex flex-col gap-6">
              {/* ── KPI cards ── */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Total Revenue", value: `R${totalRevenue.toFixed(2)}`, sub: `${orders.length} orders`, color: "text-green-400" },
                  { label: "Avg Order Value", value: `R${avgOrderValue.toFixed(2)}`, sub: `across ${orders.length} orders`, color: "text-emerald-300" },
                  { label: "Units Sold", value: totalSold.toString(), sub: "across all products", color: "text-blue-300" },
                  { label: "Low Stock Items", value: lowStock.length.toString(), sub: lowStock.length > 0 ? "need restocking" : "all good", color: lowStock.length > 0 ? "text-red-400" : "text-green-400" },
                ].map(({ label, value, sub, color }) => (
                  <div key={label} className="rounded-2xl bg-emerald-900 border border-emerald-800 p-5">
                    <p className="text-xs font-semibold text-emerald-300 uppercase tracking-wide mb-2">{label}</p>
                    <p className={`text-2xl font-bold ${color}`}>{value}</p>
                    <p className="text-xs text-emerald-400 mt-1">{sub}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* ── Top selling products ── */}
                <div className="rounded-2xl bg-emerald-900 border border-emerald-800 p-5">
                  <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wide mb-4">Top Selling Products</p>
                  {topProducts.length === 0 ? (
                    <p className="text-emerald-400 text-sm">No sales recorded yet.</p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {topProducts.map((p, i) => (
                        <div key={p.id}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-xs font-bold text-emerald-400 w-4 shrink-0">#{i + 1}</span>
                              <span className="text-sm text-emerald-200 truncate">{p.name}</span>
                            </div>
                            <span className="text-sm font-semibold text-white shrink-0 ml-2">{p.salesCount} sold</span>
                          </div>
                          <div className="h-2 rounded-full bg-emerald-800">
                            <div
                              className="h-2 rounded-full bg-amber-500 transition-all duration-500"
                              style={{ width: `${((p.salesCount ?? 0) / maxSales) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── Low stock alerts ── */}
                <div className="rounded-2xl bg-emerald-900 border border-emerald-800 p-5">
                  <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wide mb-4">
                    Low Stock Alerts
                    {lowStock.length > 0 && (
                      <span className="ml-2 rounded-full bg-red-900/50 border border-red-700 text-red-300 px-2 py-0.5 normal-case font-medium">{lowStock.length}</span>
                    )}
                  </p>
                  {lowStock.length === 0 ? (
                    <p className="text-emerald-400 text-sm">All products are well stocked.</p>
                  ) : (
                    <div className="flex flex-col divide-y divide-emerald-800">
                      {lowStock.map((p) => (
                        <div key={p.id} className="flex items-center justify-between py-2.5">
                          <div className="min-w-0">
                            <p className="text-sm text-white font-medium truncate">{p.name}</p>
                            <p className="text-xs text-emerald-400">{p.brand || "—"}</p>
                          </div>
                          <span className={`ml-3 shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold ${
                            (p.stock ?? 0) === 0
                              ? "bg-red-900/40 border border-red-700 text-red-300"
                              : "bg-amber-900/40 border border-amber-700 text-amber-300"
                          }`}>
                            {(p.stock ?? 0) === 0 ? "Out of stock" : `${p.stock} left`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ── Recent orders ── */}
              <div className="rounded-2xl bg-emerald-900 border border-emerald-800 p-5">
                <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wide mb-4">Recent Orders</p>
                {recentOrders.length === 0 ? (
                  <p className="text-emerald-400 text-sm">No orders yet.</p>
                ) : (
                  <div className="rounded-xl overflow-hidden border border-emerald-800">
                    <table className="w-full">
                      <thead className="bg-emerald-800/80">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-emerald-300 uppercase tracking-wide">Customer</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-emerald-300 uppercase tracking-wide">Items</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-emerald-300 uppercase tracking-wide">Total</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-emerald-300 uppercase tracking-wide">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-emerald-800">
                        {recentOrders.map((o) => (
                          <tr key={o.id} className="hover:bg-emerald-800/30 transition-colors">
                            <td className="px-4 py-3">
                              <p className="text-sm text-white font-medium">{o.delivery?.fullName || "—"}</p>
                              <p className="text-xs text-emerald-400 truncate max-w-40">{o.userEmail}</p>
                            </td>
                            <td className="px-4 py-3 text-sm text-emerald-200">{(o.items || []).reduce((s, i) => s + i.quantity, 0)} item{(o.items || []).reduce((s, i) => s + i.quantity, 0) !== 1 ? "s" : ""}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-white">R{Number(o.total).toFixed(2)}</td>
                            <td className="px-4 py-3 text-sm text-emerald-300">
                              {o.createdAt ? new Date(o.createdAt).toLocaleDateString("en-ZA", { day: "numeric", month: "short" }) : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* ─── Stock Tab ─── */}
        {activeTab === "stock" && (
          <div className="space-y-6">
            {/* Search bar */}
            <div className="rounded-2xl bg-emerald-900 border border-emerald-800 p-4">
              <input
                type="text"
                placeholder="Search products by name or brand…"
                value={stockSearch}
                onChange={(e) => setStockSearch(e.target.value)}
                className="w-full rounded-xl bg-emerald-800/60 border border-emerald-700 px-4 py-2.5 text-sm text-white placeholder-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {loading ? (
              <p className="text-emerald-400">Loading products…</p>
            ) : products.length === 0 ? (
              <div className="rounded-2xl bg-emerald-900 border border-emerald-800 p-10 text-center">
                <p className="text-emerald-400">No products found.</p>
              </div>
            ) : (
              <div className="rounded-2xl bg-emerald-900 border border-emerald-800 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-emerald-800/80">
                    <tr>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-emerald-300 uppercase tracking-wide">Product</th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-emerald-300 uppercase tracking-wide">Brand</th>
                      <th className="px-5 py-3.5 text-center text-xs font-semibold text-emerald-300 uppercase tracking-wide">Current Stock</th>
                      <th className="px-5 py-3.5 text-center text-xs font-semibold text-emerald-300 uppercase tracking-wide">New Stock</th>
                      <th className="px-5 py-3.5 text-center text-xs font-semibold text-emerald-300 uppercase tracking-wide">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-800">
                    {products
                      .filter((p) => {
                        const q = stockSearch.toLowerCase();
                        return (
                          !q ||
                          p.name.toLowerCase().includes(q) ||
                          (p.brand ?? "").toLowerCase().includes(q)
                        );
                      })
                      .map((p) => {
                        const draft = stockDraft[p.id] ?? String(p.stock ?? 0);
                        const unchanged = draft === String(p.stock ?? 0);
                        const stockNum = p.stock ?? 0;
                        const stockColor =
                          stockNum === 0
                            ? "text-red-400"
                            : stockNum <= 5
                            ? "text-amber-400"
                            : "text-emerald-200";
                        return (
                          <tr key={p.id} className="hover:bg-emerald-800/40 transition-colors">
                            {/* Product name */}
                            <td className="px-5 py-4 font-medium text-white max-w-55 truncate">
                              {p.name}
                            </td>
                            {/* Brand */}
                            <td className="px-5 py-4 text-emerald-300">
                              {p.brand ?? "—"}
                            </td>
                            {/* Current stock */}
                            <td className="px-5 py-4 text-center">
                              <span className={`font-semibold ${stockColor}`}>
                                {stockNum}
                                {stockNum === 0 && (
                                  <span className="ml-1.5 text-xs text-red-400 font-normal">out of stock</span>
                                )}
                                {stockNum > 0 && stockNum <= 5 && (
                                  <span className="ml-1.5 text-xs text-amber-400 font-normal">low</span>
                                )}
                              </span>
                            </td>
                            {/* New stock input */}
                            <td className="px-5 py-4 text-center">
                              <input
                                type="number"
                                min={0}
                                value={draft}
                                onChange={(e) =>
                                  setStockDraft((prev) => ({ ...prev, [p.id]: e.target.value }))
                                }
                                className="w-24 rounded-xl bg-emerald-800/60 border border-emerald-700 px-3 py-1.5 text-center text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              />
                            </td>
                            {/* Save button */}
                            <td className="px-5 py-4 text-center">
                              <button
                                onClick={() => handleSaveStock(p.id)}
                                disabled={unchanged || savingStock === p.id}
                                className="rounded-lg bg-emerald-700 hover:bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                {savingStock === p.id ? "Saving…" : "Save"}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
