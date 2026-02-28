"use client";

import React from "react";
import Link from "next/link";
import { useUserProfile } from "../hooks/useUserProfile";

interface FilterSidebarProps {
  safeForMe: boolean;
  onSafeForMeChange: (v: boolean) => void;
  priceMin: string;
  priceMax: string;
  onPriceMinChange: (v: string) => void;
  onPriceMaxChange: (v: string) => void;
  /** Unique category values derived from the current product list */
  categories?: string[];
  selectedCategories: Set<string>;
  onToggleCategory: (cat: string) => void;
  onClearAll: () => void;
}

export default function FilterSidebar({
  safeForMe,
  onSafeForMeChange,
  priceMin,
  priceMax,
  onPriceMinChange,
  onPriceMaxChange,
  categories = [],
  selectedCategories,
  onToggleCategory,
  onClearAll,
}: FilterSidebarProps) {
  const { profile } = useUserProfile();

  const anyActive =
    safeForMe ||
    priceMin !== "" ||
    priceMax !== "" ||
    selectedCategories.size > 0;

  return (
    <aside className="w-64 shrink-0 border-r border-emerald-800 bg-emerald-900 p-5 overflow-y-auto hidden md:flex md:flex-col gap-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-emerald-500 px-1">
        Filters
      </p>

      {/* Safe-for-me */}
      <div
        className={`rounded-2xl border p-4 transition-colors ${
          safeForMe
            ? "bg-emerald-800/60 border-emerald-600"
            : "bg-emerald-950/40 border-emerald-800"
        }`}
      >
        <label className="flex items-center justify-between cursor-pointer select-none group">
          <div>
            <p className="text-sm font-semibold text-white group-hover:text-emerald-100 transition-colors">
              Safe for me
            </p>
            <p className="text-xs text-emerald-400 mt-0.5">
              Hide products with your allergens
            </p>
          </div>
          <span className="relative ml-3 shrink-0">
            <input
              type="checkbox"
              checked={safeForMe}
              onChange={() => onSafeForMeChange(!safeForMe)}
              className="sr-only peer"
            />
            <span className="block w-10 h-6 rounded-full bg-emerald-800 border border-emerald-700 peer-checked:bg-emerald-500 peer-checked:border-emerald-400 transition-colors duration-200" />
            <span className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-200 peer-checked:translate-x-4" />
          </span>
        </label>
        {safeForMe && (
          <div className="mt-4 pt-4 border-t border-emerald-700/60">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-2">
              Your allergens
            </p>
            {(profile?.allergies || profile?.dietary?.allergies || []).length ? (
              <div className="flex flex-wrap gap-1.5">
                {(profile?.allergies || profile?.dietary?.allergies || []).map((a) => (
                  <span
                    key={a}
                    className="inline-flex items-center gap-1 rounded-full bg-amber-900/50 border border-amber-700 text-amber-200 text-xs px-2.5 py-1 font-medium"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                    {a}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-emerald-400 italic">None listed yet.</p>
            )}
            <Link
              href="/profile"
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-emerald-400 hover:text-white transition-colors"
            >
              Edit allergies
              <svg
                className="h-3 w-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>
          </div>
        )}
      </div>

      {/* Price filter */}
      <div className="rounded-2xl border border-emerald-800 bg-emerald-950/40 p-4 flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-500">
          Price (R)
        </p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            placeholder="Min"
            value={priceMin}
            onChange={(e) => onPriceMinChange(e.target.value)}
            className="w-full rounded-lg border border-emerald-700 bg-emerald-900 px-3 py-1.5 text-sm text-white placeholder-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <span className="text-emerald-500 shrink-0 text-xs">–</span>
          <input
            type="number"
            min={0}
            placeholder="Max"
            value={priceMax}
            onChange={(e) => onPriceMaxChange(e.target.value)}
            className="w-full rounded-lg border border-emerald-700 bg-emerald-900 px-3 py-1.5 text-sm text-white placeholder-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Category filter */}
      {categories.length > 0 && (
        <div className="rounded-2xl border border-emerald-800 bg-emerald-950/40 p-4 flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-500">
            Category
          </p>
          {categories.map((cat) => (
            <label
              key={cat}
              className="flex items-center justify-between cursor-pointer select-none group"
            >
              <p className="text-sm text-white group-hover:text-emerald-100 transition-colors">
                {cat}
              </p>
              <span className="relative ml-3 shrink-0">
                <input
                  type="checkbox"
                  checked={selectedCategories.has(cat)}
                  onChange={() => onToggleCategory(cat)}
                  className="sr-only peer"
                />
                <span className="block w-10 h-6 rounded-full bg-emerald-800 border border-emerald-700 peer-checked:bg-emerald-500 peer-checked:border-emerald-400 transition-colors duration-200" />
                <span className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-200 peer-checked:translate-x-4" />
              </span>
            </label>
          ))}
        </div>
      )}

      {/* Clear all */}
      {anyActive && (
        <button
          onClick={onClearAll}
          className="rounded-xl border border-emerald-700 py-2 text-xs font-medium text-emerald-400 hover:bg-emerald-800 hover:text-white transition-colors"
        >
          Clear filters
        </button>
      )}
    </aside>
  );
}
