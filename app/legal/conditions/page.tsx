import type { Metadata } from "next";
import Link from "next/link";
import { LegalArticle, LegalList, LegalSection } from "@/components/legal/Prose";
import { LEGAL } from "@/lib/legal/config";

export const metadata: Metadata = {
  title: "Conditions d'utilisation",
  description: "Ce que le service propose, ce qu'il ne prétend pas être, et les règles d'usage.",
};

export default function ConditionsPage() {
  return (
    <LegalArticle>
      <h1 className="text-2xl font-semibold tracking-tight text-fg sm:text-3xl">Conditions générales d&apos;utilisation</h1>

      <div className="rounded-xl border border-warning/40 bg-warning/10 p-4">
        <p>
          <strong className="text-fg">À lire avant toute chose.</strong> {LEGAL.serviceName} est un outil
          d&apos;entraînement, pas un professeur de chant et encore moins un professionnel de santé. Il ne pose aucun
          diagnostic. En cas de douleur, d&apos;enrouement persistant, de raclement ou de fatigue vocale inhabituelle,
          arrêtez et consultez.
        </p>
      </div>

      <LegalSection title="1. Objet">
        <p>
          Les présentes conditions régissent l&apos;utilisation de {LEGAL.serviceName}, un service en ligne proposant des
          séances vocales quotidiennes destinées aux choristes. Créer un compte vaut acceptation de ces conditions.
        </p>
      </LegalSection>

      <LegalSection title="2. Description du service">
        <p>Le service propose :</p>
        <LegalList>
          <li>des séances générées selon votre niveau, le temps dont vous disposez et vos retours ;</li>
          <li>une bibliothèque d&apos;exercices commentés, avec des outils sonores produits par synthèse ;</li>
          <li>une évaluation de la voix estimant les zones accessibles, fiables et confortables ;</li>
          <li>un suivi de progression, synchronisé entre vos appareils.</li>
        </LegalList>
        <p>
          Le service fonctionne dans un navigateur récent. Certaines fonctions demandent un microphone ; elles restent
          facultatives, et les exercices correspondants sont réalisables à l&apos;oreille.
        </p>
      </LegalSection>

      <LegalSection title="3. Ce que le service n'est pas">
        <p>Ces limites sont constitutives du service, et non des réserves de style.</p>
        <LegalList>
          <li>
            <strong className="text-fg">Ce n&apos;est pas un dispositif médical.</strong> Aucun diagnostic, aucun avis
            thérapeutique, aucune rééducation vocale. Un trouble de la voix relève d&apos;un médecin ou d&apos;un
            orthophoniste.
          </li>
          <li>
            <strong className="text-fg">Ce n&apos;est pas un instrument de mesure.</strong> L&apos;estimation de hauteur par le
            microphone est un repère approximatif : elle suppose une voix seule et tenue dans une pièce calme, se trompe
            parfois d&apos;octave, et devient inutilisable sur les consonnes ou dans le bruit. Elle est présentée comme telle
            dans l&apos;interface.
          </li>
          <li>
            <strong className="text-fg">Ce n&apos;est pas un verdict sur votre pupitre.</strong> Le profil vocal estimé
            s&apos;appuie sur des hauteurs chantées. Le placement dans un chœur dépend aussi du timbre, de
            l&apos;endurance et des besoins de l&apos;ensemble, que le service ne mesure pas. Seuls un chef de chœur ou un
            professeur de chant peuvent trancher.
          </li>
          <li>
            <strong className="text-fg">Ce n&apos;est pas un professeur.</strong> Les commentaires pédagogiques sont des
            repères généraux. Ils ne remplacent pas le retour d&apos;une oreille humaine sur votre voix.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title="4. Sécurité vocale">
        <p>
          Aucun exercice ne doit être forcé. Le service ne propose jamais d&apos;atteindre une note extrême, ne compare
          personne à personne, et interrompt immédiatement l&apos;exploration dès qu&apos;une gêne est signalée.
        </p>
        <LegalList>
          <li>Chantez à volume doux ou moyen, jamais en poussant.</li>
          <li>Arrêtez à la moindre douleur, au moindre raclement, à la moindre sensation de forçage.</li>
          <li>Échauffez-vous avant les exercices d&apos;étendue, et ne les enchaînez pas plusieurs fois par jour.</li>
          <li>
            Le bouton « Je suis inconfortable » est là pour être utilisé : il n&apos;est pénalisé nulle part et n&apos;abîme
            aucun résultat.
          </li>
        </LegalList>
        <p>
          Vous restez seul juge de ce que votre voix peut faire. L&apos;éditeur ne saurait être tenu responsable des
          conséquences d&apos;un usage contraire à ces recommandations.
        </p>
      </LegalSection>

      <LegalSection title="5. Compte">
        <p>
          L&apos;accès requiert un compte, créé par mot de passe ou par connexion Google. Vous êtes responsable de la
          confidentialité de vos identifiants et des actions effectuées depuis votre compte.
        </p>
        <LegalList>
          <li>Un compte est personnel. Il n&apos;est pas destiné à être partagé entre plusieurs choristes.</li>
          <li>Les informations fournies à l&apos;inscription doivent être exactes, en particulier l&apos;adresse e-mail.</li>
          <li>
            Le service est ouvert à partir de {LEGAL.minimumAge} ans ; en dessous, l&apos;accord d&apos;un titulaire de
            l&apos;autorité parentale est requis.
          </li>
          <li>Vous pouvez supprimer votre compte à tout moment depuis la page « Mon compte ». L&apos;effacement est définitif.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="6. Usage acceptable">
        <p>En utilisant le service, vous vous engagez à ne pas :</p>
        <LegalList>
          <li>tenter d&apos;accéder aux données d&apos;un autre utilisateur, ni de contourner les contrôles d&apos;accès ;</li>
          <li>perturber le fonctionnement du service, notamment par un volume de requêtes anormal ;</li>
          <li>extraire ou réutiliser les contenus pédagogiques en dehors d&apos;un usage personnel ;</li>
          <li>utiliser le service à des fins illicites.</li>
        </LegalList>
        <p>Un manquement peut entraîner la suspension ou la fermeture du compte, après avertissement lorsque c&apos;est possible.</p>
      </LegalSection>

      <LegalSection title="7. Disponibilité">
        <p>
          Le service est fourni en l&apos;état, sans garantie de disponibilité continue. Il s&apos;agit d&apos;un projet
          personnel, gratuit, susceptible d&apos;être interrompu, modifié ou arrêté.
        </p>
        <p>
          En cas d&apos;arrêt définitif, un préavis d&apos;au moins trente jours sera adressé par courriel aux comptes actifs,
          afin que chacun puisse exporter ses données depuis les réglages.
        </p>
        <p>
          La progression étant conservée localement sur votre appareil, l&apos;application reste utilisable hors ligne. Une
          interruption du service n&apos;entraîne donc pas de perte immédiate de vos données.
        </p>
      </LegalSection>

      <LegalSection title="8. Responsabilité">
        <p>
          L&apos;éditeur met en œuvre les moyens raisonnables pour que le service fonctionne et que les données soient
          protégées. Sa responsabilité ne saurait être engagée en cas :
        </p>
        <LegalList>
          <li>d&apos;interruption, de lenteur ou de perte de données imputable à un prestataire technique ou au réseau ;</li>
          <li>d&apos;usage du service contraire aux présentes conditions ou aux recommandations de sécurité vocale ;</li>
          <li>de dommage indirect, tel qu&apos;une perte de temps ou une contre-performance en répétition.</li>
        </LegalList>
        <p>
          Ces limitations ne s&apos;appliquent pas en cas de faute lourde ou intentionnelle, ni dans les cas où la loi les
          écarte.
        </p>
      </LegalSection>

      <LegalSection title="9. Données personnelles">
        <p>
          Le traitement de vos données est décrit dans la{" "}
          <Link href="/legal/confidentialite" className="underline underline-offset-2 hover:text-fg">
            politique de confidentialité
          </Link>
          , qui fait partie intégrante des présentes conditions. En particulier : aucun son n&apos;est enregistré ni transmis,
          et vous pouvez exporter ou supprimer vos données depuis l&apos;application.
        </p>
      </LegalSection>

      <LegalSection title="10. Modification des conditions">
        <p>
          Ces conditions peuvent être modifiées. Toute modification substantielle est annoncée par courriel aux comptes actifs
          avant son entrée en vigueur. Poursuivre l&apos;utilisation du service après cette date vaut acceptation ; à défaut,
          vous pouvez supprimer votre compte après avoir exporté vos données.
        </p>
      </LegalSection>

      <LegalSection title="11. Droit applicable">
        <p>
          Les présentes conditions sont soumises au droit français. En cas de différend, une solution amiable sera recherchée
          en priorité, à l&apos;adresse{" "}
          <a href={`mailto:${LEGAL.publisher.email}`} className="underline underline-offset-2 hover:text-fg">
            {LEGAL.publisher.email}
          </a>
          . À défaut, les tribunaux français sont compétents.
        </p>
      </LegalSection>
    </LegalArticle>
  );
}
