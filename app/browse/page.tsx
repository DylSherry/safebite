"use client";

import React, { useState, useEffect, useCallback } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useCart } from "../context/CartContext";
import { useUserProfile } from "../hooks/useUserProfile";
import CartSidebar from "../components/CartSidebar";
import FilterSidebar from "../components/FilterSidebar";

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
  salesCount?: number;
  isOnPromotion?: boolean;
  promotionPrice?: number;
  isFeatured?: boolean;
  category?: string;
};

// ─── Product Detail Modal ────────────────────────────────────────────────────
function ProductModal({ product, onClose, onAddToCart, added }: {
  product: Product;
  onClose: () => void;
  onAddToCart: (p: Product) => void;
  added: boolean;
}) {
  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const safetyColor =
    (product.safety_score ?? 100) >= 80
      ? "text-green-400"
      : (product.safety_score ?? 100) >= 50
      ? "text-amber-400"
      : "text-red-400";

  const hasAllergens = product.allergens?.some((a) => a.toLowerCase() !== "none");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={product.name}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-emerald-950 border border-emerald-700 shadow-2xl flex flex-col">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-emerald-400 hover:text-white rounded-full p-1 hover:bg-emerald-800 transition-colors"
          aria-label="Close"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Image */}
        <div className="h-56 w-full shrink-0 overflow-hidden rounded-t-2xl bg-emerald-800 flex items-center justify-center">
          {product.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <span className="text-emerald-500 text-sm">No image available</span>
          )}
          {product.isOnPromotion && product.promotionPrice != null && (
            <span className="absolute top-3 left-3 rounded-full bg-amber-500 text-white text-xs font-bold px-2 py-1">
              -{Math.round(((product.price - product.promotionPrice) / product.price) * 100)}% OFF
            </span>
          )}
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-4">
          {/* Name & brand */}
          <div>
            <h2 className="text-2xl font-bold text-white">{product.name}</h2>
            {product.brand && <p className="text-emerald-400 text-sm mt-0.5">{product.brand}</p>}
            {product.category && (
              <span className="mt-1 inline-block text-xs rounded-full bg-emerald-800 border border-emerald-600 text-emerald-300 px-2.5 py-0.5">
                {product.category}
              </span>
            )}
          </div>

          {/* Price row */}
          <div className="flex items-baseline gap-3">
            {product.isOnPromotion && product.promotionPrice != null ? (
              <>
                <span className="text-2xl font-bold text-amber-300">R{product.promotionPrice.toFixed(2)}</span>
                <span className="text-base text-emerald-600 line-through">R{product.price.toFixed(2)}</span>
              </>
            ) : (
              <span className="text-2xl font-bold text-emerald-300">R{product.price.toFixed(2)}</span>
            )}
            {product.stock != null && (
              <span className={`ml-auto text-xs font-medium ${
                product.stock > 10 ? "text-green-400" : product.stock > 0 ? "text-amber-400" : "text-red-400"
              }`}>
                {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
              </span>
            )}
          </div>

          {/* Safety score */}
          {product.safety_score != null && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-emerald-400">Safety score:</span>
              <span className={`text-sm font-bold ${safetyColor}`}>{product.safety_score}/100</span>
              <div className="flex-1 h-2 rounded-full bg-emerald-800 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    product.safety_score >= 80 ? "bg-green-500" : product.safety_score >= 50 ? "bg-amber-400" : "bg-red-500"
                  }`}
                  style={{ width: `${product.safety_score}%` }}
                />
              </div>
            </div>
          )}

          {/* Allergens */}
          <div>
            <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wide mb-1.5">Allergens</p>
            <div className="flex flex-wrap gap-2">
              {hasAllergens ? (
                product.allergens!.filter((a) => a.toLowerCase() !== "none").map((a) => (
                  <span key={a} className="inline-flex items-center gap-1.5 text-xs rounded-full bg-red-900/40 border border-red-700/50 text-red-300 px-2.5 py-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                    {a}
                  </span>
                ))
              ) : (
                <span className="text-xs rounded-full bg-green-900/40 border border-green-700/50 text-green-300 px-2.5 py-1">No allergens</span>
              )}
            </div>
          </div>

          {/* Certifications */}
          {product.certifications && product.certifications.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wide mb-1.5">Certifications</p>
              <div className="flex flex-wrap gap-2">
                {product.certifications.map((c) => (
                  <span key={c} className="text-xs rounded-full bg-emerald-800 border border-emerald-600 text-emerald-200 px-2.5 py-1">
                    ✓ {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Ingredients */}
          {product.ingredients && (
            <div>
              <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wide mb-1.5">Ingredients</p>
              <p className="text-sm text-emerald-300 leading-relaxed">{product.ingredients}</p>
            </div>
          )}

          {/* Add to cart */}
          <button
            onClick={() => onAddToCart(product)}
            disabled={product.stock === 0}
            className={`mt-2 w-full rounded-xl py-3 text-white font-semibold transition-colors text-sm ${
              product.stock === 0
                ? "bg-emerald-900 text-emerald-600 cursor-not-allowed"
                : added
                ? "bg-green-500 hover:bg-green-600"
                : "bg-emerald-600 hover:bg-emerald-500"
            }`}
          >
            {product.stock === 0 ? "Out of stock" : added ? "✓ Added to cart" : "Add to Cart"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function BrowsePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [safeForMe, setSafeForMe] = useState(false);
  const [search, setSearch] = useState("");
  const { profile } = useUserProfile();
  const { addToCart, cart } = useCart();
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());

  const handleCloseModal = useCallback(() => setSelectedProduct(null), []);

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

  const categories = Array.from(
    new Set(products.map((p) => p.category).filter((c): c is string => !!c))
  ).sort();

  const toggleCategory = (cat: string) =>
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });

  const effectivePrice = (p: Product) =>
    p.isOnPromotion && p.promotionPrice != null ? p.promotionPrice : p.price;

  const filteredProducts = products
    .filter((product) => {
      const allergens = (product.allergens || []).map((a) => a.toLowerCase()).filter((a) => a !== "none");
      if (safeForMe && profile) {
        const userAllergies = (profile.allergies || profile.dietary?.allergies || []).map((a) => a.toLowerCase());
        if (userAllergies.some((ua) => allergens.includes(ua))) return false;
      }
      const ep = effectivePrice(product);
      if (priceMin !== "" && ep < parseFloat(priceMin)) return false;
      if (priceMax !== "" && ep > parseFloat(priceMax)) return false;
      if (selectedCategories.size > 0) {
        if (!product.category || !selectedCategories.has(product.category)) return false;
      }
      return true;
    })
    .filter((product) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return product.name.toLowerCase().includes(q) || (product.brand ?? "").toLowerCase().includes(q);
    });

  return (
    <>
      <FilterSidebar
        safeForMe={safeForMe}
        onSafeForMeChange={setSafeForMe}
        priceMin={priceMin}
        priceMax={priceMax}
        onPriceMinChange={setPriceMin}
        onPriceMaxChange={setPriceMax}
        categories={categories}
        selectedCategories={selectedCategories}
        onToggleCategory={toggleCategory}
        onClearAll={() => {
          setSafeForMe(false);
          setPriceMin("");
          setPriceMax("");
          setSelectedCategories(new Set());
        }}
      />

      {/* Main content */}
      <main className="flex-1 p-6 overflow-y-auto bg-emerald-950">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h1 className="text-3xl font-bold text-white">All Products</h1>
          <div className="relative w-full sm:w-72">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400 hover:text-white" aria-label="Clear search">✕</button>
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
            <p className="text-emerald-500 text-sm mb-4">Try adjusting your search or filters.</p>
            <button
              onClick={() => { setSearch(""); setPriceMin(""); setPriceMax(""); setSelectedCategories(new Set()); setSafeForMe(false); }}
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
                onClick={() => setSelectedProduct(p)}
                className="flex flex-col bg-emerald-900 rounded-xl shadow p-4 hover:shadow-emerald-800/50 hover:shadow-lg border border-emerald-800 transition-shadow cursor-pointer group"
              >
                <div className="relative h-40 w-full mb-4 rounded-lg overflow-hidden bg-emerald-800 flex items-center justify-center">
                  {p.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="text-emerald-400 text-sm">No image</div>
                  )}
                  {p.isOnPromotion && p.promotionPrice != null && (
                    <span className="absolute top-2 right-2 rounded-full bg-amber-500 text-white text-xs font-bold px-2 py-0.5">
                      -{Math.round(((p.price - p.promotionPrice) / p.price) * 100)}%
                    </span>
                  )}
                </div>
                <div className="mb-2">
                  <h2 className="text-lg font-medium text-white">{p.name}</h2>
                  {p.brand && <p className="text-sm text-emerald-300">{p.brand}</p>}
                  <div className="flex items-baseline gap-2 mt-0.5">
                    {p.isOnPromotion && p.promotionPrice != null ? (
                      <>
                        <span className="text-sm font-bold text-amber-300">R{p.promotionPrice.toFixed(2)}</span>
                        <span className="text-xs text-emerald-600 line-through">R{p.price.toFixed(2)}</span>
                      </>
                    ) : (
                      <span className="text-sm text-emerald-300">R{p.price.toFixed(2)}</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {p.allergens && p.allergens.some((a) => a.toLowerCase() !== "none") ? (
                    p.allergens.filter((a) => a.toLowerCase() !== "none").map((a) => (
                      <span key={a} className="inline-flex items-center gap-2 text-xs rounded-full bg-emerald-800 border border-emerald-600 text-white px-2.5 py-1 font-medium">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                        {a}
                      </span>
                    ))
                  ) : (
                    <span className="inline-flex items-center gap-2 text-xs rounded-full bg-green-900 text-green-100 px-2 py-1">No allergens</span>
                  )}
                </div>
                <div className="flex items-center justify-between mt-auto gap-2">
                  <span className="text-xs text-emerald-600 group-hover:text-emerald-400 transition-colors">
                    View details →
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleQuickAdd(p); }}
                    className={`rounded-full px-4 py-2 text-white font-medium transition-colors text-sm ${
                      addedItems.has(p.id) ? "bg-green-500 hover:bg-green-600" : "bg-emerald-600 hover:bg-emerald-500"
                    }`}
                  >
                    {addedItems.has(p.id) ? "✓ Added" : "Quick Add"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      <CartSidebar />

      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={handleCloseModal}
          onAddToCart={handleQuickAdd}
          added={addedItems.has(selectedProduct.id)}
        />
      )}
    </>
  );
}
