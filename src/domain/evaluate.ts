import { demoConfig } from '../config/demoConfig';
import type { AssetId, Evaluation, FactoryState, Proposal, SystemName } from './types';
export function systemMismatches(state: FactoryState, assetId: AssetId): SystemName[] {
  const expected = state.expected[assetId];
  const records = state.records[assetId];
  if (!expected || !records) return [];
  const names: SystemName[] = demoConfig.requireMESForAllAssets ? ['AMS', 'MES'] : ['AMS'];
  return names.filter(name => !records[name]?.registered || records[name].stationId !== expected.stationId);
}
export function evidenceIsFresh(state: FactoryState, assetId: AssetId, now = Date.now()): boolean {
  const o = state.observations[assetId];
  if (!o) return false;
  const when = new Date(o.observedAt).getTime();
  return Number.isFinite(when) && when <= now && (now - when) <= demoConfig.freshnessHours * 3600000;
}
/** Pure, side-effect-free policy engine. Physical observations never rewrite intent. */
export function evaluateAsset(state: FactoryState, assetId: AssetId, now = Date.now()): Evaluation {
  const e = state.expected[assetId];
  const o = state.observations[assetId];
  const records = state.records[assetId];
  const fresh = evidenceIsFresh(state, assetId, now);
  const mismatchedSystems = systemMismatches(state, assetId);
  const reasons: string[] = [];
  const lastAttempt = state.attempts.find(a => a.assetId === assetId);
  const failedTargets = lastAttempt?.status === 'partial'
    ? lastAttempt.results.filter(r => r.outcome === 'failed' && mismatchedSystems.includes(r.system)).map(r => r.system) : [];
  if (!e || !records || !state.stations.some(s => s.id === e.stationId)) {
    return { status: 'Needs investigation', reasons: ['An approved assignment or essential system record is missing.'], mismatchedSystems, eligibleForReconciliation: false, evidenceFresh: fresh };
  }
  if (!o) reasons.push('No physical observation is available. Capture station evidence before making digital corrections.');
  else if (!fresh) reasons.push('The last physical observation is stale or invalid. Refresh station evidence.');
  else if (o.stationId !== e.stationId) reasons.push(`Physical observation places this asset at ${o.stationId}, but the approved assignment is ${e.stationId}. Investigate the move before changing digital records.`);
  for (const name of mismatchedSystems) {
    const record = records[name];
    reasons.push(record?.registered ? `${name} records ${record.stationId}; approved assignment is ${e.stationId}.` : `${name} has no registration for this asset.`);
  }
  if (failedTargets.length) reasons.unshift(`A previous correction could not be verified in ${failedTargets.join(' and ')}. Retry only the failed target(s).`);
  const eligible = fresh && o?.stationId === e.stationId && mismatchedSystems.length > 0 && failedTargets.length === 0;
  let status: Evaluation['status'];
  if (failedTargets.length) status = 'Partial sync';
  else if (!fresh) status = 'Unverified';
  else if (o?.stationId !== e.stationId) status = 'Physical mismatch';
  else if (mismatchedSystems.length > 0) status = 'Digital drift';
  else status = 'In sync';
  if (status === 'In sync') reasons.push('Recent physical evidence and all required system assignments match the approved station.');
  return { status, reasons, mismatchedSystems, eligibleForReconciliation: Boolean(eligible), evidenceFresh: fresh };
}
export function makeProposal(state: FactoryState, assetId: AssetId): Proposal | null {
  const evaluation = evaluateAsset(state, assetId);
  const expected = state.expected[assetId];
  if (!expected || !evaluation.eligibleForReconciliation) return null;
  return { assetId, expectedVersion: expected.version, expectedStation: expected.stationId, systems: evaluation.mismatchedSystems };
}
export function statusTone(status: Evaluation['status']): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'In sync') return 'success';
  if (status === 'Partial sync' || status === 'Physical mismatch') return 'danger';
  if (status === 'Digital drift' || status === 'Unverified') return 'warning';
  return 'neutral';
}
