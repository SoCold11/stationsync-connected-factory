import { ArrowLeft, ArrowRight, MapPin } from 'lucide-react';
import { evaluateAsset } from '../domain/evaluate';
import type { FactoryState } from '../domain/types';
import { SectionHeading, StatusPill, SystemCell } from './Shared';
export function StationDetail({ state, stationId, onBack, onAsset }: { state: FactoryState; stationId: string; onBack: () => void; onAsset: (id: string) => void }) {
  const station = state.stations.find(s => s.id === stationId);
  if (!station) return null;
  const assigned = state.assets.filter(a => state.expected[a.id]?.stationId === stationId);
  const unexpected = state.assets.filter(a => state.observations[a.id]?.stationId === stationId && state.expected[a.id]?.stationId !== stationId);
  return <div className="view-content">
    <button className="back-link" onClick={onBack}><ArrowLeft size={16}/> All stations</button>
    <div className="page-overline">ASSEMBLY LINE A <span className="small-divider">/</span> WORK CENTER {station.id}</div>
    <h1>{station.id}<span className="title-dot">.</span> <span className="station-page-name">{station.name}</span></h1>
    <p className="page-subtitle">Configuration version {station.configVersion} · {assigned.length} assigned assets · {unexpected.length} unexpected observed asset{unexpected.length===1?'':'s'}</p>
    <SectionHeading eyebrow="APPROVED CONFIGURATION" title="Assigned equipment" description="Compare current observations and independent AMS/MES records against approved station intent."/>
    <div className="card issue-table-wrap"><table className="data-table"><thead><tr><th>ASSET</th><th>OBSERVED</th><th>AMS</th><th>MES</th><th>STATUS</th><th/></tr></thead><tbody>
      {assigned.map(asset => { const e = evaluateAsset(state, asset.id); const obs = state.observations[asset.id]; const rec = state.records[asset.id]; return <tr key={asset.id} onClick={() => onAsset(asset.id)} onKeyDown={ev => {if(ev.key==='Enter') onAsset(asset.id)}} tabIndex={0} className="clickable-row"><td><strong>{asset.id}</strong><span className="td-caption">{asset.label}</span></td><td>{obs?.stationId ?? 'No evidence'}</td><td><SystemCell station={rec.AMS.stationId} registered={rec.AMS.registered} expected={stationId}/></td><td><SystemCell station={rec.MES.stationId} registered={rec.MES.registered} expected={stationId}/></td><td><StatusPill status={e.status}/></td><td><ArrowRight size={15}/></td></tr> })}
    </tbody></table></div>
    {unexpected.length > 0 && <><SectionHeading eyebrow="FLOOR EXCEPTIONS" title="Observed here, assigned elsewhere" description="An observed movement never silently updates the approved configuration."/>
    <div className="unexpected-list">{unexpected.map(asset => <button className="unexpected-row card" key={asset.id} onClick={() => onAsset(asset.id)}><div className="unexpected-icon"><MapPin size={20}/></div><div><strong>{asset.id} — {asset.label}</strong><p>Observed at {stationId}; approved for {state.expected[asset.id].stationId}</p></div><StatusPill status={evaluateAsset(state, asset.id).status}/><ArrowRight size={17}/></button>)}</div></>}
  </div>;
}
