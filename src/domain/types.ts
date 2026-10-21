export type SystemName = 'AMS' | 'MES';
export type StationId = string;
export type AssetId = string;
export type Status = 'In sync' | 'Digital drift' | 'Physical mismatch' | 'Unverified' | 'Partial sync' | 'Needs investigation';
export type TargetOutcome = 'verified' | 'failed';

export interface Station { id: StationId; name: string; line: string; configVersion: number; }
export interface Asset { id: AssetId; label: string; type: string; serial: string; connectivity: 'Online' | 'Offline' | 'Unknown'; }
export interface ExpectedAssignment { assetId: AssetId; stationId: StationId; version: number; approvedBy: string; approvedAt: string; }
export interface PhysicalObservation { assetId: AssetId; stationId: StationId; observedAt: string; method: string; observer: string; evidenceId: string; }
export interface SystemRecord { assetId: AssetId; system: SystemName; stationId: StationId | null; registered: boolean; updatedAt: string; }
export interface TargetResult { system: SystemName; before: string | null; after: string; outcome: TargetOutcome; details: string; attemptedAt: string; verifiedAt?: string; }
export interface ReconciliationAttempt { id: string; assetId: AssetId; expectedVersion: number; targets: SystemName[]; reason: string; actor: string; startedAt: string; results: TargetResult[]; status: 'partial' | 'verified'; }
export interface AuditEvent { id: string; timestamp: string; actor: string; assetId?: string; operation: string; before?: string; after?: string; outcome: 'success' | 'failure' | 'info'; reason?: string; }
export interface FactoryState {
  schemaVersion: 1;
  stations: Station[];
  assets: Asset[];
  expected: Record<AssetId, ExpectedAssignment>;
  observations: Record<AssetId, PhysicalObservation | null>;
  records: Record<AssetId, Record<SystemName, SystemRecord>>;
  attempts: ReconciliationAttempt[];
  audit: AuditEvent[];
  failNextMES: boolean;
}
export interface Evaluation { status: Status; reasons: string[]; mismatchedSystems: SystemName[]; eligibleForReconciliation: boolean; evidenceFresh: boolean; }
export interface Proposal { assetId: AssetId; expectedVersion: number; expectedStation: string; systems: SystemName[]; }
