import type { ArchetypeId, SceneBackdrop } from "../types/game";

export const TITLE_KEY_ART = "/src/assets/images/title_euphoric_void_1794781615940.jpg";

export const PROTAGONIST_PORTRAIT =
  "/src/assets/images/portrait_ket_traveler_1794781615171.jpg";

export const ARCHETYPE_PORTRAITS: Record<ArchetypeId, string> = {
  arachne: "/src/assets/images/void_arachne_siren_1794781937204.jpg",
  lamia: "/src/assets/images/void_lamia_warden_1794781938240.jpg",
  succubus: "/src/assets/images/void_succubus_queen_1794781939183.jpg",
  moth: "/src/assets/images/void_moth_whisperer_1794781940501.jpg",
  alraune: "/src/assets/images/void_alraune_sovereign_1794781940449.jpg",
  slime: "/src/assets/images/void_slime_spirit_1794781941274.jpg",
  fungal: "/src/assets/images/void_fungal_dryad_1794781940398.jpg",
};

export const ARCHETYPE_BATTLE_SCENES: Record<ArchetypeId, string> = {
  arachne: "/src/assets/images/battle_arachne_attack_1794832986785.jpg",
  lamia: "/src/assets/images/battle_lamia_attack_1794832986025.jpg",
  succubus: "/src/assets/images/battle_succubus_attack_1794832986558.jpg",
  moth: "/src/assets/images/battle_moth_attack_1794832983705.jpg",
  alraune: "/src/assets/images/battle_alraune_attack_1794832987519.jpg",
  slime: "/src/assets/images/battle_slime_attack_1794832990403.jpg",
  fungal: "/src/assets/images/battle_fungal_attack_1794832988719.jpg",
};

export const ARCHETYPE_CLOSE_SCENES: Record<ArchetypeId, string> = {
  arachne: "/src/assets/images/close_arachne_embrace_1794833373537.jpg",
  lamia: "/src/assets/images/close_lamia_embrace_1794833377912.jpg",
  succubus: "/src/assets/images/close_succubus_embrace_1794833377739.jpg",
  moth: "/src/assets/images/close_moth_embrace_1794833373128.jpg",
  alraune: "/src/assets/images/close_alraune_embrace_1794833378385.jpg",
  slime: "/src/assets/images/close_slime_embrace_1794833379970.jpg",
  fungal: "/src/assets/images/close_fungal_embrace_1794833381921.jpg",
};

export const ARCHETYPE_DEEP_SCENES: Record<ArchetypeId, string> = {
  arachne: "/src/assets/images/deep_arachne_thrall_1794833379018.jpg",
  lamia: "/src/assets/images/deep_lamia_thrall_1794833381458.jpg",
  succubus: "/src/assets/images/deep_succubus_thrall_1794833380498.jpg",
  moth: "/src/assets/images/deep_moth_thrall_1794833381703.jpg",
  alraune: "/src/assets/images/deep_alraune_thrall_1794833382250.jpg",
  slime: "/src/assets/images/deep_slime_thrall_1794833383758.jpg",
  fungal: "/src/assets/images/deep_fungal_thrall_1794833384100.jpg",
};

export const ARCHETYPE_KISS_SCENES: Record<ArchetypeId, string> = {
  arachne: "/src/assets/images/kiss_arachne_velvet_1794833703074.jpg",
  lamia: "/src/assets/images/kiss_lamia_throne_1794833701444.jpg",
  succubus: "/src/assets/images/kiss_succubus_embrace_1794833701000.jpg",
  moth: "/src/assets/images/kiss_moth_winged_1794833699507.jpg",
  alraune: "/src/assets/images/kiss_alraune_petal_1794833702412.jpg",
  slime: "/src/assets/images/kiss_slime_liquid_1794833706284.jpg",
  fungal: "/src/assets/images/kiss_fungal_forehead_1794833705053.jpg",
};

