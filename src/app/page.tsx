"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Pricing from "@/components/Pricing";
import FAQ from "@/components/FAQ";
import Footer from "@/components/Footer";
import ParticleCanvas from "@/components/ParticleCanvas";
import UpscaleTool from "@/components/UpscaleTool";
import ConverterTool from "@/components/ConverterTool";

export default function Home() {
  const [activeTab, setActiveTab] = useState<string>("home");
  const [heroSelectedFile, setHeroSelectedFile] = useState<File | null>(null);

  const handleHeroFileSelect = (file: File, mode: "upscale" | "convert") => {
    setHeroSelectedFile(file);
    setActiveTab(mode);
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    // Auto-scroll to top on tab changes for smoother SPA experience
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="relative min-h-screen bg-background text-foreground flex flex-col overflow-hidden">
      {/* Background Interactive Particles */}
      <ParticleCanvas />

      {/* Grid background & gradient glows */}
      <div className="fixed inset-0 pointer-events-none z-0 cyber-grid opacity-60" />
      <div className="fixed top-0 left-1/4 -translate-y-1/2 w-[700px] h-[700px] rounded-full radial-glow-1 pointer-events-none z-0" />
      <div className="fixed bottom-0 right-1/4 translate-y-1/2 w-[600px] h-[600px] rounded-full radial-glow-2 pointer-events-none z-0" />

      {/* Sticky Header */}
      <Navbar activeTab={activeTab} setActiveTab={handleTabChange} />

      {/* Main Content Area */}
      <main className="grow flex flex-col relative z-10">
        {activeTab === "home" && (
          <div className="flex flex-col w-full">
            <Hero onFileSelect={handleHeroFileSelect} setActiveTab={handleTabChange} />
            <Features />
            <Pricing />
            <FAQ />
          </div>
        )}

        {activeTab === "upscale" && (
          <div className="grow flex items-center justify-center py-10">
            <UpscaleTool 
              initialFile={heroSelectedFile} 
              onResetInitialFile={() => setHeroSelectedFile(null)} 
            />
          </div>
        )}

        {activeTab === "convert" && (
          <div className="grow flex items-center justify-center py-10">
            <ConverterTool />
          </div>
        )}

        {activeTab === "pricing" && (
          <div className="py-12 grow flex items-center">
            <Pricing />
          </div>
        )}

        {activeTab === "faq" && (
          <div className="py-12 grow flex items-center">
            <FAQ />
          </div>
        )}
      </main>

      {/* Footer */}
      <Footer setActiveTab={handleTabChange} />
    </div>
  );
}
