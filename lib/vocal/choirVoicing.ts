import type { ChoirVoicing } from "@/lib/types";
import { CHOIR_LINES, CHOIR_LINE_IDS, choirRoles } from "./voiceParts";
import type { ChoirLine } from "./types";

/** Volume de chaque ligne, 0 = muette, 1 = pleine. */
export type LineVolumes = Record<ChoirLine, number>;

const OTHERS_VOLUME = 0.8;

/**
 * Traduit un rôle en volumes concrets, selon la ligne travaillée.
 *
 * C'est ici que « ma ligne face à la voix qui attire l'oreille » devient
 * « ténor à 100 %, soprano à 80 % » ou « basse à 100 %, soprano à 80 % ».
 * L'exercice reste le même ; seule la distribution change.
 */
export function voicingToVolumes(line: ChoirLine, voicing: ChoirVoicing, myVolume = 1): LineVolumes {
  const { attractor, support } = choirRoles(line);
  const volumes = { S: 0, A: 0, T: 0, B: 0 } as LineVolumes;
  volumes[line] = myVolume;

  const enable = (other: ChoirLine) => {
    if (other !== line) volumes[other] = OTHERS_VOLUME;
  };

  switch (voicing) {
    case "none":
      break;
    case "support":
      enable(support);
      break;
    case "attractor":
      enable(attractor);
      break;
    case "except-attractor":
      for (const other of CHOIR_LINE_IDS) if (other !== attractor) enable(other);
      break;
    case "all":
      for (const other of CHOIR_LINE_IDS) enable(other);
      break;
  }

  return volumes;
}

/** Étapes d'indépendance, formulées avec le nom de la ligne travaillée. */
export function independenceSteps(line: ChoirLine): Array<{ title: string; hint: string; volumes: LineVolumes }> {
  const me = CHOIR_LINES[line].label.toLowerCase();
  const { attractor, support } = choirRoles(line);
  const attractorName = CHOIR_LINES[attractor].label.toLowerCase();
  const supportName = CHOIR_LINES[support].label.toLowerCase();

  return [
    {
      title: "1. Écoute ta ligne",
      hint: `${CHOIR_LINES[line].label} seul. Écoute, puis chante avec.`,
      volumes: voicingToVolumes(line, "none", 1),
    },
    {
      title: "2. Ajoute un appui",
      hint: `Ta ligne à 100 %, ${supportName} en dessous : la voix la plus facile à combiner avec la tienne.`,
      volumes: voicingToVolumes(line, "support", 1),
    },
    {
      title: "3. Face à la voix qui attire",
      hint: `${capitalize(attractorName)} entre. C'est elle qui « aspire » l'oreille : laisse-la passer sans la suivre.`,
      volumes: voicingToVolumes(line, "attractor", 0.5),
    },
    {
      title: "4. Toutes les voix",
      hint: `Le chœur complet, ta ligne encore présente.`,
      volumes: voicingToVolumes(line, "all", 0.8),
    },
    {
      title: "5. Tiens ta ligne seul",
      hint: `${CHOIR_LINES[line].label} à 0 %. Les autres chantent, c'est toi qui portes la ligne de ${me}.`,
      volumes: voicingToVolumes(line, "all", 0),
    },
  ];
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
