"use client";

import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Download, RefreshCw, File, ImageIcon, AlertCircle } from "lucide-react";

interface PNGFileState {
  file: File;
  src: string;
  name: string;
  size: number; // raw bytes
  width: number;
  height: number;
}

export default function ConverterTool() {
  const [pngImage, setPngImage] = useState<PNGFileState | null>(null);
  const [quality, setQuality] = useState<0.5 | 0.7 | 0.85 | 0.95>(0.85);
  const [outputJpgSrc, setOutputJpgSrc] = useState<string | null>(null);
  const [outputSize, setOutputSize] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Trigger browser-based canvas conversion
  const convertPngToJpeg = useCallback((imageState: PNGFileState, qualityVal: number) => {
    setIsProcessing(true);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setIsProcessing(false);
        return;
      }

      // Draw white background (since PNG might have transparency and JPEG does not support alpha channel)
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      // Export as JPEG with exact quality value
      const dataUrl = canvas.toDataURL("image/jpeg", qualityVal);
      setOutputJpgSrc(dataUrl);

      // Estimate byte size from Base64 string
      const stringLength = dataUrl.length - "data:image/jpeg;base64,".length;
      const sizeInBytes = Math.floor(stringLength * 0.75);
      setOutputSize(sizeInBytes);
      setIsProcessing(false);
    };
    img.src = imageState.src;
  }, []);

  // Re-run conversion when quality or image changes
  useEffect(() => {
    if (pngImage) {
      convertPngToJpeg(pngImage, quality);
    }
  }, [pngImage, quality, convertPngToJpeg]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError(null);
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      const src = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        setPngImage({
          file,
          src,
          name: file.name,
          size: file.size,
          width: img.width,
          height: img.height
        });
      };
      img.src = src;
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/png": [".png"],
    },
    maxFiles: 1,
    onDropRejected: () => {
      setError("Please upload a valid PNG image format.");
    }
  });

  const handleDownload = () => {
    if (!outputJpgSrc || !pngImage) return;
    const link = document.createElement("a");
    const originalName = pngImage.name.replace(/\.[^/.]+$/, ""); // Strip PNG extension
    link.download = `${originalName}_converted_q${Math.round(quality * 100)}.jpg`;
    link.href = outputJpgSrc;
    link.click();
  };

  const handleReset = () => {
    if (pngImage) {
      URL.revokeObjectURL(pngImage.src);
    }
    setPngImage(null);
    setOutputJpgSrc(null);
    setQuality(0.85);
    setOutputSize(0);
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = 2;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  return (
    <div className="w-full max-w-5xl mx-auto py-8 px-4 relative z-10">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-space font-bold mb-2">PNG to JPEG Converter</h2>
        <p className="text-neutral-400 text-sm">Convert transparent or heavy PNG files into optimized, browser-ready JPEG format.</p>
      </div>

      <AnimatePresence mode="wait">
        {!pngImage ? (
          <motion.div
            key="upload-zone"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="flex flex-col items-center"
          >
            <div
              {...getRootProps()}
              className={`w-full max-w-2xl rounded-3xl p-12 border-2 border-dashed glass-card text-center cursor-pointer flex flex-col items-center justify-center min-h-[280px] transition-all duration-300 ${
                isDragActive ? "border-lime-green bg-lime-green/5" : "border-neon-purple/20 hover:border-neon-purple/50"
              }`}
            >
              <input {...getInputProps()} />
              <div className="p-5 rounded-2xl bg-charcoal-light/60 border border-neutral-800 mb-6">
                <ImageIcon className="h-8 w-8 text-neon-purple" />
              </div>
              <h3 className="font-space font-semibold text-lg mb-2">Upload PNG Image</h3>
              <p className="text-neutral-400 text-xs mb-4">Drag and drop PNG images only, up to 20MB</p>
              <button className="px-5 py-2.5 rounded-xl bg-neon-purple text-white text-xs font-semibold uppercase tracking-wider font-space glow-purple hover:bg-[#8e6bff] cursor-pointer">
                Select PNG File
              </button>
            </div>

            {error && (
              <div className="mt-4 p-3.5 rounded-xl border border-red-500/30 bg-red-950/20 text-red-400 text-sm flex items-center gap-2 max-w-2xl w-full">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="converter-workspace"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start"
          >
            {/* Image Previews */}
            <div className="lg:col-span-2 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Original PNG */}
                <div className="glass-card rounded-3xl p-4 border border-neutral-800 flex flex-col h-full">
                  <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-2 text-center">Original PNG</div>
                  <div className="relative flex-1 min-h-[220px] rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-900/30 flex items-center justify-center p-2">
                    <img src={pngImage.src} alt="Source PNG" className="max-w-full max-h-[240px] object-contain" />
                  </div>
                  <div className="mt-3 text-xs text-neutral-400 font-mono text-center">
                    Size: {formatSize(pngImage.size)} | {pngImage.width}×{pngImage.height}
                  </div>
                </div>

                {/* Converted JPEG Preview */}
                <div className="glass-card rounded-3xl p-4 border border-neutral-800 flex flex-col h-full">
                  <div className="text-[10px] text-lime-green font-bold uppercase tracking-wider mb-2 text-center">Converted JPEG</div>
                  <div className="relative flex-1 min-h-[220px] rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-900/30 flex items-center justify-center p-2">
                    {isProcessing ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-6 w-6 rounded-full border-2 border-transparent border-t-neon-purple animate-spin" />
                        <span className="text-xs text-neutral-400 font-mono">Processing...</span>
                      </div>
                    ) : (
                      outputJpgSrc && <img src={outputJpgSrc} alt="Output JPEG" className="max-w-full max-h-[240px] object-contain" />
                    )}
                  </div>
                  <div className="mt-3 text-xs text-neutral-400 font-mono text-center">
                    Size: {formatSize(outputSize)} | Quality: {Math.round(quality * 100)}%
                  </div>
                </div>
              </div>
            </div>

            {/* Quality controls and download action */}
            <div className="space-y-6">
              <div className="glass-card rounded-3xl p-6 border border-neutral-800">
                <h3 className="text-base font-space font-bold mb-6 text-white">JPEG Quality Settings</h3>
                
                {/* Sliders / Preset Radio Buttons */}
                <div className="space-y-4 mb-8">
                  <span className="text-xs text-neutral-400 block mb-2 font-medium">Select Output Quality Preset:</span>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { val: 0.5, label: "50% - Low Size" },
                      { val: 0.7, label: "70% - Balanced" },
                      { val: 0.85, label: "85% - High" },
                      { val: 0.95, label: "95% - Premium" }
                    ].map((item) => {
                      const isSelected = quality === item.val;
                      return (
                        <div
                          key={item.val}
                          onClick={() => setQuality(item.val as any)}
                          className={`p-3.5 rounded-xl border text-center cursor-pointer transition-all duration-200 ${
                            isSelected 
                              ? "border-neon-purple bg-neon-purple/5 font-semibold text-white shadow-[0_0_12px_rgba(127,86,255,0.05)]" 
                              : "border-neutral-800 bg-charcoal-light/20 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200"
                          }`}
                        >
                          <div className="text-sm font-space">{item.label.split(" - ")[0]}</div>
                          <div className="text-[9px] uppercase tracking-wider text-neutral-500 mt-1">
                            {item.label.split(" - ")[1]}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Summary information */}
                <div className="p-4 rounded-2xl bg-charcoal-light/30 border border-neutral-800/80 mb-6 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-500">File Compression Ratio</span>
                    <span className="text-lime-green font-semibold">
                      {pngImage.size && outputSize ? `${Math.round(((pngImage.size - outputSize) / pngImage.size) * 100)}% smaller` : "0%"}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-500">Output Dimensions</span>
                    <span className="text-white">{pngImage.width} × {pngImage.height}</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleReset}
                    className="flex-1 py-3 rounded-xl bg-charcoal-light border border-neutral-800 hover:border-neutral-700 text-neutral-300 text-xs font-semibold uppercase tracking-wider font-space cursor-pointer"
                  >
                    Reset
                  </button>
                  <button
                    onClick={handleDownload}
                    className="flex-2 py-3 rounded-xl bg-lime-green text-black text-xs font-bold uppercase tracking-wider font-space glow-green hover:shadow-[0_0_20px_rgba(128,255,86,0.5)] cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download JPEG</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
