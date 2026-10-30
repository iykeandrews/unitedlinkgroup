'use client';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {MapPin,Shield,RefreshCcw} from 'lucide-react';
import {toast} from 'sonner';
import api from '../../lib/api';
import {useBusiness} from '../../context/business-context';
import {useAuth} from '../../context/auth-context';
import {formatRecordTime} from '../../lib/time/record-zone';
import IncidentList from './IncidentList';
import IncidentModal from './IncidentModal';

type Site={locationId:string;locationName:string;locationStatus:string;totalIncidents:number;openIncidents:number;criticalIncidents:number};
const name=(person:any)=>person?([person.firstName,person.lastName].filter(Boolean).join(' ')||person.email||'Unknown'):'Unassigned';
const date=(value:string)=>value?formatRecordTime(value,'MM/dd/yyyy h:mm a','America/New_York'):'—';
const field='w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm dark:bg-slate-800 dark:border-slate-700';
const button='rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-700';
const label='mb-1.5 block text-xs font-semibold text-slate-500';
export default function IncidentWorkspace(){
  const {selectedBusiness}=useBusiness(),{user}=useAuth();
  const canManage=['SUPER_ADMIN','BUSINESS_ADMIN','MANAGER'].includes(user?.role||'');
  const [sites,setSites]=useState<Site[]>([]),[officers,setOfficers]=useState<any[]>([]),[years,setYears]=useState<number[]>([]);
  const [mode,setMode]=useState('location'),[locationId,setLocationId]=useState(''),[officer,setOfficer]=useState('');
  const [siteStatus,setSiteStatus]=useState('ACTIVE'),[siteSearch,setSiteSearch]=useState('');
  const [period,setPeriod]=useState('all'),[year,setYear]=useState(formatRecordTime(new Date(),'yyyy')),[month,setMonth]=useState(formatRecordTime(new Date(),'MM')),[quarter,setQuarter]=useState('1');
  const [customFrom,setCustomFrom]=useState(''),[customTo,setCustomTo]=useState('');
  const [searchInput,setSearchInput]=useState(''),[search,setSearch]=useState('');
  const [sort,setSort]=useState('date'),[direction,setDirection]=useState('desc');
  const [status,setStatus]=useState(''),[severity,setSeverity]=useState(''),[type,setType]=useState(''),[filters,setFilters]=useState(false);
  const [page,setPage]=useState(1),[data,setData]=useState<{items:any[];total:number}>({items:[],total:0});
  const [loading,setLoading]=useState(false),[baseLoading,setBaseLoading]=useState(true),[error,setError]=useState(''),[baseError,setBaseError]=useState('');
  const [selected,setSelected]=useState(''),[create,setCreate]=useState(false),[exporting,setExporting]=useState(false),[refresh,setRefresh]=useState(0);
  const version=useRef(0), businessScope=useRef(selectedBusiness?.id);
  businessScope.current=selectedBusiness?.id;
  const ready=mode==='location'?!!locationId:!!officer;
  const site=sites.find(s=>s.locationId===locationId);
  const visible=sites.filter(s=>(siteStatus==='ALL'||s.locationStatus===siteStatus)&&s.locationName.toLowerCase().includes(siteSearch.toLowerCase())).sort((a,b)=>Number(b.locationStatus==='ACTIVE')-Number(a.locationStatus==='ACTIVE')||a.locationName.localeCompare(b.locationName));
  const range=useMemo(()=>{
    if(period==='all')return {from:undefined,to:undefined};
    if(period==='custom')return {from:customFrom||undefined,to:customTo||undefined};
    const y=Number(year);
    if(!Number.isInteger(y)||y<1900||y>9999)return {from:undefined,to:undefined};
    const first=period==='monthly'?Number(month):period==='quarterly'?(Number(quarter)-1)*3+1:1;
    const last=period==='monthly'?first:period==='quarterly'?first+2:12;
    const pad=(n:number)=>String(n).padStart(2,'0');
    return {from:year+'-'+pad(first)+'-01',to:year+'-'+pad(last)+'-'+pad(new Date(Date.UTC(y,last,0)).getUTCDate())};
  },[period,year,month,quarter,customFrom,customTo]);
  const invalidRange=(period!=='all'&&period!=='custom'&&!range.from)||(range.from&&range.to&&range.from>range.to);
  const params=useMemo(()=>({...range,locationId:locationId||undefined,reportingOfficerEmployeeId:officer||undefined,search:search||undefined,sort,direction,status:status||undefined,severity:severity||undefined,type:type||undefined,dateField:'submitted'}),[range,locationId,officer,search,sort,direction,status,severity,type]);
  useEffect(()=>{const timer=setTimeout(()=>setSearch(searchInput.trim()),300);return()=>clearTimeout(timer);},[searchInput]);
  useEffect(()=>{
    let active=true;setSites([]);setOfficers([]);setYears([]);setLocationId('');setOfficer('');setSelected('');setCreate(false);setData({items:[],total:0});setBaseLoading(true);setBaseError('');
    if(!selectedBusiness?.id){setBaseLoading(false);return;}
    const request=canManage?api.get('/incident-reports/workspace'):api.get('/locations');
    request.then(res=>{if(!active)return;if(canManage){setSites(res.data.locations);setOfficers(res.data.officers);setYears(res.data.years);}else setSites(res.data.map((s:any)=>({locationId:s.id,locationName:s.name,locationStatus:s.status,totalIncidents:0,openIncidents:0,criticalIncidents:0})));}).catch(()=>{if(active)setBaseError('Unable to load locations. Please refresh to try again.');}).finally(()=>{if(active)setBaseLoading(false);});
    return()=>{active=false;version.current++;};
  },[selectedBusiness?.id,canManage]);
  const loadBase=useCallback(async()=>{
    if(!canManage)return;
    const businessId=businessScope.current;
    try{const response=await api.get('/incident-reports/workspace');if(businessScope.current!==businessId)return;setSites(response.data.locations);setOfficers(response.data.officers);setYears(response.data.years);setBaseError('');}catch{setBaseError('Unable to refresh location totals. Please try again.');}
  },[canManage]);
  useEffect(()=>{setPage(1);setSelected('');},[params,mode]);
  useEffect(()=>{
    const current=++version.current;
    if(!ready||!selectedBusiness?.id||invalidRange){setData({items:[],total:0});setLoading(false);return;}
    setLoading(true);setError('');
    api.get('/incident-reports',{params:{...params,page,pageSize:20}}).then(res=>{if(current===version.current)setData(res.data);}).catch(()=>{if(current===version.current){setData({items:[],total:0});setError('Unable to load reports. Please refresh to try again.');}}).finally(()=>{if(current===version.current)setLoading(false);});
    return()=>{version.current++;};
  },[params,page,ready,selectedBusiness?.id,refresh,invalidRange]);
  useEffect(()=>{if(!selected)return;const key=(event:KeyboardEvent)=>{if(event.key==='Escape')setSelected('');};document.addEventListener('keydown',key);return()=>document.removeEventListener('keydown',key);},[selected]);
  const download=async(format:'pdf'|'xlsx')=>{
    if(exporting)return;setExporting(true);
    try{const response=await api.get('/incident-reports/export',{params:{...params,format},responseType:'blob'});const url=URL.createObjectURL(response.data),a=document.createElement('a');a.href=url;a.download='incident-reports-'+(range.from||'all')+'-'+(range.to||'dates')+'.'+format;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch{toast.error('Unable to download reports. Please try again.');}finally{setExporting(false);}
  };
  const refreshAll=()=>{loadBase();setRefresh(value=>value+1);};
  const switchMode=(value:string)=>{setMode(value);setLocationId('');setOfficer('');setSelected('');};
  return <div className="space-y-6 text-slate-900 dark:text-slate-100">
    <header className="flex flex-wrap justify-between items-center gap-4"><div><p className="text-xs font-semibold uppercase tracking-widest text-blue-600">Security operations</p><h1 className="mt-1 text-2xl font-bold">Incident reports</h1><p className="mt-1 text-sm text-slate-500">Every location. Every response. A clear record.</p></div><div className="flex gap-2"><button className={button} aria-label="Refresh reports" onClick={refreshAll}><RefreshCcw size={17}/></button><button className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white" onClick={()=>setCreate(true)}>+ New report</button></div></header>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex rounded-lg bg-slate-100 p-1 dark:bg-slate-900">{['location',...(canManage?['officer']:[])].map(value=><button key={value} onClick={()=>switchMode(value)} className={'rounded-md px-4 py-2 text-sm font-semibold '+(mode===value?'bg-white shadow-sm text-blue-700 dark:bg-slate-700':'')}>By {value}</button>)}</div>
      {mode==='location'&&!locationId&&<div className="flex flex-wrap gap-2"><input className={field+' sm:w-64'} aria-label="Search locations" placeholder="Search locations" value={siteSearch} onChange={e=>setSiteSearch(e.target.value)}/><select className={field+' sm:w-44'} aria-label="Location status" value={siteStatus} onChange={e=>setSiteStatus(e.target.value)}><option value="ACTIVE">Active locations</option><option value="INACTIVE">Inactive locations</option><option value="ALL">All locations</option></select></div>}</div>
      {mode==='location'&&locationId?<div className="mt-5 flex justify-between items-center gap-3"><div><h2 className="text-lg font-bold">{site?.locationName||'Selected location'}</h2><p className="text-xs text-slate-500">{site?.locationStatus} · {site?.totalIncidents||0} reports submitted in total</p></div><button className={button} onClick={()=>setLocationId('')}>Change location</button></div>:mode==='location'?<>
        {baseLoading?<p className="py-10 text-center text-slate-500">Loading locations…</p>:baseError?<p role="alert" className="py-8 text-red-600">{baseError}</p>:<div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{visible.map(location=><button key={location.locationId} onClick={()=>setLocationId(location.locationId)} className="rounded-xl border border-slate-200 p-4 text-left hover:border-blue-400 hover:shadow-sm dark:border-slate-700"><div className="flex justify-between"><MapPin size={19} className="text-blue-600"/><span className="text-[11px] text-slate-500">{location.locationStatus}</span></div><h3 className="mt-3 font-semibold">{location.locationName}</h3><div className="mt-4 flex justify-between items-end"><span><strong className="text-2xl">{location.totalIncidents}</strong><span className="ml-2 text-xs text-slate-500">total reports</span></span><span className="text-xs text-slate-500">{location.openIncidents} open</span></div></button>)}{!visible.length&&<p className="py-8 text-sm text-slate-500">No locations match your selection.</p>}</div>}
      </>:<div className="mt-5 grid gap-3 sm:grid-cols-2"><label><span className={label}>Officer</span><select className={field} value={officer} onChange={e=>setOfficer(e.target.value)}><option value="">Choose officer</option>{officers.map(o=><option key={o.id} value={o.id}>{name(o)}{o.status!=='ACTIVE'?' (inactive)':''}</option>)}</select></label><label><span className={label}>Location</span><select className={field} value={locationId} onChange={e=>setLocationId(e.target.value)}><option value="">All locations</option>{sites.map(s=><option key={s.locationId} value={s.locationId}>{s.locationName}</option>)}</select></label></div>}
    </section>
    {ready&&<>
      <section className="grid gap-3 sm:grid-cols-3">{[{title:'Matching reports',value:loading?'…':data.total,note:'Selected submission period and filters'},{title:'Location total',value:site?.totalIncidents??'—',note:'All time · all officers'},{title:'Open at this location',value:site?.openIncidents??'—',note:String(site?.criticalIncidents||0)+' critical reports · all time'}].map((card,index)=><div key={card.title} className={'rounded-xl border p-5 '+(index===0?'border-blue-100 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-900':'border-slate-200 dark:border-slate-700')}><p className="text-xs font-semibold text-slate-500">{card.title}</p><strong className="mt-2 block text-3xl">{card.value}</strong><p className="mt-1 text-xs text-slate-500">{card.note}</p></div>)}</section>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        <div className="space-y-4 border-b border-slate-200 p-5 dark:border-slate-700"><div className="flex flex-wrap items-end gap-3">
          <label className="w-40"><span className={label}>Submission period</span><select className={field} value={period} onChange={e=>setPeriod(e.target.value)}>{[['all','All time'],['monthly','Monthly'],['quarterly','Quarterly'],['yearly','Yearly'],['custom','Custom dates']].map(([value,text])=><option key={value} value={value}>{text}</option>)}</select></label>
          {period!=='all'&&period!=='custom'&&<label className="w-28"><span className={label}>Year</span><input type="number" min="1900" max="9999" className={field} list="incident-years" value={year} onChange={e=>setYear(e.target.value)}/><datalist id="incident-years">{years.map(y=><option key={y} value={y}/>)}</datalist></label>}
          {period==='monthly'&&<label className="w-40"><span className={label}>Month</span><select className={field} value={month} onChange={e=>setMonth(e.target.value)}>{Array.from({length:12},(_,i)=><option key={i} value={String(i+1).padStart(2,'0')}>{new Date(2026,i,1).toLocaleString('en-US',{month:'long'})}</option>)}</select></label>}
          {period==='quarterly'&&<label className="w-44"><span className={label}>Quarter</span><select className={field} value={quarter} onChange={e=>setQuarter(e.target.value)}>{['Jan–Mar','Apr–Jun','Jul–Sep','Oct–Dec'].map((q,i)=><option key={q} value={i+1}>Q{i+1} · {q}</option>)}</select></label>}
          {period==='custom'&&<><label><span className={label}>From</span><input type="date" className={field} value={customFrom} onChange={e=>setCustomFrom(e.target.value)}/></label><label><span className={label}>Through</span><input type="date" className={field} value={customTo} onChange={e=>setCustomTo(e.target.value)}/></label></>}
          <div className="flex-1"/><button className={button} onClick={()=>setFilters(!filters)}>{filters?'Hide':'More'} filters</button>{canManage&&<><button className={button} disabled={exporting||loading||!data.total||!!invalidRange} onClick={()=>download('pdf')}>{exporting?'Preparing…':'Download PDF'}</button><button className={button} disabled={exporting||loading||!data.total||!!invalidRange} onClick={()=>download('xlsx')}>Download Excel</button></>}
        </div>
        {!!invalidRange&&<p role="alert" className="text-sm text-red-600">Choose a valid year and date range.</p>}
        <div className="grid gap-3 md:grid-cols-3"><label><span className={label}>Search report content</span><input className={field} value={searchInput} onChange={e=>setSearchInput(e.target.value)} placeholder="Reference, title, officer, narrative…"/></label>
          {canManage&&mode==='location'&&<label><span className={label}>Officer</span><select className={field} value={officer} onChange={e=>setOfficer(e.target.value)}><option value="">All officers</option>{officers.map(o=><option key={o.id} value={o.id}>{name(o)}</option>)}</select></label>}
          <label><span className={label}>Sort reports</span><div className="flex gap-2"><select className={field} value={sort} onChange={e=>setSort(e.target.value)}>{[['date','Submission date'],['incidentDate','Incident date'],['officer','Officer name'],['title','Title'],['content','Narrative'],['severity','Severity'],['status','Status']].map(([v,t])=><option key={v} value={v}>{t}</option>)}</select><button className={button} aria-label="Change sort direction" onClick={()=>setDirection(direction==='desc'?'asc':'desc')}>{direction==='desc'?'↓':'↑'}</button></div></label></div>
        {filters&&<div className="grid gap-3 border-t border-slate-200 pt-4 sm:grid-cols-3 dark:border-slate-700">{[{title:'Type',value:type,set:setType,options:['GENERAL','SECURITY','INJURY','DAMAGE','PATROL','CAR_INVENTORY','SHIFT_REPORT','VISITOR_LOG','THEFT','SUSPICIOUS_ACTIVITY','UNAUTHORIZED_ACCESS','ASSAULT','VANDALISM','FIRE','MEDICAL_EMERGENCY','EQUIPMENT_DAMAGE','TRESPASSING','OTHER']},{title:'Severity',value:severity,set:setSeverity,options:['LOW','MEDIUM','MODERATE','HIGH','CRITICAL']},{title:'Status',value:status,set:setStatus,options:['OPEN','INVESTIGATING','CLOSED','REPORTED','UNDER_INVESTIGATION','ESCALATED','RESOLVED']}].map(f=><label key={f.title}><span className={label}>{f.title}</span><select className={field} value={f.value} onChange={e=>f.set(e.target.value)}><option value="">All</option>{f.options.map(v=><option key={v} value={v}>{v.replaceAll('_',' ')}</option>)}</select></label>)}<button className={button} onClick={()=>{setSearchInput('');setType('');setSeverity('');setStatus('');}}>Clear content filters</button></div>}
        </div>
        {loading?<p className="py-16 text-center text-slate-500">Loading reports…</p>:error?<p role="alert" className="py-12 text-center text-red-600">{error}</p>:!data.items.length?<div className="py-16 text-center text-slate-500"><Shield className="mx-auto mb-3"/><p className="font-semibold">No reports match these filters</p><p className="mt-1 text-sm">Try another period, officer, or search term.</p></div>:<div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500 dark:bg-slate-900/50"><tr>{['Report','Submitted / Occurred','Officer','Severity / Status',''].map((t,i)=><th key={i} className="p-4 font-semibold">{t}</th>)}</tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-700">{data.items.map(report=><tr key={report.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30"><td className="min-w-64 max-w-md p-4"><p className="text-xs font-mono text-slate-500">{report.reportNumber||report.id.slice(0,8)}</p><button className="mt-1 text-left font-semibold text-blue-700 dark:text-blue-300" onClick={()=>setSelected(report.id)}>{report.title}</button><p className="mt-1 line-clamp-2 text-xs text-slate-500">{report.description}</p>{mode==='officer'&&<p className="mt-1 text-xs">{report.location?.name||'Unassigned'}</p>}</td><td className="whitespace-nowrap p-4">{date(report.createdAt)}<p className="mt-1 text-xs text-slate-500">Occurred {date(report.incidentAt||report.date)}</p></td><td className="p-4"><button className="text-left hover:text-blue-600" onClick={()=>{if(canManage&&report.reportingOfficer?.id){setOfficer(report.reportingOfficer.id);setMode('officer');}}}>{name(report.reportingOfficer)}</button><p className="mt-1 text-xs text-slate-500">Submitted by {name(report.submittedBy)}</p></td><td className="p-4"><span className={'rounded-full px-2 py-1 text-xs font-semibold '+(['HIGH','CRITICAL'].includes(report.severity)?'bg-red-50 text-red-700':'bg-blue-50 text-blue-700')}>{report.severity}</span><p className="mt-2 text-xs text-slate-500">{report.status.replaceAll('_',' ')}</p></td><td className="p-4"><button className={button} onClick={()=>setSelected(report.id)}>View</button></td></tr>)}</tbody></table></div>}
        <footer className="flex flex-wrap justify-between items-center gap-3 border-t border-slate-200 p-4 text-xs text-slate-500 dark:border-slate-700"><span>{data.total} reports · Page {page} of {Math.max(1,Math.ceil(data.total/20))}</span><div className="flex gap-2"><button className={button} disabled={loading||page<=1} onClick={()=>setPage(page-1)}>Previous</button><button className={button} disabled={loading||page>=Math.ceil(data.total/20)} onClick={()=>setPage(page+1)}>Next</button></div></footer>
      </section>
    </>}
    {!ready&&<p className="py-4 text-center text-sm text-slate-500">Choose {mode==='location'?'a location':'an officer'} to view incident reports.</p>}
    {selected&&<div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 p-2 sm:p-5" onClick={()=>setSelected('')}><div role="dialog" aria-modal="true" aria-label="Incident detail" className="w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-xl dark:bg-slate-800" onClick={event=>event.stopPropagation()}><IncidentList detailId={selected} onClose={()=>{setSelected('');refreshAll();}}/></div></div>}
    <IncidentModal isOpen={create} onClose={()=>setCreate(false)} onSuccess={refreshAll} initialData={null}/>
  </div>;
}
