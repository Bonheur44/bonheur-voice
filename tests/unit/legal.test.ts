import { describe, expect, it } from "vitest";
import { LEGAL, databaseEndpoint, formatLegalDate, pendingLegalFields, publisherIdentity, type LegalPublisher } from "@/lib/legal/config";

describe("détection des emplacements à remplir", () => {
  it("repère un emplacement, si profondément niché soit-il", () => {
    const config = { a: "rempli", b: { c: { d: "[à remplir]" } } };
    expect(pendingLegalFields(config)).toEqual(["b.c.d"]);
  });

  it("ne signale rien sur une configuration complète", () => {
    const config = { editeur: "Jeanne Martin", contact: "jeanne@exemple.fr", region: "eu-west-3", inEurope: true, age: 15 };
    expect(pendingLegalFields(config)).toEqual([]);
  });

  it("ignore ce qui n'est pas du texte", () => {
    expect(pendingLegalFields({ n: 15, ok: true, rien: null })).toEqual([]);
  });

  it("liste tous les emplacements plutôt que le premier", () => {
    const config = { a: "[un]", b: "[deux]" };
    expect(pendingLegalFields(config)).toHaveLength(2);
  });
});

describe("identité de l'éditeur", () => {
  const base: LegalPublisher = {
    name: "Jeanne Martin",
    status: "particulier",
    email: "jeanne@exemple.fr",
    address: "1 rue des Lilas, 75000 Paris",
    publicationDirector: "Jeanne Martin",
    anonymous: false,
  };

  it("publie toujours une adresse de contact", () => {
    const rows = publisherIdentity();
    expect(rows.some((r) => r.label === "Contact")).toBe(true);
  });

  it("désigne toujours un directeur de la publication", () => {
    expect(publisherIdentity().some((r) => r.label === "Directeur de la publication")).toBe(true);
  });

  it("sous le régime non professionnel, ne divulgue ni nom ni adresse", () => {
    const rows = publisherIdentity({ ...base, anonymous: true });
    const editeur = rows.find((r) => r.label === "Éditeur")!;
    expect(editeur.value).toContain("non professionnel");
    expect(editeur.value).not.toContain(base.name);
    expect(rows.some((r) => r.label === "Adresse")).toBe(false);
    // Le contact reste publié : c'est la seule mention à laquelle on ne coupe pas.
    expect(rows.some((r) => r.label === "Contact")).toBe(true);
  });

  it("expose nom, adresse et directeur quand l'éditeur les publie", () => {
    const rows = publisherIdentity(base);
    expect(rows.map((r) => r.label)).toEqual(["Éditeur", "Adresse", "Directeur de la publication", "Contact"]);
    expect(rows[0].value).toBe(base.name);
  });

  it("omet l'adresse laissée vide sans casser la liste", () => {
    const rows = publisherIdentity({ ...base, address: null });
    expect(rows.some((r) => r.label === "Adresse")).toBe(false);
    expect(rows.map((r) => r.label)).toEqual(["Éditeur", "Directeur de la publication", "Contact"]);
  });

  it("ajoute l'immatriculation d'une structure, et elle seule", () => {
    const association = publisherIdentity({ ...base, status: "association", registration: "W751234567" });
    expect(association.find((r) => r.label === "Immatriculation")?.value).toBe("W751234567");
    expect(publisherIdentity(base).some((r) => r.label === "Immatriculation")).toBe(false);
  });
});

describe("configuration livrée", () => {
  it("ne comporte plus aucun emplacement à remplir", () => {
    expect(pendingLegalFields()).toEqual([]);
  });

  it("publie une identité d'éditeur et un contact", () => {
    const rows = publisherIdentity();
    expect(rows.find((r) => r.label === "Éditeur")?.value).toBe(LEGAL.publisher.name);
    expect(rows.find((r) => r.label === "Contact")?.value).toBe(LEGAL.publisher.email);
  });

  it("situe la base dans l'Union européenne, conformément à ce qui est affiché", () => {
    expect(LEGAL.database.inEurope).toBe(true);
    expect(LEGAL.database.region).toMatch(/^eu-/);
    expect(LEGAL.database.location).toMatch(/Union européenne/);
  });

  it("n'expose que l'hôte du point d'accès, jamais une clé", () => {
    const endpoint = databaseEndpoint();
    if (endpoint === null) return; // sans variable d'environnement, rien n'est affiché
    expect(endpoint).not.toContain("/");
    expect(endpoint).not.toContain("key");
  });
});

describe("cohérence de la configuration", () => {
  it("fixe un âge minimal compatible avec le droit français", () => {
    // En France, un mineur consent seul à partir de 15 ans.
    expect(LEGAL.minimumAge).toBeGreaterThanOrEqual(15);
  });

  it("porte une date de mise à jour valide", () => {
    expect(LEGAL.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Number.isNaN(Date.parse(LEGAL.updatedAt))).toBe(false);
  });

  it("met la date en forme en français", () => {
    expect(formatLegalDate("2026-09-10")).toBe("10 septembre 2026");
  });

  it("nomme les deux hébergeurs, qui sont distincts", () => {
    expect(LEGAL.host.name.length).toBeGreaterThan(0);
    expect(LEGAL.database.name.length).toBeGreaterThan(0);
    expect(LEGAL.host.name).not.toBe(LEGAL.database.name);
  });
});
