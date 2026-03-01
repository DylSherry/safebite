"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "../context/CartContext";
import { useAuth } from "../hooks/useAuth";

type PaymentMethod = "card" | "eft";

type DeliveryDetails = {
  fullName: string;
  address: string;
  city: string;
  postalCode: string;
};

const EMPTY_DELIVERY: DeliveryDetails = {
  fullName: "",
  address: "",
  city: "",
  postalCode: "",
};

export default function CheckoutPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { cart, total, clearCart } = useCart();

  const [mounted, setMounted] = useState(false);
  const [delivery, setDelivery] = useState<DeliveryDetails>(EMPTY_DELIVERY);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedOrderId, setConfirmedOrderId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auth guard – redirect to login once we know the user is not signed in
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login?redirect=/checkout");
    }
  }, [authLoading, user, router]);

  if (!mounted || authLoading) {
    return (
      <main className="flex-1 overflow-y-auto bg-emerald-950 p-8 animate-pulse">
        <div className="max-w-5xl mx-auto">
          <div className="mb-6 flex items-center gap-4">
            <div className="h-4 w-24 rounded bg-emerald-900" />
            <div className="h-8 w-40 rounded-xl bg-emerald-900" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-lg bg-emerald-900 border border-emerald-800 p-6 space-y-4">
                <div className="h-6 w-40 rounded bg-emerald-800" />
                <div className="grid grid-cols-2 gap-4">
                  {[0,1,2,3].map((i) => <div key={i} className="h-10 rounded-xl bg-emerald-800" />)}
                </div>
              </div>
              <div className="rounded-lg bg-emerald-900 border border-emerald-800 p-6 space-y-4">
                <div className="h-6 w-36 rounded bg-emerald-800" />
                <div className="grid grid-cols-2 gap-3">
                  <div className="h-14 rounded-lg bg-emerald-800" />
                  <div className="h-14 rounded-lg bg-emerald-800" />
                </div>
              </div>
            </div>
            <div className="rounded-lg bg-emerald-900 border border-emerald-800 p-6 h-fit space-y-4">
              <div className="h-6 w-32 rounded bg-emerald-800" />
              {[0,1,2].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded bg-emerald-800 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-full rounded bg-emerald-800" />
                    <div className="h-3 w-2/3 rounded bg-emerald-800" />
                  </div>
                </div>
              ))}
              <div className="h-10 w-full rounded-lg bg-emerald-800 mt-2" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!user) {
    return null; // redirect in progress
  }

  // ── Order confirmed screen ───────────────────────────────────────────────
  if (confirmedOrderId) {
    return (
      <main className="flex-1 overflow-y-auto bg-emerald-950 p-8">
        <div className="max-w-lg mx-auto text-center py-16">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-800">
            <svg className="h-10 w-10 text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">Order Confirmed!</h1>
          <p className="text-emerald-300 mb-2">
            Thank you for your order, <span className="text-white font-medium">{delivery.fullName}</span>.
          </p>
          <p className="text-emerald-400 text-sm mb-8">
            Order reference: <span className="font-mono text-emerald-200">{confirmedOrderId}</span>
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/"
              className="rounded-lg bg-emerald-600 px-6 py-2 text-white font-medium hover:bg-emerald-700 transition-colors"
            >
              Continue Shopping
            </Link>
            <Link
              href="/orders"
              className="rounded-lg border border-emerald-600 px-6 py-2 text-emerald-300 font-medium hover:bg-emerald-800 transition-colors"
            >
              View Orders
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // ── Empty cart guard ─────────────────────────────────────────────────────
  if (cart.length === 0) {
    return (
      <main className="flex-1 overflow-y-auto bg-emerald-950 p-8">
        <div className="max-w-lg mx-auto text-center py-16">
          <p className="text-emerald-300 mb-6">Your cart is empty. Add some products before checking out.</p>
          <Link href="/" className="rounded-lg bg-emerald-600 px-6 py-2 text-white hover:bg-emerald-700 transition-colors">
            Browse Products
          </Link>
        </div>
      </main>
    );
  }

  // ── Field helpers ────────────────────────────────────────────────────────
  const setField = (key: keyof DeliveryDetails) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setDelivery((prev) => ({ ...prev, [key]: e.target.value }));

  const isDeliveryComplete = Object.values(delivery).every((v) => v.trim() !== "");

  // ── Place order ──────────────────────────────────────────────────────────
  const handlePlaceOrder = async () => {
    if (placing || !isDeliveryComplete) return;
    setPlacing(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: cart.map((item) => ({
            id: item.id,
            name: item.name,
            brand: item.brand,
            price: item.price,
            quantity: item.quantity,
            image_url: item.image_url,
          })),
          total,
          delivery,
          paymentMethod,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to place order");

      clearCart();
      setConfirmedOrderId(data.orderId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to place order");
    } finally {
      setPlacing(false);
    }
  };

  // ── Checkout form ────────────────────────────────────────────────────────
  return (
    <main className="flex-1 overflow-y-auto bg-emerald-950 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6 flex items-center gap-4">
          <Link href="/cart" className="text-emerald-400 hover:text-emerald-300 text-sm">
            ← Back to cart
          </Link>
          <h1 className="text-3xl font-bold text-white">Checkout</h1>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-900/30 border border-red-800 p-4 text-red-200">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Left column: delivery + payment ── */}
          <div className="lg:col-span-2 space-y-6">
            {/* Delivery details */}
            <section className="rounded-lg bg-emerald-900 border border-emerald-800 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Delivery Details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm text-emerald-300 mb-1">Full Name</label>
                  <input
                    type="text"
                    placeholder="Jane Doe"
                    value={delivery.fullName}
                    onChange={setField("fullName")}
                    className="w-full rounded-lg border border-emerald-700 bg-emerald-800 px-3 py-2 text-white placeholder-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm text-emerald-300 mb-1">Street Address</label>
                  <input
                    type="text"
                    placeholder="123 Main Street"
                    value={delivery.address}
                    onChange={setField("address")}
                    className="w-full rounded-lg border border-emerald-700 bg-emerald-800 px-3 py-2 text-white placeholder-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-emerald-300 mb-1">City</label>
                  <input
                    type="text"
                    placeholder="Cape Town"
                    value={delivery.city}
                    onChange={setField("city")}
                    className="w-full rounded-lg border border-emerald-700 bg-emerald-800 px-3 py-2 text-white placeholder-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-emerald-300 mb-1">Postal Code</label>
                  <input
                    type="text"
                    placeholder="8001"
                    value={delivery.postalCode}
                    onChange={setField("postalCode")}
                    className="w-full rounded-lg border border-emerald-700 bg-emerald-800 px-3 py-2 text-white placeholder-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </section>

            {/* Payment method */}
            <section className="rounded-lg bg-emerald-900 border border-emerald-800 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Payment Method</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(
                  [
                    { value: "card", label: "Credit / Debit Card", icon: "💳" },
                    { value: "eft", label: "EFT / Bank Transfer", icon: "🏦" },
                  ] as { value: PaymentMethod; label: string; icon: string }[]
                ).map(({ value, label, icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPaymentMethod(value)}
                    className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${
                      paymentMethod === value
                        ? "border-emerald-400 bg-emerald-700 text-white"
                        : "border-emerald-700 bg-emerald-800 text-emerald-300 hover:bg-emerald-700/60"
                    }`}
                  >
                    <span className="text-2xl">{icon}</span>
                    <span className="font-medium text-sm">{label}</span>
                    {paymentMethod === value && (
                      <span className="ml-auto text-emerald-300 text-xs font-semibold">Selected</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Mock card fields – visual only */}
              {paymentMethod === "card" && (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm text-emerald-300 mb-1">Card Number</label>
                    <input
                      type="text"
                      placeholder="•••• •••• •••• ••••"
                      maxLength={19}
                      readOnly
                      className="w-full rounded-lg border border-emerald-700 bg-emerald-800/50 px-3 py-2 text-emerald-400 placeholder-emerald-600 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-emerald-300 mb-1">Expiry Date</label>
                    <input
                      type="text"
                      placeholder="MM / YY"
                      readOnly
                      className="w-full rounded-lg border border-emerald-700 bg-emerald-800/50 px-3 py-2 text-emerald-400 placeholder-emerald-600 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-emerald-300 mb-1">CVV</label>
                    <input
                      type="text"
                      placeholder="•••"
                      readOnly
                      className="w-full rounded-lg border border-emerald-700 bg-emerald-800/50 px-3 py-2 text-emerald-400 placeholder-emerald-600 cursor-not-allowed"
                    />
                  </div>
                  <p className="sm:col-span-2 text-xs text-emerald-500 italic">
                    Payment processing is simulated – no real transaction will occur.
                  </p>
                </div>
              )}

              {paymentMethod === "eft" && (
                <div className="mt-4 rounded-lg bg-emerald-800/50 border border-emerald-700 p-4 text-sm text-emerald-300 space-y-1">
                  <p><span className="text-emerald-400 font-medium">Bank:</span> First National Bank</p>
                  <p><span className="text-emerald-400 font-medium">Account:</span> 123 456 789</p>
                  <p><span className="text-emerald-400 font-medium">Branch code:</span> 250 655</p>
                  <p><span className="text-emerald-400 font-medium">Reference:</span> Your order ID (shown after confirmation)</p>
                  <p className="text-xs text-emerald-500 italic mt-2">
                    Payment processing is simulated – no real transaction will occur.
                  </p>
                </div>
              )}
            </section>
          </div>

          {/* ── Right column: order summary ── */}
          <div className="space-y-4">
            <section className="rounded-lg bg-emerald-900 border border-emerald-800 p-6 h-fit">
              <h2 className="text-xl font-semibold text-white mb-4">Order Summary</h2>
              <div className="space-y-3 mb-4">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-start gap-3">
                    {item.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="h-12 w-12 rounded object-cover flex-shrink-0 bg-emerald-800"
                      />
                    )}
                    <div className="flex-grow min-w-0">
                      <p className="text-sm text-white font-medium truncate">{item.name}</p>
                      {item.brand && <p className="text-xs text-emerald-400">{item.brand}</p>}
                      <p className="text-xs text-emerald-300">Qty: {item.quantity}</p>
                    </div>
                    <p className="text-sm text-white font-medium flex-shrink-0">
                      R{(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="border-t border-emerald-800 pt-4 space-y-2 mb-6">
                <div className="flex justify-between text-sm text-emerald-300">
                  <span>Subtotal</span>
                  <span>R{total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-emerald-300">
                  <span>Delivery</span>
                  <span className="text-green-400">Free</span>
                </div>
                <div className="flex justify-between font-semibold text-white text-base pt-1 border-t border-emerald-800">
                  <span>Total</span>
                  <span>R{total.toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={placing || !isDeliveryComplete}
                className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-white font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {placing ? "Placing Order…" : `Place Order · R${total.toFixed(2)}`}
              </button>

              {!isDeliveryComplete && (
                <p className="text-xs text-emerald-500 text-center mt-2">
                  Please fill in all delivery details to continue.
                </p>
              )}
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
