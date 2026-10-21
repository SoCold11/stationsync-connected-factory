import { demoConfig } from '../config/demoConfig';
import type { Asset, FactoryState, Station, SystemName } from '../domain/types';

/** All demo scenarios live in this file; edit here to add equipment or stations. */
const stations: Station[] = [
  { id: 'A-102', name: 'Subassembly', line: demoConfig.lineName, configVersion: 1 },
  { id: 'A-104', name: 'Integration & Test', line: demoConfig.lineName, configVersion: 1 },
  { id: 'A-106', name: 'Final Verification', line: demoConfig.lineName, configVersion: 1 },
];
const assets: Asset[] = [
  { id: 'TT-1842', label: 'Torque Driver', type: 'Smart torque tool', serial: 'TQ-51042', connectivity: 'Online' },
  { id: 'SC-218', label: 'Barcode Scanner', type: 'Industrial scanner', serial: 'SC-09218', connectivity: 'Online' },
  { id: 'PLC-44', label: 'Station Controller', type: 'Programmable logic controller', serial: 'PLC-0044', connectivity: 'Online' },
  { id: 'TT-1920', label: 'Torque Driver', type: 'Smart torque tool', serial: 'TQ-51920', connectivity: 'Offline' },
  { id: 'TT-2020', label: 'Torque Driver', type: 'Smart torque tool', serial: 'TQ-52020', connectivity: 'Online' },
];
const blueprints: { assetId: string; expected: string; observed: string; ams: string; mes: string | null }[] = [
  { assetId: 'TT-1842', expected: 'A-104', observed: 'A-104', ams: 'A-104', mes: 'A-104' },
  { assetId: 'SC-218', expected: 'A-104', observed: 'A-104', ams: 'A-102', mes: 'A-104' },
  { assetId: 'PLC-44', expected: 'A-104', observed: 'A-104', ams: 'A-104', mes: null },
  { assetId: 'TT-1920', expected: 'A-102', observed: 'A-104', ams: 'A-102', mes: 'A-102' },
  { assetId: 'TT-2020', expected: 'A-106', observed: 'A-106', ams: 'A-102', mes: 'A-102' },
];
export function createSeedState(now = new Date()): FactoryState {
  const observedAt = new Date(now.getTime() - 10 * 60000).toISOString();
  const prior = new Date(now.getTime() - 2 * 3600000).toISOString();
  const expected: FactoryState['expected'] = {};
  const observations: FactoryState['observations'] = {};
  const records: FactoryState['records'] = {};
  blueprints.forEach((b) => {
    expected[b.assetId] = { assetId: b.assetId, stationId: b.expected, version: 1, approvedBy: demoConfig.defaultActor, approvedAt: prior };
    observations[b.assetId] = { assetId: b.assetId, stationId: b.observed, observedAt, method: 'Manual station verification', observer: demoConfig.defaultActor, evidenceId: `OBS-${b.assetId}-001` };
    records[b.assetId] = {
      AMS: record(b.assetId, 'AMS', b.ams, prior),
      MES: record(b.assetId, 'MES', b.mes, prior),
    };
  });
  return { schemaVersion: 1, stations: stations.map(s => ({...s})), assets: assets.map(a => ({...a})), expected, observations, records, attempts: [], audit: [], failNextMES: false };
}
function record(assetId: string, system: SystemName, stationId: string | null, updatedAt: string) {
  return { assetId, system, stationId, registered: stationId !== null, updatedAt };
}
