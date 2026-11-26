export const finishingMachines = {
  'Bakar Bulu': ['Mesin 1', 'Mesin 2'],
  Stenter: ['Yamuma', 'MW1', 'MW2'],
  'Desizing/Washing': ['Panon', 'Xilian', 'Haspel'],
  Calendar: ['Ramish', 'Wakayama', 'Sadhu'],
} as const;
export type FinishingSection = keyof typeof finishingMachines;
export const finishingSections = Object.keys(finishingMachines) as FinishingSection[];
export const finishingShifts = ['Shift 1', 'Shift 2', 'Shift 3'];
export const finishingUnits = ['Meter', 'Kodi', 'Potong'];
export const finishingIssues = ['Tidak Ada', 'Kebersihan', 'Sambung Kain', 'Kerusakan Mesin', 'Tunggu Air', 'Tunggu Sangan', 'Bikin Obat', 'Istirahat', 'Sholat', 'Lain Lain'];
export type FinishingIssue = { issue: string; lost_minutes: number | null };
export type FinishingData = {
  id: string; production_date: string; section: FinishingSection; machine: string;
  shift: string; production_quantity: number; unit: string; machine_speed: number;
  issue: string; issues: FinishingIssue[]; notes: string; created_at: string;
};
export function finishingAllowed(user: { access_role: string; process_stage?: string | null }) {
  return user.access_role === 'all' || user.access_role === 'finishing' ||
    (user.access_role === 'process' && ['Bakar Bulu', 'Stenter', 'Desizing / Washing', 'Calender'].includes(user.process_stage || ''));
}
export function allowedSections(user: { access_role: string; process_stage?: string | null }): FinishingSection[] {
  if (user.access_role !== 'process') return finishingSections;
  const stage = user.process_stage === 'Desizing / Washing' ? 'Desizing/Washing' : user.process_stage;
  return finishingSections.filter(section => section === stage);
}
export function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T00:00:00Z');
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function validateFinishing(raw: unknown) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const data = raw as Record<string, unknown>;
  const section = data.section as FinishingSection;
  const quantity = Number(data.production_quantity);
  const speed = Number(data.machine_speed);
  if (!Array.isArray(data.issues) || data.issues.length < 1 || data.issues.length > 30) return null;
  const issues: FinishingIssue[] = [];
  for (const item of data.issues) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
    const row = item as Record<string, unknown>;
    if (!finishingIssues.includes(String(row.issue))) return null;
    const minutes = row.lost_minutes === '' || row.lost_minutes === null ? null : Number(row.lost_minutes);
    if (minutes !== null && (!Number.isInteger(minutes) || minutes < 0 || minutes > 1440)) return null;
    issues.push({issue:String(row.issue),lost_minutes:minutes});
  }
  if (issues.reduce((sum,row)=>sum+(row.lost_minutes ?? 0),0) > 1440) return null;
  if (!validDate(data.production_date) || !finishingSections.includes(section) ||
    !finishingMachines[section].includes(data.machine as never) ||
    !finishingShifts.includes(String(data.shift)) || !finishingUnits.includes(String(data.unit)) ||
    data.production_quantity === '' || data.production_quantity === null ||
    !Number.isFinite(quantity) || quantity < 0 || quantity > 1e9 ||
    data.machine_speed === '' || data.machine_speed === null ||
    !Number.isFinite(speed) || speed < 0 || speed > 1e9 ||
    typeof data.notes !== 'string' || data.notes.length > 1000) return null;
  return { production_date: data.production_date, section, machine: String(data.machine), shift: String(data.shift),
    production_quantity: quantity, unit: String(data.unit), machine_speed: speed,
     issue: issues[0].issue, issues, notes: data.notes.trim() };
}
