"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Upload, Sparkles, Download, RefreshCw, File, Layers, 
  ZoomIn, Maximize2, Minimize2 
} from "lucide-react";

interface ImageState {
  file: File;
  src: string;
  lowResSrc: string;
  name: string;
  size: string;
  format: string;
  width: number;
  height: number;
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

export default function UpscaleTool({ initialFile, onResetInitialFile }: UpscaleToolProps) {
  const [image, setImage] = useState<ImageState | null>(null);
  const [selectedFactor, setSelectedFactor] = useState<2 | 4 | 8>(4);
  const [status, setStatus] = useState<"upload" | "details" | "loading" | "preview">("upload");
  
  // Loading progress states
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState("Analyzing image pixels...");
  const [timeRemaining, setTimeRemaining] = useState(0);
  
  // Preview interaction states
  const [sliderPosition, setSliderPosition] = useState(50);
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const processImageFile = useCallback(async (file: File) => {
    const src = URL.createObjectURL(file);
    const img = new Image();
    img.onload = async () => {
      const lowResSrc = await generateLowResSimulation(src, img.width, img.height);
      setImage({
        file,
        src,
        lowResSrc,
        name: file.name,
        size: (file.size / (1024 * 1024)).toFixed(2) + " MB",
        format: file.type.split("/")[1].toUpperCase(),
        width: img.width,
        height: img.height
      });
      setStatus("details");
    };
    img.src = src;
  }, []);

  // Listen to initial file passed from hero
  useEffect(() => {
    if (initialFile) {
      processImageFile(initialFile);
      onResetInitialFile();
    }
  }, [initialFile, processImageFile, onResetInitialFile]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      processImageFile(acceptedFiles[0]);
    }
  }, [processImageFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/webp": [".webp"],
    },
    maxFiles: 1
  });

  const handleStartUpscale = () => {
    setStatus("loading");
    setProgress(0);
    
    const steps = [
      { p: 15, t: "Analyzing structural details...", time: 5 },
      { p: 35, t: "Denoising input pixel matrix...", time: 4 },
      { p: 60, t: "Reconstructing high-frequency textures...", time: 3 },
      { p: 85, t: "Polishing edges & sharpening details...", time: 1 },
      { p: 100, t: "Compiling output asset...", time: 0 }
    ];

    let currentStep = 0;
    const estimatedTotal = selectedFactor === 2 ? 2.5 : selectedFactor === 4 ? 4 : 7;
    setTimeRemaining(estimatedTotal);

    const timer = setInterval(() => {
      setTimeRemaining((prev) => Math.max(0, +(prev - 0.2).toFixed(1)));
    }, 200);

    const progressTimer = setInterval(() => {
      setProgress((prev) => {
        const target = steps[currentStep].p;
        setLoadingText(steps[currentStep].t);

        if (prev >= 100) {
          clearInterval(progressTimer);
          clearInterval(timer);
          setStatus("preview");
          return 100;
        }

        if (prev >= target && currentStep < steps.length - 1) {
          currentStep++;
        }

        return prev + 1.5;
      });
    }, 50);
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

  const handleDownload = () => {
    if (!image) return;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      // Create high-res target canvas
      canvas.width = image.width * selectedFactor;
      canvas.height = image.height * selectedFactor;
      
      // Determine file format
      const mimeType = image.file.type || "image/png";
      const isJpeg = mimeType === "image/jpeg" || mimeType === "image/jpg" || image.name.toLowerCase().endsWith(".jpg") || image.name.toLowerCase().endsWith(".jpeg");
      const isWebp = mimeType === "image/webp" || image.name.toLowerCase().endsWith(".webp");
      
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
      
      // Draw standard upscale watermark (aesthetic element)
      ctx.fillStyle = "rgba(128, 255, 86, 0.4)";
      ctx.font = `bold ${Math.max(12, canvas.width / 50)}px sans-serif`;
      ctx.fillText("VERAND AI", 30, canvas.height - 30);

      // Trigger download
      const link = document.createElement("a");
      const nameParts = image.name.split(".");
      if (nameParts.length > 1) {
        nameParts.pop(); // Remove original extension
      }
      link.download = `${nameParts.join(".")}_upscaled_${selectedFactor}x.${downloadExt}`;
      link.href = canvas.toDataURL(exportMime, qualityParam);
      link.click();
    };
    img.src = image.src;
  };

  const handleReset = () => {
    setImage(null);
    setStatus("upload");
    setZoom(1);
    setSliderPosition(50);
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
              <h3 className="font-space font-semibold text-lg mb-2">Select Image to Upscale</h3>
              <p className="text-neutral-400 text-xs mb-4">PNG, JPEG, WEBP files up to 20MB</p>
              <button className="px-5 py-2.5 rounded-xl bg-neon-purple text-white text-xs font-semibold uppercase tracking-wider font-space glow-purple hover:bg-[#8e6bff] cursor-pointer">
                Browse Files
              </button>
            </div>
          </motion.div>
        )}

        {/* State 2: Details and configuration */}
        {status === "details" && image && (
          <motion.div
            key="details"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start"
          >
            {/* Left Preview */}
            <div className="lg:col-span-2 space-y-6">
              <div className="glass-card rounded-3xl p-6 flex flex-col items-center justify-center overflow-hidden border border-neutral-800 bg-neutral-900/30">
                <div className="relative max-h-[420px] rounded-2xl overflow-hidden border border-neutral-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.src}
                    alt="Preview Source"
                    className="max-w-full h-auto object-contain max-h-[420px]"
                  />
                </div>
              </div>

              {/* Image Info Panel */}
              <div className="glass-card rounded-3xl p-6 border border-neutral-800">
                <h3 className="text-sm font-space font-semibold uppercase tracking-widest text-neutral-400 mb-4 flex items-center gap-2">
                  <File className="h-4 w-4 text-neon-purple" />
                  <span>Source File Metadata</span>
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 bg-charcoal-light/30 border border-neutral-800/60 rounded-2xl">
                    <span className="text-[10px] text-neutral-500 font-bold block uppercase tracking-wider mb-1">Format</span>
                    <span className="text-sm font-semibold text-white font-space">{image.format}</span>
                  </div>
                  <div className="p-3 bg-charcoal-light/30 border border-neutral-800/60 rounded-2xl">
                    <span className="text-[10px] text-neutral-500 font-bold block uppercase tracking-wider mb-1">File Size</span>
                    <span className="text-sm font-semibold text-white font-space">{image.size}</span>
                  </div>
                  <div className="p-3 bg-charcoal-light/30 border border-neutral-800/60 rounded-2xl">
                    <span className="text-[10px] text-neutral-500 font-bold block uppercase tracking-wider mb-1">Resolution</span>
                    <span className="text-sm font-semibold text-white font-space">{image.width} × {image.height}</span>
                  </div>
                  <div className="p-3 bg-charcoal-light/30 border border-neutral-800/60 rounded-2xl">
                    <span className="text-[10px] text-neutral-500 font-bold block uppercase tracking-wider mb-1">Total Pixels</span>
                    <span className="text-sm font-semibold text-white font-space">
                      {((image.width * image.height) / 1000000).toFixed(1)} MP
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Configuration */}
            <div className="space-y-6">
              <div className="glass-card rounded-3xl p-6 border border-neutral-800">
                <h3 className="text-base font-space font-bold mb-4 text-white">Select Upscale Factor</h3>
                
                {/* Cards */}
                <div className="space-y-4">
                  {upscaleOptions.map((opt) => {
                    const isSelected = selectedFactor === opt.factor;
                    return (
                      <div
                        key={opt.factor}
                        onClick={() => setSelectedFactor(opt.factor)}
                        className={`p-4 rounded-2xl border transition-all duration-300 cursor-pointer ${
                          isSelected 
                            ? "border-neon-purple bg-neon-purple/5 shadow-[0_0_15px_rgba(127,86,255,0.08)]" 
                            : "border-neutral-800 bg-charcoal-light/20 hover:border-neutral-700"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-xl font-space font-black ${isSelected ? "text-neon-purple" : "text-neutral-400"}`}>
                            {opt.factor}×
                          </span>
                          <span className="text-[10px] bg-charcoal-light border border-neutral-800 px-2 py-0.5 rounded text-neutral-400 font-medium">
                            {opt.cost}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-neutral-400 pt-2 border-t border-neutral-800/60">
                          <div>
                            <span className="text-[9px] text-neutral-500 block">EXPECTED RESOLUTION</span>
                            <span className="font-semibold text-neutral-200">
                              {image.width * opt.factor} × {image.height * opt.factor}
                            </span>
                          </div>
                          <div>
                            <span className="text-[9px] text-neutral-500 block">EST. TIME</span>
                            <span className="font-semibold text-neutral-200">{opt.time}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-8 flex gap-3">
                  <button
                    onClick={handleReset}
                    className="flex-1 py-3.5 rounded-2xl bg-charcoal-light border border-neutral-800 hover:border-neutral-700 text-neutral-300 text-sm font-semibold font-space cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleStartUpscale}
                    className="flex-2 py-3.5 rounded-2xl bg-neon-purple text-white text-sm font-semibold font-space glow-purple hover:bg-[#8e6bff] cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>Upscale Image</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* State 3: Loading Screen */}
        {status === "loading" && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-20"
          >
            {/* Cyber Gradient Spinner */}
            <div className="relative h-28 w-28 mb-8">
              <div className="absolute inset-0 rounded-full border-4 border-neon-purple/10" />
              <div 
                className="absolute inset-0 rounded-full border-4 border-transparent border-t-neon-purple border-r-lime-green animate-spin" 
                style={{ animationDuration: "1s" }}
              />
              <div className="absolute inset-2 rounded-full bg-background flex items-center justify-center">
                <Layers className="h-8 w-8 text-neon-purple animate-pulse" />
              </div>
            </div>

            <h3 className="text-xl font-space font-bold mb-2">Enhancing your image...</h3>
            <p className="text-neutral-400 text-xs mb-8 font-mono">{loadingText}</p>

            {/* Progress Bar Container */}
            <div className="w-full max-w-md bg-charcoal-light/60 border border-neutral-800 h-2.5 rounded-full overflow-hidden mb-3">
              <div 
                className="bg-linear-to-r from-neon-purple to-lime-green h-full rounded-full transition-all duration-100 shadow-[0_0_12px_rgba(127,86,255,0.5)]"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="flex justify-between w-full max-w-md text-xs text-neutral-500 font-mono">
              <span>{Math.round(progress)}% Complete</span>
              <span>Est. remaining: {timeRemaining}s</span>
            </div>
          </motion.div>
        )}

        {/* State 4: Preview Slider comparison */}
        {status === "preview" && image && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="space-y-6"
          >
            {/* Header info */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800/80">
              <div>
                <h2 className="text-xl font-space font-bold text-white flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-lime-green text-glow-green" />
                  <span>Upscale Result Complete</span>
                </h2>
                <p className="text-xs text-neutral-400 mt-1">Drag the slider to compare original versus enhanced details.</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-charcoal-light border border-neutral-800 hover:border-neutral-700 text-neutral-300 text-xs font-semibold cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Start New</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-lime-green text-black text-xs font-bold font-space glow-green hover:shadow-[0_0_20px_rgba(128,255,86,0.5)] cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download Enhanced</span>
                </button>
              </div>
            </div>

            {/* Main Comparative Slider */}
            <div 
              ref={containerRef}
              className={`relative overflow-hidden w-full h-[520px] rounded-3xl border border-neutral-800 bg-neutral-950 select-none ${
                isFullscreen ? "fixed inset-0 z-50 h-screen w-screen rounded-none bg-neutral-950" : ""
              }`}
              onMouseMove={(e) => {
                if (isDragging.current) handleSliderMove(e.clientX);
              }}
              onMouseDown={(e) => {
                isDragging.current = true;
                handleSliderMove(e.clientX);
              }}
              onMouseUp={() => {
                isDragging.current = false;
              }}
              onMouseLeave={() => {
                isDragging.current = false;
              }}
              onTouchMove={handleTouchMove}
              onTouchStart={() => {
                isDragging.current = true;
              }}
              onTouchEnd={() => {
                isDragging.current = false;
              }}
            >
              {/* Fullscreen indicator details */}
              {isFullscreen && (
                <div className="absolute top-4 left-4 z-40 bg-neutral-900/80 backdrop-blur border border-neutral-800 px-3 py-1.5 rounded-xl text-xs font-space flex items-center gap-3">
                  <span>{image.name}</span>
                  <span className="text-lime-green">{selectedFactor}× Upscaled</span>
                </div>
              )}

              {/* Slider image wrapper (zoom container) */}
              <div 
                className="w-full h-full flex items-center justify-center overflow-hidden"
                style={{ 
                  transform: `scale(${zoom})`, 
                  transformOrigin: "center center",
                  transition: "transform 0.2s ease" 
                }}
              >
                {/* Right Image (Enhanced High-Res) */}
                <div className="absolute inset-0 flex items-center justify-center p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.src} // original loaded image is crisp/enhanced
                    alt="Enhanced"
                    className="max-w-full max-h-full object-contain pointer-events-none select-none"
                  />
                </div>

                {/* Left Image Container (Low-Res Original, clipped) */}
                <div 
                  className="absolute inset-0 flex items-center justify-center p-4"
                  style={{
                    clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)`
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.lowResSrc} // simulation of low res
                    alt="Original"
                    className="max-w-full max-h-full object-contain pointer-events-none select-none"
                  />
                </div>
              </div>

              {/* Comparison Label overlays */}
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
                {/* Handle circle */}
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-black border-2 border-lime-green flex items-center justify-center shadow-[0_0_12px_rgba(128,255,86,0.5)]">
                  <span className="text-[10px] text-lime-green font-bold select-none font-space">⇄</span>
                </div>
              </div>

              {/* Float Controls Layer */}
              <div className="absolute bottom-4 right-4 z-40 flex items-center gap-2 bg-black/75 border border-neutral-800 p-1.5 rounded-2xl backdrop-blur-md">
                <button
                  onClick={() => setZoom((prev) => (prev === 1 ? 2 : prev === 2 ? 3 : 1))}
                  className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800/60 transition-all cursor-pointer"
                  title="Zoom"
                >
                  <ZoomIn className="h-4.5 w-4.5" />
                </button>
                <button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800/60 transition-all cursor-pointer"
                  title="Toggle Fullscreen"
                >
                  {isFullscreen ? <Minimize2 className="h-4.5 w-4.5" /> : <Maximize2 className="h-4.5 w-4.5" />}
                </button>
              </div>
            </div>

            {/* Grid breakdown of Details */}
            <div className="glass-card rounded-3xl p-6 border border-neutral-800 grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <span className="text-[10px] text-neutral-500 font-bold block uppercase tracking-wider mb-1">Target Resolution</span>
                <span className="text-base font-bold text-white font-space">
                  {image.width * selectedFactor} × {image.height * selectedFactor}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-500 font-bold block uppercase tracking-wider mb-1">Scale Factor</span>
                <span className="text-base font-bold text-lime-green font-space">{selectedFactor}× Super Resolution</span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-500 font-bold block uppercase tracking-wider mb-1">Estimated Output Size</span>
                <span className="text-base font-bold text-white font-space">
                  {(parseFloat(image.size.split(" ")[0]) * selectedFactor * 0.85).toFixed(2)} MB
                </span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-500 font-bold block uppercase tracking-wider mb-1">Processing Duration</span>
                <span className="text-base font-bold text-neutral-300 font-space">
                  {selectedFactor === 2 ? "1.85s" : selectedFactor === 4 ? "3.12s" : "6.48s"}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
