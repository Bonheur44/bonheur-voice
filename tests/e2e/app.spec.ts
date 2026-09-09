import { expect, test, type Page } from "@playwright/test";

/** Collecte les erreurs console et les exceptions de page. */
function watchConsole(page: Page) {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  return errors;
}

const EMAIL = process.env.E2E_EMAIL ?? "";
const PASSWORD = process.env.E2E_PASSWORD ?? "";

/**
 * La suite a besoin d'un compte de test réel sur le projet Supabase, car les
 * pages sont désormais protégées. Sans identifiants, elle est ignorée plutôt
 * que de produire des échecs trompeurs.
 */
test.skip(!EMAIL || !PASSWORD, "Renseigne E2E_EMAIL et E2E_PASSWORD dans .env.local pour exécuter cette suite.");

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Adresse e-mail").fill(EMAIL);
  await page.getByLabel("Mot de passe").fill(PASSWORD);
  await page.getByRole("button", { name: "Se connecter", exact: true }).click();
  await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 20_000 });
}

/** Remet le compte de test à zéro pour que chaque scénario parte du même état. */
async function resetAccount(page: Page) {
  await page.goto("/settings");
  const reset = page.getByRole("button", { name: "Réinitialiser", exact: true });
  if (await reset.count()) {
    await reset.click();
    await page.getByRole("button", { name: "Confirmer la réinitialisation" }).click();
    await expect(page.getByText(/Données réinitialisées/)).toBeVisible();
  }
}

