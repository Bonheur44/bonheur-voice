export const TOOLS = [
  { id: "piano", name: "Piano", emoji: "🎹", description: "Retrouver une note, vérifier ta zone confortable, prendre le ton avant de chanter." },
  { id: "tuner", name: "Accordeur vocal", emoji: "🎯", description: "Chante : le micro affiche la note la plus proche et l'écart approximatif." },
  { id: "metronome", name: "Métronome", emoji: "⏱️", description: "Pulsation stable pour la respiration comptée et les exercices rythmiques." },
  { id: "scales", name: "Gammes et tonalités", emoji: "🎼", description: "Gammes, arpèges, sirènes dans toutes les tonalités, bornées à ta zone." },
  { id: "choir", name: "Mode chorale", emoji: "🎭", description: "Ta ligne de ténor face aux autres voix, avec mixage par pupitre." },
  { id: "melody", name: "Ligne de ténor", emoji: "🧠", description: "Apprends la ligne du choral note par note, phrase par phrase." },
] as const;

export type ToolId = (typeof TOOLS)[number]["id"];
