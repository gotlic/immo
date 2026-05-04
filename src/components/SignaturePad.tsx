"use client";

import { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from "react";

export type SignaturePadHandle = {
  isEmpty: () => boolean;
  toDataURL: () => string;
  clear: () => void;
};

type Props = {
  onChange?: (dataUrl: string | null) => void;
  disabled?: boolean;
};

const SignaturePad = forwardRef<SignaturePadHandle, Props>(function SignaturePad({ onChange, disabled }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const drawing = useRef(false);
  const [empty, setEmpty] = useState(true);

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const ratio = window.devicePixelRatio || 1;
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    canvas.width = w * ratio;
    canvas.height = h * ratio;
    ctx.scale(ratio, ratio);
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    resize();
    // Re-init if the canvas had 0 width on first render (layout not ready yet)
    const observer = new ResizeObserver(() => {
      if (canvas.offsetWidth > 0) resize();
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [resize]);

  // Attach non-passive touch listeners directly to DOM to allow preventDefault()
  // (React synthetic events are passive by default, which prevents scroll blocking)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (disabled) return;
      e.preventDefault();
      const p = getPos(e.touches[0], canvas);
      startDraw(p.x, p.y);
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (disabled) return;
      e.preventDefault();
      const p = getPos(e.touches[0], canvas);
      moveDraw(p.x, p.y);
    };
    const handleTouchEnd = () => { drawing.current = false; };

    canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
    canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
    canvas.addEventListener("touchend", handleTouchEnd);
    return () => {
      canvas.removeEventListener("touchstart", handleTouchStart);
      canvas.removeEventListener("touchmove", handleTouchMove);
      canvas.removeEventListener("touchend", handleTouchEnd);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled]);

  function getPos(e: { clientX: number; clientY: number }, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function startDraw(x: number, y: number) {
    if (disabled) return;
    drawing.current = true;
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function moveDraw(x: number, y: number) {
    if (!drawing.current || disabled) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.lineTo(x, y);
    ctx.stroke();
    if (empty) setEmpty(false);
    onChange?.(canvas.toDataURL("image/png"));
  }

  function endDraw() { drawing.current = false; }

  function onMouseDown(e: React.MouseEvent) { startDraw(getPos(e.nativeEvent, canvasRef.current!).x, getPos(e.nativeEvent, canvasRef.current!).y); }
  function onMouseMove(e: React.MouseEvent) { moveDraw(getPos(e.nativeEvent, canvasRef.current!).x, getPos(e.nativeEvent, canvasRef.current!).y); }

  function clear() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
    setEmpty(true);
    onChange?.(null);
  }

  /** Charge une image depuis un fichier et la dessine centrée sur le canvas */
  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || disabled) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d")!;
        const ratio = window.devicePixelRatio || 1;
        const cw = canvas.offsetWidth;
        const ch = canvas.offsetHeight;
        // Centrer et adapter l'image avec marges
        const maxW = cw * 0.9;
        const maxH = ch * 0.9;
        const scale = Math.min(maxW / img.width, maxH / img.height, 1);
        const w = img.width * scale;
        const h = img.height * scale;
        const x = (cw - w) / 2;
        const y = (ch - h) / 2;
        ctx.clearRect(0, 0, cw * ratio, ch * ratio);
        ctx.drawImage(img, x, y, w, h);
        setEmpty(false);
        onChange?.(canvas.toDataURL("image/png"));
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be reloaded
    e.target.value = "";
  }

  useImperativeHandle(ref, () => ({
    isEmpty: () => empty,
    toDataURL: () => canvasRef.current?.toDataURL("image/png") ?? "",
    clear,
  }));

  return (
    <div className="space-y-1">
      <div
        className={`relative border-2 rounded-xl overflow-hidden bg-white ${disabled ? "opacity-60" : "border-gray-300 hover:border-gray-400"} ${!empty ? "border-gray-500" : ""}`}
        style={{ height: 120 }}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-crosshair"
          style={{ touchAction: "none" }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
        />
        {empty && !disabled && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-gray-300 text-sm select-none">Signez ici avec votre doigt ou la souris</span>
          </div>
        )}
        {/* Bouton upload image discret */}
        {!disabled && (
          <button
            type="button"
            title="Importer une image de signature"
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-1.5 right-1.5 p-1 rounded text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-colors"
          >
            {/* Icône image upload */}
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileUpload}
        />
      </div>
      {!empty && !disabled && (
        <button type="button" onClick={clear} className="text-xs text-red-500 hover:text-red-700">
          Effacer et recommencer
        </button>
      )}
    </div>
  );
});

export default SignaturePad;
