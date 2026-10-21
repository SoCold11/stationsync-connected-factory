# StationSync v1.0 — Connected Factory Reconciliation

**Primary user:** Manufacturing Engineer  
**Core workflow:** Observe → Compare → Investigate → Reconcile → Verify  
**Supporting workflow:** Reconfigure approved station assignment  
**Runtime:** React 18 + TypeScript + Vite 6, one browser, simulated AMS/MES adapters

StationSync keeps **approved expected assignments**, **last physical observations**, and independent **AMS/MES records** separate. A physical observation is evidence, not authorization to rewrite an approved station configuration. Every proposed system correction is explicit, limited to mismatched targets, and verified by read-back.

## Import into Replit (recommended)

1. Visit **https://replit.com/import** and select **ZIP**.
2. Upload the provided `StationSync_Replit_Prototype_v1.zip` archive.
3. Choose **Import**. Replit should restore the source files and dependencies. If needed, open the Shell and run `npm install`.
4. Click **Run** or run `npm run dev` in the Shell. The preview should show the StationSync dashboard.
5. If Replit puts the source inside a nested `stationsync` folder, run `cd stationsync` first, then `npm install` and `npm run dev` from that folder.

No API keys or database are required. Data persists in the browser's `localStorage`, so **use the same browser and Replit preview URL** for demonstrations. The app has an explicit **Reset demo** button.

## Primary demo walkthrough

1. On **Factory overview**, confirm 3 work centers, 5 assets, and 4 assets requiring attention.
2. Open **A-104** or select **SC-218** from the action queue.
3. The asset is observed and approved at **A-104**, with AMS **A-102** and MES **A-104**.
4. Select **Review digital correction**, enter a reason and checking-engineer name, confirm the evidence check, then run the correction.
5. StationSync writes **AMS only**, reads back the record, and displays **In sync**. Review **Activity history**.
6. Open **TT-1920**, observed at A-104 but approved for A-102: digital write is blocked. Use **Change approved station** only if the movement is explicitly authorized.
7. To show failure recovery, open **Demo controls** and enable **Fail next MES write**. Open **TT-2020**, review and confirm its AMS+MES correction. AMS verifies, MES fails; **Partial sync** remains. Select **Retry failed target** in the asset inspector. Only MES is retried.
8. Use **Reset all demo data** to restore the initial presentation state.

## Architecture / code map

| File | Responsibility | Live interview change example |
| --- | --- | --- |
| `src/config/demoConfig.ts` | Freshness and adapter timings | Change 4-hour threshold to 30 minutes |
| `src/data/seed.ts` | Factory stations and seeded asset scenarios | Add a station or move an asset |
| `src/domain/types.ts` | Strongly typed model | Add evidence attributes |
| `src/domain/evaluate.ts` | Pure consistency and guardrail rules | Make MES optional for a class of equipment |
| `src/services/systemAdapters.ts` | Targeted writes and read-back with injected failures | Simulate MES outage or altered latency |
| `src/store/StationSyncStore.tsx` | State, actions, persistence and audit | Introduce a new authorized workflow |
| `src/components/` | Overview, station, inspector, dialogs, history | Change interface behavior |
| `src/styles.css` | Responsive UI style | Adjust presentation or color |
| `tests/domain.test.ts` | Vitest policy and adapter tests | Add a regression test |

### Domain status precedence

1. Prior failed target with unresolved mismatch → `Partial sync`.
2. Incomplete approved intent or records → `Needs investigation`.
3. Missing/stale physical evidence → `Unverified`.
4. Recent observation conflicts with approved intent → `Physical mismatch`.
5. System records disagree with approved intent → `Digital drift`.
6. All observed/approved/required system states align → `In sync`.

### Important behavior

- All five assets have independent approved, observed, AMS and MES values.
- The initial observation freshness threshold is **4 hours**, configured centrally.
- Every reconciliation requires a reason and explicit confirmation.
- Failed writes do not change the target record. Successful writes get a simulated read-back.
- A one-shot MES outage supports demonstration of partial failure and retry.
- Station reconfiguration changes **approved intent only**, increments the version, and leaves physical/system records untouched.
- Audit history and attempts persist across refreshes, subject to browser storage.
- The **MES service is simulated**; no actual factory equipment is controlled.
- Future barcode validation can scan a **station ID plus an asset ID** and submit the same physical-observation event.

## Commands

```bash
npm install
npm run dev
npm run build
npm test
```

`npm run build` performs TypeScript checking and creates a Vite production bundle. `npm test` runs eight focused Vitest policy tests. For a working Replit preview, start with `npm run dev`.

## Test status / handoff

- **Completed:** 16 TypeScript/TSX files passed syntax transpilation.
- **Completed:** 10 independent offline domain/adapter assertions passed (including mismatch detection, guardrails, freshness, read-back, partial failure and recovery).
- **Pending in Replit:** Full `npm install`, browser smoke test, `npm run build` and `npm test`; the package registry was unreachable in the authoring environment, so those commands could not run there.
- **Presentation gate:** Confirm all three screens, dialogs, reconciliation/retry, reload persistence and reset in Replit before using the live demo.

## Scope and roadmap

**v1.0:** Browser app, manual observation, human-confirmed reconciliation, simulated AMS/MES, partial failure, audit, supporting station reconfiguration.  
**v1.2:** Paired station barcode + asset barcode evidence capture.  
**v2:** Authenticated enterprise integrations, role-based approval controls, richer commissioning and production line changeovers.

There is no production authorization, physical equipment control, actual barcode/camera integration, or real network integration in v1.0. The UI reports configuration consistency, not permission to operate equipment.
