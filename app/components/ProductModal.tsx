"use client";

import React, { useEffect } from "react";
import { Product } from "../../lib/types";

export default function ProductModal({
  product,
  onClose,
  onAddToCart,
  added,
}: {
  product: Product;
  onClose: () => void;
  onAddToCart: (p: Product) => void;
  added: boolean;
}) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
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
          className="absolute top-3 right-3 text-emerald-400 hover:text-white rounded-full p-1 hover:bg-emerald-800 transition-colors z-10"
          aria-label="Close"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Image */}
        <div className="relative h-56 w-full shrink-0 overflow-hidden rounded-t-2xl bg-emerald-800 flex items-center justify-center">
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
          {/* Name, brand & category */}
          <div>
            <h2 className="text-2xl font-bold text-white">{product.name}</h2>
            {product.brand && <p className="text-emerald-400 text-sm mt-0.5">{product.brand}</p>}
            {product.category && (
              <span className="mt-1 inline-block text-xs rounded-full bg-emerald-800 border border-emerald-600 text-emerald-300 px-2.5 py-0.5">
                {product.category}
              </span>
            )}
          </div>

          {/* Price & stock */}
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
              <span
                className={`ml-auto text-xs font-medium ${
                  product.stock > 10
                    ? "text-green-400"
                    : product.stock > 0
                    ? "text-amber-400"
                    : "text-red-400"
                }`}
              >
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
                    product.safety_score >= 80
                      ? "bg-green-500"
                      : product.safety_score >= 50
                      ? "bg-amber-400"
                      : "bg-red-500"
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
                product.allergens!
                  .filter((a) => a.toLowerCase() !== "none")
                  .map((a) => (
                    <span
                      key={a}
                      className="inline-flex items-center gap-1.5 text-xs rounded-full bg-red-900/40 border border-red-700/50 text-red-300 px-2.5 py-1"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                      {a}
                    </span>
                  ))
              ) : (
                <span className="text-xs rounded-full bg-green-900/40 border border-green-700/50 text-green-300 px-2.5 py-1">
                  No allergens
                </span>
              )}
            </div>
          </div>

          {/* Certifications */}
          {product.certifications && product.certifications.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wide mb-1.5">Certifications</p>
              <div className="flex flex-wrap gap-2">
                {product.certifications.map((c) => (
                  <span
                    key={c}
                    className="text-xs rounded-full bg-emerald-800 border border-emerald-600 text-emerald-200 px-2.5 py-1"
                  >
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
