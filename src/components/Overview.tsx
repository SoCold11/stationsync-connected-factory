import { ArrowRight, Boxes, CheckCheck, Factory, MapPin, ShieldAlert, Waypoints } from 'lucide-react';
import { evaluateAsset } from '../domain/evaluate';
import type { FactoryState } from '../domain/types';
import { SectionHeading, StatusPill } from './Shared';
export function Overview({ state, onStation, onAsset }: { state: FactoryState; onStation: (id: string) => void; onAsset: (id: string) => void }) {
  const evaluations = Object.fromEntries(state.assets.map(a => [a.id, evaluateAsset(state, a.id)]));
  const issues = state.assets.filter(a => evaluations[a.id].status !== 'In sync');
  const healthy = state.assets.length - issues.length;
  return <div className="view-content">
    <div className="page-overline"><span className="live-dot"/> LIVE OPERATIONS MODEL <span className="small-divider">/</span> {state.stations.length} WORK CENTERS</div>
    <h1>Factory overview<span className="title-dot">.</span></h1>
    <p className="page-subtitle">One line, one trusted view. Compare approved station intent against observed equipment and connected-system records.</p>
    <div className="kpi-grid">
      <div className="kpi card"><div className="kpi-icon"><Factory size={19}/></div><span>Production stations</span><strong>{state.stations.length.toString().padStart(2,'0')}</strong><small>Assembly Line A</small></div>
      <div className="kpi card"><div className="kpi-icon blue"><Boxes size={19}/></div><span>Tracked assets</span><strong>{state.assets.length.toString().padStart(2,'0')}</strong><small>Unique registered equipment</small></div>
      <div className="kpi card"><div className="kpi-icon amber"><Waypoints size={19}/></div><span>Require attention</span><strong>{issues.length.toString().padStart(2,'0')}</strong><small>Across the production line</small></div>
      <div className="kpi card"><div className="kpi-icon green"><CheckCheck size={19}/></div><span>Verified in sync</span><strong>{healthy.toString().padStart(2,'0')}</strong><small>Approved + observed + systems</small></div>
    </div>
    <SectionHeading eyebrow="PRODUCTION LINE" title="Work centers" description="Select a station to inspect its assigned assets and any unexpected physical observations." />
    <div className="station-grid">{state.stations.map((station, i) => {
      const assigned = state.assets.filter(a => state.expected[a.id]?.stationId === station.id);
      const issueCount = assigned.filter(a => evaluations[a.id].status !== 'In sync').length;
      const unexpected = state.assets.filter(a => state.observations[a.id]?.stationId === station.id && state.expected[a.id]?.stationId !== station.id);
      return <button className="station-card card" key={station.id} onClick={() => onStation(station.id)}>
        <div className="station-top"><div className="station-index">0{i+1}</div><span className={`station-status ${issueCount ? 'attention' : 'clear'}`}>{issueCount ? `${issueCount} issue${issueCount!==1?'s':''}` : 'All clear'}</span></div>
        <div className="station-icon"><Factory size={24}/></div><h3>{station.id}</h3><p>{station.name}</p>
        <div className="station-stats"><span><Boxes size={15}/>{assigned.length} assigned</span>{unexpected.length > 0 && <span className="unexpected"><MapPin size={14}/>{unexpected.length} unexpected</span>}</div>
        <div className="station-bottom"><span>View station</span><ArrowRight size={17}/></div>
      </button>;
    })}</div>
    <SectionHeading eyebrow="ACTION QUEUE" title="Discrepancies to investigate" description="Issues are calculated from current equipment evidence and system records." />
    <div className="card issue-table-wrap"><table className="data-table"><thead><tr><th>ASSET</th><th>APPROVED STATION</th><th>STATUS</th><th>DISCREPANCY</th><th/></tr></thead><tbody>{issues.map(asset => <tr key={asset.id} onClick={() => onAsset(asset.id)} className="clickable-row" tabIndex={0} onKeyDown={e => { if(e.key==='Enter') onAsset(asset.id); }}><td><strong>{asset.id}</strong><span className="td-caption">{asset.label}</span></td><td>{state.expected[asset.id]?.stationId ?? '—'}</td><td><StatusPill status={evaluations[asset.id].status}/></td><td><span className="issue-description">{evaluations[asset.id].reasons[0]}</span></td><td><ArrowRight size={16}/></td></tr>)}</tbody></table></div>
    <div className="disclaimer"><ShieldAlert size={14}/> StationSync displays configuration consistency, not authorization to operate equipment.</div>
  </div>;
}
