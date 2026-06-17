import React, { useState, useRef, useEffect } from 'react';
import { TextItem, BackgroundConfig } from '../types.ts';
import { PRESET_GRADIENTS, hexToRgba, getContrastColor } from '../utils.ts';
import { Trash2 } from 'lucide-react';

interface StoryCanvasProps {
  bgConfig: BackgroundConfig;
  textItems: TextItem[];
  activeId: string | null;
  onSelectText: (id: string | null) => void;
  onUpdateTextPosition: (id: string, x: number, y: number) => void;
  onEditText: (item: TextItem) => void;
  onDeleteText: (id: string) => void;
  onDoubleTapCanvas: (xPercent: number, yPercent: number) => void;
  width?: number;
  height?: number;
}

export default function StoryCanvas({
  bgConfig,
  textItems,
  activeId,
  onSelectText,
  onUpdateTextPosition,
  onEditText,
  onDeleteText,
  onDoubleTapCanvas,
  width,
  height,
}: StoryCanvasProps) {
  const canvasViewportRef = useRef<HTMLDivElement>(null);
  
  // Dragging states
  const [dragState, setDragState] = useState<{
    itemId: string;
    startX: number;
    startY: number;
    initX: number;
    initY: number;
  } | null>(null);

  // Drag coordinates for snapping and trash checks
  const [currentDragPos, setCurrentDragPos] = useState<{ x: number; y: number } | null>(null);

  // Active snap flags
  const [snapX, setSnapX] = useState(false);
  const [snapY, setSnapY] = useState(false);

  // Hover over trash flag
  const [isOverTrash, setIsOverTrash] = useState(false);

  // Start drag interaction
  const handlePointerDown = (e: React.PointerEvent, item: TextItem) => {
    // Left click or direct touch only
    if (e.button !== 0) return;
    
    e.stopPropagation();
    onSelectText(item.id);
    
    setDragState({
      itemId: item.id,
      startX: e.clientX,
      startY: e.clientY,
      initX: item.x,
      initY: item.y
    });

    setCurrentDragPos({ x: item.x, y: item.y });
  };

  // Process pointer motion
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragState || !canvasViewportRef.current) return;

    const rect = canvasViewportRef.current.getBoundingClientRect();
    const deltaX = e.clientX - dragState.startX;
    const deltaY = e.clientY - dragState.startY;

    // Convert pixel offset to canvas percent
    const pctDiffX = (deltaX / rect.width) * 100;
    const pctDiffY = (deltaY / rect.height) * 100;

    let newX = dragState.initX + pctDiffX;
    let newY = dragState.initY + pctDiffY;

    // Boundary constraints (allowing items to be dragged off-screen)
    newX = Math.max(-100, Math.min(200, newX));
    newY = Math.max(-100, Math.min(200, newY));

    // Snapping thresholds (snap to vertical center X = 50% and horizontal center Y = 50%)
    const snapThreshold = 3.0; // percentage
    let isSnappedX = false;
    let isSnappedY = false;

    if (Math.abs(newX - 50) < snapThreshold) {
      newX = 50;
      isSnappedX = true;
    }
    if (Math.abs(newY - 50) < snapThreshold) {
      newY = 50;
      isSnappedY = true;
    }

    setSnapX(isSnappedX);
    setSnapY(isSnappedY);

    // Trash zone target check (lower center of canvas)
    // Trash lies at bottom: Y > 90% and X center range (35% to 65%)
    const overTrash = newY > 90 && newX > 35 && newX < 65;
    setIsOverTrash(overTrash);

    setCurrentDragPos({ x: newX, y: newY });
    onUpdateTextPosition(dragState.itemId, newX, newY);
  };

  // Drag complete
  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragState) return;

    if (isOverTrash) {
      onDeleteText(dragState.itemId);
      onSelectText(null);
    }

    // Reset interaction trackers
    setDragState(null);
    setCurrentDragPos(null);
    setSnapX(false);
    setSnapY(false);
    setIsOverTrash(false);
  };

  const currentGradient = bgConfig.type === 'gradient'
    ? PRESET_GRADIENTS[bgConfig.gradientIndex] || PRESET_GRADIENTS[0]
    : null;

  // Background inline styling
  const getBackgroundStyle = (): React.CSSProperties => {
    if (bgConfig.type === 'color') {
      return { backgroundColor: bgConfig.color };
    }
    if (bgConfig.type === 'gradient' && currentGradient) {
      return {
        backgroundImage: `linear-gradient(180deg, ${currentGradient.color1}, ${currentGradient.color2})`,
      };
    }
    if (bgConfig.type === 'image' && bgConfig.imageSrc) {
      return {
        backgroundImage: `url(${bgConfig.imageSrc})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      };
    }
    return { backgroundColor: '#141e30' }; // fallback
  };

  // Canvas click handles empty tap to deselect or add text
  const handleCanvasClick = (e: React.MouseEvent) => {
    // If clicking directly on container wrapper
    if (e.target === e.currentTarget) {
      onSelectText(null);
    }
  };

  // Handle double tap/click on canvas empty area to add text
  const handleCanvasDoubleClick = (e: React.MouseEvent) => {
    if (!canvasViewportRef.current || e.target !== e.currentTarget) return;
    
    const rect = canvasViewportRef.current.getBoundingClientRect();
    const clickXPercent = ((e.clientX - rect.left) / rect.width) * 100;
    const clickYPercent = ((e.clientY - rect.top) / rect.height) * 100;

    onDoubleTapCanvas(clickXPercent, clickYPercent);
  };

  const scaleFactor = width ? (width / 337) : 1;

  return (
    <div 
      id="story-canvas-root-container"
      className="relative w-full flex justify-center py-2"
    >
      <div
        id="story-canvas-viewport"
        ref={canvasViewportRef}
        onClick={handleCanvasClick}
        onDoubleClick={handleCanvasDoubleClick}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        style={{
          ...getBackgroundStyle(),
          width: width ? `${width}px` : undefined,
          height: height ? `${height}px` : undefined,
        }}
        className={`${!width ? 'w-[337px]' : ''} ${!height ? 'h-[600px]' : ''} max-w-full relative shadow-2xl rounded-2xl md:rounded-3xl overflow-hidden touch-none select-none border border-neutral-800 flex items-center justify-center transition-all cursor-[crosshair]`}
      >
        {/* Snap guidelines */}
        {snapX && (
          <div 
            id="snap-line-vertical" 
            className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 border-l-2 border-dotted border-neutral-400/40 z-40 pointer-events-none" 
          />
        )}
        {snapY && (
          <div 
            id="snap-line-horizontal" 
            className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 border-t-2 border-dotted border-neutral-400/40 z-40 pointer-events-none" 
          />
        )}

        {/* Text Elements */}
        {textItems.length === 0 && (
          <div className="absolute inset-x-0 inset-y-0 flex flex-col items-center justify-center p-6 text-center select-none pointer-events-none">
            <span className="text-white/30 text-[10px] tracking-[0.2em] font-sans font-semibold uppercase animate-pulse">
              Double click to type
            </span>
          </div>
        )}

        {textItems.map((item) => {
          const isSelected = activeId === item.id;
          const isCurrentDragging = dragState?.itemId === item.id;

          // Compute text pill highlight themes
          let backdropBg = 'transparent';
          let textColor = item.color;

          if (item.bgStyle === 'solid') {
            backdropBg = item.bgColor;
            textColor = getContrastColor(item.bgColor);
          } else if (item.bgStyle === 'semi') {
            backdropBg = hexToRgba(item.bgColor, 0.55);
            textColor = item.color;
          } else if (item.bgStyle === 'inverted') {
            backdropBg = getContrastColor(item.bgColor);
            textColor = item.bgColor;
          }

          const containerStyle: React.CSSProperties = {
            position: 'absolute',
            left: `${item.x}%`,
            top: `${item.y}%`,
            transform: 'translate(-50%, -50%)',
            width: 'max-content',
            maxWidth: '100%',
            zIndex: isSelected ? 40 : 20,
            transition: isCurrentDragging ? 'none' : 'all 0.15s ease-out'
          };

          const scaledFontSize = Math.max(9, item.fontSize * scaleFactor);

          const textStyle: React.CSSProperties = {
            fontSize: `${scaledFontSize}px`,
            color: textColor,
            textAlign: item.align,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            lineHeight: '1.35',
            textShadow: item.bgStyle === 'none' ? '0 2px 5px rgba(0,0,0,0.75)' : 'none',
            fontFamily: '"Noto Sans Thai", "Inter", sans-serif'
          };

          return (
            <div
              id={`text-item-node-${item.id}`}
              key={item.id}
              style={containerStyle}
              onPointerDown={(e) => handlePointerDown(e, item)}
              onDoubleClick={(e) => {
                e.stopPropagation();
                onEditText(item);
              }}
              className="group cursor-grab active:cursor-grabbing origin-center select-none"
              title="Double tap to edit, drag to move"
            >
              {/* Box container */}
              <div 
                style={{ backgroundColor: backdropBg }}
                className={`py-1.5 px-3.5 rounded-xl transition-all ${
                  item.bgStyle !== 'none' ? 'shadow-md' : ''
                } ${
                  isSelected 
                    ? 'ring-2 ring-white scale-105 shadow-[0_0_20px_rgba(255,255,255,0.2)]' 
                    : 'group-hover:ring-1 group-hover:ring-white/10'
                }`}
              >
                <p style={textStyle}>{item.text}</p>
              </div>
            </div>
          );
        })}

        {/* Floating Double Tap Tip or Add Hint when empty */}
        {textItems.length === 0 && (
          <div 
            id="empty-canvas-curtain-hud"
            className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-6 select-none bg-black/10"
          >
            <div className="bg-neutral-900/80 border border-neutral-700/60 backdrop-blur-md px-5 py-4 rounded-2xl flex flex-col items-center gap-2 max-w-[80%] shadow-lg animate-pulse">
              <span className="text-xl">💬</span>
              <p className="text-xs font-semibold text-neutral-200 leading-relaxed">
                Try tapping anywhere relative to the canvas grids to add a text overlay!
              </p>
              <span className="text-[9px] font-bold font-mono tracking-widest text-neutral-400 uppercase">
                Double tap inside
              </span>
            </div>
          </div>
        )}

        {/* Drag to delete Trash Can bar (slides up on dragging) */}
        <div
          id="canvas-trash-dock"
          className={`absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/95 to-black/10 flex flex-col items-center justify-end pb-3.5 z-40 transition-all duration-300 pointer-events-none ${
            dragState 
              ? 'translate-y-0 opacity-100' 
              : 'translate-y-full opacity-0'
          }`}
        >
          <div 
            id="drag-to-delete-bin"
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full backdrop-blur-sm transition-all duration-200 ${
              isOverTrash 
                ? 'scale-[1.12] bg-red-600/30 border border-red-500/50 shadow-red-500/20 shadow-lg text-red-400 font-bold' 
                : 'text-neutral-400 bg-black/60 border border-white/5'
            }`}
          >
            <Trash2 className={`w-3.5 h-3.5 transition-transform ${isOverTrash ? 'rotate-12 scale-110' : ''}`} />
            <span className="text-[9px] font-bold uppercase tracking-widest leading-none">
              {isOverTrash ? 'Drop to discard!' : 'Drag here to delete'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
