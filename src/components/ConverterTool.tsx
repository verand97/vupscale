"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { Download, RefreshCw, File, ImageIcon, AlertCircle, Check, Loader2, Archive } from "lucide-react";
import JSZip from "jszip";

interface ConvertItem {
  id: string;
  file: File;
  src: string;
  name: string;
  size: number; // raw bytes
  width: number;
  height: number;
  outputSrc: string | null;
  outputSize: number;
  isConverting: boolean;
}

// Global helper to convert a single PNG to JPEG via Canvas
const convertSinglePng = (src: string, width: number, height: number, quality: number): Promise<{ dataUrl: string; size: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to get 2D context"));
        return;
      }
      
      // Draw white background (since PNG might have transparency and JPEG does not support alpha)
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      // Estimate bytes
      const stringLength = dataUrl.length - "data:image/jpeg;base64,".length;
      const sizeInBytes = Math.floor(stringLength * 0.75);
      
      resolve({ dataUrl, size: sizeInBytes });
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
};

export default function ConverterTool() {
  const [items, setItems] = useState<ConvertItem[]>([]);
  const [quality, setQuality] = useState<0.5 | 0.7 | 0.85 | 0.95>(0.85);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // Trigger batch conversion when items or quality changes
  useEffect(() => {
    if (items.length === 0) return;
    
    let isMounted = true;
    
    const convertAll = async () => {
      setIsProcessing(true);
      const currentItems = itemsRef.current;
      for (const item of currentItems) {
        if (!isMounted) return;
        
        // Set individual converting flag
        setItems(prev => prev.map(p => p.id === item.id ? { ...p, isConverting: true } : p));
        
        try {
          const result = await convertSinglePng(item.src, item.width, item.height, quality);
          if (!isMounted) return;
          
          setItems(prev => prev.map(p => p.id === item.id ? { 
            ...p, 
            isConverting: false,
            outputSrc: result.dataUrl,
            outputSize: result.size
          } : p));
        } catch {
          if (!isMounted) return;
          setItems(prev => prev.map(p => p.id === item.id ? { ...p, isConverting: false } : p));
        }
      }
      setIsProcessing(false);
    };
    
    convertAll();
    
    return () => {
      isMounted = false;
    };
  }, [items.length, quality]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError(null);
    if (acceptedFiles.length === 0) return;
    
    let filesToProcess = acceptedFiles;
    if (acceptedFiles.length > 10) {
      setError("Maximum 10 files can be uploaded at once. Only the first 10 files will be processed.");
      filesToProcess = acceptedFiles.slice(0, 10);
    }
    
    const newItems: ConvertItem[] = [];
    let loadedCount = 0;
    
    filesToProcess.forEach((file, idx) => {
      const src = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        newItems.push({
          id: `item-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 9)}`,
          file,
          src,
          name: file.name,
          size: file.size,
          width: img.width,
          height: img.height,
          outputSrc: null,
          outputSize: 0,
          isConverting: false
        });
        
        loadedCount++;
        if (loadedCount === filesToProcess.length) {
          // Sort according to original drop order
          newItems.sort((a, b) => {
            const indexA = filesToProcess.indexOf(a.file);
            const indexB = filesToProcess.indexOf(b.file);
            return indexA - indexB;
          });
          setItems(newItems);
        }
      };
      img.onerror = () => {
        loadedCount++;
        if (loadedCount === filesToProcess.length) {
          setItems(newItems);
        }
      };
      img.src = src;
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/png": [".png"],
    },
    maxFiles: 10
  });

  const downloadSingle = (item: ConvertItem) => {
    if (!item.outputSrc) return;
    const link = document.createElement("a");
    const nameWithoutExt = item.name.replace(/\.[^/.]+$/, "");
    link.download = `${nameWithoutExt}_converted_q${Math.round(quality * 100)}.jpg`;
    link.href = item.outputSrc;
    link.click();
  };

  const handleDownloadAllOneByOne = () => {
    items.forEach((item) => {
      if (item.outputSrc) {
        downloadSingle(item);
      }
    });
  };

  const handleDownloadZip = async () => {
    const activeItems = items.filter(i => i.outputSrc);
    if (activeItems.length === 0) return;
    
    setIsZipping(true);
    try {
      const zip = new JSZip();
      
      activeItems.forEach((item) => {
        const base64Data = item.outputSrc!.split(",")[1];
        const nameWithoutExt = item.name.replace(/\.[^/.]+$/, "");
        const filename = `${nameWithoutExt}_converted_q${Math.round(quality * 100)}.jpg`;
        
        // Add to zip archive
        zip.file(filename, base64Data, { base64: true });
      });
      
      const content = await zip.generateAsync({ type: "blob" });
      
      const link = document.createElement("a");
      link.href = URL.createObjectURL(content);
      link.download = `verand_converted_images_q${Math.round(quality * 100)}.zip`;
      link.click();
    } catch {
      setError("Failed to generate ZIP file.");
    } finally {
      setIsZipping(false);
    }
  };

  const handleReset = () => {
    items.forEach((item) => {
      URL.revokeObjectURL(item.src);
    });
    setItems([]);
    setQuality(0.85);
    setError(null);
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
    <div className="w-full max-w-6xl mx-auto py-8 px-4 relative z-10">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-space font-bold mb-2">PNG to JPEG Converter</h2>
        <p className="text-neutral-400 text-sm">Convert transparent or heavy PNG files into optimized, browser-ready JPEG format.</p>
      </div>

      <AnimatePresence mode="wait">
        {items.length === 0 ? (
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
              <h3 className="font-space font-semibold text-lg mb-2">Upload PNG Images</h3>
              <p className="text-neutral-400 text-xs mb-4">Drag and drop up to 10 PNG images, maximum 20MB per file</p>
              <button className="px-5 py-2.5 rounded-xl bg-neon-purple text-white text-xs font-semibold uppercase tracking-wider font-space glow-purple hover:bg-[#8e6bff] cursor-pointer">
                Select PNG Files
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
            {/* Left side: Images List Grid */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex justify-between items-center pb-2">
                <span className="text-sm font-space text-neutral-400">
                  Files to Convert: <span className="text-white font-bold">{items.length}</span>
                </span>
                {isProcessing && (
                  <span className="text-xs text-neon-purple flex items-center gap-1.5 font-mono animate-pulse">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Processing images...</span>
                  </span>
                )}
              </div>

              {error && (
                <div className="p-3.5 rounded-xl border border-red-500/30 bg-red-950/20 text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
                {items.map((item) => {
                  const compressionPercent = item.size && item.outputSize
                    ? Math.round(((item.size - item.outputSize) / item.size) * 100)
                    : 0;

                  return (
                    <div 
                      key={item.id}
                      className="glass-card rounded-2xl p-4 border border-neutral-800 flex gap-4 items-center relative group"
                    >
                      {/* Image Thumbnail */}
                      <div className="h-20 w-20 rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800 flex items-center justify-center shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={item.src} 
                          alt="Thumbnail" 
                          className="max-w-full max-h-full object-contain" 
                        />
                      </div>

                      {/* Info & Metadata */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-white truncate font-space mb-1" title={item.name}>
                          {item.name}
                        </h4>
                        <div className="text-[10px] text-neutral-500 font-mono space-y-0.5">
                          <div>PNG: {formatSize(item.size)} | {item.width}×{item.height}</div>
                          {item.outputSrc ? (
                            <div className="text-lime-green font-semibold">
                              JPEG: {formatSize(item.outputSize)} ({compressionPercent}% smaller)
                            </div>
                          ) : (
                            <div className="text-neutral-600">Pending conversion...</div>
                          )}
                        </div>
                      </div>

                      {/* Status / Actions */}
                      <div className="shrink-0 flex items-center justify-center pl-2">
                        {item.isConverting ? (
                          <Loader2 className="h-5 w-5 text-neon-purple animate-spin" />
                        ) : item.outputSrc ? (
                          <div className="flex flex-col items-end gap-2">
                            <span className="text-[9px] bg-lime-green/10 border border-lime-green/30 text-lime-green px-1.5 py-0.5 rounded font-bold uppercase tracking-wider flex items-center gap-1">
                              <Check className="h-3 w-3" />
                              <span>Ready</span>
                            </span>
                            <button
                              onClick={() => downloadSingle(item)}
                              className="text-[11px] text-neutral-400 hover:text-white hover:underline cursor-pointer flex items-center gap-1"
                              title="Download single JPEG"
                            >
                              <Download className="h-3 w-3" />
                              <span>Download</span>
                            </button>
                          </div>
                        ) : (
                          <span className="h-2 w-2 rounded-full bg-neutral-700 animate-pulse" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right side: Global control card */}
            <div className="space-y-6">
              <div className="glass-card rounded-3xl p-6 border border-neutral-800">
                <h3 className="text-base font-space font-bold mb-6 text-white">Batch Controls</h3>
                
                {/* Sliders / Preset Radio Buttons */}
                <div className="space-y-4 mb-8">
                  <span className="text-xs text-neutral-400 block mb-2 font-medium">JPEG Quality Preset:</span>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { val: 0.5, label: "50% - Low Size" },
                      { val: 0.7, label: "70% - Balanced" },
                      { val: 0.85, label: "85% - High" },
                      { val: 0.95, label: "95% - Premium" }
                    ].map((item) => {
                      const isSelected = quality === item.val;
                      return (
                        <button
                          key={item.val}
                          onClick={() => setQuality(item.val as 0.5 | 0.7 | 0.85 | 0.95)}
                          disabled={isProcessing}
                          className={`p-3.5 rounded-xl border text-center cursor-pointer transition-all duration-200 ${
                            isSelected 
                              ? "border-neon-purple bg-neon-purple/5 font-semibold text-white shadow-[0_0_12px_rgba(127,86,255,0.05)]" 
                              : "border-neutral-800 bg-charcoal-light/20 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200"
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          <div className="text-sm font-space">{item.label.split(" - ")[0]}</div>
                          <div className="text-[9px] uppercase tracking-wider text-neutral-500 mt-1">
                            {item.label.split(" - ")[1]}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Batch Actions */}
                <div className="space-y-3 pt-2">
                  <button
                    onClick={handleDownloadZip}
                    disabled={items.length === 0 || isZipping}
                    className="w-full py-3.5 rounded-2xl bg-lime-green text-black text-xs font-bold uppercase tracking-wider font-space glow-green hover:shadow-[0_0_20px_rgba(128,255,86,0.5)] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                  >
                    {isZipping ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Archive className="h-4 w-4" />
                    )}
                    <span>{isZipping ? "Packing ZIP..." : "Download as ZIP"}</span>
                  </button>

                  <button
                    onClick={handleDownloadAllOneByOne}
                    disabled={items.length === 0 || isProcessing}
                    className="w-full py-3.5 rounded-2xl bg-charcoal-light border border-neutral-800 hover:border-neutral-700 hover:text-white text-neutral-300 text-xs font-semibold uppercase tracking-wider font-space cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download All (1-by-1)</span>
                  </button>

                  <button
                    onClick={handleReset}
                    className="w-full py-3.5 rounded-2xl bg-charcoal-dark border border-neutral-800/80 hover:border-red-500/30 hover:text-red-400 text-neutral-400 text-xs font-semibold uppercase tracking-wider font-space cursor-pointer flex items-center justify-center gap-2 transition-all duration-300"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>Reset / Start New</span>
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
