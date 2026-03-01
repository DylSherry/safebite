"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useCart } from "../context/CartContext";

export default function CartPage() {
  const { cart, removeFromCart, updateQuantity, clearCart, total } = useCart();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <main className="flex-1 overflow-y-auto bg-emerald-950 p-6 sm:p-10">
        <h1 className="text-3xl font-bold text-white mb-8">Shopping Cart</h1>
        <p className="text-emerald-400">Loading…</p>
      </main>
    );
  }

  if (cart.length === 0) {
    return (
      <main className="flex-1 overflow-y-auto bg-emerald-950 p-6 sm:p-10">
        <h1 className="text-3xl font-bold text-white mb-8">Shopping Cart</h1>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-16 w-16 rounded-full bg-emerald-900 border border-emerald-700 flex items-center justify-center mb-5">
            <svg className="h-8 w-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
            </svg>
          </div>
          <p className="text-white font-semibold text-lg mb-1">Your cart is empty</p>
          <p className="text-emerald-500 text-sm mb-6">Add some products to get started.</p>
          <Link
            href="/"
            className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-6 py-2.5 text-white font-semibold transition-colors"
          >
            Browse Products
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto bg-emerald-950 p-6 sm:p-10">
      <h1 className="text-3xl font-bold text-white mb-8">Shopping Cart</h1>

      <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart items */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {cart.map((item) => (
            <div
              key={item.id}
              className="flex gap-5 bg-emerald-900 rounded-2xl border border-emerald-800 p-5 shadow-sm"
            >
              {/* Thumbnail */}
              {item.image_url && (
                <div className="h-24 w-24 rounded-xl overflow-hidden bg-emerald-800 shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                </div>
              )}

              {/* Info */}
              <div className="grow min-w-0">
                <h3 className="font-semibold text-white text-base leading-snug truncate">{item.name}</h3>
                {item.brand && <p className="text-sm text-emerald-400 mt-0.5">{item.brand}</p>}
                <p className="mt-2 font-bold">
                  {item.originalPrice != null ? (
                    <>
                      <span className="text-amber-300 text-base">R{item.price.toFixed(2)}</span>
                      <span className="ml-2 text-emerald-600 line-through text-sm font-normal">
                        R{item.originalPrice.toFixed(2)}
                      </span>
                    </>
                  ) : (
                    <span className="text-emerald-200 text-base">R{item.price.toFixed(2)}</span>
                  )}
                </p>
              </div>

              {/* Controls */}
              <div className="flex flex-col items-end justify-between shrink-0 gap-3">
                <button
                  onClick={() => removeFromCart(item.id)}
                  className="text-xs font-semibold text-red-400 hover:text-red-300 transition-colors"
                >
                  Remove
                </button>

                <div className="flex flex-col items-end gap-1.5">
                  {/* Stepper */}
                  <div className="flex items-center gap-1 bg-emerald-800 rounded-full p-1">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      aria-label="Decrease quantity"
                      className="h-8 w-8 rounded-full flex items-center justify-center bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-lg leading-none transition-colors"
                    >
                      −
                    </button>
                    <span className="w-8 text-center text-sm font-semibold text-white tabular-nums">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => {
                        const maxQty = typeof item.stock === "number" ? item.stock : Infinity;
                        if (item.quantity < maxQty) updateQuantity(item.id, item.quantity + 1);
                      }}
                      disabled={typeof item.stock === "number" && item.quantity >= item.stock}
                      aria-label="Increase quantity"
                      className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-lg leading-none transition-colors ${
                        typeof item.stock === "number" && item.quantity >= item.stock
                          ? "bg-emerald-900 text-emerald-700 cursor-not-allowed"
                          : "bg-emerald-700 hover:bg-emerald-600 text-white"
                      }`}
                    >
                      +
                    </button>
                  </div>

                  {/* Stock warning */}
                  {typeof item.stock === "number" && item.quantity >= item.stock && (
                    <p className="text-xs text-amber-400">
                      {item.stock === 0 ? "Out of stock" : `Max ${item.stock} available`}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Order summary */}
        <div className="bg-emerald-900 rounded-2xl border border-emerald-800 p-6 h-fit shadow-sm">
          <h2 className="text-lg font-bold text-white mb-5">Order Summary</h2>

          <div className="space-y-3 pb-5 border-b border-emerald-800">
            {cart.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-emerald-300 truncate mr-3">
                  {item.name}
                  <span className="text-emerald-500 ml-1">× {item.quantity}</span>
                </span>
                <span className="text-white font-medium shrink-0">
                  R{(item.price * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          <div className="flex justify-between font-bold text-white text-lg mt-5 mb-6">
            <span>Total</span>
            <span>R{total.toFixed(2)}</span>
          </div>

          <Link
            href="/checkout"
            className="block w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-3 text-white font-semibold transition-colors mb-3 text-center"
          >
            Proceed to Checkout
          </Link>

          <button
            onClick={clearCart}
            className="w-full rounded-xl border border-emerald-700 hover:border-emerald-500 px-4 py-3 text-emerald-300 hover:text-white hover:bg-emerald-800 font-medium transition-colors text-sm"
          >
            Clear Cart
          </button>

          <Link
            href="/"
            className="block text-center text-sm text-emerald-500 hover:text-emerald-300 mt-4 transition-colors"
          >
            ← Continue shopping
          </Link>
        </div>
      </div>
    </main>
  );
}
