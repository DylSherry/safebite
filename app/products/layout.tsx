import React from "react";
import NavBar from "../components/NavBar";

export const metadata = {
  title: "Products",
};

export default function ProductsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NavBar />
      <div>{children}</div>
    </>
  );
}
