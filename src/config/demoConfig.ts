/** Designed for on-the-fly interview modifications. */
export const demoConfig = {
  appName: 'StationSync',
  lineName: 'Assembly Line A',
  freshnessHours: 4,
  simulatedWriteDelayMs: 420,
  simulatedReadDelayMs: 140,
  requireMESForAllAssets: true,
  defaultActor: 'Alex Morgan · Manufacturing Engineer',
} as const;
