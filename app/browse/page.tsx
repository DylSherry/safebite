"use client";

import React, { Suspense, useState, useEffect, useCallback } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useCart } from "../context/CartContext";
import { useUserProfile } from "../hooks/useUserProfile";
import CartSidebar from "../components/CartSidebar";
import FilterSidebar from "../components/FilterSidebar";
import ProductModal from "../components/ProductModal";
import { useSearchParams, useRouter } from "next/navigation";

type Product = {
  id: string;
  name: string;
  brand?: string;
  price: number;
  stock?: number;
  image_url?: string;
  allergens?: string[];
  tags?: string[];
  ingredients?: string;
  safety_score?: number;
  salesCount?: number;
  isOnPromotion?: boolean;
  promotionPrice?: number;
  isFeatured?: boolean;
  category?: string;
};

// (ProductModal lives in app/components/ProductModal.tsx)

// ── Smart prompt search ──────────────────────────────────────────────────────
type ParsedPrompt = {
  maxPrice: number | null;
  minPrice: number | null;
  allergenFree: string[];
  keywords: string[];
  raw: string;
};

const ALLERGEN_TRIGGERS: { family: string; allergenWords: string[]; phrases: string[] }[] = [
  { family: "nuts",   allergenWords: ["nuts","nut","peanut","peanuts"],                   phrases: ["nut-free","nut free","no nuts","peanut-free","peanut free","no peanuts"] },
  { family: "dairy",  allergenWords: ["dairy","milk","lactose","cream","cheese","butter"], phrases: ["dairy-free","dairy free","no dairy","lactose-free","lactose free","milk-free","milk free","no milk"] },
  { family: "gluten", allergenWords: ["gluten","wheat"],                                  phrases: ["gluten-free","gluten free","no gluten","wheat-free","wheat free","celiac","coeliac"] },
  { family: "soy",    allergenWords: ["soy","soya"],                                      phrases: ["soy-free","soy free","no soy","soya-free"] },
  { family: "eggs",   allergenWords: ["egg","eggs"],                                      phrases: ["egg-free","egg free","no eggs","eggless"] },
];

const SEARCH_STOP_WORDS = new Set([
  "i","am","looking","for","a","an","the","want","need","find","me","some","my","is","are","can",
  "you","with","and","or","that","have","without","free","no","not","any","something","please",
  "show","give","do","in","on","at","to","of","r","rands","budget","price","cheap","affordable",
  "good","great","best","top","under","above","over","below",
]);

function parsePrompt(prompt: string): ParsedPrompt {
  const lower = prompt.toLowerCase();
  let maxPrice: number | null = null;
  let minPrice: number | null = null;

  const rangeMatch = lower.match(/r\s*(\d+(?:\.\d+)?)\s*(?:to|-)\s*r?\s*(\d+(?:\.\d+)?)/i);
  if (rangeMatch) { minPrice = parseFloat(rangeMatch[1]); maxPrice = parseFloat(rangeMatch[2]); }

  if (!maxPrice) {
    const m = lower.match(/(?:under|below|less than|max(?:imum)?|budget(?:\s+of)?|no more than|at most|cheaper than)\s*r?\s*(\d+(?:\.\d+)?)/i);
    if (m) maxPrice = parseFloat(m[1]);
  }
  if (!minPrice) {
    const m = lower.match(/(?:above|over|more than|at least|minimum|starting from?)\s*r?\s*(\d+(?:\.\d+)?)/i);
    if (m) minPrice = parseFloat(m[1]);
  }

  const allergenFree: string[] = [];
  for (const entry of ALLERGEN_TRIGGERS) {
    if (entry.phrases.some((p) => lower.includes(p))) {
      if (!allergenFree.includes(entry.family)) allergenFree.push(entry.family);
    }
  }

  const keywords = lower
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !SEARCH_STOP_WORDS.has(w) && !/^\d+$/.test(w));

  return { maxPrice, minPrice, allergenFree, keywords, raw: prompt };
}

