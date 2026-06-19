"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Sparkles, Image as ImageIcon, ArrowRight, AlertCircle } from "lucide-react";

interface HeroProps {
  onFileSelect: (file: File, mode: "upscale" | "convert") => void;
  setActiveTab: (tab: string) => void;
}

export default function Hero({ onFileSelect, setActiveTab }: HeroProps) {
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      setError(null);
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        
        // Double-check file size (20MB)
        if (file.size > 20 * 1024 * 1024) {
          setError("File size exceeds 20MB limit.");
          return;
        }

        // Auto-detect mode based on extension, or default to upscale
        const isPng = file.type === "image/png" || file.name.endsWith(".png");
        onFileSelect(file, isPng ? "upscale" : "upscale");
      }
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/webp": [".webp"],
    },
    maxFiles: 1,
    maxSize: 20 * 1024 * 1024, // 20 MB
    onDropRejected: (rejections) => {
      if (rejections[0]?.errors[0]?.code === "file-too-large") {
        setError("File is too large. Max size is 20MB.");
      } else {
        setError("Unsupported file format. Please upload PNG, JPEG, or WEBP.");
      }
    }
  });

  return (
    <section className="relative flex flex-col items-center justify-center pt-20 pb-16 px-4 overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full radial-glow-1 pointer-events-none z-0" />
      <div className="absolute bottom-10 right-1/4 w-[350px] h-[350px] rounded-full radial-glow-2 pointer-events-none z-0" />

      <div className="relative z-10 max-w-4xl w-full text-center flex flex-col items-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neon-purple/10 border border-neon-purple/30 text-xs font-semibold text-neon-purple mb-6 font-space"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>NEXT-GEN AI RECONSTRUCTION</span>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-5xl md:text-7xl font-space font-extrabold tracking-tight mb-6 leading-tight"
        >
          Enhance Every <span className="bg-linear-to-r from-neon-purple to-[#A588FF] bg-clip-text text-transparent text-glow-purple">Pixel.</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-neutral-400 text-lg md:text-xl max-w-2xl mb-12 font-inter leading-relaxed"
        >
          Upscale your images with AI up to <span className="text-lime-green font-semibold">8× quality</span> while preserving sharpness and details. Convert PNG to JPEG instantly with lightning-fast processing.
        </motion.p>

        {/* Upload Container */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="w-full max-w-2xl mb-8"
        >
          <div
            {...getRootProps()}
            className={`relative group rounded-3xl p-10 border-2 border-dashed transition-all duration-300 cursor-pointer glass-card text-center flex flex-col items-center justify-center min-h-[260px] overflow-hidden ${
              isDragActive
                ? "border-lime-green bg-lime-green/5 shadow-[0_0_30px_rgba(128,255,86,0.15)]"
                : "border-neon-purple/30 hover:border-neon-purple/60 hover:shadow-[0_0_30px_rgba(127,86,255,0.1)]"
            }`}
          >
            <input {...getInputProps()} />

            {/* Glowing accents */}
            <div className="absolute top-0 left-0 w-12 h-px bg-neon-purple" />
            <div className="absolute top-0 left-0 w-px h-12 bg-neon-purple" />
            <div className="absolute bottom-0 right-0 w-12 h-px bg-lime-green glow-green" />
            <div className="absolute bottom-0 right-0 w-px h-12 bg-lime-green glow-green" />

            {/* Icon */}
            <div className="relative mb-6">
              <div className={`p-4 rounded-2xl bg-charcoal-light/50 border border-neutral-800 transition-all duration-300 ${
                isDragActive ? "scale-110 border-lime-green text-lime-green" : "group-hover:border-neon-purple text-neutral-400 group-hover:text-neon-purple"
              }`}>
                <Upload className="h-8 w-8 animate-pulse" />
              </div>
            </div>

            {/* Text details */}
            <h3 className="font-space font-semibold text-lg text-white mb-2">
              {isDragActive ? "Drop your image here..." : "Drag & Drop Image"}
            </h3>
            <p className="text-neutral-400 text-sm mb-4 max-w-xs">
              or click to browse your files (PNG, JPEG, WEBP)
            </p>

            <div className="flex items-center gap-6 text-xs text-neutral-500 font-medium">
              <span>Max size: 20 MB</span>
              <span className="w-1.5 h-1.5 rounded-full bg-neutral-700" />
              <span>Multi-format support</span>
            </div>
          </div>

          {/* Error message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 p-3.5 rounded-xl border border-red-500/30 bg-red-950/20 text-red-400 text-sm flex items-center gap-2"
              >
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Hero Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex flex-wrap justify-center gap-4 z-10"
        >
          <button
            onClick={() => setActiveTab("upscale")}
            className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-neon-purple text-white font-space font-semibold text-sm transition-all duration-300 hover:scale-105 active:scale-95 glow-purple hover:shadow-[0_0_25px_rgba(127,86,255,0.6)] group cursor-pointer"
          >
            <Sparkles className="h-4 w-4 group-hover:rotate-12 transition-transform" />
            <span>Upscale Image</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={() => setActiveTab("convert")}
            className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-charcoal-dark border border-neon-purple/40 text-neutral-200 font-space font-semibold text-sm transition-all duration-300 hover:scale-105 active:scale-95 hover:border-lime-green hover:text-white group cursor-pointer"
          >
            <ImageIcon className="h-4 w-4 text-neon-purple group-hover:text-lime-green" />
            <span>Convert PNG → JPEG</span>
          </button>
        </motion.div>
      </div>
    </section>
  );
}
