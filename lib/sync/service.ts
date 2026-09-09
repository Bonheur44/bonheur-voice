"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { AchievementRow, ProfileRow, RemoteBundle, SessionRow, SkillRow } from "@/lib/supabase/types";
import { snapshot, useAppStore } from "@/lib/store";
import type { AppData } from "@/lib/types";
import { toDayKey } from "@/lib/utils";
import { mergeSnapshots } from "./merge";
import { achievementsToRows, bundleToSnapshot, profileToRow, sessionsToRows, skillsToRows } from "./rows";

export type SyncStatus = "idle" | "loading" | "syncing" | "synced" | "offline" | "error";

/**
 * Synchronisation entre le cache local et Supabase.
 *
 * Choix assumé : à chaque écriture, on renvoie l'intégralité des lignes de
 * l'utilisateur plutôt qu'un différentiel. Le volume est de l'ordre de quelques
 * dizaines de lignes, et cela supprime toute une classe de bogues de suivi des
 * modifications. Un contrôle d'empreinte évite les envois inutiles.
 */
class SyncService {
  private userId: string | null = null;
  private unsubscribeStore: (() => void) | null = null;
  private pushTimer = 0;
  private retryTimer = 0;
  private retryDelay = 15_000;
  private lastPushedSignature = "";
  private pending = false;
  private listeners = new Set<() => void>();
  private currentStatus: SyncStatus = "idle";
  private onlineHandler: (() => void) | null = null;

  get status(): SyncStatus {
    return this.currentStatus;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private setStatus(status: SyncStatus) {
    if (this.currentStatus === status) return;
    this.currentStatus = status;
    this.listeners.forEach((l) => l());
  }

  private client(): SupabaseClient {
    return getSupabaseClient();
  }

  /** Récupère l'état distant, le fusionne avec le local, puis renvoie le résultat. */
  async start(userId: string): Promise<void> {
    if (this.userId === userId) return;
    this.stop();
    this.userId = userId;
    this.setStatus("loading");
    try {
      await this.pullAndMerge();
      this.lastPushedSignature = "";
      await this.push();
    } catch {
      this.setStatus(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "error");
      this.pending = true;
      this.scheduleRetry();
    }
    this.unsubscribeStore = useAppStore.subscribe(() => this.schedulePush());
    if (typeof window !== "undefined") {
      this.onlineHandler = () => {
        if (this.pending) void this.push();
      };
      window.addEventListener("online", this.onlineHandler);
    }
  }

  stop(): void {
    this.userId = null;
    this.unsubscribeStore?.();
    this.unsubscribeStore = null;
    if (typeof window !== "undefined") {
      window.clearTimeout(this.pushTimer);
      window.clearTimeout(this.retryTimer);
      if (this.onlineHandler) window.removeEventListener("online", this.onlineHandler);
    }
    this.onlineHandler = null;
    this.pending = false;
    this.lastPushedSignature = "";
    this.setStatus("idle");
  }

  private async fetchBundle(userId: string): Promise<RemoteBundle> {
    const db = this.client();
    const [profile, skills, sessions, achievements] = await Promise.all([
      db.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
      db.from("skills").select("*").eq("user_id", userId),
      db.from("sessions").select("*").eq("user_id", userId),
      db.from("achievements").select("*").eq("user_id", userId),
    ]);
    const failure = profile.error ?? skills.error ?? sessions.error ?? achievements.error;
    if (failure) throw new Error(failure.message);
    return {
      profile: (profile.data as ProfileRow | null) ?? null,
      skills: (skills.data as SkillRow[]) ?? [],
      sessions: (sessions.data as SessionRow[]) ?? [],
      achievements: (achievements.data as AchievementRow[]) ?? [],
    };
  }

  private async pullAndMerge(): Promise<void> {
    const userId = this.userId;
    if (!userId) return;
    const bundle = await this.fetchBundle(userId);
    const remote = bundleToSnapshot(bundle);
    const merged = mergeSnapshots(snapshot(), remote, toDayKey());
    useAppStore.getState().applySnapshot(merged);
  }

  private schedulePush(): void {
    if (!this.userId) return;
    window.clearTimeout(this.pushTimer);
    this.pushTimer = window.setTimeout(() => void this.push(), 2000);
  }

  private scheduleRetry(): void {
    window.clearTimeout(this.retryTimer);
    this.retryTimer = window.setTimeout(() => void this.push(), this.retryDelay);
    this.retryDelay = Math.min(this.retryDelay * 2, 5 * 60_000);
  }

  /** Écrit l'intégralité de l'instantané courant. Sans effet si rien n'a changé. */
  async push(): Promise<void> {
    const userId = this.userId;
    if (!userId) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      this.pending = true;
      this.setStatus("offline");
      return;
    }

    const data = snapshot();
    const payload = buildPayload(data, userId);
    const signature = JSON.stringify(payload);
    if (signature === this.lastPushedSignature) {
      this.setStatus("synced");
      return;
    }

    this.setStatus("syncing");
    try {
      const db = this.client();
      const writes: Array<PromiseLike<{ error: { message: string } | null }>> = [
        db.from("profiles").upsert(payload.profile, { onConflict: "user_id" }),
      ];
      if (payload.skills.length) writes.push(db.from("skills").upsert(payload.skills, { onConflict: "user_id,skill_id" }));
      if (payload.sessions.length) writes.push(db.from("sessions").upsert(payload.sessions, { onConflict: "user_id,id" }));
      if (payload.achievements.length) writes.push(db.from("achievements").upsert(payload.achievements, { onConflict: "user_id,achievement_id" }));

      const results = await Promise.all(writes);
      const failure = results.find((r) => r.error !== null)?.error;
      if (failure) throw new Error(failure.message);
      this.lastPushedSignature = signature;
      this.pending = false;
      this.retryDelay = 15_000;
      this.setStatus("synced");
    } catch {
      this.pending = true;
      this.setStatus(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "error");
      this.scheduleRetry();
    }
  }

  /** Efface les données distantes de l'utilisateur (réinitialisation demandée depuis les réglages). */
  async wipeRemote(): Promise<void> {
    const userId = this.userId;
    if (!userId) return;
    const db = this.client();
    await Promise.all([
      db.from("sessions").delete().eq("user_id", userId),
      db.from("skills").delete().eq("user_id", userId),
      db.from("achievements").delete().eq("user_id", userId),
    ]);
    this.lastPushedSignature = "";
  }

  /** Force une relecture distante suivie d'une fusion. */
  async refresh(): Promise<void> {
    if (!this.userId) return;
    try {
      this.setStatus("syncing");
      await this.pullAndMerge();
      await this.push();
    } catch {
      this.setStatus("error");
    }
  }
}

interface Payload {
  profile: ProfileRow;
  skills: SkillRow[];
  sessions: SessionRow[];
  achievements: AchievementRow[];
}

function buildPayload(data: AppData, userId: string): Payload {
  return {
    profile: profileToRow(data.profile, userId),
    skills: skillsToRows(data.skills, userId),
    sessions: sessionsToRows(data, userId),
    achievements: achievementsToRows(data, userId),
  };
}

export const syncService = new SyncService();
