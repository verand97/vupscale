"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, HelpCircle } from "lucide-react";

export default function FAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const faqs = [
    {
      q: "How does AI Upscaling work?",
      a: "Verand Upscaler uses deep convolutional neural networks (CNNs) trained on millions of high-resolution images. Unlike standard bicubic interpolation that stretches pixels and introduces blur, our AI predicts and reconstructs high-frequency details, sharp edges, and realistic textures, resulting in natural-looking expansions.",
    },
    {
      q: "Does image quality decrease during upscaling?",
      a: "No, image quality actually increases. The AI processes low-resolution source files, removes noise, cleans up compression artifacts, and fills in missing detail. The output resolution is larger, sharper, and visually superior compared to the source file.",
    },
    {
      q: "What is the maximum image size supported?",
      a: "Free users can upload images up to 5MB. Pro users can upload files up to 20MB. The maximum resolution supported is 4000x4000 pixels for input files to prevent client-side or cloud processing timeouts.",
    },
    {
      q: "Which image formats are supported?",
      a: "Verand Upscaler supports PNG (.png), JPEG (.jpg, .jpeg), and WEBP (.webp) file formats. You can upscale any of these formats or use our PNG to JPEG module to convert PNG files to optimized JPEGs with customized quality compression controls.",
    },
  ];

  return (
    <section className="py-20 px-4 max-w-4xl mx-auto relative">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-5xl font-space font-extrabold tracking-tight mb-4">
          Frequently Asked <span className="text-neon-purple text-glow-purple">Questions.</span>
        </h2>
        <p className="text-neutral-400 font-inter">
          Everything you need to know about the pixel enhancement technology.
        </p>
      </div>

      <div className="space-y-4">
        {faqs.map((faq, idx) => {
          const isOpen = openIdx === idx;
          return (
            <div
              key={idx}
              className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                isOpen 
                  ? "border-neon-purple/40 bg-neon-purple/5 shadow-[0_0_15px_rgba(127,86,255,0.05)]" 
                  : "border-neutral-800 bg-charcoal-light/20 hover:border-neutral-700"
              }`}
            >
              <button
                onClick={() => setOpenIdx(isOpen ? null : idx)}
                className="w-full px-6 py-5 flex items-center justify-between text-left font-space font-semibold text-white group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <HelpCircle className={`h-5 w-5 transition-colors duration-300 ${
                    isOpen ? "text-neon-purple" : "text-neutral-400 group-hover:text-neutral-200"
                  }`} />
                  <span className="text-base sm:text-lg">{faq.q}</span>
                </div>
                <ChevronDown className={`h-5 w-5 text-neutral-400 transition-transform duration-300 ${
                  isOpen ? "rotate-180 text-neon-purple" : "group-hover:text-neutral-200"
                }`} />
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                  >
                    <div className="px-6 pb-6 pt-1 text-neutral-400 text-sm sm:text-base font-inter leading-relaxed border-t border-neutral-800/50">
                      {faq.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
}
