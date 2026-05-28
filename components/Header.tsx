"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "./ui/button";

export function Header() {
  const pathname = usePathname();
  
  const isActive = (path: string) => {
    if (path === "/") {
      return pathname === "/";
    }
    return pathname === path;
  };

  return (
    <header className="bg-blue-50 shadow-sm border-b border-slate-200">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6">
          {/* Banner */}
          <div className="text-center">
            <h1 className="text-3xl text-slate-900">Cambridge Behavioural Inventory-Revised (CBI-R) Screening Tool</h1>
          </div>
          
          {/* Navigation */}
          <nav className="flex flex-wrap items-center gap-4 border-b border-slate-200">
            <Link 
              href="/"
              className={`pb-2 px-1 transition-all border-b-2 ${
                isActive("/") 
                  ? "border-slate-900 font-bold text-slate-900" 
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-400"
              }`}
            >
              Home
            </Link>
            <Link 
              href="/about"
              className={`pb-2 px-1 transition-all border-b-2 ${
                isActive("/about") 
                  ? "border-slate-900 font-bold text-slate-900" 
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-400"
              }`}
            >
              About
            </Link>
            <Link 
              href="/explore-data"
              className={`pb-2 px-1 transition-all border-b-2 ${
                isActive("/explore-data") 
                  ? "border-slate-900 font-bold text-slate-900" 
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-400"
              }`}
            >
              Explore Our Data
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}