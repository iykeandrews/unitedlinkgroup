import assert from 'node:assert/strict';
import {formatRecordTime,recordInputDate,recordWallDate,moveRecordRange,enteredShiftRange} from '../../web/src/lib/time/record-zone';
import {workedHours} from '../../web/src/lib/time/records';
const zone='America/New_York';
let hours=0;
for(const day of [17,18,19,24,25,26]){
 const short=day===17||day===24;
 const start=`2026-09-${day}T${short?'14':'06'}:00:00-04:00`,end=`2026-09-${day}T22:00:00-04:00`;
 const breakStart=`2026-09-${day}T${short?'18':'14'}:00:00-04:00`,breakEnd=`2026-09-${day}T${short?'18:30':'15:00'}:00-04:00`;
 assert.equal(formatRecordTime(start,'HH:mm',zone),short?'14:00':'06:00');
 assert.equal(formatRecordTime(end,'HH:mm',zone),'22:00');
 assert.equal(formatRecordTime(end,'MM/dd/yyyy',zone),`09/${day}/2026`);
 assert.equal(recordWallDate(end,zone).getDate(),day);
 assert.equal(formatRecordTime(breakStart,'HH:mm',zone),short?'18:00':'14:00');
 assert.equal(formatRecordTime(breakEnd,'HH:mm',zone),short?'18:30':'15:00');
 assert.equal(+recordInputDate(`2026-09-${day}T${short?'14':'06'}:00`,zone),+new Date(start));
 hours+=workedHours(start,end,[{startTime:breakStart,endTime:breakEnd}]);
}
assert.equal(hours,75);
assert.equal(formatRecordTime('2026-09-18T02:00:00Z','HH:mm'),'22:00');
assert.equal(recordInputDate('2026-09-17T14:00').toISOString(),'2026-09-17T18:00:00.000Z');
assert.equal(recordInputDate('2026-01-17T14:00',zone).toISOString(),'2026-01-17T19:00:00.000Z');
assert(Number.isNaN(+recordInputDate('2026-03-08T02:30',zone)));
// Explicit snapshots also preserve entered clock values outside the Eastern zone.
assert.equal(formatRecordTime(recordInputDate('2026-09-17T14:00','America/Los_Angeles'),'HH:mm','America/Los_Angeles'),'14:00');
console.log(`Clock preservation passed with viewer TZ=${process.env.TZ}: all 6 start/end and break ranges unchanged; 75 net hours.`);

const moved=moveRecordRange('2026-10-31T22:00:00-04:00','2026-11-01T06:00:00-05:00','2026-11-07',zone);
assert.equal(formatRecordTime(moved.start,'HH:mm',zone),'22:00');
assert.equal(formatRecordTime(moved.end,'HH:mm',zone),'06:00');
const overnight=enteredShiftRange('2026-10-31','22:00','06:00',zone);
assert.equal((+overnight.end-+overnight.start)/3600000,9);

assert.equal(formatRecordTime('2026-03-08T02:30Z','HH:mm','UTC'),'02:30');
