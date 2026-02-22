import React from "react";

export const metadata = {
  title: "Products",
};

export default function ProductsLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex-1 overflow-y-auto bg-emerald-950">{children}</div>;
}
