import type { ReactNode } from 'react';
import { Activity, AlertCircle, AlertTriangle, ArrowRight, CheckCircle2, CircleHelp, Clock3, GitCompareArrows, ShieldAlert } from 'lucide-react';
import type { Status } from '../domain/types';
export function StatusPill({ status }: { status: Status }) {
  const icon = status === 'In sync' ? <CheckCircle2 size={13}/> : status === 'Physical mismatch' ? <ShieldAlert size={13}/> : status === 'Partial sync' ? <AlertCircle size={13}/> : status === 'Digital drift' ? <AlertTriangle size={13}/> : status === 'Unverified' ? <Clock3 size={13}/> : <CircleHelp size={13}/>;
  return <span className={`pill pill-${status.toLowerCase().replaceAll(' ', '-')}`}>{icon}{status}</span>;
}
export function SectionHeading({ eyebrow, title, description, right }: { eyebrow?: string; title: string; description?: string; right?: ReactNode }) {
  return <div className="section-head"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h2>{title}</h2>{description && <p>{description}</p>}</div>{right && <div className="section-action">{right}</div>}</div>;
}
export function Empty({ children }: { children: ReactNode }) { return <div className="empty"><Activity size={22}/><p>{children}</p></div>; }
export function SystemCell({ station, expected, registered = true }: { station: string | null; expected: string; registered?: boolean }) {
  const match = registered && station === expected;
  return <span className={`sys-value ${match ? 'sys-ok' : 'sys-bad'}`}>{match ? <CheckCircle2 size={14}/> : <AlertCircle size={14}/>} {registered ? station : 'Not registered'}</span>;
}
export function OpenLabel() { return <span className="open-label">Inspect <ArrowRight size={14}/></span>; }
export function FlowNote({ children }: { children: ReactNode }) { return <div className="flow-note"><GitCompareArrows size={16}/>{children}</div>; }
