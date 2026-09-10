import { SUPABASE_URL } from "@/lib/supabase/config";

/**
 * Informations légales.
 *
 * Tout ce qui doit être vérifié ou renseigné par une personne est rassemblé ici,
 * plutôt que dispersé dans trois pages. Une valeur encadrée de crochets est un
 * emplacement resté vide : elle s'affiche telle quelle, ce qui rend un oubli
 * visible au lieu de le masquer derrière une valeur plausible mais fausse.
 * `pendingLegalFields()` en dresse la liste.
 *
 * Deux rôles distincts, souvent confondus :
 *   - l'**hébergeur du site**, dont la LCEN impose de publier l'identité et
 *     l'adresse dans les mentions légales ;
 *   - les **sous-traitants** au sens du RGPD, qui relèvent de la politique de
 *     confidentialité : il faut les nommer et dire où les données résident, sans
 *     obligation de publier leur adresse postale.
 */

export interface LegalPublisher {
  /** Nom affiché comme éditeur. */
  name: string;
  /** Statut : détermine les mentions obligatoires. */
  status: "particulier" | "association" | "société";
  /** Adresse de contact, obligatoire dans tous les cas. */
  email: string;
  /** Adresse postale. `null` si elle n'est pas publiée. */
  address: string | null;
  /** Numéro d'immatriculation (SIREN, RNA…), uniquement pour une structure. */
  registration?: string;
  /** Directeur de la publication. */
  publicationDirector: string;
  /**
   * Régime non professionnel de la LCEN (article 6 III 2) : un particulier qui
   * ne tire aucun revenu du site peut ne pas publier son nom ni son adresse, à
   * condition de les avoir communiqués à son hébergeur. Passer à `true` applique
   * ce régime et masque l'identité.
   */
  anonymous: boolean;
}

export const LEGAL = {
  /** Nom du service, tel qu'il apparaît dans les documents. */
  serviceName: "Vocal Training",

  /**
   * Adresse canonique du service, sans barre oblique finale.
   *
   * Sert trois fois : mention dans les documents légaux, base des URL absolues
   * des métadonnées, et adresse de partage. Une seule source évite qu'elles
   * divergent.
   */
  siteUrl: "https://voice-coach-khaki.vercel.app",

  publisher: {
    name: "Bonheur MEYEVI",
    status: "particulier",
    email: "bmeyevi@gmail.com",
    // Non publiée : le service n'a aucune activité commerciale, et l'identité
    // de l'hébergeur suffit à satisfaire la LCEN.
    address: null,
    publicationDirector: "Bonheur MEYEVI",
    anonymous: false,
  } satisfies LegalPublisher,

  /**
   * Hébergeur du site. Adresse relevée dans la politique de confidentialité de
   * Vercel, section « Contact Us » (vercel.com/legal/privacy-policy).
   */
  host: {
    name: "Vercel Inc.",
    address: "440 N Barranca Avenue #4133, Covina, CA 91723, États-Unis",
    site: "https://vercel.com",
  },

  /**
   * Sous-traitant assurant l'authentification et la base de données.
   * Supabase ne publie pas d'adresse postale ; son contact « vie privée » est
   * privacy@supabase.com, et ses transferts sont encadrés par les clauses
   * contractuelles types de la Commission européenne.
   */
  database: {
    name: "Supabase, Inc.",
    site: "https://supabase.com",
    privacy: "https://supabase.com/privacy",
    contact: "privacy@supabase.com",
    /** Région du projet. */
    region: "eu-west-1",
    /** Localisation lisible, telle qu'elle doit apparaître dans les documents. */
    location: "Irlande, Union européenne",
    /** Les données au repos restent-elles dans l'Union ? */
    inEurope: true,
  },

  /**
   * Âge minimal. En France, un mineur peut consentir seul au traitement de ses
   * données à partir de 15 ans ; en dessous, l'accord d'un titulaire de
   * l'autorité parentale est requis.
   */
  minimumAge: 15,

  /** Date de dernière mise à jour des documents, au format ISO. */
  updatedAt: "2026-09-10",
} as const;

/**
 * Point d'accès de la base, tel qu'il est déjà visible dans le navigateur.
 *
 * L'URL est publiée par construction : elle figure dans le code envoyé au
 * client, et la sécurité repose sur les règles d'isolation par ligne, non sur
 * son secret. La mentionner ne révèle donc rien de plus, et permet d'être
 * précis sur l'endroit où les données résident.
 */
export function databaseEndpoint(): string | null {
  if (!SUPABASE_URL) return null;
  try {
    return new URL(SUPABASE_URL).host;
  } catch {
    return null;
  }
}

/** Nom de domaine du service, pour l'afficher sans le protocole. */
export function siteHost(): string {
  try {
    return new URL(LEGAL.siteUrl).host;
  } catch {
    return LEGAL.siteUrl;
  }
}

/** Ce que l'on publie comme identité de l'éditeur. */
export function publisherIdentity(publisher: LegalPublisher = LEGAL.publisher): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];

  if (publisher.anonymous) {
    rows.push({
      label: "Éditeur",
      value:
        "Personne physique éditant ce service à titre non professionnel. Conformément à l'article 6 III 2 de la loi pour la confiance dans l'économie numérique, son nom et son adresse ne sont pas publiés ; ils ont été communiqués à l'hébergeur, qui les tient à la disposition de l'autorité judiciaire.",
    });
    rows.push({ label: "Directeur de la publication", value: "L'éditeur" });
  } else {
    rows.push({ label: "Éditeur", value: publisher.name });
    if (publisher.address) rows.push({ label: "Adresse", value: publisher.address });
    if (publisher.registration) rows.push({ label: "Immatriculation", value: publisher.registration });
    rows.push({ label: "Directeur de la publication", value: publisher.publicationDirector });
  }

  rows.push({ label: "Contact", value: publisher.email });
  return rows;
}

/**
 * Champs encore à remplir.
 *
 * Publier des mentions légales contenant « [Prénom Nom] » est pire que ne rien
 * publier : c'est une information fausse là où la loi en exige une vraie. Cette
 * fonction permet de le vérifier avant une mise en ligne.
 */
export function pendingLegalFields(config: unknown = LEGAL, path: string[] = []): string[] {
  if (typeof config === "string") {
    // Un emplacement est une valeur encadrée de crochets. Test par inclusion
    // plutôt que par expression régulière : rien à échapper, rien à relire.
    const open = config.indexOf("[");
    const isPlaceholder = open !== -1 && config.indexOf("]", open + 1) > open + 1;
    return isPlaceholder ? [path.join(".")] : [];
  }
  if (config && typeof config === "object") {
    return Object.entries(config).flatMap(([key, value]) => pendingLegalFields(value, [...path, key]));
  }
  return [];
}

export function formatLegalDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
