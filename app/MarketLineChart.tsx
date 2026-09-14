"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";

export type MarketChartPoint = {
  timestamp: number;
  close: number;
};

type MarketLineChartProps = {
  points: MarketChartPoint[];
  positive: boolean;
  locale: "zh" | "en" | "ja";
  period: string;
  currency?: string;
  formatValue?: (value: number) => string;
  ariaLabel: string;
};

function formatTime(timestamp: number, period: string, locale: string) {
  const date = new Date(timestamp * 1000);
  const language = locale === "zh" ? "zh-TW" : locale === "ja" ? "ja-JP" : "en-US";
  if (period === "1D" || period === "1W") {
    return new Intl.DateTimeFormat(language, {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Taipei",
    }).format(date);
  }
  return new Intl.DateTimeFormat(language, {
    year: period === "1Y" ? "2-digit" : undefined,
    month: "numeric",
    day: "numeric",
    timeZone: "Asia/Taipei",
  }).format(date);
}

export function MarketLineChart({ points, positive, locale, period, currency = "USD", formatValue, ariaLabel }: MarketLineChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [activeIndex, setActiveIndex] = useState(Math.max(0, points.length - 1));

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    let frameId = 0;
    const update = () => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        const rect = frame.getBoundingClientRect();
        setSize({ width: Math.max(0, rect.width), height: Math.max(0, rect.height) });
      });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(frame);
    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, []);

  const moneyFormatter = useMemo(
    () => new Intl.NumberFormat(locale === "zh" ? "zh-TW" : locale === "ja" ? "ja-JP" : "en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
    [currency, locale],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || points.length < 2 || size.width <= 0 || size.height <= 0) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(size.width * dpr);
    canvas.height = Math.round(size.height * dpr);
    canvas.style.width = `${size.width}px`;
    canvas.style.height = `${size.height}px`;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, size.width, size.height);

    const padding = { top: 22, right: 62, bottom: 30, left: 12 };
    const width = Math.max(1, size.width - padding.left - padding.right);
    const height = Math.max(1, size.height - padding.top - padding.bottom);
    const values = points.map((point) => point.close);
    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);
    const range = Math.max(0.01, rawMax - rawMin);
    const min = rawMin - range * 0.12;
    const max = rawMax + range * 0.12;
    const xAt = (index: number) => padding.left + (index / (points.length - 1)) * width;
    const yAt = (value: number) => padding.top + ((max - value) / (max - min)) * height;

    context.font = "10px Arial, sans-serif";
    context.textBaseline = "middle";
    for (let index = 0; index <= 4; index += 1) {
      const y = padding.top + (index / 4) * height;
      context.strokeStyle = "rgba(89, 102, 94, .16)";
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(padding.left, y);
      context.lineTo(padding.left + width, y);
      context.stroke();
      context.fillStyle = "#7a817b";
      context.textAlign = "left";
      context.fillText((max - (index / 4) * (max - min)).toLocaleString("en-US", { maximumFractionDigits: 1 }), padding.left + width + 8, y);
    }

    for (let index = 0; index <= 3; index += 1) {
      const pointIndex = Math.min(points.length - 1, Math.round((index / 3) * (points.length - 1)));
      const x = xAt(pointIndex);
      context.fillStyle = "#838a83";
      context.textAlign = index === 0 ? "left" : index === 3 ? "right" : "center";
      context.fillText(formatTime(points[pointIndex].timestamp, period, locale), x, size.height - 10);
    }

    context.beginPath();
    points.forEach((point, index) => {
      const x = xAt(index);
      const y = yAt(point.close);
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.lineTo(xAt(points.length - 1), padding.top + height);
    context.lineTo(xAt(0), padding.top + height);
    context.closePath();
    context.fillStyle = positive ? "rgba(190, 88, 70, .08)" : "rgba(40, 116, 99, .08)";
    context.fill();

    context.beginPath();
    points.forEach((point, index) => {
      const x = xAt(index);
      const y = yAt(point.close);
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.strokeStyle = positive ? "#b9503e" : "#287463";
    context.lineWidth = 2.2;
    context.lineJoin = "round";
    context.lineCap = "round";
    context.stroke();

    const safeIndex = Math.max(0, Math.min(points.length - 1, activeIndex));
    const selected = points[safeIndex];
    const activeX = xAt(safeIndex);
    const activeY = yAt(selected.close);
    context.setLineDash([4, 4]);
    context.strokeStyle = "rgba(50, 59, 54, .45)";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(activeX, padding.top);
    context.lineTo(activeX, padding.top + height);
    context.stroke();
    context.setLineDash([]);
    context.beginPath();
    context.arc(activeX, activeY, 4.5, 0, Math.PI * 2);
    context.fillStyle = "#fffdf8";
    context.fill();
    context.strokeStyle = positive ? "#b9503e" : "#287463";
    context.lineWidth = 2;
    context.stroke();
  }, [activeIndex, locale, moneyFormatter, period, points, positive, size]);

  const handlePointer = (event: PointerEvent<HTMLCanvasElement>) => {
    if (points.length < 2) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const available = Math.max(1, rect.width - 74);
    const progress = Math.max(0, Math.min(1, (event.clientX - rect.left - 12) / available));
    setActiveIndex(Math.round(progress * (points.length - 1)));
  };

  const safeActiveIndex = Math.max(0, Math.min(points.length - 1, activeIndex));
  const activePoint = points[safeActiveIndex];

  return (
    <figure className="marketLineFigure">
      <div className="marketLineCanvas" ref={frameRef}>
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={ariaLabel}
          onPointerMove={handlePointer}
          onPointerDown={handlePointer}
        />
        {activePoint && (
          <div className="marketChartReadout" aria-live="polite">
            <span>{formatTime(activePoint.timestamp, period, locale)}</span>
            <strong>{(formatValue ?? ((value: number) => moneyFormatter.format(value)))(activePoint.close)}</strong>
          </div>
        )}
        <label className="srOnly" htmlFor={`market-chart-${period}`}>{locale === "en" ? "Inspect chart points with keyboard" : locale === "ja" ? "キーボードでチャートを確認" : "使用鍵盤檢視圖表資料點"}</label>
        <input
          className="marketChartKeyboard"
          id={`market-chart-${period}`}
          type="range"
          min="0"
          max={Math.max(0, points.length - 1)}
          value={safeActiveIndex}
          onChange={(event) => setActiveIndex(Number(event.target.value))}
        />
      </div>
    </figure>
  );
}
