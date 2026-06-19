"use client";

import { motion } from "framer-motion";
import { Sparkles, Layers, Image as ImageIcon } from "lucide-react";

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Navbar({ activeTab, setActiveTab }: NavbarProps) {
  const navItems = [
    { id: "home", label: "Home", icon: Sparkles },
    { id: "upscale", label: "AI Upscaler", icon: Layers },
    { id: "convert", label: "PNG to JPEG", icon: ImageIcon },
    { id: "pricing", label: "Pricing", icon: Sparkles },
    { id: "faq", label: "FAQ", icon: Sparkles },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-charcoal-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <div 
          className="flex items-center gap-2 cursor-pointer group"
          onClick={() => setActiveTab("home")}
        >
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-neon-purple/10 border border-neon-purple/30 group-hover:border-lime-green/50 transition-all duration-300">
            <Layers className="h-5 w-5 text-neon-purple group-hover:text-lime-green transition-colors duration-300" />
            <div className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-lime-green glow-green" />
          </div>
          <span className="font-space font-bold text-lg tracking-wider bg-linear-to-r from-white via-neutral-200 to-neon-purple bg-clip-text text-transparent group-hover:to-lime-green transition-all duration-500">
            VERAND <span className="text-neon-purple group-hover:text-lime-green transition-colors duration-500">UPSCALE</span>
          </span>
        </div>

        {/* Nav Links - Desktop */}
        <nav className="hidden md:flex items-center gap-1 bg-charcoal-light/30 rounded-xl p-1 border border-neutral-800">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`relative px-4 py-1.5 rounded-lg text-sm font-medium transition-colors duration-300 flex items-center gap-1.5 cursor-pointer ${
                  isActive ? "text-white" : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-nav-pill"
                    className="absolute inset-0 bg-neon-purple/20 border border-neon-purple/40 rounded-lg shadow-[0_0_12px_rgba(127,86,255,0.15)]"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Action Button */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveTab("upscale")}
            className="relative overflow-hidden px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider text-black bg-lime-green transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer glow-green hover:shadow-[0_0_20px_rgba(128,255,86,0.6)] font-space"
          >
            Launch App
          </button>
        </div>
      </div>
    </header>
  );
}
