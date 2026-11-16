import React, { useEffect, useRef } from "react";
import { Heart, Sparkles, DoorOpen, Users } from "lucide-react";
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

  return (
    <section className="relative rounded-xl overflow-hidden border border-white/10 bg-[#12131a] shadow-2xl">
      {/* Main Scene Backdrop / Tiered Battle Artwork */}
      <div className="relative h-64 sm:h-80 w-full overflow-hidden">
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

        <div className={`absolute inset-0 bg-gradient-to-t ${moodTint}`} />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0b0c10]/85 via-transparent to-[#0b0c10]/70" />

        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />

        {/* Top Header Badges */}
        <div className="absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex items-center gap-2 rounded-lg bg-[#0b0c10]/80 backdrop-blur-md border border-white/15 px-3 py-1.5 text-xs">
            <DoorOpen className="w-3.5 h-3.5 text-rose-300" />
            <span className="font-display font-medium text-[#f2efe9]">
              {tileExamined ? roomName : `${doorLabel} (Unexamined)`}
            </span>
            <span className="text-[#f2efe9]/45">·</span>
            <span className="font-mono text-[11px] text-rose-200/80">{floorTitle}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
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
        <div className="absolute bottom-3 left-3 right-3 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
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