export const SCENE_BACKDROPS: Record<SceneBackdrop, string> = {
  bedroom: "/src/assets/images/scene_velvet_bedroom_1794782204852.jpg",
  corridor: "/src/assets/images/scene_mist_corridor_1794782207391.jpg",
  conservatory: "/src/assets/images/scene_overgrown_conservatory_1794782207026.jpg",
  sanctuary: "/src/assets/images/scene_sanctuary_shrine_1794782207013.jpg",
};

export interface ArchetypeCatalogEntry {
  id: ArchetypeId;
  label: string;
  species: string;
  signatureKiss: string;
  traitNote: string;
}

export const ARCHETYPE_CATALOG: ArchetypeCatalogEntry[] = [
  {
    id: "arachne",
    label: "Twilight Arachne",
    species: "Arachne Weaver",
    signatureKiss: "Velvet Recline Kiss",
    traitNote: "Silver gossamer threads & cushioned silk hammocks",
  },
  {
    id: "lamia",
    label: "Serpent Lamia",
    species: "Obsidian Lamia",
    signatureKiss: "Throne Kiss",
    traitNote: "Iridescent coils & mesmerizing gaze",
  },
  {
    id: "succubus",
    label: "Velvet Succubus",
    species: "Dream Succubus",
    signatureKiss: "Full-Body Kiss",
    traitNote: "Folded dark wings & warm rose embers",
  },
  {
    id: "moth",
    label: "Luna Mothkin",
    species: "Luminous Mothkin",
    signatureKiss: "Winged Kiss",
    traitNote: "Pale-green glowing wings & swirling lantern dust",
  },
  {
    id: "alraune",
    label: "Rose Alraune",
    species: "Crimson Alraune",
    signatureKiss: "Petal Kiss",
    traitNote: "Blooming crimson vines & intoxicating petals",
  },
  {
    id: "slime",
    label: "Lavender Slime",
    species: "Crystal Slime Spirit",
    signatureKiss: "Liquid Kiss",
    traitNote: "Translucent lavender tendrils & fluid cushion holds",
  },
  {
    id: "fungal",
    label: "Fungal Dryad",
    species: "Twilight Mycelial Dryad",
    signatureKiss: "Forehead Kiss",
    traitNote: "Bioluminescent spore canopy & protective cloak",
  },
];

export function computeBattleTier(params: {
  embracePose: string;
  intimacyContact: "none" | "soft" | "deep";
  entityStance: string;
  intoxication: number;
  selfhood: number;
  tether: number;
  affinity: number;
  disposition: string;
}): "confrontation" | "close" | "deep" | "kiss" {
  const {
    embracePose,
    intimacyContact,
    entityStance,
    intoxication,
    selfhood,
    tether,
    affinity,
    disposition,
  } = params;

  const isKissPose = /\bkiss\b/i.test(embracePose);
  const deepPoseMatch = /(recline|cocoon|nest|lock|lap|cradle|throne|sleeping)/i.test(
    embracePose
  );

  if (
    isKissPose ||
    (intimacyContact === "deep" &&
      (intoxication >= 85 || selfhood <= 30 || affinity >= 50)) ||
    (intoxication >= 92 && affinity >= 35) ||
    (disposition === "Charmed" && affinity >= 45)
  ) {
    return "kiss";
  }
  if (
    intimacyContact === "deep" ||
    intoxication >= 75 ||
    selfhood <= 40 ||
    tether <= 25 ||
    affinity >= 40 ||
    (deepPoseMatch && (intoxication >= 55 || affinity >= 25))
  ) {
    return "deep";
  }
  if (
    intimacyContact === "soft" ||
    entityStance === "embrace" ||
    Boolean(embracePose) ||
    intoxication >= 40 ||
    selfhood <= 70 ||
    tether <= 60 ||
    affinity >= 15 ||
    disposition === "Charmed"
  ) {
    return "close";
  }
  return "confrontation";
}