async function completeOnboarding(page: Page) {
  await signIn(page);
  await resetAccount(page);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/onboarding/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("coach vocal");
  await page.getByRole("button", { name: "Continuer →" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("zone confortable");
  // choisir une note basse et une note haute au piano
  await page.getByRole("button", { name: "Ré3", exact: true }).dispatchEvent("pointerdown");
  await page.getByRole("tab", { name: /Haute/ }).click();
  await page.getByRole("button", { name: "La4", exact: true }).dispatchEvent("pointerdown");
  await expect(page.getByText("Zone : Ré3 → La4")).toBeVisible();
  await page.getByRole("button", { name: "Continuer →" }).click();
  await page.getByRole("tab", { name: "15 min" }).click();
  await page.getByRole("button", { name: /C'est parti/ }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test.describe("Vocal Training — Tenor", () => {
  test("onboarding → dashboard → séance complète → progression → historique", async ({ page }) => {
    const errors = watchConsole(page);
    await completeOnboarding(page);

    // Dashboard
    await expect(page.getByRole("heading", { level: 2, name: /15 min/ })).toBeVisible();
    await expect(page.getByText("Mes compétences")).toBeVisible();
    await expect(page.getByText("Respiration", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Première séance").first()).toBeVisible();

    // Séance : durée configurable + variante
    await page.getByRole("link", { name: "Ajuster la durée" }).click();
    await expect(page).toHaveURL(/\/routine$/);
    await page.getByRole("tab", { name: "10 min" }).click();
    await expect(page.getByRole("heading", { name: /Programme · \d+ exercices/ })).toBeVisible();
    const firstPlan = await page.locator("ol li").allTextContents();
    await page.getByRole("button", { name: /Autre variante/ }).click();
    const secondPlan = await page.locator("ol li").allTextContents();
    expect(secondPlan.length).toBeGreaterThanOrEqual(3);
    expect(firstPlan.length).toBeGreaterThanOrEqual(3);

    // Lecteur
    await page.getByRole("link", { name: /Commencer la séance/ }).click();
    await expect(page).toHaveURL(/\/routine\/play/);
    await expect(page.getByText(/Exercice 1 \/ \d+/)).toBeVisible();
    await expect(page.getByText("Pourquoi cet exercice")).toBeVisible();
    await expect(page.getByText("Comment faire")).toBeVisible();
    await expect(page.getByText("Erreurs fréquentes")).toBeVisible();

    const count = Number((await page.getByText(/Exercice 1 \/ (\d+)/).textContent())!.match(/\/ (\d+)/)![1]);
    expect(count).toBeGreaterThanOrEqual(3);

    for (let i = 0; i < count; i++) {
      await expect(page.getByText(`Exercice ${i + 1} / ${count}`)).toBeVisible();
      await page.getByRole("button", { name: "▶ Commencer" }).click();
      // Timer visible et qui décrémente
      const timer = page.getByTestId("timer");
      const t0 = await timer.textContent();
      await expect.poll(() => timer.textContent(), { timeout: 5000 }).not.toBe(t0);
      // Pause / reprise
      await page.getByRole("button", { name: /Pause/ }).click();
      await expect(page.getByText("En pause")).toBeVisible();
      const tp = await timer.textContent();
      await page.waitForTimeout(2200);
      expect(await timer.textContent()).toBe(tp);
      await page.getByRole("button", { name: /Reprendre/ }).click();
      // Répétitions si présentes
      const rep = page.getByRole("button", { name: "Ajouter une répétition" });
      if (await rep.count()) await rep.click();
      await page.getByRole("button", { name: /Terminer ✓/ }).click();
      await expect(page.getByText(/Comment s'est passé/)).toBeVisible();
      await page.getByRole("radio", { name: /Correct/ }).click();
      const isLast = i === count - 1;
      await page.getByRole("button", { name: isLast ? /Terminer la séance/ : /Exercice suivant/ }).click();
    }

    // Bilan
    await expect(page.getByRole("heading", { name: "Séance terminée" })).toBeVisible();
    await expect(page.getByText("Progression").first()).toBeVisible();
    await expect(page.getByText("Première séance")).toBeVisible();

    // Dashboard mis à jour
    await page.getByRole("link", { name: "Retour à l'accueil" }).click();
    await expect(page.getByText("Séance terminée ✓")).toBeVisible();
    await expect(page.getByText("1 j")).toBeVisible();

    // Progression
    await page.goto("/progression");
    await expect(page.getByRole("heading", { name: "Progression" })).toBeVisible();
    await expect(page.getByText("Minutes par semaine")).toBeVisible();
    await expect(page.getByRole("img", { name: "Radar des compétences" })).toBeVisible();

    // Historique
    await page.goto("/history");
    await page.getByRole("button", { expanded: false }).first().click();
    await expect(page.locator("ul ul li").first()).toBeVisible();

    // Persistance après rechargement
    await page.reload();
    await expect(page.getByRole("heading", { name: "Mes séances" })).toBeVisible();
    await expect(page.getByRole("button", { expanded: false }).first()).toBeVisible();

    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("bibliothèque d'exercices, fiche et essai libre", async ({ page }) => {
    const errors = watchConsole(page);
    await completeOnboarding(page);
    await page.goto("/exercises");
    await expect(page.getByRole("heading", { name: "Exercices" })).toBeVisible();
    await page.getByRole("button", { name: /Justesse/ }).click();
    await page.getByRole("link", { name: /Trouve la note \(zone médium\)/ }).click();
    await expect(page.getByRole("heading", { name: "Trouve la note (zone médium)" })).toBeVisible();
    await expect(page.getByText("Pourquoi cet exercice")).toBeVisible();
    await page.getByRole("button", { name: "▶ Essayer" }).click();
    await page.getByRole("button", { name: "▶ Jouer une note" }).click();
    await expect(page.getByText("Note cible")).toBeVisible();
    await page.getByRole("button", { name: /Activer le micro/ }).click();
    await expect(page.getByRole("button", { name: /Micro actif/ })).toBeVisible();
    // recherche
    await page.goto("/exercises");
    await page.getByRole("searchbox").fill("legato");
    await expect(page.getByRole("link", { name: /Legato sur trois notes/ })).toBeVisible();
    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("outils : piano, métronome, gammes, chorale, mélodie, accordeur", async ({ page }) => {
    const errors = watchConsole(page);
    await completeOnboarding(page);
    await page.goto("/tools");
    await expect(page.getByRole("heading", { name: "Outils musicaux" })).toBeVisible();

    await page.goto("/tools/piano");
    await page.getByRole("button", { name: "Do4", exact: true }).dispatchEvent("pointerdown");
    await page.getByRole("button", { name: "Do4", exact: true }).dispatchEvent("pointerup");

    await page.goto("/tools/metronome");
    await page.getByRole("button", { name: "▶ Lancer" }).click();
    await page.waitForTimeout(900);
    await expect(page.getByRole("button", { name: "■ Stop" })).toBeVisible();
    await page.getByRole("button", { name: "■ Stop" }).click();

    await page.goto("/tools/scales");
    await page.getByRole("button", { name: "Arpège" }).click();
    await page.getByRole("button", { name: "▶ Jouer" }).click();
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: "■ Stop" }).click();

    await page.goto("/tools/choir");
    await expect(page.getByRole("img", { name: /Partition simplifiée/ })).toBeVisible();
    await page.getByRole("button", { name: /4\. Réduis ta ligne/ }).click();
    await expect(page.getByText("30%")).toBeVisible();
    await page.getByRole("button", { name: "▶ Jouer" }).click();
    await page.waitForTimeout(800);
    await page.getByRole("button", { name: "■ Stop" }).click();

    await page.goto("/tools/melody");
    await page.getByRole("tab", { name: "Note par note" }).click();
    await page.getByRole("button", { name: "▶ Jouer la note" }).click();
    await page.getByRole("button", { name: "Note →" }).click();
    await expect(page.getByText("Note 2 /")).toBeVisible();
    await page.getByRole("tab", { name: "En entier" }).click();
    await page.getByRole("button", { name: "▶ Tout jouer" }).click();
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: "■ Stop" }).click();

    await page.goto("/tools/tuner");
    await page.getByRole("button", { name: /Activer le micro/ }).click();
    await expect(page.getByRole("button", { name: "■ Arrêter" })).toBeVisible();
    await page.waitForTimeout(700);
    await page.getByRole("button", { name: "■ Arrêter" }).click();

    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("réglages : tessiture, niveau manuel, export, réinitialisation", async ({ page }) => {
    const errors = watchConsole(page);
    await completeOnboarding(page);
    await page.goto("/settings");
    await expect(page.getByText("Ré3 → La4")).toBeVisible();
    await page.getByRole("tab", { name: /3 · Indépendance/ }).click();
    await page.goto("/dashboard");
    await expect(page.getByText("Niveau 3 · Indépendance")).toBeVisible();
    await page.goto("/routine");
    await expect(page.getByText(/Indépendance chorale · \d+ min|Mémoire mélodique · \d+ min/).first()).toBeVisible();
    await page.goto("/settings");
    await page.getByRole("button", { name: "Réinitialiser" }).click();
    await page.getByRole("button", { name: "Confirmer la réinitialisation" }).click();
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/onboarding/);
    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("responsive : navigation basse sur mobile, latérale sur desktop", async ({ page, isMobile }) => {
    await completeOnboarding(page);
    const bottomNav = page.getByRole("navigation", { name: "Navigation principale" });
    const sidebar = page.locator("aside");
    if (isMobile) {
      await expect(bottomNav).toBeVisible();
      await expect(sidebar).toBeHidden();
    } else {
      await expect(sidebar).toBeVisible();
      await expect(bottomNav).toBeHidden();
    }
    // pas de défilement horizontal
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    expect(overflow).toBe(false);
    for (const path of ["/routine", "/exercises", "/progression", "/tools", "/settings"]) {
      await page.goto(path);
      const o = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      expect(o, `overflow horizontal sur ${path}`).toBe(false);
    }
  });
});
