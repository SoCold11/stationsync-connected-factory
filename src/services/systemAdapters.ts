import { demoConfig } from '../config/demoConfig';
import type { FactoryState, SystemName, SystemRecord, TargetResult } from '../domain/types';
const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

/** Explicit adapter interface. Replace implementations with real authenticated services in a later version. */
export interface FactoryAdapter {
  write(current: SystemRecord, station: string, injectFailure: boolean): Promise<SystemRecord>;
  read(current: SystemRecord): Promise<SystemRecord>;
}
export const simulatedAdapter: FactoryAdapter = {
  async write(current, station, injectFailure) {
    await wait(demoConfig.simulatedWriteDelayMs);
    if (injectFailure) throw new Error(`${current.system} service unavailable (injected failure)`);
    return { ...current, registered: true, stationId: station, updatedAt: new Date().toISOString() };
  },
  async read(current) {
    await wait(demoConfig.simulatedReadDelayMs);
    return { ...current };
  },
};
export interface WriteOperationResult { system: SystemName; record: SystemRecord; result: TargetResult; }
export async function writeAndVerify(state: FactoryState, assetId: string, system: SystemName, expectedStation: string, fail: boolean): Promise<WriteOperationResult> {
  const before = state.records[assetId][system];
  const stamp = new Date().toISOString();
  try {
    const written = await simulatedAdapter.write(before, expectedStation, fail);
    const readback = await simulatedAdapter.read(written);
    if (!readback.registered || readback.stationId !== expectedStation) throw new Error(`${system} read-back differs from requested station`);
    return { system, record: readback, result: { system, before: before.stationId, after: expectedStation, outcome: 'verified', details: 'Write confirmed by read-back', attemptedAt: stamp, verifiedAt: new Date().toISOString() } };
  } catch (error) {
    return { system, record: before, result: { system, before: before.stationId, after: expectedStation, outcome: 'failed', details: error instanceof Error ? error.message : 'Unknown integration error', attemptedAt: stamp } };
  }
}
