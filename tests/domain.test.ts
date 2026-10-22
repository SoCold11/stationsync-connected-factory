import { describe, expect, it } from 'vitest';
import { createSeedState } from '../src/data/seed';
import { evaluateAsset, evidenceIsFresh, makeProposal, systemMismatches } from '../src/domain/evaluate';
import { calculateStationHealth } from '../src/domain/stationHealth';
import { writeAndVerify } from '../src/services/systemAdapters';

describe('Factory reconciliation policy', () => {
  it('initializes exactly five unique assets, 3 stations, and 4 discrepancies', () => {
    const s=createSeedState();
    expect(s.stations).toHaveLength(3); expect(s.assets).toHaveLength(5);
    const status=s.assets.map(a=>evaluateAsset(s,a.id).status);
    expect(status.filter(a=>a==='In sync')).toHaveLength(1);
    expect(status.filter(a=>a==='Digital drift')).toHaveLength(3);
    expect(status.filter(a=>a==='Physical mismatch')).toHaveLength(1);
  });
  it('SC-218 proposes only AMS and never MES', () => {
    const s=createSeedState(); expect(makeProposal(s,'SC-218')?.systems).toEqual(['AMS']);
  });
  it('unexpected physical movement blocks write proposals', () => {
    const s=createSeedState(); expect(evaluateAsset(s,'TT-1920').status).toBe('Physical mismatch'); expect(makeProposal(s,'TT-1920')).toBeNull();
  });
  it('a stale or missing observation is unverified and blocks corrections', () => {
    const s=createSeedState(); s.observations['SC-218']={...s.observations['SC-218']!,observedAt:new Date(Date.now()-6*3600000).toISOString()};
    expect(evidenceIsFresh(s,'SC-218')).toBe(false); expect(evaluateAsset(s,'SC-218').status).toBe('Unverified'); expect(makeProposal(s,'SC-218')).toBeNull();
    s.observations['SC-218']=null; expect(evaluateAsset(s,'SC-218').status).toBe('Unverified');
  });
  it('reconfiguring expected intent changes evaluation but not AMS or observed values', () => {
    const s=createSeedState(); const before=s.records['TT-1842'].AMS.stationId;
    s.expected['TT-1842']={...s.expected['TT-1842'],stationId:'A-102',version:2};
    expect(s.records['TT-1842'].AMS.stationId).toBe(before); expect(s.observations['TT-1842']?.stationId).toBe('A-104');
    expect(evaluateAsset(s,'TT-1842').status).toBe('Physical mismatch');
  });
  it('observing at a new location is evidence not authority', () => {
    const s=createSeedState(); s.observations['TT-1842']={...s.observations['TT-1842']!,stationId:'A-102'};
    expect(evaluateAsset(s,'TT-1842').status).toBe('Physical mismatch');expect(s.expected['TT-1842'].stationId).toBe('A-104');
  });
  it('counts unexpected observed assets in station health without inflating unique factory attention', () => {
    const s=createSeedState();
    const uniqueAttention=s.assets.filter(asset=>evaluateAsset(s,asset.id).status!=='In sync').length;
    const localExceptions=s.stations.reduce((total,station)=>total+calculateStationHealth(s,station.id).exceptionCount,0);
    expect(uniqueAttention).toBe(4);
    expect(localExceptions).toBe(5);

    s.records['SC-218'].AMS={...s.records['SC-218'].AMS,stationId:'A-104'};
    s.records['PLC-44'].MES={...s.records['PLC-44'].MES,stationId:'A-104',registered:true};
    expect(calculateStationHealth(s,'A-104')).toMatchObject({
      assignedCount:3,
      assignedIssueCount:0,
      unexpectedCount:1,
      exceptionCount:1,
    });

    s.expected['TT-1920']={...s.expected['TT-1920'],stationId:'A-104',version:2};
    s.records['TT-1920'].AMS={...s.records['TT-1920'].AMS,stationId:'A-104'};
    s.records['TT-1920'].MES={...s.records['TT-1920'].MES,stationId:'A-104'};
    expect(evaluateAsset(s,'TT-1920').status).toBe('In sync');
    expect(calculateStationHealth(s,'A-104')).toMatchObject({
      assignedIssueCount:0,
      unexpectedCount:0,
      exceptionCount:0,
    });
  });
  it('shows unresolved partial sync, preserves success and limits retry to failed target', () => {
    const s=createSeedState();
    s.records['TT-2020'].AMS={...s.records['TT-2020'].AMS,stationId:'A-106'};
    s.attempts.unshift({id:'REC-1',assetId:'TT-2020',expectedVersion:1,targets:['AMS','MES'],actor:'Test engineer',reason:'Correct digital drift',startedAt:new Date().toISOString(),status:'partial',results:[
      {system:'AMS',before:'A-102',after:'A-106',outcome:'verified',details:'Read-back confirmed',attemptedAt:new Date().toISOString()},
      {system:'MES',before:'A-102',after:'A-106',outcome:'failed',details:'MES unavailable',attemptedAt:new Date().toISOString()}]});
    expect(evaluateAsset(s,'TT-2020').status).toBe('Partial sync');
    expect(systemMismatches(s,'TT-2020')).toEqual(['MES']);
  });
  it('simulated write verifies read-back; failed writes preserve original record', async () => {
    const s=createSeedState();
    const ok=await writeAndVerify(s,'SC-218','AMS','A-104',false);
    expect(ok.result.outcome).toBe('verified');expect(ok.record.stationId).toBe('A-104');
    const bad=await writeAndVerify(s,'TT-2020','MES','A-106',true);
    expect(bad.result.outcome).toBe('failed');expect(bad.record.stationId).toBe('A-102');
  });
});
