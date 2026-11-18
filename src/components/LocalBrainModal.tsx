import React, { useEffect, useState } from "react";
import {
  X,
  Cpu,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Download,
  ExternalLink,
} from "lucide-react";
import {
  COLAB_NOTEBOOK_SNIPPET,
  fetchLmStudioModels,
  isRemoteHttpsUrl,
  testColabTunnelBrain,
  type LocalBrainConfig,
  type LocalBrainScope,
} from "../utils/localBrain";

interface LocalBrainModalProps {
  open: boolean;
  config: LocalBrainConfig;
  onSave: (next: LocalBrainConfig) => void;
  onClose: () => void;
}

export const LocalBrainModal: React.FC<LocalBrainModalProps> = ({
  open,
  config,
  onSave,
  onClose,
}) => {
  const [enabled, setEnabled] = useState(config.enabled);
  const [baseUrl, setBaseUrl] = useState(config.baseUrl);
  const [modelName, setModelName] = useState(config.modelName);
  const [scope, setScope] = useState<LocalBrainScope>(config.scope);
  const [detectedModels, setDetectedModels] = useState<string[]>([]);
  const [testState, setTestState] = useState<"idle" | "testing" | "ok" | "error">("idle");
  const [testMessage, setTestMessage] = useState("");
  const [copiedColab, setCopiedColab] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEnabled(config.enabled);
    setBaseUrl(config.baseUrl);
    setModelName(config.modelName);
    setScope(config.scope);
    setDetectedModels([]);
    setTestState("idle");
    setTestMessage("");
    setCopiedColab(false);
  }, [open, config]);

  if (!open) return null;

  const handleCopyColabScript = async () => {
    try {
      await navigator.clipboard.writeText(COLAB_NOTEBOOK_SNIPPET);
      setCopiedColab(true);
      setTimeout(() => setCopiedColab(false), 2500);
    } catch {
      // Clipboard blocked in some embedded frames; download .ipynb remains available
    }
  };

  const handleTest = async () => {
    const trimmedUrl = baseUrl.trim();
    if (!trimmedUrl) {
      setTestState("error");
      setTestMessage(
        "Paste your https://...trycloudflare.com/v1 URL from Google Colab first."
      );
      return;
    }

    setTestState("testing");
    setTestMessage("");

    if (isRemoteHttpsUrl(trimmedUrl)) {
      try {
        const result = await testColabTunnelBrain(trimmedUrl, modelName);
        if (result.models.length > 0) {
          setDetectedModels(result.models);
          if (!modelName.trim() && result.defaultModel) {
            setModelName(result.defaultModel);
          }
        }
        if (result.ok) {
          setTestState("ok");
          setTestMessage(
            `Connected to ${result.provider} (${result.endpointHost}) using model "${result.defaultModel}".`
          );
        } else {
          setTestState("error");
          setTestMessage(result.error || "Connection test failed.");
        }
      } catch {
        setTestState("error");
        setTestMessage("Could not reach the game server to test your Colab tunnel.");
      }
      return;
    }

    try {
      const models = await fetchLmStudioModels(trimmedUrl);
      setDetectedModels(models);
      if (models.length > 0 && !modelName.trim()) {
        setModelName(models[0]);
      }
      setTestState("ok");
      setTestMessage(
        models.length > 0
          ? `Connected! Found loaded model: ${models[0]}`
          : "Connected to local model server."
      );
    } catch {
      setTestState("error");
      setTestMessage(
        "Could not reach that URL. For Google Colab, paste the https://...trycloudflare.com/v1 URL printed by your running notebook."
      );
    }
  };

  const handleApply = () => {
    const trimmedUrl = baseUrl.trim();
    onSave({
      enabled: enabled && Boolean(trimmedUrl),
      baseUrl: trimmedUrl,
      modelName: modelName.trim(),
      scope,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0b0c10]/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#12131a] border border-white/15 rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-rose-300" />
            <h2 className="font-display text-lg font-semibold text-[#f2efe9]">
              Google Colab AI Brain
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-[#f2efe9]/75 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs text-[#f2efe9]/85 max-h-[82vh] overflow-y-auto">
          <label className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3.5 cursor-pointer">
            <div>
              <div className="text-sm font-medium text-[#f2efe9]">
                Use Google Colab Roleplay Brain
              </div>
              <div className="text-[11px] text-[#f2efe9]/60 mt-0.5">
                Run Llama 3.1 Nemotron 8B UltraLong free on Google&apos;s T4 GPU for NPCs or full turns.
              </div>
            </div>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="w-4 h-4 accent-rose-500"
            />
          </label>

          <div className="rounded-xl border border-rose-400/25 bg-rose-950/15 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-rose-200">
                Host Nemotron 8B UltraLong Free on Google Colab
              </span>
              <a
                href="https://colab.research.google.com/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-rose-300 hover:text-rose-200 underline"
              >
                <span>Open Colab</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <ol className="text-[11px] text-[#f2efe9]/75 space-y-1 list-decimal list-inside">
              <li>
                Upload <span className="font-mono text-rose-200">.ipynb</span> or paste the copied cell into Colab.
              </li>
              <li>
                Select <span className="text-rose-200 font-medium">Runtime → Change runtime type → T4 GPU</span> and run it (~2 min).
              </li>
              <li>
                Keep the Colab tab open, paste the printed <span className="font-mono text-rose-200">https://...trycloudflare.com/v1</span> link below, and click <span className="text-rose-200 font-medium">Test</span>.
              </li>
            </ol>
            <div className="flex flex-wrap gap-2 pt-0.5">
              <a
                href="/euphoric-void-colab.ipynb"
                download="euphoric-void-colab.ipynb"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-rose-400/40 bg-rose-500/20 hover:bg-rose-500/30 text-rose-100 text-[11px] font-medium"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .ipynb</span>
              </a>
              <button
                type="button"
                onClick={() => void handleCopyColabScript()}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/15 bg-white/10 hover:bg-white/15 text-[#f2efe9] text-[11px] font-medium cursor-pointer"
              >
                {copiedColab ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Copied Colab Cell!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Colab Script</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block font-mono text-[11px] uppercase tracking-wider text-rose-200/80">
              Google Colab Tunnel URL
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://xxxx.trycloudflare.com/v1"
                className="flex-1 bg-[#0b0c10] border border-white/15 focus:border-rose-400/60 rounded-lg px-3 py-2 text-xs text-[#f2efe9] outline-none font-mono"
              />
              <button
                type="button"
                onClick={() => void handleTest()}
                disabled={testState === "testing"}
                className="px-3 py-2 rounded-lg border border-white/15 bg-white/10 hover:bg-white/15 text-xs font-medium cursor-pointer"
              >
                {testState === "testing" ? "Checking..." : "Test"}
              </button>
            </div>
          </div>

          {testState !== "idle" && (
            <div
              className={`rounded-lg border px-3 py-2 text-[11px] flex items-start gap-2 ${
                testState === "ok"
                  ? "border-emerald-400/35 bg-emerald-950/30 text-emerald-200"
                  : "border-amber-400/35 bg-amber-950/30 text-amber-200"
              }`}
            >
              {testState === "ok" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span>{testMessage}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block font-mono text-[11px] uppercase tracking-wider text-rose-200/80">
              Model Name (Optional — Auto-Detected if Blank)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                list="brain-detected-models"
                placeholder={detectedModels[0] || "nemotron-8b-ultralong:latest"}
                className="flex-1 bg-[#0b0c10] border border-white/15 focus:border-rose-400/60 rounded-lg px-3 py-2 text-xs text-[#f2efe9] outline-none font-mono"
              />
              {modelName.trim() !== "" && (
                <button
                  type="button"
                  onClick={() => setModelName("")}
                  className="px-2.5 py-2 rounded-lg border border-white/15 bg-white/5 hover:bg-white/15 text-[11px] text-[#f2efe9]/80 cursor-pointer"
                  title="Clear model name to auto-detect"
                >
                  Clear
                </button>
              )}
            </div>
            {detectedModels.length > 0 && (
              <>
                <datalist id="brain-detected-models">
                  {detectedModels.map((m) => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[10px] text-[#f2efe9]/65">
                  <span>Detected:</span>
                  {detectedModels.slice(0, 3).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setModelName(m)}
                      className="underline hover:text-rose-200 font-mono cursor-pointer text-left break-all"
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="font-mono text-[11px] uppercase tracking-wider text-rose-200/80">
              Brain Mode
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setScope("npc_only")}
                className={`text-left p-2.5 rounded-lg border transition cursor-pointer ${
                  scope === "npc_only"
                    ? "border-rose-400/65 bg-rose-500/20 text-rose-100"
                    : "border-white/10 bg-white/[0.03] text-[#f2efe9]/70"
                }`}
              >
                <div className="font-semibold">NPC Responses Only</div>
                <div className="text-[10px] opacity-75 mt-0.5">
                  Nemotron writes Lumina &amp; monster-girl replies while engine rules stay strict.
                </div>
              </button>
              <button
                type="button"
                onClick={() => setScope("full_turn")}
                className={`text-left p-2.5 rounded-lg border transition cursor-pointer ${
                  scope === "full_turn"
                    ? "border-rose-400/65 bg-rose-500/20 text-rose-100"
                    : "border-white/10 bg-white/[0.03] text-[#f2efe9]/70"
                }`}
              >
                <div className="font-semibold">Full Game Brain</div>
                <div className="text-[10px] opacity-75 mt-0.5">
                  Nemotron controls narration, dialogue, poses, and stat deltas for every turn.
                </div>
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-4 py-2 rounded-lg bg-rose-500 hover:bg-rose-400 text-[#0b0c10] font-semibold text-xs cursor-pointer"
            >
              Save Brain Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
