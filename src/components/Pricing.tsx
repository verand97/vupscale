"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, HelpCircle, Sparkles } from "lucide-react";

export default function Pricing() {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");

  return (
    <section className="py-20 px-4 max-w-5xl mx-auto relative">
      {/* Glows */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[300px] h-[300px] rounded-full radial-glow-1 pointer-events-none z-0" />

      <div className="relative z-10 text-center mb-16">
        <h2 className="text-3xl md:text-5xl font-space font-extrabold tracking-tight mb-4">
          Simple, Transparent <span className="text-lime-green text-glow-green">Pricing.</span>
        </h2>
        <p className="text-neutral-400 max-w-md mx-auto font-inter">
          Start upscaling for free, or upgrade to Pro to unlock maximum detail up to 8x and API endpoints.
        </p>

        {/* Toggle */}
        <div className="inline-flex items-center gap-2 mt-8 bg-charcoal-light/40 border border-neutral-800 rounded-2xl p-1.5">
          <button
            onClick={() => setBilling("monthly")}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 cursor-pointer ${
              billing === "monthly" ? "bg-neon-purple text-white shadow-lg" : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling("yearly")}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 cursor-pointer flex items-center gap-1.5 ${
              billing === "yearly" ? "bg-neon-purple text-white shadow-lg" : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <span>Yearly</span>
            <span className="text-[10px] bg-lime-green/20 border border-lime-green/30 text-lime-green px-1.5 py-0.5 rounded font-bold font-space">
              SAVE 20%
            </span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
        {/* Free Plan */}
        <motion.div
          whileHover={{ y: -4 }}
          className="rounded-3xl p-8 glass-card border border-neutral-800 flex flex-col justify-between"
        >
          <div>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-space font-bold text-neutral-400">Starter</h3>
                <p className="text-neutral-500 text-sm mt-1">For casual creators</p>
              </div>
              <span className="text-xs uppercase font-bold tracking-widest font-space px-2 py-0.5 rounded border border-neutral-800 bg-neutral-900 text-neutral-400">
                Free
              </span>
            </div>

            <div className="flex items-baseline gap-1 mb-8">
              <span className="text-4xl font-space font-extrabold text-white">$0</span>
              <span className="text-neutral-500 text-sm">/ forever</span>
            </div>

            <ul className="space-y-4 mb-8">
              <li className="flex items-center gap-3 text-sm text-neutral-300">
                <Check className="h-4.5 w-4.5 text-lime-green shrink-0" />
                <span>2× Upscale only</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-neutral-300">
                <Check className="h-4.5 w-4.5 text-lime-green shrink-0" />
                <span>10 uploads per day</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-neutral-300">
                <Check className="h-4.5 w-4.5 text-lime-green shrink-0" />
                <span>Standard cloud queue speed</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-neutral-300">
                <Check className="h-4.5 w-4.5 text-lime-green shrink-0" />
                <span>PNG to JPEG conversion (up to 85% quality)</span>
              </li>
            </ul>
          </div>

          <button className="w-full py-3.5 rounded-2xl bg-charcoal-light hover:bg-neutral-800 border border-neutral-800 text-white font-space font-semibold text-sm transition-all duration-300 cursor-pointer">
            Get Started Free
          </button>
        </motion.div>

        {/* Pro Plan */}
        <motion.div
          whileHover={{ y: -4 }}
          className="rounded-3xl p-8 glass-card-purple border border-neon-purple/30 relative flex flex-col justify-between shadow-[0_0_40px_rgba(127,86,255,0.08)]"
        >
          {/* Top Banner */}
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-neon-purple text-white px-4 py-1 rounded-full text-xs font-bold font-space flex items-center gap-1 glow-purple">
            <Sparkles className="h-3 w-3 fill-white" />
            <span>MOST POPULAR</span>
          </div>

          <div>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-space font-bold text-white">Pro Creator</h3>
                <p className="text-neon-purple/75 text-sm mt-1">For professional designers</p>
              </div>
              <span className="text-xs uppercase font-bold tracking-widest font-space px-2 py-0.5 rounded border border-neon-purple/30 bg-neon-purple/10 text-neon-purple">
                PRO
              </span>
            </div>

            <div className="flex items-baseline gap-1 mb-8">
              <span className="text-4xl font-space font-extrabold text-white">
                {billing === "monthly" ? "$19" : "$15"}
              </span>
              <span className="text-neutral-400 text-sm">/ month</span>
              {billing === "yearly" && (
                <span className="text-[10px] text-lime-green ml-2 font-semibold">billed annually</span>
              )}
            </div>

            <ul className="space-y-4 mb-8">
              <li className="flex items-center gap-3 text-sm text-neutral-200">
                <Check className="h-4.5 w-4.5 text-lime-green shrink-0" />
                <span>Unlimited uploads & conversion</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-neutral-200">
                <Check className="h-4.5 w-4.5 text-lime-green shrink-0" />
                <span>Unlock 2×, 4×, and 8× AI models</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-neutral-200">
                <Check className="h-4.5 w-4.5 text-lime-green shrink-0" />
                <span>Priority queue processing (sub-3 seconds)</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-neutral-200">
                <Check className="h-4.5 w-4.5 text-lime-green shrink-0" />
                <span>Full PNG to JPEG settings (up to 100% quality)</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-neutral-200">
                <Check className="h-4.5 w-4.5 text-lime-green shrink-0" />
                <span>Developer API Access</span>
              </li>
            </ul>
          </div>

          <button className="w-full py-3.5 rounded-2xl bg-neon-purple text-white font-space font-semibold text-sm transition-all duration-300 glow-purple hover:shadow-[0_0_20px_rgba(127,86,255,0.4)] hover:bg-[#8e6bff] cursor-pointer">
            Upgrade to Pro
          </button>
        </motion.div>
      </div>
    </section>
  );
}
