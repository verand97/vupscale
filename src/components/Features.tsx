"use client";

import { motion } from "framer-motion";
import { Sparkles, Zap, Layers, RefreshCw, Cpu, Award } from "lucide-react";

export default function Features() {
  const features = [
    {
      icon: Sparkles,
      title: "AI Upscaling",
      desc: "Increase image resolution with advanced neural networks, rebuilding textures.",
      badge: "State-of-the-art",
      color: "purple",
    },
    {
      icon: Zap,
      title: "2× Upscale",
      desc: "Fast enhancement ideal for social media posts, quick edits, and previews.",
      badge: "Lightning Fast",
      color: "green",
    },
    {
      icon: Layers,
      title: "4× Upscale",
      desc: "Perfect balance between file size and outstanding image clarity.",
      badge: "Recommended",
      color: "purple",
    },
    {
      icon: Award,
      title: "8× Upscale",
      desc: "Maximum detail reconstruction, turning low-res crops into high-res assets.",
      badge: "Ultra Quality",
      color: "green",
    },
    {
      icon: RefreshCw,
      title: "PNG to JPEG",
      desc: "Convert images instantly, control file sizes, and adjust quality output parameters.",
      badge: "Batch Ready",
      color: "purple",
    },
    {
      icon: Cpu,
      title: "Fast Cloud Processing",
      desc: "Powered by advanced GPU cloud nodes, delivering enhanced results in seconds.",
      badge: "99.9% Uptime",
      color: "green",
    },
  ];

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" as const }
    },
  };

  return (
    <section className="py-20 px-4 max-w-7xl mx-auto relative">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-5xl font-space font-extrabold tracking-tight mb-4">
          Engineered for <span className="text-neon-purple text-glow-purple">Ultimate Quality.</span>
        </h2>
        <p className="text-neutral-400 max-w-xl mx-auto font-inter">
          Experience AI-driven pixel reconstruction technologies that outperform traditional bilinear scaling.
        </p>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {features.map((feat, idx) => {
          const Icon = feat.icon;
          const isPurple = feat.color === "purple";
          return (
            <motion.div
              key={idx}
              variants={cardVariants}
              whileHover={{ 
                y: -6, 
                borderColor: isPurple ? "rgba(127, 86, 255, 0.4)" : "rgba(128, 255, 86, 0.4)",
                boxShadow: isPurple 
                  ? "0 10px 30px -10px rgba(127, 86, 255, 0.2)" 
                  : "0 10px 30px -10px rgba(128, 255, 86, 0.2)"
              }}
              className="relative rounded-3xl p-6 glass-card transition-all duration-300 flex flex-col justify-between group h-full"
            >
              <div>
                {/* Badge */}
                <div className="flex justify-between items-start mb-6">
                  <div className={`p-3 rounded-2xl bg-charcoal-light/40 border border-neutral-800 transition-all duration-300 ${
                    isPurple 
                      ? "group-hover:border-neon-purple/40 group-hover:bg-neon-purple/5" 
                      : "group-hover:border-lime-green/40 group-hover:bg-lime-green/5"
                  }`}>
                    <Icon className={`h-6 w-6 transition-transform duration-500 group-hover:rotate-12 ${
                      isPurple ? "text-neon-purple" : "text-lime-green"
                    }`} />
                  </div>
                  <span className={`text-[10px] uppercase font-bold tracking-widest font-space px-2 py-0.5 rounded border ${
                    isPurple 
                      ? "border-neon-purple/20 bg-neon-purple/5 text-neon-purple/80" 
                      : "border-lime-green/20 bg-lime-green/5 text-lime-green/80"
                  }`}>
                    {feat.badge}
                  </span>
                </div>

                {/* Content */}
                <h3 className="text-xl font-space font-bold mb-3 text-white">
                  {feat.title}
                </h3>
                <p className="text-neutral-400 text-sm font-inter leading-relaxed">
                  {feat.desc}
                </p>
              </div>

              {/* Card Footer Interactive Arrow */}
              <div className="mt-8 pt-4 border-t border-neutral-800/60 flex items-center justify-between text-xs font-semibold text-neutral-400 group-hover:text-white transition-colors duration-300">
                <span>Learn technology</span>
                <span className={`h-1.5 w-1.5 rounded-full ${isPurple ? "bg-neon-purple shadow-[0_0_8px_#7F56FF]" : "bg-lime-green shadow-[0_0_8px_#80FF56]"}`} />
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
}
