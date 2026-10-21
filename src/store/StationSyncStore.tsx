import { useCallback, useEffect, useRef, useState } from 'react';
import { createSeedState } from '../data/seed';
import { evidenceIsFresh, evaluateAsset, makeProposal, systemMismatches } from '../domain/evaluate';
import type { AssetId, AuditEvent, FactoryState, Proposal, ReconciliationAttempt, TargetResult } from '../domain/types';
import { writeAndVerify } from '../services/systemAdapters';

const KEY = 'stationsync-v1.0-data';
const id = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
function load(): FactoryState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed: FactoryState = JSON.parse(raw);
      if (parsed.schemaVersion === 1 && Array.isArray(parsed.assets) && Array.isArray(parsed.attempts) && parsed.records) return parsed;
    }
  } catch { /* storage may be unavailable */ }
  return createSeedState();
}
function audit(data: Omit<AuditEvent, 'id' | 'timestamp'>): AuditEvent {
  return { id: id('EVT'), timestamp: new Date().toISOString(), ...data };
}
export function useStationSync() {
  const [state, setState] = useState<FactoryState>(load);
  const current = useRef(state);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [message, setMessage] = useState('');
  const update = useCallback((fn: (previous: FactoryState) => FactoryState) => {
    const next = fn(current.current);
    current.current = next;
    setState(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* memory-only fallback */ }
    return next;
  }, []);
  useEffect(() => { // Keep storage coherent if the host browser restores state.
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* continue without storage */ }
  }, [state]);
  const recordObservation = useCallback((assetId: string, stationId: string, actor: string) => {
    if (!current.current.assets.some(a => a.id === assetId) || !current.current.stations.some(s => s.id === stationId)) return false;
    if (!actor.trim()) return false;
    update(s => {
      const old = s.observations[assetId]?.stationId ?? 'None';
      return { ...s, observations: { ...s.observations, [assetId]: { assetId, stationId, observedAt: new Date().toISOString(), method: 'Manual station verification', observer: actor, evidenceId: id('OBS') } },
        audit: [audit({ actor, assetId, operation: 'Physical observation recorded', before: old, after: stationId, outcome: 'success', reason: 'Manual station verification' }), ...s.audit] };
    });
    setMessage(`Observation recorded: ${assetId} at ${stationId}. Digital records were not changed.`);
    return true;
  }, [update]);
  const configure = useCallback((assetId: AssetId, stationId: string, actor: string, reason: string, acknowledged: boolean) => {
    if (busyRef.current || !reason.trim() || !actor.trim() || !acknowledged) return false;
    const s = current.current;
    const old = s.expected[assetId];
    if (!old || !s.stations.some(x => x.id === stationId) || old.stationId === stationId) return false;
    update(prev => ({ ...prev,
      expected: { ...prev.expected, [assetId]: { ...old, stationId, version: old.version + 1, approvedBy: actor, approvedAt: new Date().toISOString() } },
      stations: prev.stations.map(st => st.id === stationId || st.id === old.stationId ? { ...st, configVersion: st.configVersion + 1 } : st),
      audit: [audit({ actor, assetId, operation: 'Expected assignment changed', before: `${old.stationId} (v${old.version})`, after: `${stationId} (v${old.version + 1})`, outcome: 'success', reason }), ...prev.audit]
    }));
    setMessage(`Approved assignment changed to ${stationId}. Physical observation and AMS/MES records were not altered.`);
    return true;
  }, [update]);
  const toggleFailure = useCallback((enabled: boolean) => {
    update(s => ({ ...s, failNextMES: enabled }));
    setMessage(enabled ? 'Next MES write will fail once. AMS writes remain available.' : 'MES failure injection disabled.');
  }, [update]);
  const reset = useCallback(() => {
    if (busyRef.current) return;
    const fresh = createSeedState();
    update(() => fresh);
    setMessage('Demo restored: three stations and five original assets.');
  }, [update]);

  /** Target-by-target simulated writes, with read-back, authorization checks and audit records. */
  const execute = useCallback(async (assetId: AssetId, proposal: Proposal, reason: string, actor: string, confirmed: boolean, retryAttemptId?: string): Promise<boolean> => {
    if (busyRef.current || !reason.trim() || !actor.trim() || !confirmed) return false;
    const starting = current.current;
    const intent = starting.expected[assetId];
    if (!intent || intent.version !== proposal.expectedVersion || intent.stationId !== proposal.expectedStation) {
      setMessage('Approved assignment changed. Review the correction again before proceeding.');
      return false;
    }
    const evaluation = evaluateAsset(starting, assetId);
    if (!evaluation.evidenceFresh || starting.observations[assetId]?.stationId !== intent.stationId) {
      setMessage('Correction blocked: approved assignment and recent physical observation must agree.');
      return false;
    }
    const pendingTargets = systemMismatches(starting, assetId);
    const targets = proposal.systems.filter(name => pendingTargets.includes(name));
    if (!targets.length) { setMessage('Nothing to change; these records are already synchronized.'); return false; }
    if (retryAttemptId) {
      const previous = starting.attempts.find(a => a.id === retryAttemptId);
      const failed = previous?.results.filter(r => r.outcome === 'failed').map(r => r.system) ?? [];
      if (!previous || previous.status !== 'partial' || !targets.every(t => failed.includes(t))) return false;
    } else if (!evaluation.eligibleForReconciliation) {
      setMessage('This asset cannot be corrected until the physical evidence is validated.');
      return false;
    }
    busyRef.current = true;
    setBusy(true);
    setMessage('');
    const attemptId = retryAttemptId ?? id('REC');
    if (!retryAttemptId) {
      const attempt: ReconciliationAttempt = { id: attemptId, assetId, expectedVersion: intent.version, targets, reason, actor, startedAt: new Date().toISOString(), results: [], status: 'partial' };
      update(s => ({ ...s, attempts: [attempt, ...s.attempts],
        audit: [audit({ actor, assetId, operation: 'Correction confirmed', outcome: 'info', after: targets.join(', '), reason }), ...s.audit] }));
    } else {
      update(s => ({ ...s, audit: [audit({ actor, assetId, operation: 'Retry failed targets confirmed', outcome: 'info', after: targets.join(', '), reason }), ...s.audit] }));
    }
    try {
      for (const system of targets) {
        // Serialize targets so outcomes and persistence are visible independently.
        const beforeState = current.current;
        const fail = system === 'MES' && beforeState.failNextMES;
        if (fail) update(s => ({ ...s, failNextMES: false })); // One-shot toggle is consumed.
        const operation = await writeAndVerify(beforeState, assetId, system, intent.stationId, fail);
        update(s => {
          const attempt = s.attempts.find(a => a.id === attemptId)!;
          const result: TargetResult = operation.result;
          const combined = [...attempt.results.filter(r => r.system !== system), result];
          const remainingFailed = combined.some(r => r.outcome === 'failed');
          const allRequiredVerified = attempt.targets.every(t => combined.some(r => r.system === t && r.outcome === 'verified'));
          return { ...s,
            records: operation.result.outcome === 'verified' ? { ...s.records, [assetId]: { ...s.records[assetId], [system]: operation.record } } : s.records,
            attempts: s.attempts.map(a => a.id === attemptId ? { ...a, results: combined, status: allRequiredVerified && !remainingFailed ? 'verified' : 'partial' } : a),
            audit: [audit({ actor, assetId, operation: `${system} ${retryAttemptId ? 'retry' : 'reconciliation'} ${result.outcome === 'verified' ? 'verified' : 'failed'}`, before: result.before ?? 'Unregistered', after: result.outcome === 'verified' ? result.after : result.details, outcome: result.outcome === 'verified' ? 'success' : 'failure', reason }), ...s.audit]
          };
        });
      }
      const finalAttempt = current.current.attempts.find(a => a.id === attemptId)!;
      const allDone = finalAttempt.status === 'verified' && systemMismatches(current.current, assetId).length === 0;
      setMessage(allDone ? `${assetId} verified. ${targets.join(' and ')} read-back matches the approved assignment.` : `${assetId}: partial synchronization. Review the failed target and retry when ready.`);
      return allDone;
    } finally { busyRef.current = false; setBusy(false); }
  }, [update]);
  const reconcile = useCallback((proposal: Proposal, reason: string, actor: string, confirmed: boolean) => execute(proposal.assetId, proposal, reason, actor, confirmed), [execute]);
  const retry = useCallback((assetId: string, actor: string, reason: string, confirmed: boolean) => {
    const s = current.current;
    const attempt = s.attempts.find(a => a.assetId === assetId && a.status === 'partial');
    const e = s.expected[assetId];
    if (!attempt || !e || attempt.expectedVersion !== e.version || !evidenceIsFresh(s, assetId)) {
      setMessage('Retry requires matching approved configuration and recent physical evidence. Review this asset.');
      return Promise.resolve(false);
    }
    const failedSystems = attempt.results.filter(r => r.outcome === 'failed').map(r => r.system).filter(sys => systemMismatches(s, assetId).includes(sys));
    if (!failedSystems.length) return Promise.resolve(false);
    return execute(assetId, { assetId, expectedVersion: e.version, expectedStation: e.stationId, systems: failedSystems }, reason, actor, confirmed, attempt.id);
  }, [execute]);
  return { state, busy, message, setMessage, recordObservation, configure, toggleFailure, reset, reconcile, retry, evaluate: (assetId: string) => evaluateAsset(state, assetId), propose: (assetId: string) => makeProposal(state, assetId) };
}
