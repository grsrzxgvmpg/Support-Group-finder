// Pure display/formatting helpers for Meeting Guide meeting data.
// Shared by the server feed parser, the React components, and the .ics
// generator. No I/O, no platform dependencies - safe to import anywhere.

import type { MeetingSession } from '../types';

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Meeting Guide "types" codes -> human-readable labels. Curated to the
// subset that helps someone decide whether a meeting is right for them.
// See https://github.com/code4recovery/spec for the full code list.
export const MEETING_TYPE_LABELS: Record<string, string> = {
  O: 'Open',
  C: 'Closed',
  ONL: 'Online',
  X: 'Wheelchair accessible',
  BE: 'Newcomer-friendly',
  M: 'Men',
  W: 'Women',
  G: 'LGBTQ+',
  L: 'LGBTQ+',
  T: 'LGBTQ+',
  LGBTQ: 'LGBTQ+',
  Y: 'Young people',
  SEN: 'Seniors',
  P: 'Professionals',
  SP: 'Speaker',
  D: 'Discussion',
  ST: 'Step study',
  TR: 'Tradition study',
  B: 'Big Book',
  BB: 'Big Book',
  MED: 'Meditation',
  '11': 'Meditation',
  '12x12': '12 & 12',
  A: 'Secular',
  CAN: 'Candlelight',
  BA: 'Childcare available',
  EN: 'English',
  ES: 'Spanish',
  FR: 'French',
  ASL: 'ASL'
};

// The labels worth showing as quick chips on a card (most decision-relevant).
const PRIORITY_LABELS = ['Open', 'Closed', 'Online', 'Wheelchair accessible', 'Newcomer-friendly', 'Women', 'Men', 'LGBTQ+', 'Young people', 'Spanish'];

// Convert raw type codes into a de-duplicated list of human labels,
// most decision-relevant first.
export function typeCodesToLabels(codes: string[] | undefined): string[] {
  if (!codes || codes.length === 0) return [];
  const labels: string[] = [];
  for (const raw of codes) {
    const label = MEETING_TYPE_LABELS[String(raw).trim().toUpperCase()];
    if (label && !labels.includes(label)) labels.push(label);
  }
  return labels.sort((a, b) => {
    const ai = PRIORITY_LABELS.indexOf(a);
    const bi = PRIORITY_LABELS.indexOf(b);
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

// "19:00" -> "7:00 PM". Returns the input unchanged if it isn't HH:MM.
export function formatTime(time: string): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return time;
  let hour = parseInt(match[1], 10);
  const minute = match[2];
  if (Number.isNaN(hour) || hour > 23) return time;
  const period = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return `${hour}:${minute} ${period}`;
}

// "Mon 7:00 PM" (short) or "Monday 7:00 PM" (long), with optional end time.
export function sessionLabel(session: MeetingSession, opts: { long?: boolean } = {}): string {
  const days = opts.long ? DAY_NAMES : DAY_NAMES_SHORT;
  const day = days[session.day] ?? '';
  const start = formatTime(session.time);
  const end = session.endTime ? `–${formatTime(session.endTime)}` : '';
  return `${day} ${start}${end}`.trim();
}

// Sort sessions chronologically by day, then time.
export function sortSessions(sessions: MeetingSession[]): MeetingSession[] {
  return [...sessions].sort((a, b) => (a.day - b.day) || a.time.localeCompare(b.time));
}
