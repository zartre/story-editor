import React, { useState, useRef, useEffect } from 'react';
import { TextItem, BackgroundConfig, BackgroundType } from './types.ts';
import { PRESET_GRADIENTS, SELECTED_COLORS, exportStory } from './utils.ts';
import StoryCanvas from './components/StoryCanvas.tsx';
import TextEditModal from './components/TextEditModal.tsx';
import {
  Download,
  Plus,
  Trash2,
  Image,
  Palette,
  Shuffle,
  Smile,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

export default function App() {
  // 1. Centralized Application States
  const [textItems, setTextItems] = useState<TextItem[]>([]);

  const [bgConfig, setBgConfig] = useState<BackgroundConfig>({
    type: 'gradient',
    color: '#1a1a1a',
    gradientIndex: 0,
    imageSrc: null,
  });

  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<TextItem | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Reference for file input picker
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Measure available space for responsive canvas scaling
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width, height } = entries[0].contentRect;
      setContainerSize({ width, height });
    });

    observer.observe(container);
    return () => {
      observer.unobserve(container);
    };
  }, []);

  // Calculate dynamic fit dimensions keeping 9:16 aspect ratio
  const targetRatio = 9 / 16;
  let canvasWidth = 337;
  let canvasHeight = 600;

  if (containerSize.width > 0 && containerSize.height > 0) {
    // Leave safe margins (e.g. 24px vertical, 24px horizontal)
    const availableWidth = Math.max(120, containerSize.width - 24);
    const availableHeight = Math.max(120, containerSize.height - 24);

    if (availableWidth / availableHeight > targetRatio) {
      // Height is the limiting factor
      canvasHeight = availableHeight;
      canvasWidth = availableHeight * targetRatio;
    } else {
      // Width is the limiting factor
      canvasWidth = availableWidth;
      canvasHeight = availableWidth / targetRatio;
    }
  }

  // 2. Action Handlers for Item Mutation
  const handleAddText = (defaultX = 50, defaultY = 50) => {
    const newItem: TextItem = {
      id: `text-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      text: 'พิมพ์ข้อความ...',
      x: defaultX,
      y: defaultY,
      fontSize: 24,
      color: '#ffffff',
      bgStyle: 'none',
      bgColor: '#f43f5e',
      align: 'center',
    };

    setTextItems([...textItems, newItem]);
    setActiveId(newItem.id);
    // Directly engage editing modal for newly created blocks
    setEditingItem(newItem);
  };

  const handleUpdateTextPosition = (id: string, x: number, y: number) => {
    setTextItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, x, y } : item))
    );
  };

  const handleSaveTextUpdate = (updatedItem: TextItem) => {
    setTextItems((prev) =>
      prev.map((item) => (item.id === updatedItem.id ? updatedItem : item))
    );
    setEditingItem(null);
  };

  const handleDeleteText = (id: string) => {
    setTextItems((prev) => prev.filter((item) => item.id !== id));
    if (activeId === id) setActiveId(null);
  };

  // 3. Background Controllers
  const handleBgTypeChange = (type: BackgroundType) => {
    if (type === 'image' && !bgConfig.imageSrc) {
      // Trigger prompt to upload image immediately
      fileInputRef.current?.click();
    } else {
      setBgConfig((prev) => ({ ...prev, type }));
    }
  };

  const handleRandomizeColor = () => {
    const randomHex = SELECTED_COLORS[Math.floor(Math.random() * SELECTED_COLORS.length)];
    setBgConfig((prev) => ({
      ...prev,
      type: 'color',
      color: randomHex,
    }));
  };

  const handleRandomizeGradient = () => {
    const nextGradIndex = (bgConfig.gradientIndex + 1) % PRESET_GRADIENTS.length;
    setBgConfig((prev) => ({
      ...prev,
      type: 'gradient',
      gradientIndex: nextGradIndex,
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setBgConfig((prev) => ({
            ...prev,
            type: 'image',
            imageSrc: event.target!.result as string,
          }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Double tapped on empty canvas coordinates: quickly creates text at that spot
  const handleDoubleTapCanvas = (xPercent: number, yPercent: number) => {
    handleAddText(xPercent, yPercent);
  };

  // 4. Export JPG Asset Generator
  const handleExportJPG = async () => {
    if (textItems.length === 0) {
      alert('Please add at least one text block before exporting!');
      return;
    }

    setIsExporting(true);
    try {
      // Small timeout to allow spinner and render threads
      await new Promise((r) => setTimeout(r, 600));
      const fileDataUrl = await exportStory(bgConfig, textItems);

      // Create dummy downloader link
      const downloadLink = document.createElement('a');
      downloadLink.href = fileDataUrl;
      downloadLink.download = `story_creative_${Date.now()}.jpg`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    } catch (err) {
      console.error('Exporting error occurred: ', err);
      alert('Export failed. Please double check image permissions or try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleResetCanvas = () => {
    if (window.confirm('Are you sure you want to clear all text and reset the canvas?')) {
      setTextItems([]);
      setActiveId(null);
      setBgConfig({
        type: 'gradient',
        color: '#1a1a1a',
        gradientIndex: 0,
        imageSrc: null,
      });
    }
  };

  return (
    <div 
      id="app-root-mainframe"
      className="h-[100dvh] max-h-screen bg-neutral-950 text-neutral-100 flex flex-col justify-between font-sans select-none overflow-hidden px-4 py-3 sm:py-4"
    >
      {/* Hidden file input picker */}
      <input
        id="bg-file-uploader-node"
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />



      {/* Main Container Stage (Renders as responsive phone viewport mock on large monitors, full viewport on small formats) */}
      <main id="app-canvas-container-box" ref={containerRef} className="flex-1 flex items-center justify-center p-2 relative overflow-hidden min-h-0 w-full">
        
        {/* Sidebar Info (Minimalism Design Integration) */}
        <div id="desktop-sidebar-info" className="hidden lg:flex flex-col text-right absolute left-[calc(50%-440px)] top-[140px] w-52 pr-6 pointer-events-none select-none border-r border-neutral-900">
          <div className="text-xl font-light text-white tracking-wider mb-2 uppercase font-sans">
            Editor Pro
          </div>
          <div className="text-[10px] text-neutral-500 font-mono tracking-widest leading-6 uppercase">
            9:16 Native Canvas<br />
            Multi-Layer Text Support<br />
            PWA Optimized<br />
            High-Res Export
          </div>
        </div>

        <div className="relative group/phone">
          {/* Mock Smartphone border framing for Desktop/Laptop viewports */}
          <div className="hidden lg:block absolute -inset-x-4 -inset-y-5 rounded-[40px] bg-black border-[8px] border-neutral-900 shadow-[0_0_50px_rgba(0,0,0,0.85)] -z-10 pointer-events-none transition-all" />
          
          {/* Mock Speaker/Camera bezel notch */}
          <div className="hidden lg:block absolute top-1 left-1/2 -translate-x-1/2 w-28 h-4 bg-neutral-900 rounded-full z-40 pointer-events-none" />

          {/* Core Interactive Canvas Grid */}
          <StoryCanvas
            bgConfig={bgConfig}
            textItems={textItems}
            activeId={activeId}
            onSelectText={setActiveId}
            onUpdateTextPosition={handleUpdateTextPosition}
            onEditText={(targetItem) => setEditingItem(targetItem)}
            onDeleteText={handleDeleteText}
            onDoubleTapCanvas={handleDoubleTapCanvas}
            width={canvasWidth}
            height={canvasHeight}
          />

          {/* Floating Image Picker Button Bottom Left */}
          <button
            id="btn-floating-image-picker"
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-4 left-4 z-40 w-11 h-11 bg-black/60 hover:bg-black/90 active:scale-95 border border-white/10 rounded-full flex items-center justify-center text-white shadow-lg backdrop-blur-md transition-all cursor-pointer"
            title="Upload background picture"
          >
            <Image className="w-5 h-5 text-white/90" />
          </button>
        </div>
      </main>

      {/* Bottom Floating Control Panel (Add item & Backdrop selection) */}
      <footer id="app-footer-controls" className="w-full max-w-lg mx-auto flex flex-col gap-4 py-3 bg-black/80 border border-neutral-900 rounded-2xl p-4 backdrop-blur-md shadow-xl">
        
        {/* Backdrop Type Tabs & Quick Modification Buttons */}
        <div className="flex items-center justify-between gap-3">
          {/* Selector Tabs */}
          <div className="flex gap-1.5 p-1 bg-black/40 rounded-lg max-w-full">
            <button
              id="btn-tab-gradient"
              onClick={() => handleBgTypeChange('gradient')}
              className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${
                bgConfig.type === 'gradient'
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Gradient
            </button>
            <button
              id="btn-tab-color"
              onClick={() => handleBgTypeChange('color')}
              className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${
                bgConfig.type === 'color'
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Solid
            </button>
            {bgConfig.imageSrc && (
              <button
                id="btn-tab-image"
                onClick={() => handleBgTypeChange('image')}
                className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${
                  bgConfig.type === 'image'
                    ? 'bg-neutral-800 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Photo
              </button>
            )}
          </div>

          {/* Export Action Button */}
          <div className="flex items-center gap-2">
            <button
              id="btn-footer-export"
              onClick={handleExportJPG}
              disabled={isExporting || textItems.length === 0}
              className="flex items-center gap-1.5 bg-white hover:bg-neutral-100 disabled:bg-neutral-950 disabled:text-neutral-600 disabled:border-neutral-900 text-black font-bold uppercase tracking-wider text-[10px] px-4 py-2 border border-transparent rounded-full shadow-md transition-all cursor-pointer"
              title="Download creative as high quality JPG"
            >
              {isExporting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Export JPG</span>
                </>
              )}
            </button>
          </div>
        </div>
      </footer>

      {/* Fullcreen Backdrop Text Edit Modal */}
      {editingItem && (
        <TextEditModal
          item={editingItem}
          onSave={handleSaveTextUpdate}
          onCancel={() => {
            // If cancel a newly created completely blank item, delete it to keep slate clean
            if (!editingItem.text.trim() || editingItem.text === 'พิมพ์ข้อความ...') {
              handleDeleteText(editingItem.id);
            }
            setEditingItem(null);
          }}
          onDelete={() => handleDeleteText(editingItem.id)}
        />
      )}

      {/* Fullscreen Loading Curtain during High Fidelity export rendering */}
      {isExporting && (
        <div 
          id="export-loading-curtain shadow-2xl"
          className="fixed inset-0 bg-black/90 backdrop-blur-lg flex flex-col items-center justify-center z-50 animate-fade-in"
        >
          <div className="text-center max-w-xs flex flex-col items-center gap-4">
            <div className="relative flex items-center justify-center w-16 h-16">
              <div className="absolute inset-0 rounded-full border-4 border-dashed border-red-500/20 animate-spin duration-[4000ms]" />
              <div className="absolute inset-2 rounded-full border-4 border-t-amber-500 border-r-pink-500 border-b-rose-500 border-l-transparent animate-spin" />
              <Download className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-sm font-bold tracking-tight text-white uppercase font-mono">
                Compiling Assets
              </p>
              <p className="text-[11px] text-neutral-400 mt-1 uppercase tracking-widest font-mono">
                Drawing high-res elements...
              </p>
              <p className="text-[10px] text-zinc-500 mt-2 italic leading-relaxed">
                Applying Noto Sans Thai curves and Instagram line-backdrops perfectly.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
