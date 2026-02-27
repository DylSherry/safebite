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
      <main className="p-8">
        <h1 className="text-3xl font-semibold mb-6 text-white">Shopping Cart</h1>
        <p className="text-emerald-200">Loading…</p>
      </main>
    );
  }

  if (cart.length === 0) {
    return (
      <main className="p-8">
        <h1 className="text-3xl font-semibold mb-6 text-white">Shopping Cart</h1>
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-emerald-300 mb-6">Your cart is empty</p>
          <Link href="/" className="rounded bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700">
            Continue Shopping
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="p-8">
      <h1 className="text-3xl font-semibold mb-6 text-white">Shopping Cart</h1>

      <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="space-y-4">
            {cart.map((item) => (
              <div key={item.id} className="flex gap-4 bg-emerald-900 rounded-lg shadow p-4 border border-emerald-800">
                {item.image_url && (
                  <div className="h-24 w-24 rounded overflow-hidden bg-emerald-800 flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                  </div>
                )}

                <div className="flex-grow">
                  <h3 className="font-medium text-white">{item.name}</h3>
                  {item.brand && <p className="text-sm text-emerald-300">{item.brand}</p>}
                  <p className="text-sm font-semibold text-white mt-2">R{item.price.toFixed(2)}</p>
                </div>

                <div className="flex flex-col items-end justify-between">
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="text-sm text-red-500 hover:text-red-400 font-medium"
                  >
                    Remove
                  </button>

                  <div className="flex items-center gap-2 border border-emerald-700 rounded">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="px-2 py-1 text-white hover:bg-emerald-800"
                    >
                      −
                    </button>
                    <span className="px-3 py-1 text-sm text-white">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="px-2 py-1 text-white hover:bg-emerald-800"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-emerald-900 rounded-lg shadow p-6 h-fit border border-emerald-800">
          <h2 className="text-lg font-semibold text-white mb-4">Order summary</h2>

          <div className="space-y-2 mb-4 pb-4 border-b border-emerald-800">
            <div className="flex justify-between text-sm text-emerald-200">
              <span>Subtotal</span>
              <span>R{total.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex justify-between font-semibold text-white mb-6">
            <span>Total</span>
            <span>R{total.toFixed(2)}</span>
          </div>

          <Link
            href="/checkout"
            className="block w-full rounded bg-emerald-600 px-4 py-2 text-white font-medium hover:bg-emerald-700 mb-3 text-center"
          >
            Checkout
          </Link>

          <button
            onClick={clearCart}
            className="w-full rounded border border-emerald-700 px-4 py-2 text-emerald-200 hover:bg-emerald-800"
          >
            Clear cart
          </button>

          <Link href="/products" className="block text-center text-sm text-emerald-400 hover:text-emerald-300 mt-4">
            Continue shopping
          </Link>
        </div>
      </div>
    </main>
  );
}
