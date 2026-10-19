/** Prefer the current published shift, then the next shift on its local calendar day. */
export function adminClockInShift(shifts:any[],now:Date,businessId:string) {
  const day=(value:Date,zone:string)=>new Intl.DateTimeFormat('en-US',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(value);
  const eligible=shifts.filter(shift=>{
    if(shift.status!=='PUBLISHED'||shift.notes==='Unscheduled shift started by Admin'||!shift.locationId||!shift.location||shift.location.businessId!==businessId||+new Date(shift.endTime)<=+now)return false;
    if(+new Date(shift.startTime)<=+now)return true;
    const zone=shift.timeZone||shift.location.timeZone||'America/New_York';
    return day(new Date(shift.startTime),zone)===day(now,zone);
  });
  const active=eligible.filter(shift=>+new Date(shift.startTime)<=+now);
  if(new Set(active.map(shift=>shift.locationId)).size>1)return null;
  return (active.length?active:eligible).sort((a,b)=>+new Date(a.startTime)-+new Date(b.startTime))[0]||null;
}
