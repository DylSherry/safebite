import React from "react";

export const metadata = {
  title: "Products",
};

export default function ProductsLayout({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}
