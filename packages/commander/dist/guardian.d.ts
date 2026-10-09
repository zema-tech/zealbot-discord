/**
 * Guardian — sistema immunitario del Commander (cervello).
 * Non è un LLM: regole + punteggi deterministici (~mini-IA).
 * Osserva gli esiti dei muscoli (moduli/dashboard/MCP), aggiorna uno score
 * per guild:feature e espone summary per la dashboard.
 * La quarantena resta sul Breaker/registry: il Guardian valuta e consiglia.
 */
export type GuardianSource = "command" | "event" | "dashboard" | "mcp" | "other";
export type GuardianLevel = "ok" | "weak" | "critical";
export interface GuardianObserveInput {
    guildId: string | null | undefined;
    featureId: string | null | undefined;
    ok: boolean;
    ms?: number;
    timedOut?: boolean;
    source?: GuardianSource;
    errMessage?: string;
}
export interface GuardianFeatureHealth {
    featureId: string;
    score: number;
    level: GuardianLevel;
    fails: number;
    oks: number;
    lastAt: string | null;
    lastError: string | null;
    recommendQuarantine: boolean;
}
export interface GuardianGuildSummary {
    guildId: string;
    features: GuardianFeatureHealth[];
    critical: number;
    weak: number;
    ok: number;
}
export declare class Guardian {
    private readonly states;
    observe(input: GuardianObserveInput, now?: number): GuardianFeatureHealth | null;
    score(guildId: string | null | undefined, featureId: string): number;
    health(guildId: string | null | undefined, featureId: string): GuardianFeatureHealth;
    /** Riepilogo per una guild (dashboard Diagnostica / panoramica). */
    summary(guildId: string | null | undefined): GuardianGuildSummary;
    /** Azzera stato (dopo reload/reset modulo). */
    reset(guildId: string | null | undefined, featureId?: string): void;
    private toHealth;
}
/** Singleton di processo: un solo sistema immunitario nel cervello. */
export declare const guardian: Guardian;
//# sourceMappingURL=guardian.d.ts.map