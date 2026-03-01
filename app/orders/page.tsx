"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../hooks/useAuth";

type OrderItem = {
  id: string;
  name: string;
  brand?: string;
  price: number;
  quantity: number;
  image_url?: string;
};

type DeliveryDetails = {
  fullName: string;
  address: string;
  city: string;
  postalCode: string;
};

type Order = {
  id: string;
  items: OrderItem[];
  total: number;
  delivery: DeliveryDetails;
  paymentMethod: string;
  createdAt: string | null;
};

export default function OrdersPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login?redirect=/orders");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/get-orders", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load orders");
        setOrders(data.orders);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load orders");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user]);

  if (authLoading || (!user && !authLoading)) {
    return (
      <main className="flex-1 overflow-y-auto bg-emerald-950 p-8">
        <p className="text-emerald-200">Loading…</p>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto bg-emerald-950 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white">My Orders</h1>
          <Link href="/" className="text-sm text-emerald-400 hover:text-emerald-300">
            ← Continue Shopping
          </Link>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-900/30 border border-red-800 p-4 text-red-200">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-emerald-200">Loading orders…</p>
        ) : orders.length === 0 ? (
          <div className="rounded-lg bg-emerald-900 border border-emerald-800 p-12 text-center">
            <p className="text-emerald-300 mb-4">You haven't placed any orders yet.</p>
            <Link
              href="/"
              className="rounded-lg bg-emerald-600 px-6 py-2 text-white font-medium hover:bg-emerald-700 transition-colors"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const isExpanded = expandedId === order.id;
              const date = order.createdAt
                ? new Date(order.createdAt).toLocaleDateString("en-ZA", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : "—";

              return (
                <div
                  key={order.id}
                  className="rounded-lg bg-emerald-900 border border-emerald-800 overflow-hidden"
                >
                  {/* Order header */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : order.id)}
                    className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-6 py-4 text-left hover:bg-emerald-800/40 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                      <span className="text-xs font-mono text-emerald-400 break-all">{order.id}</span>
                      <span className="text-sm text-emerald-300">{date}</span>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <span className="font-semibold text-white">R{Number(order.total).toFixed(2)}</span>
                      <svg
                        className={`h-5 w-5 text-emerald-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t border-emerald-800 px-6 py-5 space-y-5">
                      {/* Items */}
                      <div>
                        <h3 className="text-sm font-semibold text-emerald-300 mb-3">Items</h3>
                        <div className="space-y-3">
                          {order.items.map((item, i) => (
                            <div key={i} className="flex items-center gap-3">
                              {item.image_url && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={item.image_url}
                                  alt={item.name}
                                  className="h-12 w-12 rounded object-cover bg-emerald-800 shrink-0"
                                />
                              )}
                              <div className="grow min-w-0">
                                <p className="text-sm text-white font-medium truncate">{item.name}</p>
                                {item.brand && <p className="text-xs text-emerald-400">{item.brand}</p>}
                                <p className="text-xs text-emerald-300">Qty: {item.quantity}</p>
                              </div>
                              <p className="text-sm text-white font-medium shrink-0">
                                R{(item.price * item.quantity).toFixed(2)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        {/* Delivery */}
                        <div>
                          <h3 className="text-sm font-semibold text-emerald-300 mb-2">Delivery Address</h3>
                          <div className="text-sm text-emerald-200 space-y-0.5">
                            <p>{order.delivery?.fullName}</p>
                            <p>{order.delivery?.address}</p>
                            <p>{order.delivery?.city}, {order.delivery?.postalCode}</p>
                          </div>
                        </div>

                        {/* Payment */}
                        <div>
                          <h3 className="text-sm font-semibold text-emerald-300 mb-2">Payment</h3>
                          <p className="text-sm text-emerald-200 capitalize">
                            {order.paymentMethod === "card" ? "💳 Credit / Debit Card" : "🏦 EFT / Bank Transfer"}
                          </p>
                          <div className="mt-3 border-t border-emerald-800 pt-3 flex justify-between text-sm">
                            <span className="text-emerald-300">Order Total</span>
                            <span className="font-semibold text-white">R{Number(order.total).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
