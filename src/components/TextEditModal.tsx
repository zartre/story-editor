import React, { useState, useEffect, useRef } from 'react';
import { TextItem } from '../types.ts';
import { SELECTED_COLORS, getContrastColor, hexToRgba } from '../utils.ts';
import { X, Check, AlignLeft, AlignCenter, AlignRight, Trash2, Contrast } from 'lucide-react';

interface TextEditModalProps {
  item: TextItem;
  onSave: (updatedItem: TextItem) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

export default function TextEditModal({ item, onSave, onCancel, onDelete }: TextEditModalProps) {
  const [text, setText] = useState(item.text);
  const [fontSize, setFontSize] = useState(item.fontSize);
  const [color, setColor] = useState(item.color);
  const [bgStyle, setBgStyle] = useState(item.bgStyle);
  const [bgColor, setBgColor] = useState(item.bgColor);
  const [align, setAlign] = useState(item.align);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus on mount & place cursor at the end
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(text.length, text.length);
    }
    // Prevent background scrolling while entering text on mobile
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Handle saving the state
  const handleSave = () => {
    onSave({
      ...item,
      text: text,
      fontSize,
      color,
      bgStyle,
      bgColor,
      align
    });
  };

  // Cycle background styles: none -> solid -> semi -> inverted -> none
  const cycleBgStyle = () => {
    const sequence: ('none' | 'solid' | 'semi' | 'inverted')[] = ['none', 'solid', 'semi', 'inverted'];
    const currentIndex = sequence.indexOf(bgStyle);
    const nextIndex = (currentIndex + 1) % sequence.length;
    const nextStyle = sequence[nextIndex];
    setBgStyle(nextStyle);
    
    // If we transition to a background and background color is empty or matches white/black defaultly,
    // match it with a good helper
    if (nextStyle !== 'none' && (!bgColor || bgColor === '#ffffff' || bgColor === '#000000')) {
      if (color === '#ffffff') {
        setBgColor('#000000');
      } else {
        setBgColor(color);
      }
    }
  };

  // Select text color and auto-adjust backdrop colors for solid elements
  const selectColor = (selectedHex: string) => {
    setColor(selectedHex);
    // Automatically match backdrop to color for luxury UX
    if (bgStyle !== 'none') {
      setBgColor(selectedHex);
    }
  };

  // Compute text rendering styles inside the modal textarea
  const getTextAreaStyles = () => {
    let backgroundStyleStr = 'transparent';
    let textColorStr = color;

    if (bgStyle === 'solid') {
      backgroundStyleStr = bgColor;
      textColorStr = getContrastColor(bgColor);
    } else if (bgStyle === 'semi') {
      backgroundStyleStr = hexToRgba(bgColor, 0.55);
      textColorStr = color;
    } else if (bgStyle === 'inverted') {
      backgroundStyleStr = getContrastColor(bgColor);
      textColorStr = bgColor;
    }

    return {
      backgroundColor: backgroundStyleStr,
      color: textColorStr,
      fontSize: `${fontSize}px`,
      textAlign: align,
      textShadow: bgStyle === 'none' ? '0 2px 4px rgba(0, 0, 0, 0.7)' : 'none'
    };
  };

  return (
    <div 
      id="text-edit-modal-wrapper"
      className="fixed inset-0 z-50 flex flex-col justify-between bg-black/85 backdrop-blur-md px-4 pt-12 pb-8 select-none"
    >
      {/* Top Controls Bar */}
      <div className="flex items-center justify-between w-full max-w-lg mx-auto">
        <button 
          id="btn-modal-cancel"
          onClick={onCancel}
          className="p-3 text-white hover:bg-white/10 rounded-full transition-colors active:scale-95"
          title="Cancel"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Text styling buttons */}
        <div className="flex items-center gap-3 bg-white/5 px-2 py-1 rounded-full border border-white/10">
          {/* Alignment toggle */}
          <button
            id="btn-toggle-align"
            onClick={() => {
              const aligns: ('left' | 'center' | 'right')[] = ['left', 'center', 'right'];
              const nextAlign = aligns[(aligns.indexOf(align) + 1) % aligns.length];
              setAlign(nextAlign);
            }}
            className="p-2 text-white hover:bg-white/10 rounded-full transition-all"
            title="Toggle Alignment"
          >
            {align === 'left' && <AlignLeft className="w-5 h-5" />}
            {align === 'center' && <AlignCenter className="w-5 h-5" />}
            {align === 'right' && <AlignRight className="w-5 h-5" />}
          </button>

