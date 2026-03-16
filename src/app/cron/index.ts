// ── Shared helper
export const log = (msg: string) => console.log(`[CRON] ${msg}`);

export const fail = (job: string, err: unknown) =>
    console.error(`[CRON][${job}] Failed:`, err);