function scoreProduct(product: Product, parsed: ParsedPrompt): number {
  const ep = product.isOnPromotion && product.promotionPrice != null ? product.promotionPrice : product.price;
  const allergens = (product.allergens || []).map((a) => a.toLowerCase()).filter((a) => a !== "none");

  if (parsed.maxPrice !== null && ep > parsed.maxPrice) return -1;
  if (parsed.minPrice !== null && ep < parsed.minPrice) return -1;

  for (const family of parsed.allergenFree) {
    const entry = ALLERGEN_TRIGGERS.find((e) => e.family === family);
    if (entry && allergens.some((pa) => entry.allergenWords.some((aw) => pa.includes(aw) || aw.includes(pa)))) return -1;
  }

  let score = 0;
  if (parsed.maxPrice !== null) score += 8;
  score += parsed.allergenFree.length * 12;

  const text = [product.name, product.brand, product.category, product.ingredients,
    ...(product.allergens || []), ...(product.tags || [])].filter(Boolean).join(" ").toLowerCase();
  for (const kw of parsed.keywords) { if (text.includes(kw)) score += 6; }

  score += Math.min((product.salesCount ?? 0) * 0.3, 5);
  if (product.isOnPromotion) score += 2;
  return score;
}

function getMatchReasons(product: Product, parsed: ParsedPrompt): string[] {
  const reasons: string[] = [];
  const ep = product.isOnPromotion && product.promotionPrice != null ? product.promotionPrice : product.price;
  if (parsed.maxPrice !== null && ep <= parsed.maxPrice) reasons.push(`under R${parsed.maxPrice}`);
  if (parsed.minPrice !== null && ep >= parsed.minPrice) reasons.push(`over R${parsed.minPrice}`);
  for (const family of parsed.allergenFree) reasons.push(`${family}-free`);
  const text = [product.name, product.brand, product.category].filter(Boolean).join(" ").toLowerCase();
  for (const kw of parsed.keywords) { if (text.includes(kw) && reasons.length < 3) reasons.push(kw); }
  return reasons.slice(0, 3);
}

