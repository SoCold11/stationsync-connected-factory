import { useEffect, useState } from 'react';
import { Activity, AlertTriangle, ArrowRightLeft, ChevronDown, ClipboardList, Factory, LayoutDashboard, Menu, RotateCcw, Settings2, ShieldCheck, X } from 'lucide-react';
import { Overview } from './components/Overview';
import { StationDetail } from './components/StationDetail';
import { ActivityHistory } from './components/ActivityHistory';
import { AssetInspector } from './components/AssetInspector';
import { ConfigurationDialog, ObservationDialog, ReconcileDialog, ResetDialog } from './components/WorkflowDialogs';
import { useStationSync } from './store/StationSyncStore';
import { demoConfig } from './config/demoConfig';
import './styles.css';

type View = 'overview' | 'station' | 'activity';
type Dialog = 'observe' | 'configure' | 'reconcile' | 'retry' | 'reset' | null;
export default function App() {
  const { state, busy, message, setMessage, recordObservation, configure, toggleFailure, reset, reconcile, retry } = useStationSync();
  const [view,setView]=useState<View>('overview');
  const [stationId,setStationId]=useState('A-104');
  const [assetId,setAssetId]=useState<string|null>(null);
  const [dialog,setDialog]=useState<Dialog>(null);
  const [demoOpen,setDemoOpen]=useState(false);
  const [mobileOpen,setMobileOpen]=useState(false);
  const [actor,setActor]=useState<string>(demoConfig.defaultActor);
  useEffect(()=>{ if(message){const id=setTimeout(()=>setMessage(''),6500);return()=>clearTimeout(id)} },[message,setMessage]);
  useEffect(()=>{const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape'&&!busy){if(dialog)setDialog(null);else setAssetId(null)}};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey)},[dialog,busy]);
  const navigate=(next:View)=>{setView(next);setAssetId(null);setDialog(null);setMobileOpen(false)};
  const openStation=(id:string)=>{setStationId(id);navigate('station')};
  const openAsset=(id:string)=>{setAssetId(id);setDialog(null)};
  const closeDialog=()=>{if(!busy)setDialog(null)};
  return <div className="app-layout">
    <aside className={`sidebar ${mobileOpen?'mobile-show':''}`}>
      <div className="sidebar-top"><div className="brand"><div className="brand-mark"><ArrowRightLeft size={23}/></div><div><strong>StationSync<span className="brand-dot">.</span></strong><span>CONNECTED FACTORY</span></div></div><button className="mobile-close icon-button" onClick={()=>setMobileOpen(false)} aria-label="Close navigation"><X size={20}/></button></div>
      <div className="workspace-label">WORKSPACE</div><div className="workspace-card"><div className="workspace-icon"><Factory size={19}/></div><div><strong>Arsenal Operations</strong><span>{demoConfig.lineName}</span></div><ChevronDown size={15}/></div>
      <div className="nav-group"><div className="nav-label">OPERATIONS</div><button className={`nav-item ${view==='overview'?'active':''}`} onClick={()=>navigate('overview')}><LayoutDashboard size={19}/> Factory overview</button><button className={`nav-item ${view==='station'?'active':''}`} onClick={()=>navigate('station')}><Factory size={19}/> Stations <span className="nav-count">{state.stations.length}</span></button><button className={`nav-item ${view==='activity'?'active':''}`} onClick={()=>navigate('activity')}><ClipboardList size={19}/> Activity history {state.audit.length>0&&<span className="nav-count">{state.audit.length}</span>}</button></div>
      <div className="nav-group"><div className="nav-label">DEMONSTRATION</div><button className={`nav-item ${demoOpen?'active':''}`} onClick={()=>setDemoOpen(v=>!v)}><Settings2 size={19}/> Demo controls <ChevronDown size={15} className={demoOpen?'rotate':''}/></button>{demoOpen&&<div className="demo-panel"><label className="demo-toggle"><span><AlertTriangle size={16}/> Fail next MES write</span><input type="checkbox" checked={state.failNextMES} onChange={e=>toggleFailure(e.target.checked)} disabled={busy}/></label><p>One-shot failure injection for partial-sync recovery.</p><button className="reset-link" onClick={()=>setDialog('reset')} disabled={busy}><RotateCcw size={15}/> Reset all demo data</button></div>}</div>
      <div className="sidebar-bottom"><div className="sidebar-status"><span className="online-light"/> DEMO ENVIRONMENT <span className="sidebar-version">v1.0</span></div><div className="sidebar-user"><div className="avatar">AM</div><div><strong>Manufacturing Engineering</strong><span>Engineer workflow</span></div><ShieldCheck size={16}/></div></div>
    </aside>
    {mobileOpen&&<div className="mobile-scrim" onClick={()=>setMobileOpen(false)}/>}
    <main className="main"><header className="topbar"><div className="topbar-left"><button className="mobile-menu icon-button" aria-label="Open navigation" onClick={()=>setMobileOpen(true)}><Menu size={21}/></button><span className="breadcrumb">FACTORY SYSTEMS</span><span className="divider-slash">/</span><span className="breadcrumb-current">{view==='overview'?'Overview':view==='station'?'Stations':'Activity'}</span></div><div className="topbar-right"><span className="environment-tag"><span className="online-light"/> ALL SYSTEMS SIMULATED</span><div className="topbar-actor">AM</div></div></header>
      {view==='overview'&&<Overview state={state} onStation={openStation} onAsset={openAsset}/>}
      {view==='station'&&<StationDetail state={state} stationId={stationId} onBack={()=>navigate('overview')} onAsset={openAsset}/>}
      {view==='activity'&&<ActivityHistory state={state}/>}
      <footer className="app-footer"><span>STATIONSYNC / CONNECTED FACTORY</span><span>Configuration consistency • Explicit review • Verified outcomes</span></footer>
    </main>
    {message&&<div className="toast" role="status"><Activity size={17}/><span>{message}</span><button onClick={()=>setMessage('')} aria-label="Dismiss notification"><X size={17}/></button></div>}
    {assetId&&!dialog&&<AssetInspector state={state} assetId={assetId} onClose={()=>setAssetId(null)} onObserve={()=>setDialog('observe')} onConfigure={()=>setDialog('configure')} onReconcile={()=>setDialog('reconcile')} onRetry={()=>setDialog('retry')}/>}
    {assetId&&dialog==='observe'&&<ObservationDialog state={state} assetId={assetId} actor={actor} busy={busy} onClose={closeDialog} onSubmit={(station,person)=>{setActor(person);return recordObservation(assetId,station,person)}}/>}
    {assetId&&dialog==='configure'&&<ConfigurationDialog state={state} assetId={assetId} actor={actor} busy={busy} onClose={closeDialog} onSubmit={(station,person,reason,confirmed)=>{setActor(person);return configure(assetId,station,person,reason,confirmed)}}/>}
    {assetId&&dialog==='reconcile'&&<ReconcileDialog state={state} assetId={assetId} actor={actor} busy={busy} onClose={closeDialog} retry={false} onSubmit={(reason,person,confirmed)=>{setActor(person);const proposal=(()=>{const e=state.expected[assetId];const systems=(['AMS','MES'] as const).filter(sys=>{const r=state.records[assetId][sys];return !r.registered||r.stationId!==e.stationId});return {assetId,expectedVersion:e.version,expectedStation:e.stationId,systems:[...systems]}})();return reconcile(proposal,reason,person,confirmed)}}/>}
    {assetId&&dialog==='retry'&&<ReconcileDialog state={state} assetId={assetId} actor={actor} busy={busy} onClose={closeDialog} retry={true} onSubmit={(reason,person,confirmed)=>{setActor(person);return retry(assetId,person,reason,confirmed)}}/>}
    {dialog==='reset'&&<ResetDialog onClose={closeDialog} onReset={()=>{reset();navigate('overview');setAssetId(null)}}/>}
  </div>;
}
