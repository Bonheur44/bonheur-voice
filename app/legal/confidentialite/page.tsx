import type { Metadata } from "next";
import Link from "next/link";
import { LegalArticle, LegalList, LegalSection, LegalTable } from "@/components/legal/Prose";
import { LEGAL } from "@/lib/legal/config";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description: "Quelles données sont traitées, pourquoi, combien de temps, et comment les récupérer ou les effacer.",
};

export default function ConfidentialitePage() {
  return (
    <LegalArticle>
      <h1 className="text-2xl font-semibold tracking-tight text-fg sm:text-3xl">Politique de confidentialité</h1>

      <p className="rounded-xl border border-border bg-surface p-4">
        <strong className="text-fg">En résumé.</strong> {LEGAL.serviceName} conserve votre adresse e-mail, votre progression
        et des mesures chiffrées issues de vos exercices. <strong className="text-fg">Aucun son n&apos;est enregistré ni
        transmis</strong> : le micro est analysé dans votre navigateur, et seuls des nombres en sortent. Il n&apos;y a ni
        publicité, ni mesure d&apos;audience, ni revente de données. Vous pouvez exporter ou supprimer l&apos;ensemble depuis
        l&apos;application, à tout moment.
      </p>

      <LegalSection title="1. Responsable du traitement">
        <p>
          Le responsable du traitement est l&apos;éditeur du service, identifié dans les{" "}
          <Link href="/legal/mentions" className="underline underline-offset-2 hover:text-fg">
            mentions légales
          </Link>
          . Pour toute question ou demande, écrivez à{" "}
          <a href={`mailto:${LEGAL.publisher.email}`} className="underline underline-offset-2 hover:text-fg">
            {LEGAL.publisher.email}
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="2. Le microphone, en détail">
        <p>
          Plusieurs exercices et l&apos;évaluation d&apos;étendue vocale utilisent le microphone. C&apos;est le point le plus
          sensible du service, il mérite d&apos;être exposé précisément.
        </p>
        <LegalList>
          <li>
            L&apos;accès au micro n&apos;est demandé qu&apos;au moment où vous lancez un exercice qui en a besoin, et votre
            navigateur vous demande l&apos;autorisation. Vous pouvez la refuser : les exercices restent réalisables à
            l&apos;oreille.
          </li>
          <li>
            Le signal est analysé <strong className="text-fg">dans la page</strong>, par le navigateur, pour estimer la hauteur
            de la note chantée. Il n&apos;est ni enregistré, ni stocké, ni envoyé à un serveur — ni au nôtre, ni à un tiers.
          </li>
          <li>
            Ce qui est conservé, ce sont uniquement des nombres décrivant une tentative : la note demandée, la hauteur estimée,
            la régularité de la tenue, sa durée, un indice de fiabilité de la détection, et le confort que vous avez déclaré.
          </li>
          <li>
            Ces nombres ne permettent pas de reconstituer un son, ni de reconnaître une voix. Ils ne constituent donc pas une
            donnée biométrique d&apos;identification au sens de l&apos;article 9 du RGPD.
          </li>
          <li>Dès que l&apos;exercice se termine, le flux du micro est coupé et l&apos;indicateur de votre navigateur s&apos;éteint.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="3. Données traitées">
        <LegalTable
          headers={["Catégorie", "Contenu"]}
          rows={[
            {
              label: "Compte",
              value:
                "Adresse e-mail, mot de passe (conservé sous forme chiffrée à sens unique, jamais en clair), dates de création et de dernière connexion. En cas de connexion Google : l'identifiant du compte Google, l'adresse e-mail et le nom associés.",
            },
            {
              label: "Profil",
              value:
                "Nom affiché, pupitre déclaré, ligne travaillée, zone de travail (deux notes), durée de séance préférée, niveau, volume sonore.",
            },
            {
              label: "Progression",
              value:
                "Séances réalisées (date, durée, exercices, ressenti déclaré après chaque exercice), scores par compétence, objectifs obtenus.",
            },
            {
              label: "Observations vocales",
              value:
                "Une ligne par tentative sur une note : note demandée, hauteur estimée, régularité, durée, fiabilité de la détection, confort déclaré, date. Aucun son.",
            },
            {
              label: "Sur votre appareil",
              value:
                "Une copie locale de votre progression, pour que l'application fonctionne hors ligne, et vos préférences de timbre — qui restent sur l'appareil et ne sont jamais envoyées.",
            },
            {
              label: "Techniques",
              value:
                "Les journaux de connexion des hébergeurs (adresse IP, date, page demandée), conservés par ceux-ci à des fins de sécurité et de fonctionnement.",
            },
          ]}
        />
        <p>
          Aucune donnée n&apos;est collectée à votre insu : le service ne mesure pas votre audience, ne suit pas votre
          navigation et ne dépose aucun traceur publicitaire.
        </p>
      </LegalSection>

      <LegalSection title="4. Finalités et bases légales">
        <LegalTable
          headers={["Pourquoi", "Base légale"]}
          rows={[
            {
              label: "Créer et gérer votre compte, vous authentifier",
              value: "Exécution du contrat que constituent les conditions d'utilisation.",
            },
            {
              label: "Enregistrer votre progression et la retrouver sur vos appareils",
              value: "Exécution du contrat.",
            },
            {
              label: "Adapter les exercices et les tonalités à votre voix",
              value: "Exécution du contrat : c'est l'objet même du service.",
            },
            {
              label: "Utiliser le microphone",
              value: "Votre consentement, donné à votre navigateur et révocable à tout moment dans ses réglages.",
            },
            {
              label: "Assurer la sécurité du service et prévenir les abus",
              value: "Intérêt légitime de l'éditeur à maintenir un service fonctionnel.",
            },
          ]}
        />
      </LegalSection>

      <LegalSection title="5. Destinataires">
        <p>
          Vos données ne sont ni vendues, ni louées, ni transmises à des fins commerciales. Seuls interviennent les
          prestataires techniques nécessaires au fonctionnement du service :
        </p>
        <LegalTable
          headers={["Prestataire", "Rôle"]}
          rows={[
            { label: LEGAL.host.name, value: "Hébergement du site et diffusion des pages." },
            {
              label: LEGAL.database.name,
              value: `Authentification et base de données. Projet hébergé en ${LEGAL.database.location} (région ${LEGAL.database.region}).`,
            },
            {
              label: "Google Ireland Ltd.",
              value:
                "Uniquement si vous choisissez la connexion Google. Google est alors informé que vous vous connectez à ce service, et nous transmet votre identifiant, votre adresse e-mail et votre nom. La connexion par mot de passe n'implique jamais Google.",
            },
          ]}
        />
        <p>
          L&apos;éditeur, en tant que personne physique, a techniquement accès à la base de données. Il n&apos;y consulte les
          données individuelles qu&apos;en cas de nécessité — une demande de votre part, ou un incident technique.
        </p>
      </LegalSection>

      <LegalSection title="6. Transferts hors de l'Union européenne">
        {LEGAL.database.inEurope ? (
          <p>
            Vos comptes et votre progression sont stockés en {LEGAL.database.location} (région {LEGAL.database.region}) : les
            données au repos ne quittent pas l&apos;Union européenne.
          </p>
        ) : (
          <p>
            La base de données est hébergée hors de l&apos;Union européenne (région {LEGAL.database.region}). Si vous préférez
            que vos données restent dans l&apos;Union, signalez-le : le projet peut être déplacé vers une région européenne.
          </p>
        )}
        <p>
          Les deux prestataires étant des sociétés de droit américain, certaines opérations d&apos;administration ou de support
          peuvent impliquer un accès depuis les États-Unis. Ces transferts sont encadrés par les clauses contractuelles types
          approuvées par la Commission européenne, ainsi que le prévoient leurs politiques de confidentialité respectives.
        </p>
      </LegalSection>

      <LegalSection title="7. Durées de conservation">
        <LegalTable
          headers={["Donnée", "Durée"]}
          rows={[
            {
              label: "Compte, profil, progression, objectifs",
              value: "Jusqu'à la suppression du compte. La suppression est immédiate et définitive.",
            },
            {
              label: "Observations vocales",
              value:
                "Jusqu'à la suppression du compte. L'application n'exploite que les quatre cents plus récentes et ignore celles de plus de douze mois, afin que le profil reflète votre voix d'aujourd'hui.",
            },
            {
              label: "Copie locale sur votre appareil",
              value:
                "Jusqu'à votre déconnexion suivie d'un effacement des données du site dans votre navigateur, ou jusqu'à la suppression du compte.",
            },
            { label: "Journaux techniques des hébergeurs", value: "Selon les politiques de ces prestataires, quelques semaines en général." },
          ]}
        />
        <p>
          Un compte resté inutilisé pendant trois ans peut être supprimé, après un message d&apos;avertissement envoyé à
          l&apos;adresse associée.
        </p>
      </LegalSection>

      <LegalSection title="8. Cookies">
        <p>
          Le service dépose uniquement les cookies nécessaires à votre session : ils permettent de vous garder connecté
          d&apos;une page à l&apos;autre. Ils sont strictement nécessaires au fonctionnement du service demandé et sont donc
          dispensés de consentement préalable — c&apos;est la raison pour laquelle aucun bandeau ne vous est présenté.
        </p>
        <LegalList>
          <li>Aucun cookie de mesure d&apos;audience.</li>
          <li>Aucun cookie publicitaire ou de réseau social.</li>
          <li>Aucun partage avec un tiers à des fins de suivi.</li>
        </LegalList>
        <p>
          L&apos;application utilise par ailleurs le stockage local de votre navigateur pour conserver une copie de votre
          progression et vos préférences de son. Ce stockage ne quitte pas votre appareil ; il disparaît si vous effacez les
          données du site.
        </p>
      </LegalSection>

      <LegalSection title="9. Estimation du profil vocal">
        <p>
          Le service calcule une estimation de votre profil vocal à partir de vos observations. Trois précisions, parce que
          l&apos;automatisation d&apos;un jugement mérite d&apos;être bornée :
        </p>
        <LegalList>
          <li>
            Cette estimation n&apos;a aucun effet juridique et ne conditionne l&apos;accès à rien. Elle ajuste des tonalités
            d&apos;exercice, rien de plus.
          </li>
          <li>
            Elle est présentée comme une indication assortie d&apos;un degré de confiance, jamais comme un verdict. Elle peut
            annoncer qu&apos;elle ne sait pas.
          </li>
          <li>Vous pouvez la refaire, l&apos;ignorer, ou régler vous-même votre zone de travail dans les réglages.</li>
        </LegalList>
        <p>
          Il ne s&apos;agit donc pas d&apos;une décision automatisée au sens de l&apos;article 22 du RGPD. Le service
          n&apos;est en aucun cas un dispositif médical et ne pose aucun diagnostic.
        </p>
      </LegalSection>

      <LegalSection title="10. Vos droits">
        <p>
          Vous disposez d&apos;un droit d&apos;accès, de rectification, d&apos;effacement, de limitation, d&apos;opposition et
          de portabilité. Deux de ces droits s&apos;exercent directement dans l&apos;application, sans passer par nous :
        </p>
        <LegalList>
          <li>
            <strong className="text-fg">Portabilité et accès</strong> — le bouton d&apos;export, dans les réglages, télécharge
            l&apos;intégralité de vos données dans un fichier lisible et réutilisable.
          </li>
          <li>
            <strong className="text-fg">Effacement</strong> — la suppression du compte, dans la page « Mon compte », efface
            immédiatement et définitivement le compte et toutes les données associées.
          </li>
          <li>
            <strong className="text-fg">Rectification</strong> — le nom affiché, le pupitre, la zone de travail et le niveau se
            modifient dans les réglages.
          </li>
        </LegalList>
        <p>
          Pour les autres droits, ou si l&apos;un de ces boutons ne fonctionne pas, écrivez à{" "}
          <a href={`mailto:${LEGAL.publisher.email}`} className="underline underline-offset-2 hover:text-fg">
            {LEGAL.publisher.email}
          </a>
          . Une réponse vous parviendra dans un délai d&apos;un mois.
        </p>
        <p>
          Si la réponse ne vous satisfait pas, vous pouvez introduire une réclamation auprès de la Commission nationale de
          l&apos;informatique et des libertés,{" "}
          <a href="https://www.cnil.fr/fr/plaintes" className="underline underline-offset-2 hover:text-fg" rel="noreferrer noopener" target="_blank">
            cnil.fr
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="11. Sécurité">
        <p>
          Les échanges sont chiffrés de bout en bout par HTTPS. Les mots de passe ne sont jamais stockés en clair. La base de
          données applique une isolation par ligne : techniquement, une requête effectuée avec votre session ne peut lire que
          vos propres enregistrements, et jamais ceux d&apos;un autre choriste.
        </p>
        <p>
          Aucun service n&apos;est à l&apos;abri d&apos;un incident. En cas de violation de données susceptible d&apos;engendrer
          un risque pour vos droits, la CNIL sera notifiée dans les 72 heures et vous serez informé sans délai.
        </p>
      </LegalSection>

      <LegalSection title="12. Mineurs">
        <p>
          Le service est ouvert à partir de {LEGAL.minimumAge} ans. En dessous, la création d&apos;un compte suppose
          l&apos;accord d&apos;un titulaire de l&apos;autorité parentale, qui peut à tout moment demander l&apos;accès aux
          données ou leur suppression à l&apos;adresse de contact.
        </p>
      </LegalSection>

      <LegalSection title="13. Modification de cette politique">
        <p>
          Ce document peut évoluer si le service change. En cas de modification substantielle — une nouvelle catégorie de
          données, un nouveau destinataire —, les personnes disposant d&apos;un compte en sont informées par courriel avant
          l&apos;entrée en vigueur.
        </p>
      </LegalSection>
    </LegalArticle>
  );
}
