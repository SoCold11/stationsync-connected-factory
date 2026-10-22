import { evaluateAsset } from './evaluate';
import type { FactoryState } from './types';

export function calculateStationHealth(state: FactoryState, stationId: string) {
  const assigned = state.assets.filter(asset => state.expected[asset.id]?.stationId === stationId);
  const assignedIssues = assigned.filter(asset => evaluateAsset(state, asset.id).status !== 'In sync');
  const unexpected = state.assets.filter(asset =>
    state.observations[asset.id]?.stationId === stationId &&
    state.expected[asset.id]?.stationId !== stationId
  );
  const exceptionAssetIds = new Set([...assignedIssues, ...unexpected].map(asset => asset.id));

  return {
    assignedCount: assigned.length,
    assignedIssueCount: assignedIssues.length,
    unexpectedCount: unexpected.length,
    exceptionCount: exceptionAssetIds.size,
  };
}
