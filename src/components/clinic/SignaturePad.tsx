import { useEffect, useRef, useState } from "react";

/** Finger/mouse signature capture. Emits a PNG data URL on every stroke end. */
export function SignaturePad({
  onChange,
  height = 160,
}: {
  onChange: (dataUrl: string | null) => void;
  height?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = height * ratio;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111827";
  }, [height]);

  function point(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        style={{ height }}
        className="w-full touch-none rounded-lg border border-dashed border-border bg-background"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          const ctx = e.currentTarget.getContext("2d");
          if (!ctx) return;
          const { x, y } = point(e);
          ctx.beginPath();
          ctx.moveTo(x, y);
          drawing.current = true;
        }}
        onPointerMove={(e) => {
          if (!drawing.current) return;
          const ctx = e.currentTarget.getContext("2d");
          if (!ctx) return;
          const { x, y } = point(e);
          ctx.lineTo(x, y);
          ctx.stroke();
        }}
        onPointerUp={(e) => {
          drawing.current = false;
          setDirty(true);
          onChange(e.currentTarget.toDataURL("image/png"));
        }}
      />
      <div className="flex items-center gap-3">
        <p className="text-xs text-muted-foreground">Sign inside the box using a finger or mouse.</p>
        <button
          type="button"
          className="ml-auto text-xs text-primary hover:underline"
          onClick={() => {
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext("2d");
            if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
            setDirty(false);
            onChange(null);
          }}
        >
          Clear
        </button>
      </div>
      {dirty ? null : <input type="hidden" data-signature="empty" />}
    </div>
  );
}
