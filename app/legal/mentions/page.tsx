import type { Metadata } from "next";
import Link from "next/link";
import { LegalArticle, LegalList, LegalSection, LegalTable } from "@/components/legal/Prose";
import { LEGAL, databaseEndpoint, publisherIdentity, siteHost } from "@/lib/legal/config";

export const metadata: Metadata = {
  title: "Mentions légales",
  description: "Éditeur, directeur de la publication et hébergeurs du service Vocal Training.",
};

export default function MentionsPage() {
  const endpoint = databaseEndpoint();

  return (
    <LegalArticle>
      <h1 className="text-2xl font-semibold tracking-tight text-fg sm:text-3xl">Mentions légales</h1>

      <LegalSection title="Éditeur du service">
        <LegalTable
          rows={[
            {
              label: "Service",
              value: (
                <a href={LEGAL.siteUrl} className="underline underline-offset-2 hover:text-fg">
                  {siteHost()}
                </a>
              ),
            },
            ...publisherIdentity(),
          ]}
        />
        <p>
          {LEGAL.serviceName} est un projet personnel, sans activité commerciale : le service ne vend rien, ne diffuse aucune
          publicité et ne monétise aucune donnée.
        </p>
      </LegalSection>

      <LegalSection title="Hébergement du site">
        <LegalTable
          rows={[
            { label: "Hébergeur", value: LEGAL.host.name },
            { label: "Adresse", value: LEGAL.host.address },
            {
              label: "Site",
              value: (
                <a href={LEGAL.host.site} className="underline underline-offset-2 hover:text-fg" rel="noreferrer noopener" target="_blank">
                  {LEGAL.host.site}
                </a>
              ),
            },
          ]}
        />
      </LegalSection>

      <LegalSection title="Hébergement des comptes et de la base de données">
        <p>
          L&apos;authentification et les données de progression sont confiées à un prestataire distinct de l&apos;hébergeur du
          site. Les données au repos sont stockées en {LEGAL.database.location}.
        </p>
        <LegalTable
          rows={[
            { label: "Prestataire", value: LEGAL.database.name },
            { label: "Région du serveur", value: `${LEGAL.database.region} — ${LEGAL.database.location}` },
            ...(endpoint ? [{ label: "Point d'accès", value: endpoint }] : []),
            {
              label: "Contact vie privée",
              value: (
                <a href={`mailto:${LEGAL.database.contact}`} className="underline underline-offset-2 hover:text-fg">
                  {LEGAL.database.contact}
                </a>
              ),
            },
            {
              label: "Site",
              value: (
                <a href={LEGAL.database.site} className="underline underline-offset-2 hover:text-fg" rel="noreferrer noopener" target="_blank">
                  {LEGAL.database.site}
                </a>
              ),
            },
          ]}
        />
        <p>
          Le détail des traitements figure dans la{" "}
          <Link href="/legal/confidentialite" className="underline underline-offset-2 hover:text-fg">
            politique de confidentialité
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="Propriété intellectuelle">
        <p>
          Le code, les textes pédagogiques, les exercices, les pièces musicales de démonstration et l&apos;identité visuelle du
          service sont la propriété de l&apos;éditeur, sauf mention contraire. Ils ne peuvent être reproduits ou réutilisés sans
          autorisation préalable.
        </p>
        <p>
          Le service s&apos;appuie sur des bibliothèques libres, distribuées sous leurs licences respectives, et ne revendique
          aucun droit sur celles-ci.
        </p>
        <p>
          Les enregistrements sonores sont absents du service : toutes les voix et tous les instruments entendus sont produits
          par synthèse dans le navigateur, à partir de code écrit pour ce projet.
        </p>
      </LegalSection>

      <LegalSection title="Signalement et contact">
        <p>
          Pour toute question relative au service, à ses contenus ou à vos données, écrivez à{" "}
          <a href={`mailto:${LEGAL.publisher.email}`} className="underline underline-offset-2 hover:text-fg">
            {LEGAL.publisher.email}
          </a>
          .
        </p>
        <LegalList>
          <li>Une demande relative aux données personnelles reçoit une réponse dans un délai d&apos;un mois.</li>
          <li>Un contenu jugé illicite peut être signalé à cette même adresse, et sera retiré s&apos;il l&apos;est effectivement.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="Droit applicable">
        <p>
          Le présent service est soumis au droit français. À défaut de résolution amiable, les tribunaux français sont
          compétents.
        </p>
      </LegalSection>
    </LegalArticle>
  );
}
