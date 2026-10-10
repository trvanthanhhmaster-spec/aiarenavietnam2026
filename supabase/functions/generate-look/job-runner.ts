// A claimed job runs once. Polling/idempotent re-submission never invokes this.
export async function runClaimedJob(
  process: () => Promise<Record<string, any>>,
  update: (status: string, output: Record<string, any>, error?: string) => Promise<void>,
): Promise<void> {
  try {
    const output = await process();
    await update(output.providerOperation ? 'processing' : 'completed', output);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Generation failed.';
    try { await update('failed', {}, message); }
    catch { console.error('Unable to persist generation failure. No provider retry performed.'); }
  }
}
