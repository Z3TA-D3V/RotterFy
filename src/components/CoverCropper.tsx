import React, { useEffect, useRef, useState } from 'react';
import { X, ZoomIn } from 'lucide-react';

interface Props {
  file: File;
  onApply: (blob: Blob, previewUrl: string) => void;
  onCancel: () => void;
}

const SIZE = 300;

export const CoverCropper: React.FC<Props> = ({ file, onApply, onCancel }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(false);
    imageRef.current = null;
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => { imageRef.current = image; setReady(true); };
    image.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const dimensions = () => {
    const image = imageRef.current;
    if (!image) return null;
    const scale = Math.max(SIZE / image.naturalWidth, SIZE / image.naturalHeight) * zoom;
    return { width: image.naturalWidth * scale, height: image.naturalHeight * scale };
  };

  const clamp = (x: number, y: number) => {
    const size = dimensions();
    if (!size) return { x: 0, y: 0 };
    return {
      x: Math.max((SIZE - size.width) / 2, Math.min((size.width - SIZE) / 2, x)),
      y: Math.max((SIZE - size.height) / 2, Math.min((size.height - SIZE) / 2, y)),
    };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    const size = dimensions();
    if (!canvas || !image || !size) return;
    const fixed = clamp(offset.x, offset.y);
    const context = canvas.getContext('2d');
    context?.clearRect(0, 0, SIZE, SIZE);
    context?.drawImage(image, (SIZE - size.width) / 2 + fixed.x, (SIZE - size.height) / 2 + fixed.y, size.width, size.height);
  }, [ready, zoom, offset]);

  const apply = () => {
    const image = imageRef.current;
    const size = dimensions();
    if (!image || !size) return;
    const output = document.createElement('canvas');
    output.width = 512;
    output.height = 512;
    const factor = 512 / SIZE;
    const fixed = clamp(offset.x, offset.y);
    output.getContext('2d')?.drawImage(image,
      ((SIZE - size.width) / 2 + fixed.x) * factor,
      ((SIZE - size.height) / 2 + fixed.y) * factor,
      size.width * factor, size.height * factor);
    output.toBlob((blob) => {
      if (blob) onApply(blob, URL.createObjectURL(blob));
    }, 'image/jpeg', 0.9);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Recortar portada">
      <div className="w-full max-w-sm rounded-3xl bg-[#171a28] border border-white/15 p-5 text-white shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div><h2 className="font-semibold">Recortar portada</h2><p className="text-xs text-neutral-400">Vista cuadrada de la biblioteca de sonidos</p></div>
          <button onClick={onCancel} aria-label="Cerrar"><X className="w-5 h-5" /></button>
        </div>
        <div className="relative mx-auto w-full max-w-[300px] aspect-square overflow-hidden rounded-xl touch-none cursor-grab active:cursor-grabbing" style={{ background: '#0b0d17' }}
          onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); dragRef.current = { x: event.clientX, y: event.clientY, offsetX: offset.x, offsetY: offset.y }; }}
          onPointerMove={(event) => {
            if (!dragRef.current) return;
            const factor = SIZE / event.currentTarget.getBoundingClientRect().width;
            setOffset(clamp(dragRef.current.offsetX + (event.clientX - dragRef.current.x) * factor, dragRef.current.offsetY + (event.clientY - dragRef.current.y) * factor));
          }}
          onPointerUp={() => { dragRef.current = null; }}>
          <canvas ref={canvasRef} width={SIZE} height={SIZE} className="w-full h-full" />
          <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 border border-white/60">
            {Array.from({ length: 9 }, (_, index) => <div key={index} className="border border-white/35" />)}
          </div>
        </div>
        <p className="text-xs text-neutral-400 mt-3">Arrastra la foto para encuadrarla.</p>
        <label className="flex items-center gap-3 mt-3 text-xs text-neutral-300"><ZoomIn className="w-4 h-4" /> Zoom
          <input type="range" min="1" max="3" step="0.01" value={zoom} onChange={(event) => { setZoom(Number(event.target.value)); setOffset({ x: 0, y: 0 }); }} className="flex-1" />
        </label>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onCancel} className="px-4 py-2 rounded-xl bg-white/10 text-xs">Cancelar</button>
          <button onClick={apply} disabled={!ready} className="px-4 py-2 rounded-xl bg-indigo-600 disabled:opacity-50 text-xs font-semibold">Usar portada</button>
        </div>
      </div>
    </div>
  );
};
