import Image from "next/image";
import NavBar from "./components/NavBar";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 font-sans text-black">
      <NavBar />
    </div>
  );
}
