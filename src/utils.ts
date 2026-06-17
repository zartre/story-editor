import { TextItem, BackgroundConfig, PresetGradient } from './types.ts';

// 1. Beautiful curation of gradients (like Instagram stories)
export const PRESET_GRADIENTS: PresetGradient[] = [
  { name: 'Minimal Charcoal', color1: '#1f2937', color2: '#000000' },
  { name: 'Warm Sunset', color1: '#ff5f6d', color2: '#ffc371' },
  { name: 'Cosmic Violet', color1: '#8a2387', color2: '#e94057' },
  { name: 'Neon Dream', color1: '#a18cd1', color2: '#fbc2eb' },
  { name: 'Teal Lagoon', color1: '#11ffbd', color2: '#a7bfe8' },
  { name: 'Northern Lights', color1: '#0575e6', color2: '#00f260' },
  { name: 'Charcoal Black', color1: '#141e30', color2: '#243b55' },
  { name: 'Pastel Peach', color1: '#ffecd2', color2: '#fcb69f' },
  { name: 'Mystic Jade', color1: '#12c2e9', color2: '#f64f59' }
];

// Color palette selection for text/pill backdrops
export const SELECTED_COLORS = [
  '#ffffff', // White
  '#000000', // Black
  '#f43f5e', // Rose
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#a855f7', // Purple
  '#ec4899', // Pink
  '#64748b', // Slate
  '#78350f'  // Amber
];

// Hex color to RGBA for canvas and Web previews
export function hexToRgba(hex: string, alpha: number): string {
  if (hex === '#ffffff') return `rgba(255, 255, 255, ${alpha})`;
  if (hex === '#000000') return `rgba(0, 0, 0, ${alpha})`;
  if (!hex.startsWith('#')) return `rgba(255, 255, 255, ${alpha})`;
  
  const cleanHex = hex.replace('#', '');
  const num = parseInt(cleanHex, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Compute contrast color (black or white) for absolute layout readability
export function getContrastColor(hex: string): string {
  if (hex === '#ffffff' || hex === '#fff') return '#000000';
  if (hex === '#000000' || hex === '#000') return '#ffffff';
  if (!hex.startsWith('#')) return '#ffffff';
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.slice(0, 2), 16);
  const g = parseInt(cleanHex.slice(2, 4), 16);
  const b = parseInt(cleanHex.slice(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? '#000000' : '#ffffff';
}

// Draw a smooth rounded rectangle
export function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

// Wraps text into lines based on canvas width, supporting Thai scripts as characters
export function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const paragraphs = text.split('\n');
  const finishedLines: string[] = [];

  for (const para of paragraphs) {
    if (para === '') {
      finishedLines.push('');
      continue;
    }

    // Split words by space first.
    // If double spaces or special characters exist, it splits, but in Thai, spaces are absent.
    // So if there are spaces, we split on spaces. If not, we split on characters to draw them.
    const hasSpaces = para.includes(' ');
    const tokens = hasSpaces ? para.split(' ') : Array.from(para);
    
    let currentLine = '';
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const spacing = hasSpaces ? ' ' : '';
      const testLine = currentLine ? (currentLine + spacing + token) : token;
      const testWidth = ctx.measureText(testLine).width;

      if (testWidth > maxWidth) {
        if (currentLine) {
          finishedLines.push(currentLine);
          currentLine = token;
        } else {
          finishedLines.push(testLine);
          currentLine = '';
        }
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      finishedLines.push(currentLine);
    }
  }

  return finishedLines;
}

// Draw background onto the export canvas in full high-fidelity resolution
export async function drawBackground(
  ctx: CanvasRenderingContext2D,
  config: BackgroundConfig,
  width: number,
  height: number
): Promise<void> {
  if (config.type === 'color') {
    ctx.fillStyle = config.color;
    ctx.fillRect(0, 0, width, height);
  } else if (config.type === 'gradient') {
    const gradient = PRESET_GRADIENTS[config.gradientIndex] || PRESET_GRADIENTS[0];
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, gradient.color1);
    grad.addColorStop(1, gradient.color2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  } else if (config.type === 'image' && config.imageSrc) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = config.imageSrc;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load image background'));
    });
    
    // Draw in center-cover mode
    const imgRatio = img.width / img.height;
    const canvasRatio = width / height;
    let drawWidth = width;
    let drawHeight = height;
    let offsetX = 0;
    let offsetY = 0;

    if (imgRatio > canvasRatio) {
      // Image is wider
      drawWidth = height * imgRatio;
      offsetX = (width - drawWidth) / 2;
    } else {
      // Image is taller
      drawHeight = width / imgRatio;
      offsetY = (height - drawHeight) / 2;
    }

    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
  } else {
    // Fallback standard gradient
    ctx.fillStyle = '#141e30';
    ctx.fillRect(0, 0, width, height);
  }
}

