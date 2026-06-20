"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Upload, Sparkles, Download, RefreshCw, File, Layers, 
  ZoomIn, ZoomOut, Check, Loader2, Archive, AlertCircle
} from "lucide-react";
import JSZip from "jszip";

interface UpscaleItem {
  id: string;
  file: File;
  src: string;
  lowResSrc: string;
  name: string;
  size: string;
  format: string;
  width: number;
  height: number;
  isUpscaling: boolean;
  isCompleted: boolean;
  progress: number;
  loadingText: string;
}

interface UpscaleToolProps {
  initialFile: File | null;
  onResetInitialFile: () => void;
}

// Setup low resolution simulator (downscaling image onto canvas to simulate original low res)
const generateLowResSimulation = (imgSrc: string, width: number, height: number): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(imgSrc);
        return;
      }

      // Downsample the image by 6x to introduce pixelation/blur
      const downscale = 6;
      canvas.width = Math.max(32, Math.floor(width / downscale));
      canvas.height = Math.max(32, Math.floor(height / downscale));

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Draw it back to normal size on a second canvas with smoothing off
      const outCanvas = document.createElement("canvas");
      const outCtx = outCanvas.getContext("2d");
      if (!outCtx) {
        resolve(imgSrc);
        return;
      }

      outCanvas.width = width;
      outCanvas.height = height;
      outCtx.imageSmoothingEnabled = false; // keep it pixelated
      outCtx.drawImage(canvas, 0, 0, width, height);

      // Add a slight blur filter for realism
      const finalCanvas = document.createElement("canvas");
      const finalCtx = finalCanvas.getContext("2d");
      if (finalCtx) {
        finalCanvas.width = width;
        finalCanvas.height = height;
        finalCtx.filter = "blur(0.8px) contrast(98%)";
        finalCtx.drawImage(outCanvas, 0, 0);
        resolve(finalCanvas.toDataURL("image/jpeg", 0.7));
      } else {
        resolve(outCanvas.toDataURL("image/jpeg", 0.7));
      }
    };
    img.src = imgSrc;
  });
};

// Global helper to generate upscaled canvas and output data URL
const generateUpscaledDataUrl = (item: UpscaleItem, factor: number): Promise<{ dataUrl: string; ext: string }> => {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      resolve({ dataUrl: item.src, ext: "png" });
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      // Create high-res target canvas
      canvas.width = item.width * factor;
      canvas.height = item.height * factor;
      
      const mimeType = item.file.type || "image/png";
      const isJpeg = mimeType === "image/jpeg" || mimeType === "image/jpg" || item.name.toLowerCase().endsWith(".jpg") || item.name.toLowerCase().endsWith(".jpeg");
      const isWebp = mimeType === "image/webp" || item.name.toLowerCase().endsWith(".webp");
      
      let exportMime = "image/png";
      let downloadExt = "png";
      let qualityParam: number | undefined = undefined;
      
      if (isJpeg) {
        exportMime = "image/jpeg";
        downloadExt = "jpg";
        qualityParam = 0.95; // High-quality export
        
        // Fill canvas background to prevent black margins on JPEG conversion
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else if (isWebp) {
        exportMime = "image/webp";
        downloadExt = "webp";
        qualityParam = 0.95;
      }

      // Draw image upscaled
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      resolve({ dataUrl: canvas.toDataURL(exportMime, qualityParam), ext: downloadExt });
    };
    img.onerror = () => resolve({ dataUrl: item.src, ext: "png" });
    img.src = item.src;
  });
};

