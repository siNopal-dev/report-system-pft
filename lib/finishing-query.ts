import { finishingMachines, finishingSections, finishingShifts, finishingUnits, validDate, allowedSections } from './finishing';
export function finishingWhere(params: URLSearchParams, user: {access_role:string; process_stage?:string|null}) {
  const from = params.get('from') || '';
  const to = params.get('to') || '';
  const section = params.get('section') || '';
  const machine = params.get('machine') || '';
  const shift = params.get('shift') || '';
  const unit = params.get('unit') || '';
  if ((from && !validDate(from)) || (to && !validDate(to)) || (from && to && from > to) ||
      (section && !finishingSections.includes(section as never)) ||
      (machine && !Object.values(finishingMachines).some(list => (list as readonly string[]).includes(machine))) ||
      (section && machine && !(finishingMachines[section as keyof typeof finishingMachines] as readonly string[]).includes(machine)) ||
       (shift && !finishingShifts.includes(shift)) ||
       (unit && !finishingUnits.includes(unit))) return null;
  const parts = ['section = any($1::text[])'];
  const values: unknown[] = [allowedSections(user)];
  for (const [value, column, cast] of [[from,'production_date >=','date'],[to,'production_date <=','date'],[section,'section =','text'],[machine,'machine =','text'],[shift,'shift =','text'],[unit,'unit =','text']]) {
    if (value) { values.push(value); parts.push(`${column} $${values.length}::${cast}`); }
  }
  return { sql: parts.join(' and '), values };
}