function BrowsePageContent() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [safeForMe, setSafeForMe] = useState(false);
  const [search, setSearch] = useState("");
  const { profile, updateProfile } = useUserProfile();
  const { addToCart, cart } = useCart();
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());

  const isWishlisted = (id: string) => (profile?.wishlist ?? []).includes(id);

  const toggleWishlist = async (productId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!profile) return;
    const current = profile.wishlist ?? [];
    await updateProfile({ wishlist: current.includes(productId) ? current.filter((x) => x !== productId) : [...current, productId] });
  };
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activePrompt, setActivePrompt] = useState("");
  const [parsedPrompt, setParsedPrompt] = useState<ParsedPrompt | null>(null);

  useEffect(() => {
    const p = searchParams.get("prompt") || "";
    setActivePrompt(p);
    setParsedPrompt(p.trim() ? parsePrompt(p) : null);
  }, [searchParams]);

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

  const isOutOfStock = (p: Product) => typeof p.stock === "number" && p.stock <= 0;

  const handleQuickAdd = (product: Product) => {
    if (isOutOfStock(product)) return;
    const effectiveP = product.isOnPromotion && product.promotionPrice != null ? product.promotionPrice : product.price;
    addToCart({
      id: product.id,
      name: product.name,
      price: effectiveP,
      originalPrice: product.isOnPromotion && product.promotionPrice != null ? product.price : undefined,
      image_url: product.image_url,
      brand: product.brand,
      allergens: product.allergens,
      safety_score: product.safety_score ?? computeScore(product.allergens),
      stock: product.stock,
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

  const applyBaseFilters = (product: Product): boolean => {
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
  };

  const promptScoredResults: { product: Product; score: number }[] | null = parsedPrompt
    ? products
        .filter(applyBaseFilters)
        .map((p) => ({ product: p, score: scoreProduct(p, parsedPrompt) }))
        .filter(({ score }) => score >= 0)
        .sort((a, b) => b.score - a.score)
    : null;

  const filteredProducts: Product[] = promptScoredResults
    ? promptScoredResults.map(({ product }) => product)
    : products
        .filter(applyBaseFilters)
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
        {activePrompt && parsedPrompt && (
          <div className="mb-5 rounded-xl bg-emerald-800/50 border border-emerald-700 px-4 py-3 flex items-start sm:items-center justify-between gap-3 flex-wrap">
            <div className="flex items-start sm:items-center gap-3 flex-wrap min-w-0">
              <span className="text-base shrink-0">🔍</span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">Smart Search</p>
                <p className="text-white text-sm font-medium">&#34;{activePrompt}&#34;</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {parsedPrompt.maxPrice != null && (
                  <span className="rounded-full bg-blue-900/50 border border-blue-700 text-blue-300 text-xs px-2.5 py-0.5">under R{parsedPrompt.maxPrice}</span>
                )}
                {parsedPrompt.minPrice != null && (
                  <span className="rounded-full bg-blue-900/50 border border-blue-700 text-blue-300 text-xs px-2.5 py-0.5">over R{parsedPrompt.minPrice}</span>
                )}
                {parsedPrompt.allergenFree.map((a) => (
                  <span key={a} className="rounded-full bg-green-900/50 border border-green-700 text-green-300 text-xs px-2.5 py-0.5">no {a}</span>
                ))}
              </div>
            </div>
            <button
              onClick={() => { setActivePrompt(""); setParsedPrompt(null); router.replace("/browse"); }}
              className="rounded-lg border border-emerald-700 px-3 py-1.5 text-xs text-emerald-400 hover:bg-emerald-800 hover:text-white transition-colors shrink-0"
            >
              Clear ✕
            </button>
          </div>
        )}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h1 className="text-3xl font-bold text-white">
            {activePrompt ? <>{filteredProducts.length} result{filteredProducts.length !== 1 ? "s" : ""}</> : "All Products"}
          </h1>
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
            <p className="text-emerald-200 font-medium mb-1">
              {activePrompt ? "No products match your search." : "No products match your filters."}
            </p>
            <p className="text-emerald-500 text-sm mb-4">
              {activePrompt ? "Try rephrasing your query or relaxing the price / allergen requirements." : "Try adjusting your search or filters."}
            </p>
            <button
              onClick={() => { setSearch(""); setPriceMin(""); setPriceMax(""); setSelectedCategories(new Set()); setSafeForMe(false); setActivePrompt(""); setParsedPrompt(null); router.replace("/browse"); }}
              className="rounded-lg border border-emerald-600 px-4 py-2 text-sm text-emerald-300 hover:bg-emerald-800 transition-colors"
            >
              {activePrompt ? "Clear search" : "Clear all filters"}
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
                    <img src={p.image_url} alt={p.name} className={`h-full w-full object-cover ${isOutOfStock(p) ? "opacity-40" : ""}`} />
                  ) : (
                    <div className="text-emerald-400 text-sm">No image</div>
                  )}
                  {isOutOfStock(p) ? (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="rounded-full bg-black/70 text-white text-xs font-bold px-3 py-1">Out of Stock</span>
                    </span>
                  ) : p.isOnPromotion && p.promotionPrice != null ? (
                    <span className="absolute top-2 right-2 rounded-full bg-amber-500 text-white text-xs font-bold px-2 py-0.5">
                      -{Math.round(((p.price - p.promotionPrice) / p.price) * 100)}%
                    </span>
                  ) : null}
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
                {parsedPrompt && getMatchReasons(p, parsedPrompt).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {getMatchReasons(p, parsedPrompt).map((r) => (
                      <span key={r} className="rounded-full bg-emerald-700/60 border border-emerald-600 text-emerald-300 text-xs px-2 py-0.5">✓ {r}</span>
                    ))}
                  </div>
                )}
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
                  <div className="flex items-center gap-1.5">
                    {profile && (
                      <button
                        onClick={(e) => toggleWishlist(p.id, e)}
                        title={isWishlisted(p.id) ? "Remove from wishlist" : "Add to wishlist"}
                        className={`rounded-full p-2 border transition-colors ${
                          isWishlisted(p.id)
                            ? "bg-rose-600 border-rose-500 text-white"
                            : "bg-emerald-800 border-emerald-700 text-emerald-400 hover:border-rose-500 hover:text-rose-400"
                        }`}
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill={isWishlisted(p.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleQuickAdd(p); }}
                      disabled={isOutOfStock(p)}
                      className={`rounded-full px-4 py-2 text-white font-medium transition-colors text-sm ${
                        isOutOfStock(p)
                          ? "bg-emerald-900 text-emerald-600 cursor-not-allowed"
                          : addedItems.has(p.id)
                          ? "bg-green-500 hover:bg-green-600"
                          : "bg-emerald-600 hover:bg-emerald-500"
                      }`}
                    >
                      {isOutOfStock(p) ? "Out of Stock" : addedItems.has(p.id) ? "✓ Added" : "Quick Add"}
                    </button>
                  </div>
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

export default function BrowsePage() {
  return (
    <Suspense fallback={<main className="flex-1 overflow-y-auto bg-emerald-950 p-10"><p className="text-emerald-400">Loading…</p></main>}>
      <BrowsePageContent />
    </Suspense>
  );
}
