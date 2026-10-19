import {BadRequestException} from '@nestjs/common';
function sourceDate(day:string, end:boolean) {
  const parts=day.split('-').map(Number);
  const desired=Date.UTC(parts[0],parts[1]-1,parts[2],end?23:0,end?59:0,end?59:0);
  if(new Date(desired).toISOString().slice(0,10)!==day) throw new BadRequestException('Choose valid report dates');
  let result=new Date(desired);
  for(let i=0;i<3;i++) {
    const p=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(result);
    const v=(key:string)=>Number(p.find(part=>part.type===key)?.value);
    result=new Date(+result+desired-Date.UTC(v('year'),v('month')-1,v('day'),v('hour'),v('minute'),v('second')));
  }
  return result;
}

export type ReportQuery = {page?:number;pageSize?:number;search?:string;locationId?:string;type?:string;severity?:string;status?:string;reportingOfficerEmployeeId?:string;from?:string;to?:string;sort?:string;direction?:string;dateField?:string;id?:string};
export function reportWhere(businessId:string, query:ReportQuery = {}) {
  const where:any = {businessId};
  for (const key of ['locationId','type','severity','status','reportingOfficerEmployeeId','id'] as const) if(query[key]) where[key] = query[key];
  const range:any = {};
  for(const key of ['from','to'] as const) {
    const value=query[key]; if(!value) continue;
    const date=/^\d{4}-\d{2}-\d{2}$/.test(value) ? sourceDate(value,key==='to') : new Date(value);
    if(!Number.isFinite(+date)) throw new BadRequestException('Choose valid report dates');
    range[key==='from'?'gte':'lte']=key==='to'?new Date(+date+999):date;
  }
  if(range.gte && range.lte && range.gte>range.lte) throw new BadRequestException('End date must follow start date');
  if(Object.keys(range).length) where[query.dateField==='submitted'?'createdAt':'date']=range;
  const search=query.search?.trim();
  if(search) where.OR=[...['title','description','reportNumber'].map(key=>({[key]:{contains:search,mode:'insensitive'}})),...['reportingOfficer','submittedBy'].map(key=>({[key]:{is:{OR:['firstName','lastName'].map(name=>({[name]:{contains:search,mode:'insensitive'}}))}}}))];
  return where;
}
export function reportOrder(query:ReportQuery = {}):any[] {
  const direction=query.direction==='asc'?'asc':'desc';
  if(query.sort==='officer') return [{reportingOfficer:{lastName:direction}},{reportingOfficer:{firstName:direction}},{id:'asc'}];
  const fields:Record<string,string>={date:'createdAt',incidentDate:'date',content:'description',title:'title',severity:'severity',status:'status'};
  return [{[fields[query.sort||'date']||'createdAt']:direction},{id:'asc'}];
}