          {/* Background Highlight toggle */}
          <button
            id="btn-toggle-bg-style"
            onClick={cycleBgStyle}
            className={`p-2 rounded-full transition-all flex items-center justify-center font-bold text-sm w-9 h-9 ${
              bgStyle !== 'none' 
                ? 'bg-white text-black scale-105' 
                : 'text-white border border-white/20 hover:bg-white/10'
            }`}
            title="Text Background Style"
          >
            {bgStyle === 'none' && <Contrast className="w-5 h-5" />}
            {bgStyle === 'solid' && 'A'}
            {bgStyle === 'semi' && 'A▵'}
            {bgStyle === 'inverted' && 'A▩'}
          </button>
        </div>

        <button 
          id="btn-modal-save"
          onClick={handleSave}
          disabled={!text.trim()}
          className="px-5 py-2 bg-white text-black font-semibold rounded-full shadow-lg hover:bg-neutral-200 transition-all disabled:opacity-40 disabled:pointer-events-none active:scale-95 flex items-center gap-1.5"
          title="Done"
        >
          <Check className="w-4 h-4 text-white" />
          <span>Done</span>
        </button>
      </div>

      {/* Editor Center Area */}
      <div className="flex-1 flex items-center justify-center w-full max-w-lg mx-auto py-4 relative">
        
        {/* Left Side Size Slider Slider */}
        <div className="absolute left-1 md:left-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1.5 h-48 z-10">
          <span className="text-[10px] text-white/50 uppercase font-bold tracking-widest font-mono">Size</span>
          <div className="relative flex-1 w-8 flex items-center justify-center">
            <input
              id="input-font-size-slider"
              type="range"
              min="14"
              max="52"
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              style={{ writingMode: 'bt-lr', WebkitAppearance: 'slider-vertical' } as React.CSSProperties}
              className="h-full vertical-range bg-white/20 hover:bg-white/30 rounded-lg cursor-pointer w-2"
            />
          </div>
          <span className="text-xs text-white/70 font-semibold font-mono">{fontSize}</span>
        </div>

        {/* Input Textarea Container */}
        <div className="w-[82%] ml-[14%] flex flex-col items-center justify-center">
          <textarea
            id="modal-textarea-input"
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={getTextAreaStyles()}
            placeholder="Start typing..."
            rows={4}
            className="w-full max-w-md bg-transparent resize-none border-0 outline-none focus:ring-0 rounded-2xl p-4 font-sans font-medium leading-relaxed shadow-inner placeholder-white/30 transition-all text-center leading-normal whitespace-pre-wrap break-words"
            maxLength={180}
          />
          <div className="mt-4 text-[10px] text-white/30 font-medium tracking-wide">
            {text.length}/180 characters • Supports Thai script & emojis
          </div>
        </div>
      </div>

      {/* Bottom Controls Bar (Color selectors & trash icon) */}
      <div className="w-full max-w-lg mx-auto flex flex-col gap-6">
        {/* Horizontal Color Picker Scrollway */}
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-bold text-center text-white/40 uppercase tracking-widest font-mono">
            Palette selection
          </span>
          <div className="flex items-center justify-center gap-3 overflow-x-auto py-2 px-1 max-w-full scrollbar-none">
            {SELECTED_COLORS.map((hex, index) => {
              const isSelected = color === hex;
              return (
                <button
                  id={`btn-color-pick-${index}`}
                  key={hex}
                  onClick={() => selectColor(hex)}
                  style={{ backgroundColor: hex }}
                  className={`w-9 h-9 rounded-full relative shadow-md transition-all shrink-0 active:scale-95 ${
                    isSelected 
                      ? 'scale-115 ring-3 ring-white shadow-lg ring-offset-4 ring-offset-neutral-900' 
                      : 'hover:scale-105 border border-white/20'
                  }`}
                  title={hex}
                />
              );
            })}
            
            {/* Custom Color Input circle */}
            <div className="relative shrink-0 w-9 h-9 active:scale-95">
              <input
                id="input-custom-color-modal"
                type="color"
                value={color}
                onChange={(e) => selectColor(e.target.value)}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                title="Custom color"
              />
              <button 
                id="btn-custom-color-dummy"
                className="w-9 h-9 rounded-full bg-gradient-to-tr from-rose-500 via-indigo-500 to-amber-300 border border-white/30 flex items-center justify-center shadow-lg hover:scale-105 transition-all"
              >
                <span className="text-[13px] font-extrabold text-white drop-shadow-md">🎨</span>
              </button>
            </div>
          </div>
        </div>

        {/* Delete Row */}
        {onDelete && (
          <div className="flex justify-center">
            <button
              id="btn-modal-delete"
              onClick={onDelete}
              className="flex items-center gap-2 px-4 py-2.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 active:bg-red-500/20 rounded-xl transition-all font-semibold text-xs active:scale-95 uppercase tracking-wider"
              title="Delete Text"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete text block</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
