import React, { useState, useEffect, useRef } from 'react';
import { Download, Bell, BellRing, Film, Play, RotateCcw, Volume2, VolumeX, ShieldAlert, Check } from 'lucide-react';
import { Card, Badge, Button } from '../ui/Primitives';
import { AssociationRule, StockTick } from '../../types/marketMining';

interface ShockReplayAlertsProps {
  latestTicks: StockTick[];
  rules: AssociationRule[];
  onReplayShockTicks: (shockTicks: StockTick[]) => void;
}

interface RecordedFrame {
  timestamp: number;
  ticks: StockTick[];
}

interface SmartAlert {
  id: string;
  ruleId: string;
  message: string;
  lift: number;
  time: string;
}

export function ShockReplayAlerts({ latestTicks, rules, onReplayShockTicks }: ShockReplayAlertsProps) {
  // Replay Buffer (last 60 seconds)
  const [recordedFrames, setRecordedFrames] = useState<RecordedFrame[]>([]);
  const [isReplaying, setIsReplaying] = useState(false);
  const [replayProgress, setReplayProgress] = useState(0);

  // Smart Alerts
  const [minLiftAlert, setMinLiftAlert] = useState<number>(1.6);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [alerts, setAlerts] = useState<SmartAlert[]>([]);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookStatus, setWebhookStatus] = useState<string | null>(null);

  // Buffer recording every tick batch
  useEffect(() => {
    if (isReplaying || !latestTicks.length) return;

    const frame: RecordedFrame = {
      timestamp: Date.now(),
      ticks: [...latestTicks],
    };

    setRecordedFrames((prev) => {
      const now = Date.now();
      // Keep exactly 60 seconds of history
      return [...prev.filter((f) => now - f.timestamp <= 60000), frame];
    });
  }, [latestTicks, isReplaying]);

  // Audio tone generator using Web Audio API
  const playAlertTone = () => {
    if (!audioEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {
      // AudioContext may be restricted by autoplay policy
    }
  };

  // Monitor high-lift rules for alert triggers
  useEffect(() => {
    if (!rules.length) return;

    const triggerRules = rules.filter((r) => r.lift >= minLiftAlert);
    if (triggerRules.length > 0) {
      const topRule = triggerRules[0];
      const alertId = `${topRule.id}-${Math.floor(Date.now() / 8000)}`;

      setAlerts((prev) => {
        if (prev.some((a) => a.id === alertId)) return prev;

        const newAlert: SmartAlert = {
          id: alertId,
          ruleId: topRule.id,
          message: `${topRule.antecedent.join('+')} ⇒ ${topRule.consequent.join('+')} (Lift: ${topRule.lift.toFixed(2)}x)`,
          lift: topRule.lift,
          time: new Date().toLocaleTimeString(),
        };

        playAlertTone();

        // Dispatch optional webhook POST
        if (webhookUrl) {
          fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newAlert),
          }).catch(() => {});
        }

        return [newAlert, ...prev].slice(0, 10);
      });
    }
  }, [rules, minLiftAlert, audioEnabled, webhookUrl]);

  // Shock Replay Engine
  const triggerReplay = () => {
    if (!recordedFrames.length) return;
    setIsReplaying(true);
    setReplayProgress(0);

    let idx = 0;
    const interval = window.setInterval(() => {
      if (idx >= recordedFrames.length) {
        clearInterval(interval);
        setIsReplaying(false);
        setReplayProgress(100);
        return;
      }

      onReplayShockTicks(recordedFrames[idx].ticks);
      setReplayProgress(Math.round(((idx + 1) / recordedFrames.length) * 100));
      idx++;
    }, 250);
  };

  // CSV & JSON Exporters
  const exportRulesCSV = () => {
    const headers = ['ID', 'Antecedent', 'Consequent', 'Support', 'Confidence', 'Lift', 'Stability'];
    const rows = rules.map((r) => [
      r.id,
      `"${r.antecedent.join('+')}"`,
      `"${r.consequent.join('+')}"`,
      r.support.toFixed(4),
      r.confidence.toFixed(4),
      r.lift.toFixed(4),
      r.stability,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `streammine_rules_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportRulesJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify({ rules, timestamp: Date.now() }, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `streammine_rules_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <Card className="p-5 bg-[#111827] border-[#1F2937] space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-semibold text-[#F9FAFB] flex items-center gap-2">
            <Film className="w-4 h-4 text-[#F59E0B]" />
            Shockwave Replay, Smart Alerts & Data Export
          </h4>
          <p className="text-xs text-[#9CA3AF]">
            Capture 60-second market shock tape, trigger automated Lift alerts, and export mined rule datasets.
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportRulesCSV} className="border-[#1F2937] text-xs text-[#F9FAFB] hover:border-[#6366F1]">
            <Download className="w-3.5 h-3.5 mr-1" />
            CSV Export
          </Button>
          <Button variant="outline" size="sm" onClick={exportRulesJSON} className="border-[#1F2937] text-xs text-[#F9FAFB] hover:border-[#6366F1]">
            <Download className="w-3.5 h-3.5 mr-1" />
            JSON Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Replay Studio */}
        <div className="p-4 rounded-xl bg-[#090D16] border border-[#1F2937] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-[#F9FAFB] uppercase">
              60-Second Tape Replay Buffer
            </span>
            <Badge variant="indigo" className="tabular-nums text-[10px]">
              {recordedFrames.length} Frames Cached
            </Badge>
          </div>

          <p className="text-xs text-[#9CA3AF]">
            Rewind and play back recent high-volatility flash events through the discretizer and mining pipeline.
          </p>

          <div className="w-full bg-[#111827] h-2 rounded-full overflow-hidden border border-[#1F2937]">
            <div
              className="bg-[#F59E0B] h-full transition-all duration-200"
              style={{ width: `${replayProgress}%` }}
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Button
              variant="secondary"
              size="sm"
              disabled={isReplaying || recordedFrames.length < 5}
              onClick={triggerReplay}
              className="w-full justify-center text-xs"
            >
              <Play className="w-3.5 h-3.5 mr-1 fill-current" />
              {isReplaying ? `Replaying (${replayProgress}%)` : 'Replay Flash Shock Tape'}
            </Button>
          </div>
        </div>

        {/* Smart Alerts & Webhooks */}
        <div className="p-4 rounded-xl bg-[#090D16] border border-[#1F2937] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-[#F9FAFB] uppercase">
              Real-Time Lift Threshold Alerts
            </span>
            <button
              onClick={() => setAudioEnabled(!audioEnabled)}
              className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition-colors ${
                audioEnabled ? 'border-[#10B981] text-[#10B981] bg-[#10B981]/10' : 'border-[#1F2937] text-[#9CA3AF]'
              }`}
            >
              {audioEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span className="text-[10px] font-mono">{audioEnabled ? 'Audio Chime ON' : 'Muted'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-[#9CA3AF] shrink-0 font-mono">Min Lift Alert:</span>
            <input
              type="range"
              min="1.1"
              max="2.5"
              step="0.05"
              value={minLiftAlert}
              onChange={(e) => setMinLiftAlert(parseFloat(e.target.value))}
              className="flex-1 accent-[#6366F1]"
            />
            <span className="text-xs font-mono text-[#F9FAFB] tabular-nums font-bold">
              {minLiftAlert.toFixed(2)}x
            </span>
          </div>

          {/* Webhook input */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Webhook URL (Slack, Discord, or Trading API)"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className="flex-1 px-2.5 py-1.5 rounded bg-[#111827] border border-[#1F2937] text-[11px] text-[#F9FAFB] font-mono focus:outline-none focus:border-[#6366F1]"
            />
          </div>

          {/* Alert Feed */}
          <div className="space-y-1.5 max-h-24 overflow-y-auto pt-1">
            {alerts.length > 0 ? (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between p-2 rounded bg-[#111827] border border-[#1F2937] text-[11px] font-mono"
                >
                  <div className="flex items-center gap-1.5 text-[#F9FAFB] truncate">
                    <BellRing className="w-3.5 h-3.5 text-[#F59E0B] shrink-0" />
                    <span className="truncate">{alert.message}</span>
                  </div>
                  <span className="text-[#9CA3AF] text-[10px] shrink-0 ml-2">{alert.time}</span>
                </div>
              ))
            ) : (
              <div className="text-[11px] text-[#9CA3AF] text-center py-2">
                Listening for rule lift spikes above {minLiftAlert.toFixed(2)}x...
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
