export function parseScheduleCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const input = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (char === '"') {
      if (quoted && input[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (!quoted && (char === ',' || char === '\n' || char === '\r')) {
      row.push(cell.trim());
      cell = '';
      if (char !== ',') {
        if (row.some(Boolean)) rows.push(row);
        row = [];
        if (char === '\r' && input[i + 1] === '\n') i++;
      }
    } else cell += char;
  }
  if (quoted) throw new Error('The CSV has an unclosed quoted field');
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  if (rows[0]?.[0].toLowerCase() === 'employeeid') rows.shift();
  for (let index = 0; index < rows.length; index++) {
    const fields = rows[index];
    if (fields.length < 4 || fields.length > 6 || !fields[1] ||
        !Number.isFinite(Date.parse(fields[2])) || !Number.isFinite(Date.parse(fields[3])) ||
        Date.parse(fields[3]) <= Date.parse(fields[2]) ||
        (fields[4] && (!Number.isInteger(Number(fields[4])) || Number(fields[4]) < 0))) {
      throw new Error(`Invalid shift on CSV row ${index + 1}. Use employeeId, locationId, startTime, endTime, breakMinutes, notes`);
    }
  }
  return rows;
}
