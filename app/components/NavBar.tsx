"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../../lib/firebase";
import { useCart } from "../context/CartContext";
import { useUserProfile } from "../hooks/useUserProfile";

export default function NavBar() {
  const [email, setEmail] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const { cart } = useCart();
  const { profile } = useUserProfile();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setEmail(user?.email ?? null);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setEmail(null);
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  return (
    <nav className="w-full bg-emerald-900 border-b border-emerald-800">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-xl font-semibold text-white">
            SafeBite
          </Link>
          <Link href="/" className="text-sm text-emerald-100 hover:text-white">
            Browse
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/cart"
            className="relative text-sm text-emerald-100 hover:text-white px-3 py-1"
          >
            Cart
            {mounted && cart.length > 0 && (
              <span className="absolute top-0 right-0 inline-flex items-center justify-center h-5 w-5 text-xs font-bold text-white bg-emerald-600 rounded-full">
                {cart.length}
              </span>
            )}
          </Link>

          {email ? (
            <div className="flex items-center gap-3">
              <Link href="/profile" className="text-sm text-emerald-100 hover:text-white">
                Profile
              </Link>
              {profile?.role === "admin" && (
                <Link href="/admin" className="text-sm text-yellow-300 hover:text-yellow-200 font-medium">
                  Admin
                </Link>
              )}
              <button
                onClick={handleSignOut}
                className="text-sm rounded bg-emerald-800 px-2 py-1 text-emerald-100 hover:bg-emerald-700"
              >
                Sign out
              </button>
            </div>
          ) : (
            <>
              <Link href="/login" className="text-sm text-emerald-100 hover:text-white">
                Login
              </Link>
              <Link href="/signup" className="rounded bg-emerald-600 px-3 py-1 text-sm text-white hover:bg-emerald-700">
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
