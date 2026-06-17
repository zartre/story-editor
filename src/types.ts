export interface TextItem {
  id: string;
  text: string;
  x: number; // Center percentage left from 0 to 100
  y: number; // Center percentage top from 0 to 100
  fontSize: number; // Screen-relative font size (e.g. 18-60)
  color: string; // Text color (hex)
  bgStyle: 'none' | 'solid' | 'semi' | 'inverted'; // Instagram-style wraps
  bgColor: string; // Color of the text backdrop wrapper
  align: 'left' | 'center' | 'right';
}

export interface PresetGradient {
  name: string;
  color1: string;
  color2: string;
}

export type BackgroundType = 'color' | 'gradient' | 'image';

export interface BackgroundConfig {
  type: BackgroundType;
  color: string;
  gradientIndex: number;
  imageSrc: string | null;
}
