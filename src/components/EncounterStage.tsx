import React, { useEffect, useRef, useState } from "react";
import { Heart, Sparkles, DoorOpen, Users, Palette, Loader2 } from "lucide-react";
import type {
  ArchetypeId,
  EntityStance,
  GameMode,
  LightingMood,
  MonsterGirlNPC,
  SceneBackdrop,
  VisualEffect,
} from "../types/game";
import {
  ARCHETYPE_BATTLE_SCENES,
  ARCHETYPE_CLOSE_SCENES,
  ARCHETYPE_DEEP_SCENES,
  ARCHETYPE_KISS_SCENES,
  ARCHETYPE_PORTRAITS,
  PROTAGONIST_PORTRAIT,
  SCENE_BACKDROPS,
  computeBattleTier,
} from "../utils/portraits";
import { getBattleTierStyles } from "../utils/battleTheme";

export interface CompanionMomentState {
  archetype: ArchetypeId;
  name: string;
  pose: string;
  caption: string;
}

interface EncounterStageProps {
  floorTitle: string;
  roomName: string;
  doorLabel: string;
  isDoorway: boolean;
  tileExamined: boolean;
  sceneBackdrop: SceneBackdrop;
  lightingMood: LightingMood;
  entityStance: EntityStance;
  visualEffect: VisualEffect;
  sceneCaption: string;
  visualPrompt?: string;
  turn?: number;
  gameMode: GameMode;
  activeHunter: MonsterGirlNPC | null;
  rivalHunter: MonsterGirlNPC | null;
  embracePose: string;
  intimacyContact: "none" | "soft" | "deep";
  companionMoment?: CompanionMomentState | null;
  intoxication: number;
  selfhood: number;
  tether: number;
}

