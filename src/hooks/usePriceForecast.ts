import { useState, useEffect, useRef } from 'react';

export interface PriceForecastData {
  symbol: string;
  currentPrice: number;
  baseForecast: number;
  ruleAdjustedForecast: number;
  bullishConfidence: number;
  upperBand: number;
  lowerBand: number;
  predictedDeltaPct: number;
  activeLift: number;
  isFallback: boolean;
  metrics: {
    rmse: number;
    mae: number;
    horizon: string;
  };
}

export function usePriceForecast(
  symbol: string,
  currentPrice: number,
  activeLift: number = 1.0,
  recentTicks: Array<{ price: number; pctChange: number; volumeRatio: number }> = []
) {
  const [forecast, setForecast] = useState<PriceForecastData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [history, setHistory] = useState<Array<{ time: string; actual: number; base: number; adjusted: number }>>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!symbol) return;

    const wsUrl = `ws://localhost:8000/ws/predict/${symbol}`;
    let socket: WebSocket | null = null;
    let fallbackInterval: number | null = null;

    try {
      socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        setIsConnected(true);
      };

      socket.onmessage = (event) => {
        try {
          const data: PriceForecastData = JSON.parse(event.data);
          setForecast(data);
          setHistory((prev) => [
            ...prev.slice(-25),
            {
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              actual: data.currentPrice,
              base: data.baseForecast,
              adjusted: data.ruleAdjustedForecast,
            },
          ]);
        } catch (e) {
          console.error("Error parsing AI forecast WS message:", e);
        }
      };

      socket.onerror = () => {
        setIsConnected(false);
      };

      socket.onclose = () => {
        setIsConnected(false);
      };
    } catch {
      setIsConnected(false);
    }

    // Client-side fallback if Python WebSocket microservice is not yet started
    fallbackInterval = window.setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        // Send window payload to Python FastAPI service
        const payload = {
          window: recentTicks.slice(-30).map((t) => ({
            price: t.price,
            pct_change: t.pctChange,
            volume_ratio: t.volumeRatio,
          })),
          currentPrice: currentPrice || 100,
          activeLift: activeLift || 1.0,
        };
        wsRef.current.send(JSON.stringify(payload));
      } else {
        // Generate simulated PyTorch inference fallback directly in browser
        const deltaPct = ((Math.random() - 0.48) * 0.8);
        const ruleImpact = (activeLift - 1.0) * 0.45;
        const adjustedDelta = deltaPct * (1.0 + ruleImpact);
        const base = (currentPrice || 150) * (1 + deltaPct / 100);
        const adj = (currentPrice || 150) * (1 + adjustedDelta / 100);
        const conf = Math.min(0.92, Math.max(0.12, 0.5 + deltaPct * 0.3 + ruleImpact * 0.15));

        const simulated: PriceForecastData = {
          symbol,
          currentPrice: currentPrice || 150,
          baseForecast: Number(base.toFixed(2)),
          ruleAdjustedForecast: Number(adj.toFixed(2)),
          bullishConfidence: Number(conf.toFixed(3)),
          upperBand: Number((adj * 1.006).toFixed(2)),
          lowerBand: Number((adj * 0.994).toFixed(2)),
          predictedDeltaPct: Number(adjustedDelta.toFixed(2)),
          activeLift: Number(activeLift.toFixed(2)),
          isFallback: true,
          metrics: {
            rmse: 0.39,
            mae: 0.28,
            horizon: '1-step (sliding tick)',
          },
        };

        setForecast(simulated);
        setHistory((prev) => [
          ...prev.slice(-25),
          {
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            actual: simulated.currentPrice,
            base: simulated.baseForecast,
            adjusted: simulated.ruleAdjustedForecast,
          },
        ]);
      }
    }, 2500);

    return () => {
      if (fallbackInterval) clearInterval(fallbackInterval);
      if (socket) socket.close();
    };
  }, [symbol, currentPrice, activeLift]);

  return { forecast, isConnected, history };
}
