"use client";
import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "@/components/theme-toggle";
import { useScrolled } from "@/lib/hooks/use-scrolled";

export function HomeNav() {
  const scrolled = useScrolled();
  return (
    <nav
      className={`nav-header px-8 py-4 flex items-center justify-between ${scrolled ? "nav-scrolled" : ""}`}
      style={{ fontFamily: '"Courier New", Courier, monospace' }}
    >
      <Link href="/" className="flex items-center gap-4 hover:opacity-75 transition-opacity">
        <Image
          src="/opsmem-logo.png"
          alt="OpsMem"
          width={32}
          height={32}
          className="th-logo"
          priority
        />
        <span className="font-black text-base tracking-widest uppercase hidden sm:inline">OPSMEM</span>
      </Link>
      <div className="flex items-center gap-4">
        <Link href="/blog" className="th-nav-link text-xs tracking-widest transition-colors uppercase">Blog</Link>
        <Link href="/dashboard" className="th-nav-link text-xs tracking-widest transition-colors uppercase">Dashboard</Link>
        <Link href="/pricing" className="th-nav-link text-xs tracking-widest transition-colors uppercase">Pricing</Link>
        <ThemeToggle />
      </div>
    </nav>
  );
}
