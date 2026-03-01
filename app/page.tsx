"use client";


import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useCart } from "./context/CartContext";
import { useUserProfile } from "./hooks/useUserProfile";
import CartSidebar from "./components/CartSidebar";
import FilterSidebar from "./components/FilterSidebar";
import ProductModal from "./components/ProductModal";


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

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const { profile } = useUserProfile();
  const { addToCart } = useCart();
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());
  const [safeForMe, setSafeForMe] = useState(false);
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [searchPrompt, setSearchPrompt] = useState("");
  const router = useRouter();

  const handlePromptSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchPrompt.trim()) return;
    router.push(`/browse?prompt=${encodeURIComponent(searchPrompt.trim())}`);
  };

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

  const toggleCategory = (cat: string) =>
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });

  const effectivePrice = (p: Product) =>
    p.isOnPromotion && p.promotionPrice != null ? p.promotionPrice : p.price;

  const passesFilter = (p: Product) => {
    const allergens = (p.allergens || []).map((a) => a.toLowerCase()).filter((a) => a !== "none");
    if (safeForMe && profile) {
      const userAllergies = (profile.allergies || profile.dietary?.allergies || []).map((a) => a.toLowerCase());
      if (userAllergies.some((ua) => allergens.includes(ua))) return false;
    }
    const ep = effectivePrice(p);
    if (priceMin !== "" && ep < parseFloat(priceMin)) return false;
    if (priceMax !== "" && ep > parseFloat(priceMax)) return false;
    if (selectedCategories.size > 0) {
      if (!p.category || !selectedCategories.has(p.category)) return false;
    }
    return true;
  };

  const categories = Array.from(
    new Set(products.map((p) => p.category).filter((c): c is string => !!c))
  ).sort();

  const onPromotion = products.filter((p) => p.isOnPromotion && p.promotionPrice != null && passesFilter(p));
  const featured = products.filter((p) => p.isFeatured && passesFilter(p));
  const topSelling = [...products]
    .filter((p) => (p.salesCount ?? 0) > 0 && passesFilter(p))
    .sort((a, b) => (b.salesCount ?? 0) - (a.salesCount ?? 0))
    .slice(0, 5);

  const SkeletonCards = ({ count = 4 }: { count?: number }) => (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="shrink-0 w-44 bg-emerald-900 rounded-xl border border-emerald-800 overflow-hidden animate-pulse">
          <div className="h-28 bg-emerald-800" />
          <div className="p-3 space-y-2">
            <div className="h-3 w-3/4 rounded bg-emerald-800" />
            <div className="h-3 w-1/2 rounded bg-emerald-800" />
            <div className="h-7 w-full rounded-full bg-emerald-800 mt-2" />
          </div>
        </div>
      ))}
    </div>
  );

  const ProductCard = ({
    p,
    showDiscount = false,
    rank,
  }: {
    p: Product;
    showDiscount?: boolean;
    rank?: number;
  }) => (
    <article
      onClick={() => setSelectedProduct(p)}
      className="shrink-0 w-44 bg-emerald-900 rounded-xl border border-emerald-800 overflow-hidden hover:shadow-lg hover:shadow-emerald-900/60 transition-shadow cursor-pointer group"
    >
      <div className="relative h-28 bg-emerald-800">
        {p.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.image_url} alt={p.name} className={`h-full w-full object-cover ${isOutOfStock(p) ? "opacity-40" : ""}`} />
        ) : (
          <div className="h-full flex items-center justify-center text-emerald-500 text-xs">No image</div>
        )}
        {isOutOfStock(p) ? (
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="rounded-full bg-black/70 text-white text-xs font-bold px-2.5 py-0.5">Out of Stock</span>
          </span>
        ) : (
          <>
            {showDiscount && p.promotionPrice != null && (
              <span className="absolute top-2 right-2 rounded-full bg-amber-500 text-white text-xs font-bold px-2 py-0.5">
                -{Math.round(((p.price - p.promotionPrice) / p.price) * 100)}%
              </span>
            )}
            {rank != null && (
              <span className="absolute top-2 left-2 rounded-full bg-emerald-950/80 text-emerald-300 text-xs font-bold px-2 py-0.5 border border-emerald-700">
                #{rank + 1}
              </span>
            )}
            {p.isFeatured && rank == null && !showDiscount && (
              <span className="absolute top-2 right-2 rounded-full bg-emerald-600 text-white text-xs font-semibold px-2 py-0.5">Featured</span>
            )}
          </>
        )}
      </div>
      <div className="p-3">
        <p className="text-white text-sm font-medium truncate">{p.name}</p>
        {p.brand && <p className="text-emerald-400 text-xs truncate">{p.brand}</p>}
        <div className="flex items-baseline gap-1.5 mt-1">
          {showDiscount && p.promotionPrice != null ? (
            <>
              <span className="text-amber-300 font-bold text-sm">R{p.promotionPrice.toFixed(2)}</span>
              <span className="text-emerald-600 text-xs line-through">R{p.price.toFixed(2)}</span>
            </>
          ) : (
            <span className="text-emerald-200 font-bold text-sm">R{p.price.toFixed(2)}</span>
          )}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); handleQuickAdd(p); }}
          disabled={isOutOfStock(p)}
          className={`mt-2 w-full rounded-full py-1.5 text-xs font-semibold transition-colors ${
            isOutOfStock(p)
              ? "bg-emerald-900 text-emerald-600 cursor-not-allowed"
              : addedItems.has(p.id)
              ? "bg-green-500 text-white"
              : showDiscount
              ? "bg-amber-500 hover:bg-amber-400 text-white"
              : "bg-emerald-600 hover:bg-emerald-500 text-white"
          }`}
        >
          {isOutOfStock(p) ? "Out of Stock" : addedItems.has(p.id) ? "✓ Added" : "Add to Cart"}
        </button>
      </div>
    </article>
  );


  const anyFilterActive = safeForMe || priceMin !== "" || priceMax !== "" || selectedCategories.size > 0;

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

      {/* Main content – discovery */}
      <main className="flex-1 overflow-y-auto bg-emerald-950">

        {/* Hero */}
        <section className="px-8 pt-10 pb-8 border-b border-emerald-800/60">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-bold text-white mb-3">
              {profile?.displayName ? `Welcome back, ${profile.displayName.split(" ")[0]}!` : "Welcome to SafeBite"}
            </h1>
            <p className="text-emerald-300 text-lg leading-relaxed mb-5">
              Shop safely with allergen-aware product discovery. Find deals, top picks, and food that works for you.
            </p>
            <form onSubmit={handlePromptSearch} className="mb-5">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchPrompt}
                  onChange={(e) => setSearchPrompt(e.target.value)}
                  placeholder='e.g. "dairy-free snacks under R50" or "nut-free breakfast"'
                  className="flex-1 rounded-xl bg-emerald-900/80 border border-emerald-700 px-4 py-3 text-sm text-white placeholder-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="submit"
                  disabled={!searchPrompt.trim()}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed px-5 py-3 text-sm font-semibold text-white transition-colors shrink-0"
                >
                  Search
                </button>
              </div>
              <p className="mt-2 text-xs text-emerald-500">Describe what you need — allergen requirements, price range, category, etc.</p>
            </form>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/browse"
                className="inline-flex items-center gap-2 rounded-full bg-emerald-600 hover:bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors shadow-md"
              >
                Browse All Products
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              <Link
                href="/scan-allergens"
                className="inline-flex items-center gap-2 rounded-full border border-emerald-600 hover:bg-emerald-800 px-5 py-2.5 text-sm font-semibold text-emerald-200 transition-colors"
              >
                Scan a Label
              </Link>
            </div>
          </div>
        </section>

        <div className="px-8 py-8 flex flex-col gap-10">

          {/* On Promotion */}
          {(loading || onPromotion.length > 0) && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 px-2.5 py-1 text-xs font-bold text-amber-300 uppercase tracking-wider">
                    🏷 On Sale
                  </span>
                  <h2 className="text-xl font-bold text-white">Promotions</h2>
                </div>
                <Link href="/browse" className="text-xs text-emerald-400 hover:text-emerald-200 transition-colors">See all →</Link>
              </div>
              {loading ? <SkeletonCards /> : (
                <div className="flex gap-4 overflow-x-auto pb-2">
                  {onPromotion.map((p) => <ProductCard key={p.id} p={p} showDiscount />)}
                </div>
              )}
            </section>
          )}

          {/* Featured */}
          {(loading || featured.length > 0) && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-1 text-xs font-bold text-emerald-300 uppercase tracking-wider">
                    ⭐ Picks
                  </span>
                  <h2 className="text-xl font-bold text-white">Featured Products</h2>
                </div>
                <Link href="/browse" className="text-xs text-emerald-400 hover:text-emerald-200 transition-colors">See all →</Link>
              </div>
              {loading ? <SkeletonCards /> : (
                <div className="flex gap-4 overflow-x-auto pb-2">
                  {featured.map((p) => <ProductCard key={p.id} p={p} />)}
                </div>
              )}
            </section>
          )}

          {/* Top Sellers */}
          {(loading || topSelling.length > 0) && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-500/20 border border-orange-500/40 px-2.5 py-1 text-xs font-bold text-orange-300 uppercase tracking-wider">
                    🔥 Popular
                  </span>
                  <h2 className="text-xl font-bold text-white">Top Sellers</h2>
                </div>
                <Link href="/browse" className="text-xs text-emerald-400 hover:text-emerald-200 transition-colors">See all →</Link>
              </div>
              {loading ? <SkeletonCards /> : (
                <div className="flex gap-4 overflow-x-auto pb-2">
                  {topSelling.map((p, rank) => <ProductCard key={p.id} p={p} rank={rank} />)}
                </div>
              )}
            </section>
          )}

          {/* Empty state */}
          {!loading && onPromotion.length === 0 && featured.length === 0 && topSelling.length === 0 && anyFilterActive && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-emerald-200 font-semibold text-lg mb-2">No products match your filters</p>
              <p className="text-emerald-500 text-sm mb-5">Try adjusting your dietary preferences.</p>
              <button
                onClick={() => { setSafeForMe(false); setPriceMin(""); setPriceMax(""); setSelectedCategories(new Set()); }}
                className="rounded-full border border-emerald-600 px-5 py-2 text-sm text-emerald-300 hover:bg-emerald-800 hover:text-white transition-colors"
              >
                Clear filters
              </button>
            </div>
          )}
          {!loading && onPromotion.length === 0 && featured.length === 0 && topSelling.length === 0 && !anyFilterActive && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="h-16 w-16 rounded-full bg-emerald-900 border border-emerald-700 flex items-center justify-center mb-4">
                <svg className="h-8 w-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z" />
                </svg>
              </div>
              <p className="text-emerald-200 font-semibold text-lg mb-2">No curated content yet</p>
              <p className="text-emerald-500 text-sm mb-6 max-w-sm">
                Use the Admin panel to mark products as Featured, On Promotion, or update sales counts to populate this page.
              </p>
              <Link href="/browse" className="inline-flex items-center gap-2 rounded-full bg-emerald-700 hover:bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors">
                Browse All Products
              </Link>
            </div>
          )}
        </div>
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