export default function UpscaleTool({ initialFile, onResetInitialFile }: UpscaleToolProps) {
  const [items, setItems] = useState<UpscaleItem[]>([]);
  const [selectedFactor, setSelectedFactor] = useState<2 | 4 | 8>(4);
  const [status, setStatus] = useState<"upload" | "details" | "loading" | "preview">("upload");
  const [selectedItem, setSelectedItem] = useState<UpscaleItem | null>(null);

  // Zipping / Processing states
  const [isZipping, setIsZipping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Preview interaction states
  const [sliderPosition, setSliderPosition] = useState(50);
  const [zoom, setZoom] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // Listen to initial file passed from hero
  useEffect(() => {
    if (initialFile) {
      const src = URL.createObjectURL(initialFile);
      const img = new Image();
      img.onload = async () => {
        const lowResSrc = await generateLowResSimulation(src, img.width, img.height);
        const newItem: UpscaleItem = {
          id: `item-${Date.now()}-0-${Math.random().toString(36).substr(2, 9)}`,
          file: initialFile,
          src,
          lowResSrc,
          name: initialFile.name,
          size: (initialFile.size / (1024 * 1024)).toFixed(2) + " MB",
          format: initialFile.type.split("/")[1].toUpperCase(),
          width: img.width,
          height: img.height,
          isUpscaling: false,
          isCompleted: false,
          progress: 0,
          loadingText: "Pending"
        };
        setItems([newItem]);
        setStatus("details");
        onResetInitialFile();
      };
      img.src = src;
    }
  }, [initialFile, onResetInitialFile]);

  // Batch process simulation in loading state
  useEffect(() => {
    if (status !== "loading" || items.length === 0) return;
    
    let isMounted = true;
    
    const steps = [
      { p: 25, t: "Analyzing structural details..." },
      { p: 55, t: "Denoising input pixel matrix..." },
      { p: 80, t: "Reconstructing textures..." },
      { p: 100, t: "Sharpening & compiling output..." }
    ];

    const runBatchUpscale = async () => {
      const currentItems = itemsRef.current;
      for (let i = 0; i < currentItems.length; i++) {
        if (!isMounted) return;
        const currentItem = currentItems[i];
        
        // Mark item as active upscaling
        setItems(prev => prev.map(p => p.id === currentItem.id ? { 
          ...p, 
          isUpscaling: true,
          progress: 0,
          loadingText: "Initializing AI..."
        } : p));
        
        // Simulate progress increment
        await new Promise<void>((resolve) => {
          let stepIdx = 0;
          let progressVal = 0;
          
          const interval = setInterval(() => {
            if (!isMounted) {
              clearInterval(interval);
              resolve();
              return;
            }
            
            progressVal += 5;
            if (progressVal >= 100) {
              progressVal = 100;
              clearInterval(interval);
              
              setItems(prev => prev.map(p => p.id === currentItem.id ? { 
                ...p, 
                isUpscaling: false,
                isCompleted: true,
                progress: 100,
                loadingText: "Completed"
              } : p));
              
              resolve();
            } else {
              const target = steps[stepIdx].p;
              if (progressVal >= target && stepIdx < steps.length - 1) {
                stepIdx++;
              }
              
              setItems(prev => prev.map(p => p.id === currentItem.id ? { 
                ...p, 
                progress: progressVal,
                loadingText: steps[stepIdx].t
              } : p));
            }
          }, 80); // 80ms * 20 steps = 1.6s per image
        });
      }
      
      if (isMounted) {
        setStatus("preview");
        setSelectedItem(currentItems[0]);
      }
    };
    
    runBatchUpscale();
    
    return () => {
      isMounted = false;
    };
  }, [status, items.length]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError(null);
    if (acceptedFiles.length === 0) return;
    
    let filesToProcess = acceptedFiles;
    if (acceptedFiles.length > 10) {
      setError("Maximum 10 files can be uploaded at once. Only the first 10 files will be processed.");
      filesToProcess = acceptedFiles.slice(0, 10);
    }
    
    const newItems: UpscaleItem[] = [];
    let loadedCount = 0;
    
    filesToProcess.forEach((file, idx) => {
      const src = URL.createObjectURL(file);
      const img = new Image();
      img.onload = async () => {
        const lowResSrc = await generateLowResSimulation(src, img.width, img.height);
        newItems.push({
          id: `item-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 9)}`,
          file,
          src,
          lowResSrc,
          name: file.name,
          size: (file.size / (1024 * 1024)).toFixed(2) + " MB",
          format: file.type.split("/")[1].toUpperCase(),
          width: img.width,
          height: img.height,
          isUpscaling: false,
          isCompleted: false,
          progress: 0,
          loadingText: "Pending"
        });
        
        loadedCount++;
        if (loadedCount === filesToProcess.length) {
          newItems.sort((a, b) => {
            const indexA = filesToProcess.indexOf(a.file);
            const indexB = filesToProcess.indexOf(b.file);
            return indexA - indexB;
          });
          setItems(newItems);
          setStatus("details");
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
      "image/jpeg": [".jpg", ".jpeg"],
      "image/webp": [".webp"],
    },
    maxFiles: 10
  });

  const handleStartUpscale = () => {
    setStatus("loading");
  };

  const downloadSingle = async (item: UpscaleItem) => {
    const result = await generateUpscaledDataUrl(item, selectedFactor);
    const link = document.createElement("a");
    const nameParts = item.name.split(".");
    if (nameParts.length > 1) {
      nameParts.pop();
    }
    link.download = `${nameParts.join(".")}_upscaled_${selectedFactor}x.${result.ext}`;
    link.href = result.dataUrl;
    link.click();
  };

  const handleDownloadAllOneByOne = async () => {
    for (const item of items) {
      await downloadSingle(item);
    }
  };

  const handleDownloadZip = async () => {
    setIsZipping(true);
    try {
      const zip = new JSZip();
      
      for (const item of items) {
        const result = await generateUpscaledDataUrl(item, selectedFactor);
        const base64Data = result.dataUrl.split(",")[1];
        const nameParts = item.name.split(".");
        if (nameParts.length > 1) {
          nameParts.pop();
        }
        const filename = `${nameParts.join(".")}_upscaled_${selectedFactor}x.${result.ext}`;
        zip.file(filename, base64Data, { base64: true });
      }
      
      const content = await zip.generateAsync({ type: "blob" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(content);
      link.download = `verand_upscaled_images_${selectedFactor}x.zip`;
      link.click();
    } catch {
      setError("Failed to create ZIP file.");
    } finally {
      setIsZipping(false);
    }
  };

  const handleSliderMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.min(Math.max(0, (x / rect.width) * 100), 100);
    setSliderPosition(percentage);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches[0]) {
      handleSliderMove(e.touches[0].clientX);
    }
  };

  const handleReset = () => {
    items.forEach((item) => {
      URL.revokeObjectURL(item.src);
    });
    setItems([]);
    setSelectedItem(null);
    setStatus("upload");
    setZoom(1);
    setSliderPosition(50);
    setError(null);
  };

  const upscaleOptions = [
    {
      factor: 2 as const,
      time: "1.8s",
      quality: "Fast Enhancement",
      cost: "1 Credit"
    },
    {
      factor: 4 as const,
      time: "3.2s",
      quality: "Balanced Quality",
      cost: "2 Credits"
    },
    {
      factor: 8 as const,
      time: "6.5s",
      quality: "Maximum Detail",
      cost: "5 Credits"
    }
  ];

  // Calculate overall loading metrics
  const completedCount = items.filter(i => i.isCompleted).length;
  const overallProgress = items.length > 0 ? (completedCount / items.length) * 100 : 0;
  const activeUpscalingItem = items.find(i => i.isUpscaling);

  return (
    <div className="w-full max-w-6xl mx-auto py-8 px-4 relative z-10">
      <AnimatePresence mode="wait">
        {/* State 1: Upload */}
        {status === "upload" && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="flex flex-col items-center"
          >
            <div className="text-center mb-10">
              <h2 className="text-3xl font-space font-bold mb-2">AI Image Upscaler</h2>
              <p className="text-neutral-400 text-sm">Enhance details, sharpen edges, and clear noise instantly.</p>
            </div>

            <div
              {...getRootProps()}
              className={`w-full max-w-2xl rounded-3xl p-12 border-2 border-dashed glass-card text-center cursor-pointer flex flex-col items-center justify-center min-h-[300px] transition-all duration-300 ${
                isDragActive ? "border-lime-green bg-lime-green/5" : "border-neon-purple/20 hover:border-neon-purple/50"
              }`}
            >
              <input {...getInputProps()} />
              <div className="p-5 rounded-2xl bg-charcoal-light/60 border border-neutral-800 mb-6">
                <Upload className="h-8 w-8 text-neon-purple animate-pulse" />
              </div>
              <h3 className="font-space font-semibold text-lg mb-2">Select Images to Upscale</h3>
              <p className="text-neutral-400 text-xs mb-4">PNG, JPEG, WEBP files up to 10 files, maximum 20MB per file</p>
              <button className="px-5 py-2.5 rounded-xl bg-neon-purple text-white text-xs font-semibold uppercase tracking-wider font-space glow-purple hover:bg-[#8e6bff] cursor-pointer">
                Browse Files
              </button>
            </div>

            {error && (
              <div className="mt-4 p-3.5 rounded-xl border border-red-500/30 bg-red-950/20 text-red-400 text-sm flex items-center gap-2 max-w-2xl w-full">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </motion.div>
        )}

        {/* State 2: Details and configuration list */}
        {status === "details" && items.length > 0 && (
          <motion.div
            key="details"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start"
          >
            {/* Left Column: Batch Images List */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-sm font-space font-bold uppercase tracking-widest text-neutral-400 mb-2 flex items-center gap-2">
                <Layers className="h-4 w-4 text-neon-purple" />
                <span>Batch Files ({items.length})</span>
              </h3>

              {error && (
                <div className="p-3.5 rounded-xl border border-red-500/30 bg-red-950/20 text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                {items.map((item) => (
                  <div 
                    key={item.id}
                    className="glass-card rounded-2xl p-4 border border-neutral-800 flex gap-4 items-center"
                  >
                    <div className="h-16 w-16 rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800 flex items-center justify-center shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.src} alt="Thumbnail" className="max-w-full max-h-full object-contain" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-white truncate font-space mb-1" title={item.name}>
                        {item.name}
                      </h4>
                      <div className="text-[10px] text-neutral-500 font-mono">
                        {item.format} | {item.size} | {item.width}×{item.height}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Factor selector and process trigger */}
            <div className="space-y-6">
              <div className="glass-card rounded-3xl p-6 border border-neutral-800">
                <h3 className="text-base font-space font-bold mb-4 text-white">Select Upscale Factor</h3>
                
                {/* Options cards */}
                <div className="space-y-4 mb-6">
                  {upscaleOptions.map((opt) => {
                    const isSelected = selectedFactor === opt.factor;
                    return (
                      <button
                        key={opt.factor}
                        onClick={() => setSelectedFactor(opt.factor)}
                        className={`w-full text-left p-4 rounded-2xl border transition-all duration-300 cursor-pointer flex flex-col ${
                          isSelected 
                            ? "border-neon-purple bg-neon-purple/5 shadow-[0_0_15px_rgba(127,86,255,0.08)]" 
                            : "border-neutral-800 bg-charcoal-light/20 hover:border-neutral-700"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-2">
                          <span className={`text-xl font-space font-black ${isSelected ? "text-neon-purple" : "text-neutral-400"}`}>
                            {opt.factor}×
                          </span>
                          <span className="text-[10px] bg-charcoal-light border border-neutral-800 px-2 py-0.5 rounded text-neutral-400 font-medium font-mono">
                            {opt.cost} / file
                          </span>
                        </div>
                        <div className="w-full text-xs text-neutral-400 pt-2 border-t border-neutral-800/60 flex justify-between">
                          <span>{opt.quality}</span>
                          <span className="font-mono text-neutral-300">Est: {opt.time}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleReset}
                    className="flex-1 py-3 rounded-xl bg-charcoal-light border border-neutral-800 hover:border-neutral-700 text-neutral-300 text-xs font-semibold uppercase tracking-wider font-space cursor-pointer"
                  >
                    Reset
                  </button>
                  <button
                    onClick={handleStartUpscale}
                    className="flex-2 py-3 rounded-xl bg-neon-purple text-white text-xs font-bold uppercase tracking-wider font-space glow-purple hover:bg-[#8e6bff] cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>Upscale Batch</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* State 3: Batch Loading/Processing screen */}
        {status === "loading" && items.length > 0 && (
          <motion.div
            key="loading"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start"
          >
            {/* Left side: Images showing individual conversion progress */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-sm font-space font-bold uppercase tracking-widest text-neutral-400 mb-2">
                Processing Queue ({completedCount} of {items.length} completed)
              </h3>
              
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                {items.map((item) => {
                  const isActive = item.isUpscaling;
                  const isDone = item.isCompleted;

                  return (
                    <div 
                      key={item.id}
                      className={`glass-card rounded-2xl p-4 border transition-all duration-300 flex gap-4 items-center relative ${
                        isActive ? "border-neon-purple/50 bg-neon-purple/5 shadow-[0_0_15px_rgba(127,86,255,0.05)]" : "border-neutral-800"
                      }`}
                    >
                      <div className="h-16 w-16 rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800 flex items-center justify-center shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.src} alt="Thumbnail" className="max-w-full max-h-full object-contain" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-white truncate font-space mb-1" title={item.name}>
                          {item.name}
                        </h4>
                        
                        {isActive ? (
                          <div className="space-y-2 mt-1">
                            <span className="text-[10px] text-neon-purple font-mono animate-pulse">{item.loadingText}</span>
                            <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-neon-purple h-full rounded-full transition-all duration-100" style={{ width: `${item.progress}%` }} />
                            </div>
                          </div>
                        ) : isDone ? (
                          <span className="text-[10px] text-lime-green font-mono flex items-center gap-1">
                            <Check className="h-3.5 w-3.5" />
                            <span>Enhanced {selectedFactor}× successfully</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-neutral-600 font-mono">In Queue...</span>
                        )}
                      </div>

                      <div className="shrink-0 pl-2">
                        {isActive ? (
                          <Loader2 className="h-5 w-5 text-neon-purple animate-spin" />
                        ) : isDone ? (
                          <Check className="h-5 w-5 text-lime-green" />
                        ) : (
                          <span className="h-2 w-2 rounded-full bg-neutral-700" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right side: Global batch processing summary */}
            <div className="space-y-6">
              <div className="glass-card rounded-3xl p-6 border border-neutral-800 text-center flex flex-col items-center py-10">
                <div className="relative h-20 w-20 mb-6">
                  <div className="absolute inset-0 rounded-full border-4 border-neutral-800" />
                  <div 
                    className="absolute inset-0 rounded-full border-4 border-transparent border-t-neon-purple border-r-lime-green animate-spin" 
                    style={{ animationDuration: "1.2s" }}
                  />
                  <div className="absolute inset-2 rounded-full bg-background flex items-center justify-center">
                    <Layers className="h-8 w-8 text-neon-purple animate-pulse" />
                  </div>
                </div>

                <h3 className="text-lg font-space font-bold mb-2">Enhancing Image Batch...</h3>
                <p className="text-neutral-400 text-xs mb-8 font-mono">
                  {activeUpscalingItem ? `Upscaling: ${activeUpscalingItem.name}` : "Starting AI models..."}
                </p>

                {/* Progress bar */}
                <div className="w-full bg-charcoal-light/60 border border-neutral-800 h-2.5 rounded-full overflow-hidden mb-3">
                  <div 
                    className="bg-linear-to-r from-neon-purple to-lime-green h-full rounded-full transition-all duration-300 shadow-[0_0_12px_rgba(127,86,255,0.5)]"
                    style={{ width: `${overallProgress}%` }}
                  />
                </div>

                <div className="flex justify-between w-full text-xs text-neutral-500 font-mono">
                  <span>{completedCount} of {items.length} Done</span>
                  <span>{Math.round(overallProgress)}% Complete</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* State 4: Preview workspace and comparison */}
        {status === "preview" && items.length > 0 && selectedItem && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
          >
            {/* Left side: List of Completed Items (Column Span 4) */}
            <div className="lg:col-span-4 space-y-4">
              <div className="flex justify-between items-center pb-2">
                <span className="text-sm font-space text-neutral-400">
                  Enhanced Files: <span className="text-white font-bold">{items.length}</span>
                </span>
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                {items.map((item) => {
                  const isCurrentlySelected = selectedItem.id === item.id;
                  return (
                    <div 
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className={`glass-card rounded-2xl p-3.5 border transition-all duration-300 flex gap-3 items-center relative cursor-pointer ${
                        isCurrentlySelected 
                          ? "border-neon-purple bg-neon-purple/5 shadow-[0_0_15px_rgba(127,86,255,0.08)]" 
                          : "border-neutral-800/80 hover:border-neutral-700/60"
                      }`}
                    >
                      <div className="h-14 w-14 rounded-lg overflow-hidden bg-neutral-900 border border-neutral-800 flex items-center justify-center shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.src} alt="Thumbnail" className="max-w-full max-h-full object-contain" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className={`text-xs font-semibold truncate font-space mb-0.5 ${isCurrentlySelected ? "text-white" : "text-neutral-300"}`} title={item.name}>
                          {item.name}
                        </h4>
                        <div className="text-[9px] text-neutral-500 font-mono space-y-0.5">
                          <div>Upscaled to {item.width * selectedFactor} × {item.height * selectedFactor}</div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadSingle(item);
                            }}
                            className="text-[10px] text-lime-green hover:underline cursor-pointer flex items-center gap-1 pt-1 font-space"
                          >
                            <Download className="h-3 w-3" />
                            <span>Download JPEG</span>
                          </button>
                        </div>
                      </div>

                      {isCurrentlySelected && (
                        <div className="h-1.5 w-1.5 rounded-full bg-neon-purple glow-purple shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right side: Active Comparison and Action Controls (Column Span 8) */}
            <div className="lg:col-span-8 space-y-6">
              {/* Header metadata */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800/80">
                <div>
                  <h2 className="text-xl font-space font-bold text-white flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-lime-green text-glow-green" />
                    <span>Upscale Result Comparison</span>
                  </h2>
                  <p className="text-xs text-neutral-400 mt-1 truncate max-w-lg">
                    Active File: <span className="text-white font-semibold font-mono">{selectedItem.name}</span> ({selectedFactor}× factor)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-charcoal-light border border-neutral-800 hover:border-neutral-700 text-neutral-300 text-xs font-semibold cursor-pointer"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Start New</span>
                  </button>
                </div>
              </div>

              {/* Interactive Comparison Slider */}
              <div 
                ref={containerRef}
                className="relative aspect-video w-full rounded-3xl overflow-hidden border border-neutral-800 bg-neutral-950 flex items-center justify-center"
                onMouseMove={(e) => {
                  if (e.buttons === 1 || isDragging.current) {
                    handleSliderMove(e.clientX);
                  }
                }}
                onMouseDown={(e) => {
                  isDragging.current = true;
                  handleSliderMove(e.clientX);
                }}
                onMouseUp={() => { isDragging.current = false; }}
                onTouchMove={handleTouchMove}
                onTouchStart={() => { isDragging.current = true; }}
                onTouchEnd={() => { isDragging.current = false; }}
              >
                {/* Image zoom container */}
                <div 
                  className="w-full h-full flex items-center justify-center overflow-hidden"
                  style={{ 
                    transform: `scale(${zoom})`, 
                    transformOrigin: "center center",
                    transition: "transform 0.2s ease" 
                  }}
                >
                  {/* Right Image (Enhanced High-Res Original) */}
                  <div className="absolute inset-0 flex items-center justify-center p-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selectedItem.src}
                      alt="Enhanced"
                      className="max-w-full max-h-full object-contain pointer-events-none select-none"
                    />
                  </div>

                  {/* Left Image (Low-Res Original, clipped) */}
                  <div 
                    className="absolute inset-0 flex items-center justify-center p-4"
                    style={{
                      clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)`
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selectedItem.lowResSrc}
                      alt="Original"
                      className="max-w-full max-h-full object-contain pointer-events-none select-none"
                    />
                  </div>
                </div>

                {/* Comparison Labels */}
                <div 
                  className="absolute top-4 left-4 z-20 px-3 py-1 rounded bg-black/60 backdrop-blur text-[10px] font-space font-bold uppercase tracking-wider border border-white/10"
                  style={{ opacity: sliderPosition > 10 ? 1 : 0, transition: "opacity 0.2s" }}
                >
                  Original (Low Res)
                </div>
                <div 
                  className="absolute top-4 right-4 z-20 px-3 py-1 rounded bg-neon-purple/75 backdrop-blur text-[10px] font-space font-bold uppercase tracking-wider border border-neon-purple/20"
                  style={{ opacity: sliderPosition < 90 ? 1 : 0, transition: "opacity 0.2s" }}
                >
                  Enhanced (AI Upscaled)
                </div>

                {/* Slider Divider Bar */}
                <div 
                  className="absolute top-0 bottom-0 w-[2px] bg-lime-green cursor-ew-resize z-30 pointer-events-none shadow-[0_0_10px_rgba(128,255,86,0.8)]"
                  style={{ left: `${sliderPosition}%` }}
                >
                  <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-black border-2 border-lime-green flex items-center justify-center shadow-[0_0_12px_rgba(128,255,86,0.5)]">
                    <span className="text-[10px] text-lime-green font-bold select-none font-space">⇄</span>
                  </div>
                </div>
              </div>

              {/* Action and Zoom Controls Bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-charcoal-light/20 border border-neutral-800">
                {/* Zoom Controls */}
                <div className="flex items-center gap-1 bg-charcoal-light/40 border border-neutral-800 rounded-xl p-1 shrink-0">
                  <button 
                    onClick={() => setZoom(prev => Math.max(1, prev - 0.5))}
                    className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800/50 cursor-pointer"
                    title="Zoom Out"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </button>
                  <span className="text-xs font-mono font-bold text-white px-2 min-w-[50px] text-center select-none">
                    {Math.round(zoom * 100)}%
                  </span>
                  <button 
                    onClick={() => setZoom(prev => Math.min(4, prev + 0.5))}
                    className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800/50 cursor-pointer"
                    title="Zoom In"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => setZoom(1)}
                    className="p-2 rounded-lg text-[10px] text-neutral-500 hover:text-white hover:bg-neutral-800/50 cursor-pointer uppercase font-bold px-2"
                    title="Reset Zoom"
                  >
                    Reset
                  </button>
                </div>

                {/* Bulk Action Buttons */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleDownloadZip}
                    disabled={isZipping}
                    className="py-3 px-5 rounded-xl bg-lime-green text-black text-xs font-bold uppercase tracking-wider font-space glow-green hover:shadow-[0_0_20px_rgba(128,255,86,0.5)] cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {isZipping ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Archive className="h-4 w-4" />
                    )}
                    <span>{isZipping ? "Packing ZIP..." : "Download ZIP"}</span>
                  </button>

                  <button
                    onClick={handleDownloadAllOneByOne}
                    className="py-3 px-5 rounded-xl bg-charcoal-light border border-neutral-800 hover:border-neutral-700 text-neutral-200 text-xs font-semibold uppercase tracking-wider font-space cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download All (1-by-1)</span>
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
