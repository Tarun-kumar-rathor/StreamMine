import React, { useEffect, useState } from 'react';
import { PlugZap, X } from 'lucide-react';
import { FinnhubStatus, MarketMode } from '../../types/marketMining';
import { testFinnhubConnection } from '../../engine/finnhubService';

export const FinnhubModal: React.FC<{
  open: boolean;
  onClose: () => void;
  setMode: (mode: MarketMode) => void;
  status: FinnhubStatus;
}> = ({ open, onClose, setMode, status }) => {
  const [testingKey, setTestingKey] = useState(false);
  const [keyTestResult, setKeyTestResult] = useState('');
  const [serverKeyConfigured, setServerKeyConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setServerKeyConfigured(null);
    setKeyTestResult('');
    fetch('/api/status')
      .then(async (response) => {
        if (!response.ok) throw new Error(`Status request failed (${response.status})`);
        return response.json() as Promise<{ configured: boolean }>;
      })
      .then(({ configured }) => {
        if (active) setServerKeyConfigured(configured);
      })
      .catch((error: unknown) => {
        if (active) {
          setServerKeyConfigured(false);
          const message = error instanceof Error ? error.message : 'Could not check server configuration';
          setKeyTestResult(`Request failed — ${message}`);
        }
      });
    return () => { active = false; };
  }, [open]);

  if (!open) return null;

  const testKey = async () => {
    setTestingKey(true);
    setKeyTestResult('');
    try {
      const quote = await testFinnhubConnection();
      setKeyTestResult(quote.c > 0
        ? `Server request successful — AAPL: $${quote.c.toFixed(2)}`
        : 'Server request successful — no current AAPL quote available.');
    } catch (error) {
      setKeyTestResult(error instanceof Error ? `Request failed — ${error.message}` : 'Request failed — unexpected error');
    } finally {
      setTestingKey(false);
    }
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl border border-[#1F2937] bg-[#111827] p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PlugZap className="w-5 h-5 text-[#10B981]" />
            <h3 className="text-lg font-bold">Live Finnhub WebSocket Connector</h3>
          </div>
          <button onClick={onClose} aria-label="Close Finnhub connector">
            <X className="w-5 h-5 text-[#9CA3AF]" />
          </button>
        </div>
        <p className="text-sm text-[#9CA3AF]">
          The Finnhub key is configured on the server and is never sent to your browser.
        </p>
        <p role="status" className="text-xs text-[#9CA3AF]">
          Server key: {serverKeyConfigured === null ? 'Checking…' : serverKeyConfigured ? 'Configured' : 'Not configured'}
        </p>
        <button
          type="button"
          onClick={testKey}
          disabled={testingKey || !serverKeyConfigured}
          className="w-full py-2 rounded-lg border border-[#1F2937] text-sm disabled:opacity-40"
        >
          {testingKey ? 'Testing server connection…' : 'Test server connection (GET quote)'}
        </button>
        {keyTestResult && (
          <p role="status" className={`text-xs ${keyTestResult.startsWith('Request failed') ? 'text-[#F87171]' : 'text-[#34D399]'}`}>
            {keyTestResult}
          </p>
        )}
        <div className="flex gap-3">
          <button onClick={() => { setMode('finnhub_us'); onClose(); }} className="flex-1 py-2.5 rounded-lg bg-[#6366F1]">
            US Equities
          </button>
          <button onClick={() => { setMode('finnhub_crypto'); onClose(); }} className="flex-1 py-2.5 rounded-lg border border-[#1F2937]">
            Crypto
          </button>
        </div>
        <div className="text-xs text-[#6B7280]">Status: {status.message}</div>
      </div>
    </div>
  );
};
