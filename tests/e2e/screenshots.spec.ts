import { test, type Page } from "@playwright/test";

/** Captures d'écran des principaux écrans (QA visuelle). Sortie : test-results/screens/<projet>/ */
async function onboard(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Continuer →" }).click();
  await page.getByRole("button", { name: "Continuer →" }).click();
  await page.getByRole("button", { name: /C'est parti/ }).click();
  await page.waitForURL(/\/$/);
}

test("captures", async ({ page }, info) => {
  const dir = `test-results/screens/${info.project.name}`;
  await page.goto("/");
  await page.waitForURL(/onboarding/);
  await page.screenshot({ path: `${dir}/01-onboarding.png`, fullPage: true });
  await onboard(page);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${dir}/02-dashboard.png`, fullPage: true });
  await page.goto("/routine");
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${dir}/03-routine.png`, fullPage: true });
  await page.goto("/routine/play");
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${dir}/04-player-intro.png`, fullPage: true });
  await page.getByRole("button", { name: "▶ Commencer" }).click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${dir}/05-player-running.png`, fullPage: true });
  await page.getByRole("button", { name: /Terminer ✓/ }).click();
  await page.getByRole("radio", { name: /Correct/ }).click();
  await page.screenshot({ path: `${dir}/06-player-feedback.png`, fullPage: true });
  await page.goto("/exercises");
  await page.screenshot({ path: `${dir}/07-exercises.png`, fullPage: true });
  await page.goto("/exercises/stab-sustain-5");
  await page.getByRole("button", { name: "▶ Essayer" }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${dir}/08-exercise-sustain.png`, fullPage: true });
  await page.goto("/tools/choir");
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${dir}/09-choir.png`, fullPage: true });
  await page.goto("/tools/melody");
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${dir}/10-melody.png`, fullPage: true });
  await page.goto("/progression");
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${dir}/11-progression.png`, fullPage: true });
  await page.goto("/settings");
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${dir}/12-settings.png`, fullPage: true });
});
