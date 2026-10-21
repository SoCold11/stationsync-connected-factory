import { AlertTriangle, ArrowRight, CheckCircle2, ClipboardCheck, Clock3, Database, MapPin, RadioTower, ScanBarcode, Settings2, ShieldAlert } from 'lucide-react';
import { demoConfig } from '../config/demoConfig';
import { evaluateAsset, systemMismatches } from '../domain/evaluate';
import type { FactoryState } from '../domain/types';
import { StatusPill } from './Shared';
function age(when?: string) { if(!when) return 'Not observed'; const min = Math.max(0, Math.floor((Date.now()-new Date(when).getTime())/60000)); return min < 60 ? `${min} min ago` : `${Math.floor(min/60)} hr ${min%60} min ago`; }
export function AssetInspector({ state, assetId, onClose, onObserve, onReconcile, onConfigure, onRetry }: { state: FactoryState; assetId: string; onClose: () => void; onObserve: () => void; onReconcile: () => void; onConfigure: () => void; onRetry: () => void }) {
  const asset=state.assets.find(a=>a.id===assetId); if (!asset) return null;
  const exp=state.expected[assetId]; const obs=state.observations[assetId]; const records=state.records[assetId]; const evaluation=evaluateAsset(state,assetId); const attempt=state.attempts.find(a=>a.assetId===assetId); const affected=systemMismatches(state,assetId);
  const failed = attempt?.status==='partial' && attempt.results.some(r=>r.outcome==='failed' && affected.includes(r.system));
  return <div className="drawer-shade" onMouseDown={e=>{if(e.target===e.currentTarget) onClose()}}><aside className="inspector" role="dialog" aria-modal="true" aria-label={`Inspect ${assetId}`}><div className="drawer-head"><div><div className="eyebrow">ASSET INSPECTOR</div><h2>{asset.id}</h2><p>{asset.label} · {asset.type}</p></div><button className="icon-button" aria-label="Close inspector" onClick={onClose}>×</button></div>
    <div className="drawer-scroll"><div className="asset-status-block"><StatusPill status={evaluation.status}/><span className="asset-serial">Serial {asset.serial}</span></div>
    <div className="evaluation-callout"><div className="callout-title"><AlertTriangle size={17}/> Consistency assessment</div>{evaluation.reasons.map((reason,i)=><p key={i}>{reason}</p>)}</div>
    <div className="small-section-title">FOUR-WAY COMPARISON</div>
    <div className="compare-grid">
      <div className="compare-item"><div className="compare-icon"><ClipboardCheck size={19}/></div><div><span>Approved assignment</span><strong>{exp?.stationId??'Missing'}</strong><small>Configuration v{exp?.version??'?'} · {exp?.approvedBy??'—'}</small></div><CheckCircle2 className="compare-check" size={15}/></div>
      <div className="compare-item"><div className="compare-icon"><MapPin size={19}/></div><div><span>Physical observation</span><strong>{obs?.stationId??'No observation'}</strong><small>{evaluation.evidenceFresh?'Verified · ':'Unverified · '}{age(obs?.observedAt)}</small></div>{!evaluation.evidenceFresh && <AlertTriangle className="compare-warn" size={16}/>}</div>
      {(['AMS','MES'] as const).map(system=>{ const row=records[system]; const matched=row.registered&&row.stationId===exp?.stationId; return <div className="compare-item" key={system}><div className="compare-icon"><Database size={19}/></div><div><span>{system} record</span><strong>{row.registered?row.stationId:'Not registered'}</strong><small>Updated {age(row.updatedAt)}</small></div>{matched?<CheckCircle2 className="compare-check" size={16}/>:<AlertTriangle className="compare-warn" size={16}/>}</div>})}
    </div>
    <div className="observation-info"><Clock3 size={15}/> Evidence source: {obs?.method??'None'}<br/><span>Freshness policy: {demoConfig.freshnessHours} hours · Connectivity: {asset.connectivity} (not location evidence)</span></div>
    {attempt && <><div className="small-section-title">LAST RECONCILIATION</div><div className="attempt-box"><div className="attempt-title">{attempt.status==='verified'?'All target writes verified':'Unresolved / partial'} <span>{new Date(attempt.startedAt).toLocaleTimeString()}</span></div>{attempt.results.map(r=><div className="attempt-result" key={r.system}><span>{r.system}: {r.before??'Unregistered'} → {r.after}</span><span className={r.outcome==='verified'?'success-text':'danger-text'}>{r.outcome==='verified'?'Verified':'Failed'}</span></div>)}</div></>}
    {evaluation.status==='Physical mismatch' && <div className="guardrail"><ShieldAlert size={19}/><div><strong>Direct correction blocked</strong><p>Physical evidence conflicts with approved intent. Investigate the movement or intentionally change the expected assignment.</p></div></div>}
    {evaluation.status==='Unverified' && <div className="guardrail"><Clock3 size={19}/><div><strong>Fresh observation required</strong><p>Record a new physical observation before correcting digital records.</p></div></div>}
    </div>
    <div className="drawer-actions"><button className="btn btn-outline" onClick={onObserve}><ScanBarcode size={17}/> Record observation</button><button className="btn btn-outline" onClick={onConfigure}><Settings2 size={17}/> Change approved station</button>
    {failed?<button className="btn btn-primary" onClick={onRetry} disabled={!evaluation.evidenceFresh || obs?.stationId!==exp?.stationId}><RadioTower size={17}/> Retry failed target <ArrowRight size={16}/></button>:<button className="btn btn-primary" onClick={onReconcile} disabled={!evaluation.eligibleForReconciliation}><Database size={17}/> Review digital correction <ArrowRight size={16}/></button>}
    {!failed && !evaluation.eligibleForReconciliation && <small className="action-hint">Digital correction becomes available when approved intent and fresh physical evidence agree, and a system record differs.</small>}</div>
  </aside></div>;
}
