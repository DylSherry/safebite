"use client";

import Link from "next/link";
import { useCart } from "../context/CartContext";
import { useUserProfile } from "../hooks/useUserProfile";

export default function CartSidebar() {
  const { cart, total } = useCart();
  const { profile } = useUserProfile();

  const activeCartAllergens = Array.from(
    new Set(
      cart
        .flatMap((i) => i.allergens || [])
        .map((a) => a.toLowerCase())
        .filter((a) => a && a !== "none")
    )
  );

  const cartSafetyScore =
    cart.length === 0 ? 0 : Math.max(0, 100 - activeCartAllergens.length * 10);

  return (
    <aside className="w-72 shrink-0 border-l border-emerald-800 bg-emerald-900 p-5 overflow-y-auto hidden lg:flex lg:flex-col gap-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-emerald-500 px-1">
        Cart Monitor
      </p>

      {cart.length === 0 ? (
        <div className="rounded-2xl border border-emerald-800 bg-emerald-950/40 p-5 flex flex-col items-center text-center gap-2">
          <div className="h-10 w-10 rounded-full bg-emerald-800 flex items-center justify-center mb-1">
            <svg
              className="h-5 w-5 text-emerald-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"
              />
            </svg>
          </div>
          <p className="text-sm font-semibold text-white">Your cart is empty</p>
          <p className="text-xs text-emerald-400">
            Add products to see safety information here.
          </p>
        </div>
      ) : (
        <>
          {/* Safety score card */}
          {(() => {
            const pct = Math.round(cartSafetyScore);
            const scoreColor =
              pct >= 80
                ? "text-emerald-300"
                : pct >= 50
                ? "text-amber-300"
                : "text-red-400";
            const barColor =
              pct >= 80
                ? "bg-emerald-500"
                : pct >= 50
                ? "bg-amber-500"
                : "bg-red-500";
            return (
              <div className="rounded-2xl border border-emerald-800 bg-emerald-950/40 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-500 mb-3">
                  General Safety Score
                </p>
                <div className="flex items-end justify-between mb-2">
                  <p className={`text-4xl font-bold leading-none ${scoreColor}`}>
                    {pct}
                  </p>
                  <p className="text-xs text-emerald-500 mb-1">/ 100</p>
                </div>
                <div className="h-2 w-full rounded-full bg-emerald-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-xs text-emerald-500 mt-2">
                  {pct >= 80
                    ? "Safe for most dietary needs"
                    : pct >= 50
                    ? "Contains some allergens"
                    : "High allergen content"}
                </p>
              </div>
            );
          })()}

          {/* Active allergens card */}
          <div className="rounded-2xl border border-emerald-800 bg-emerald-950/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-500 mb-3">
              Active Allergens
            </p>
            {activeCartAllergens.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {activeCartAllergens.map((a) => (
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
              <div className="flex items-center gap-2">
                <div className="h-5 w-5 rounded-full bg-emerald-700 flex items-center justify-center shrink-0">
                  <svg
                    className="h-3 w-3 text-emerald-300"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <p className="text-sm text-emerald-300 font-medium">None detected</p>
              </div>
            )}
          </div>

          {/* Safe for you card */}
          {(() => {
            const userAllergies = (
              profile?.allergies ||
              profile?.dietary?.allergies ||
              []
            ).map((a) => a.toLowerCase());

            if (!profile) {
              return (
                <div className="rounded-2xl border border-emerald-800 bg-emerald-950/40 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-500 mb-3">
                    Safe for You
                  </p>
                  <p className="text-xs text-emerald-400">
                    <Link
                      href="/login"
                      className="text-emerald-300 hover:text-white underline underline-offset-2 transition-colors"
                    >
                      Sign in
                    </Link>{" "}
                    to see personalised safety.
                  </p>
                </div>
              );
            }

            if (userAllergies.length === 0) {
              return (
                <div className="rounded-2xl border border-emerald-800 bg-emerald-950/40 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-500 mb-3">
                    Safe for You
                  </p>
                  <p className="text-xs text-emerald-400">
                    No allergies on your profile.{" "}
                    <Link
                      href="/profile"
                      className="text-emerald-300 hover:text-white underline underline-offset-2 transition-colors"
                    >
                      Add them
                    </Link>{" "}
                    for a personalised check.
                  </p>
                </div>
              );
            }

            const triggered = userAllergies.filter((ua) =>
              activeCartAllergens.includes(ua)
            );
            const safe = triggered.length === 0;

            return (
              <div
                className={`rounded-2xl border p-4 ${
                  safe
                    ? "border-emerald-700 bg-emerald-800/40"
                    : "border-amber-700/60 bg-amber-900/20"
                }`}
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-500 mb-3">
                  Safe for You
                </p>
                {safe ? (
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-full bg-emerald-700 flex items-center justify-center shrink-0">
                      <svg
                        className="h-4 w-4 text-emerald-200"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-emerald-200">
                        Looks safe!
                      </p>
                      <p className="text-xs text-emerald-400">
                        No conflicts with your allergens.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="h-8 w-8 rounded-full bg-amber-900/60 border border-amber-700 flex items-center justify-center shrink-0">
                        <svg
                          className="h-4 w-4 text-amber-300"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                          />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-amber-200">
                          Allergen conflict
                        </p>
                        <p className="text-xs text-amber-400/80">
                          Your cart contains:
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {triggered.map((a) => (
                        <span
                          key={a}
                          className="inline-flex items-center gap-1 rounded-full bg-amber-900/50 border border-amber-700 text-amber-200 text-xs px-2.5 py-1 font-medium"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Cart total + checkout card */}
          <div className="rounded-2xl border border-emerald-700 bg-emerald-800/50 p-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                Cart Total
              </p>
              <p className="text-2xl font-bold text-white">R{total.toFixed(2)}</p>
            </div>
            <Link
              href="/checkout"
              className="block w-full rounded-xl bg-emerald-500 px-4 py-2.5 text-center text-white font-semibold hover:bg-emerald-400 transition-colors shadow-md shadow-emerald-900/50"
            >
              Proceed to Checkout
            </Link>
            <Link
              href="/cart"
              className="block w-full mt-2 rounded-xl border border-emerald-700 px-4 py-2 text-center text-emerald-300 text-sm font-medium hover:bg-emerald-800 hover:text-white transition-colors"
            >
              View Cart
            </Link>
          </div>
        </>
      )}
    </aside>
  );
}