// Compile all assets, draw to 1080x1920 canvas, and download as JPG
export async function exportStory(
  bgConfig: BackgroundConfig,
  textItems: TextItem[]
): Promise<string> {
  // 1. Create offscreen canvas of standard Instagram story dimensions (1080x1920)
  const canvasWidth = 1080;
  const canvasHeight = 1920;
  
  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not request 2D context');

  // Trigger Google Font preload wait to render Noto Sans Thai correctly
  try {
    await document.fonts.load('1em "Noto Sans Thai"');
    await document.fonts.load('1em "Inter"');
  } catch (e) {
    console.warn('Google Fonts preloader error: ', e);
  }

  // 2. Draw Background
  await drawBackground(ctx, bgConfig, canvasWidth, canvasHeight);

  // 3. Draw each text overlay
  for (const item of textItems) {
    if (!item.text.trim()) continue;

    // Relative values mapping screen size (reference screen coordinates mapping max-h: 640px)
    // Absolute position coordinates
    const posX = (item.x / 100) * canvasWidth;
    const posY = (item.y / 100) * canvasHeight;

    // Convert font size from editor relative heights (using absolute scale relative to 640vh)
    const absoluteFontSize = (item.fontSize / 640) * canvasHeight;
    const maxWrapWidth = canvasWidth * 0.88; // Ensure text stays in 88% width bounds
    const lineHeight = absoluteFontSize * 1.35;

    ctx.font = `500 ${absoluteFontSize}px "Noto Sans Thai", "Inter", sans-serif`;
    
    // Wrapped lines compilation
    const wrappedLines = wrapText(ctx, item.text, maxWrapWidth);

    // Compute absolute total height
    const blockTotalHeight = wrappedLines.length * lineHeight;
    // Base starting Y position centering the textbox inside coordinates
    const absoluteStartY = posY - (blockTotalHeight / 2) + (lineHeight / 2);

    // Render Pill Backgrounds behind text if active
    if (item.bgStyle !== 'none') {
      let absoluteBgColor = '#ffffff';
      if (item.bgStyle === 'solid') {
        absoluteBgColor = item.bgColor;
      } else if (item.bgStyle === 'semi') {
        absoluteBgColor = hexToRgba(item.bgColor, 0.55);
      } else if (item.bgStyle === 'inverted') {
        absoluteBgColor = getContrastColor(item.bgColor);
      }

      ctx.fillStyle = absoluteBgColor;

      wrappedLines.forEach((line, index) => {
        if (!line.trim()) return;

        const lineY = absoluteStartY + index * lineHeight;
        const metrics = ctx.measureText(line);
        const textWidth = metrics.width;

        // Custom pill dimensions
        const padX = absoluteFontSize * 0.45;
        const padY = absoluteFontSize * 0.22;
        const boxWidth = textWidth + padX * 2;
        const boxHeight = absoluteFontSize + padY * 2;

        let boxX = posX - boxWidth / 2;
        if (item.align === 'left') {
          boxX = posX - padX;
        } else if (item.align === 'right') {
          boxX = posX - textWidth - padX;
        }

        const boxY = lineY - (absoluteFontSize * 0.82) - padY;
        const radius = absoluteFontSize * 0.28;

        drawRoundedRect(ctx, boxX, boxY, boxWidth, boxHeight, radius);
        ctx.fill();
      });
    }

    // Render actual text paths
    let textHexColor = item.color;
    if (item.bgStyle === 'solid') {
      textHexColor = getContrastColor(item.bgColor);
    } else if (item.bgStyle === 'inverted') {
      textHexColor = item.bgColor;
    }

    ctx.fillStyle = textHexColor;
    
    // Add text shadow outline for readability if background is empty
    if (item.bgStyle === 'none') {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = absoluteFontSize * 0.15;
      ctx.shadowOffsetX = absoluteFontSize * 0.03;
      ctx.shadowOffsetY = absoluteFontSize * 0.03;
    } else {
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }

    wrappedLines.forEach((line, index) => {
      const lineY = absoluteStartY + index * lineHeight;
      let targetX = posX;

      if (item.align === 'left') {
        ctx.textAlign = 'left';
      } else if (item.align === 'right') {
        ctx.textAlign = 'right';
      } else {
        ctx.textAlign = 'center';
      }

      ctx.fillText(line, targetX, lineY);
    });

    // Reset shadow state
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  // 4. Return Data URL (JPEG, 0.95 quality factor)
  return canvas.toDataURL('image/jpeg', 0.95);
}
