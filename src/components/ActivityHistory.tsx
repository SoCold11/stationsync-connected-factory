import { CheckCircle2, CircleAlert, History, Info } from 'lucide-react';
import type { FactoryState } from '../domain/types';
import { Empty, SectionHeading } from './Shared';
export function ActivityHistory({ state }: { state: FactoryState }) {
  return <div className="view-content"><div className="page-overline">OPERATIONS <span className="small-divider">/</span> TRACEABILITY</div><h1>Activity history<span className="title-dot">.</span></h1><p className="page-subtitle">A timestamped record of observations, approved configuration changes, attempted system writes, failures, and verified results.</p>
    <SectionHeading eyebrow="AUDIT TRAIL" title="System activity" description={`${state.audit.length} recorded event${state.audit.length === 1 ? '' : 's'} · newest first`}/>
    {state.audit.length===0 ? <div className="card"><Empty>No actions yet. Record an observation or reconcile an asset to create an audit event.</Empty></div> : <div className="card history-list">{state.audit.map(event => <div className="history-event" key={event.id}><div className={`history-dot ${event.outcome}`}>{event.outcome==='success'?<CheckCircle2 size={17}/>:event.outcome==='failure'?<CircleAlert size={17}/>:<Info size={17}/>}</div><div className="history-content"><div className="history-title">{event.operation}</div><div className="history-meta">{event.assetId ?? 'Factory'} <span>·</span> {event.actor} <span>·</span> {new Date(event.timestamp).toLocaleString()}</div>{event.reason && <p><strong>Reason:</strong> {event.reason}</p>}{(event.before || event.after) && <p className="history-change">{event.before ?? '—'} <span>→</span> {event.after ?? '—'}</p>}</div><span className={`audit-outcome ${event.outcome}`}>{event.outcome}</span></div>)}</div>}
    <div className="bottom-hint"><History size={16}/> Events and reconciliation attempts remain available after refreshing this browser.</div>
  </div>;
}