export const EncounterStage: React.FC<EncounterStageProps> = ({
  floorTitle,
  roomName,
  doorLabel,
  isDoorway,
  tileExamined,
  sceneBackdrop,
  lightingMood,
  entityStance,
  visualEffect,
  sceneCaption,
  visualPrompt = "",
  turn = 1,
  gameMode,
  activeHunter,
  rivalHunter,
  embracePose,
  intimacyContact,
  companionMoment,
  intoxication,
  selfhood,
  tether,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [comfyArtwork, setComfyArtwork] = useState<string | null>(null);
  const [comfyPromptUsed, setComfyPromptUsed] = useState<string>("");
  const [comfyError, setComfyError] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [comfyAvailable, setComfyAvailable] = useState<boolean>(false);
  const [autoPaint, setAutoPaint] = useState<boolean>(false);
  const lastAutoKeyRef = useRef<string>("");

  useEffect(() => {
    let active = true;
    fetch("/api/comfy/status")
      .then((r) => r.json())
      .then((d) => {
        if (active) setComfyAvailable(Boolean(d.online));
      })
      .catch(() => {
        if (active) setComfyAvailable(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const isBattle = gameMode === "SEDUCTION_BATTLE" && Boolean(activeHunter);

  const tier = activeHunter
    ? computeBattleTier({
        embracePose,
        intimacyContact,
        entityStance,
        intoxication,
        selfhood,
        tether,
        affinity: activeHunter.affinity,
        disposition: activeHunter.disposition,
      })
    : "confrontation";

  const sceneSyncKey = `${turn}|${gameMode}|${activeHunter?.id ?? ""}|${companionMoment?.pose ?? ""}|${roomName}|${embracePose}|${visualPrompt}`;

  useEffect(() => {
    setComfyArtwork(null);
    setComfyError("");
  }, [activeHunter?.id, companionMoment?.pose, turn, roomName]);

  const handleGenerateArtwork = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setComfyError("");
    try {
      const hasSubject = Boolean(companionMoment) || (isBattle && Boolean(activeHunter));
      const res = await fetch("/api/comfy/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: visualPrompt,
          sceneCaption: companionMoment ? companionMoment.caption : sceneCaption,
          archetype: companionMoment?.archetype || (isBattle ? activeHunter?.archetype : "") || "",
          species: isBattle ? activeHunter?.species || "" : "",
          hunterName: companionMoment?.name || (isBattle ? activeHunter?.name : "") || "",
          visualTraits: isBattle ? activeHunter?.visualTraits || "" : "",
          disposition: companionMoment ? "Charmed" : isBattle ? activeHunter?.disposition || "" : "",
          stage: companionMoment ? "kiss" : tier,
          embracePose: companionMoment?.pose || (isBattle ? embracePose : ""),
          intimacyContact: companionMoment ? "deep" : isBattle ? intimacyContact : "none",
          entityStance: companionMoment ? "embrace" : isBattle ? entityStance : "distant",
          sceneBackdrop,
          lightingMood: companionMoment ? "candlelit_rose" : lightingMood,
          visualEffect: companionMoment ? "petals" : visualEffect,
          roomName: tileExamined ? roomName : doorLabel,
          intoxication,
          isBattle: hasSubject,
          aspect: "scene",
        }),
      });
      const data = await res.json();
      if (data.ok && data.url) {
        setComfyArtwork(data.url);
        if (typeof data.promptUsed === "string") {
          setComfyPromptUsed(data.promptUsed);
        }
      } else {
        setComfyError(data.error || "ComfyUI failed to manifest scene.");
      }
    } catch (e) {
      console.error("Failed to generate ComfyUI artwork:", e);
      setComfyError("Unable to reach ComfyUI server.");
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (!comfyAvailable || !autoPaint || isGenerating) return;
    if (lastAutoKeyRef.current === sceneSyncKey) return;
    lastAutoKeyRef.current = sceneSyncKey;
    void handleGenerateArtwork();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comfyAvailable, autoPaint, sceneSyncKey]);



  let primaryArtwork = SCENE_BACKDROPS[sceneBackdrop] ?? SCENE_BACKDROPS.corridor;
  let tierLabel = "";

  if (companionMoment) {
    primaryArtwork =
      ARCHETYPE_KISS_SCENES[companionMoment.archetype] ??
      ARCHETYPE_PORTRAITS[companionMoment.archetype];
    tierLabel = `Sanctuary Kiss · ${companionMoment.pose}`;
  } else if (isBattle && activeHunter) {
    if (tier === "kiss") {
      primaryArtwork = ARCHETYPE_KISS_SCENES[activeHunter.archetype];
      tierLabel = "Tier IV · Kiss Embrace";
    } else if (tier === "deep") {
      primaryArtwork = ARCHETYPE_DEEP_SCENES[activeHunter.archetype];
      tierLabel = "Tier III · Deep Thrall";
    } else if (tier === "close") {
      primaryArtwork = ARCHETYPE_CLOSE_SCENES[activeHunter.archetype];
      tierLabel = "Tier II · Close Contact";
    } else {
      primaryArtwork = ARCHETYPE_BATTLE_SCENES[activeHunter.archetype];
      tierLabel = "Tier I · Confrontation";
    }
  }

  // Particle Canvas Effect (petals / embers / spores / mist)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId = 0;
    const resize = () => {
      canvas.width = canvas.offsetWidth || 640;
      canvas.height = canvas.offsetHeight || 280;
    };
    resize();
    window.addEventListener("resize", resize);

    const particles = Array.from({ length: 28 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: visualEffect === "mist" ? 20 + Math.random() * 28 : 2 + Math.random() * 3.5,
      vx: (Math.random() - 0.5) * 0.45,
      vy:
        visualEffect === "embers"
          ? -(0.35 + Math.random() * 0.55)
          : visualEffect === "petals"
          ? 0.3 + Math.random() * 0.5
          : (Math.random() - 0.5) * 0.3,
      alpha: 0.2 + Math.random() * 0.5,
      phase: Math.random() * Math.PI * 2,
    }));

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.phase += 0.02;
        p.x += p.vx + Math.sin(p.phase) * 0.22;
        p.y += p.vy;

        if (p.x < -30) p.x = canvas.width + 30;
        if (p.x > canvas.width + 30) p.x = -30;
        if (p.y < -30) p.y = canvas.height + 30;
        if (p.y > canvas.height + 30) p.y = -30;

        ctx.save();
        ctx.globalAlpha = p.alpha;
        if (visualEffect === "petals") {
          ctx.fillStyle = "#fb7185";
          ctx.translate(p.x, p.y);
          ctx.rotate(p.phase);
          ctx.beginPath();
          ctx.ellipse(0, 0, p.r * 1.4, p.r * 0.75, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (visualEffect === "embers") {
          ctx.fillStyle = "#fbbf24";
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * 0.7, 0, Math.PI * 2);
          ctx.fill();
        } else if (visualEffect === "spores") {
          ctx.fillStyle = "#6ee7b7";
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * 0.9, 0, Math.PI * 2);
          ctx.fill();
        } else {
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
          grad.addColorStop(0, "rgba(216, 180, 254, 0.16)");
          grad.addColorStop(1, "rgba(216, 180, 254, 0)");
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, [visualEffect]);

  const moodTint =
    lightingMood === "overload_haze"
      ? "from-rose-950/65 via-fuchsia-950/35 to-[#0b0c10]"
      : lightingMood === "candlelit_rose"
      ? "from-rose-950/45 via-amber-950/20 to-[#0b0c10]"
      : lightingMood === "sanctuary_silver"
      ? "from-sky-950/40 via-slate-950/25 to-[#0b0c10]"
      : "from-violet-950/40 via-[#12131a]/30 to-[#0b0c10]";

  const styles = getBattleTierStyles(tier);

  return (
    <section className={`relative rounded-xl overflow-hidden border transition-all duration-1000 ease-in-out ${styles.container} shadow-2xl`}>
      {/* Atmospheric Overlay for Battle Tier */}
      <div className={`pointer-events-none absolute inset-0 transition-opacity duration-1000 z-0 ${styles.overlay}`} />
      
      {/* Main Scene Backdrop / Tiered Battle Artwork */}
      <div className="relative z-10 h-64 sm:h-80 w-full overflow-hidden">
        {comfyArtwork ? (
          <>
            <img
              src={comfyArtwork}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover object-center blur-xl scale-110 opacity-45"
            />
            <img
              src={comfyArtwork}
              alt={
                companionMoment
                  ? companionMoment.pose
                  : isBattle && activeHunter
                  ? `${activeHunter.name} — ${tierLabel}`
                  : roomName
              }
              className="relative z-[1] h-full w-full object-contain object-center transition-all duration-700"
            />
          </>
        ) : (
          <img
            src={primaryArtwork}
            alt={
              companionMoment
                ? companionMoment.pose
                : isBattle && activeHunter
                ? `${activeHunter.name} — ${tierLabel}`
                : roomName
            }
            className="h-full w-full object-cover object-center transition-all duration-700"
          />
        )}

        <div className={`absolute inset-0 z-[2] bg-gradient-to-t ${moodTint}`} />
        <div className="absolute inset-0 z-[2] bg-gradient-to-r from-[#0b0c10]/85 via-transparent to-[#0b0c10]/70" />

        <canvas
          ref={canvasRef}
          className="absolute inset-0 z-[3] w-full h-full pointer-events-none"
        />

        {/* Top Header Badges */}
        <div className="absolute top-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex items-center gap-2 rounded-lg bg-[#0b0c10]/80 backdrop-blur-md border border-white/15 px-3 py-1.5 text-xs">
            <DoorOpen className="w-3.5 h-3.5 text-rose-300" />
            <span className="font-display font-medium text-[#f2efe9]">
              {tileExamined ? roomName : `${doorLabel} (Unexamined)`}
            </span>
            <span className="text-[#f2efe9]/45">·</span>
            <span className="font-mono text-[11px] text-rose-200/80">{floorTitle}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {comfyAvailable && (
              <div className="inline-flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleGenerateArtwork}
                  disabled={isGenerating}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-pink-950/85 hover:bg-pink-900 border border-pink-400/50 px-2.5 py-1 text-[11px] font-mono text-pink-100 transition cursor-pointer disabled:opacity-60 shadow-lg shadow-pink-950/40"
                  title={
                    comfyPromptUsed
                      ? `Synced prompt: ${comfyPromptUsed}`
                      : visualPrompt
                      ? `Next prompt: ${visualPrompt}`
                      : "Manifest synced scene via local ComfyUI instance"
                  }
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-3 h-3 text-pink-300 animate-spin" />
                      <span>Painting scene...</span>
                    </>
                  ) : (
                    <>
                      <Palette className="w-3 h-3 text-pink-300" />
                      <span>{comfyArtwork ? "Repaint Scene" : "Manifest Scene"}</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setAutoPaint((v) => !v)}
                  className={`rounded-lg border px-2 py-1 text-[10px] font-mono transition cursor-pointer ${
                    autoPaint
                      ? "bg-emerald-950/85 border-emerald-400/50 text-emerald-200"
                      : "bg-[#0b0c10]/80 border-white/15 text-[#f2efe9]/65 hover:text-[#f2efe9]"
                  }`}
                  title="Automatically paint each turn's synced scene with ComfyUI"
                >
                  Auto {autoPaint ? "ON" : "OFF"}
                </button>
              </div>
            )}
            {comfyError && (
              <span className="rounded-lg bg-red-950/85 border border-red-400/40 px-2 py-1 text-[10px] font-mono text-red-200">
                {comfyError}
              </span>
            )}
            {tierLabel && (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-rose-950/85 border border-rose-400/45 px-2.5 py-1 text-[11px] font-mono text-rose-100">
                <Heart className="w-3 h-3 text-rose-300 fill-rose-400/40" />
                {tierLabel}
              </span>
            )}
            {isDoorway && !tileExamined && !isBattle && (
              <span className="rounded-lg bg-amber-950/80 border border-amber-400/40 px-2.5 py-1 text-[11px] font-mono text-amber-200">
                Press [E] to Examine
              </span>
            )}
          </div>
        </div>

        {/* Bottom Overlay: Protagonist + Hunter / Companion Moment */}
        <div className="absolute bottom-3 left-3 right-3 z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          {/* Scene Caption + Pose */}
          <div className="max-w-xl space-y-1.5">
            {companionMoment ? (
              <div className="inline-flex items-center gap-2 rounded-md bg-pink-950/85 border border-pink-400/45 px-2.5 py-1 text-xs text-pink-100">
                <Sparkles className="w-3.5 h-3.5 text-pink-300" />
                <span>
                  {companionMoment.name} · {companionMoment.pose}
                </span>
              </div>
            ) : (
              isBattle &&
              activeHunter && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-[#0b0c10]/85 border border-rose-400/40 px-2.5 py-1 text-xs text-rose-100">
                    <span className="font-semibold">{activeHunter.name}</span>
                    <span className="text-rose-200/70">· {activeHunter.disposition}</span>
                  </span>
                  {embracePose && (
                    <span className="rounded-md bg-rose-500/25 border border-rose-300/45 px-2.5 py-1 text-[11px] font-mono text-rose-100">
                      {embracePose}
                    </span>
                  )}
                  {rivalHunter && !rivalHunter.charmed && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-950/85 border border-amber-400/45 px-2.5 py-1 text-[11px] font-mono text-amber-200">
                      <Users className="w-3 h-3" />
                      Rival: {rivalHunter.name}
                    </span>
                  )}
                </div>
              )
            )}

            <p className="text-xs sm:text-sm text-[#f2efe9]/90 bg-[#0b0c10]/70 backdrop-blur-sm border border-white/10 rounded-lg px-3 py-2 leading-snug">
              {companionMoment ? companionMoment.caption : sceneCaption}
            </p>
          </div>

          {/* Portrait Chips */}
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <img
              src={PROTAGONIST_PORTRAIT}
              alt="Ket"
              className="w-11 h-11 rounded-lg object-cover border border-white/25 shadow-lg"
            />
            {isBattle && activeHunter && (
              <img
                src={ARCHETYPE_PORTRAITS[activeHunter.archetype]}
                alt={activeHunter.name}
                className="w-11 h-11 rounded-lg object-cover border border-rose-400/60 shadow-lg"
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
