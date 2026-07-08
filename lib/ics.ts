// Generates an iCalendar (.ics) event for the next occurrence of a
// recurring meeting. Pure functions, fully unit-testable. Timezone handling
// uses Intl (no external library): we resolve the meeting's wall-clock time
// in its IANA timezone to a precise UTC instant, so "Add to calendar" lands
// on the right moment regardless of the user's own timezone.

import type { MeetingSession } from '../types';
import { DAY_NAMES, formatTime, sessionLabel, sortSessions } from './meetingFormat';

// Offset (minutes) of `timeZone` from UTC at the given instant.
function tzOffsetMinutes(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
  const p: Record<string, string> = {};
  for (const part of dtf.formatToParts(date)) p[part.type] = part.value;
  // Intl can emit hour "24" at midnight in some engines; normalize to 0.
  const hour = p.hour === '24' ? 0 : Number(p.hour);
  const asUTC = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), hour, Number(p.minute), Number(p.second));
  return (asUTC - date.getTime()) / 60000;
}

// Convert a wall-clock time in `timeZone` to the corresponding UTC instant.
// When timeZone is omitted, the runtime-local interpretation is used.
function zonedWallTimeToUtc(year: number, month: number, day: number, hour: number, minute: number, timeZone?: string): Date {
  if (!timeZone) return new Date(year, month - 1, day, hour, minute);
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const offset = tzOffsetMinutes(new Date(guess), timeZone);
  return new Date(guess - offset * 60000);
}

// Calendar date + weekday of `instant` as seen in `timeZone` (or local).
function dateInTz(instant: Date, timeZone?: string): { year: number; month: number; day: number; dow: number } {
  if (!timeZone) {
    return { year: instant.getFullYear(), month: instant.getMonth() + 1, day: instant.getDate(), dow: instant.getDay() };
  }
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone, weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit'
  });
  const p: Record<string, string> = {};
  for (const part of dtf.formatToParts(instant)) p[part.type] = part.value;
  const dowMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { year: Number(p.year), month: Number(p.month), day: Number(p.day), dow: dowMap[p.weekday] ?? 0 };
}

const DAY_MS = 24 * 60 * 60 * 1000;

export interface NextOccurrence {
  start: Date;             // UTC instant of the next occurrence
  end: Date;               // UTC instant of the end
  session: MeetingSession;
}

// Find the soonest upcoming occurrence across all of a meeting's sessions.
export function nextOccurrence(
  sessions: MeetingSession[],
  now: Date = new Date(),
  timeZone?: string
): NextOccurrence | null {
  let best: NextOccurrence | null = null;

  for (const session of sessions) {
    const [hh, mm] = session.time.split(':').map(Number);
    if (Number.isNaN(hh) || Number.isNaN(mm)) continue;

    // Probe each of the next 8 calendar days (covers "later today" and
    // a full week ahead, including the same weekday next week).
    for (let i = 0; i <= 7; i++) {
      const probe = new Date(now.getTime() + i * DAY_MS);
      const { year, month, day, dow } = dateInTz(probe, timeZone);
      if (dow !== session.day) continue;

      const start = zonedWallTimeToUtc(year, month, day, hh, mm, timeZone);
      if (start.getTime() <= now.getTime()) continue;

      if (!best || start.getTime() < best.start.getTime()) {
        let end: Date;
        if (session.endTime) {
          const [eh, em] = session.endTime.split(':').map(Number);
          end = zonedWallTimeToUtc(year, month, day, eh, em, timeZone);
          // Handle meetings that end after midnight
          if (end.getTime() <= start.getTime()) end = new Date(end.getTime() + DAY_MS);
        } else {
          end = new Date(start.getTime() + 60 * 60 * 1000); // default 1 hour
        }
        best = { start, end, session };
      }
      break; // earliest matching day for this session found
    }
  }

  return best;
}

// Format a Date as an iCalendar UTC timestamp: 20260615T230000Z
function toICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

// Escape text per RFC 5545 (commas, semicolons, backslashes, newlines).
function escapeICS(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

// Fold long content lines to 75 octets per RFC 5545.
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  let rest = line;
  chunks.push(rest.slice(0, 75));
  rest = rest.slice(75);
  while (rest.length > 0) {
    chunks.push(' ' + rest.slice(0, 74));
    rest = rest.slice(74);
  }
  return chunks.join('\r\n');
}

export interface ICSMeeting {
  name: string;
  meetingSchedule?: MeetingSession[];
  timezone?: string;
  address?: string;
  conferenceUrl?: string;
  conferencePhone?: string;
  meetingTypes?: string[];
  url?: string;
  group?: string;
}

// Build a complete .ics document for the next occurrence of the meeting,
// or null if it has no usable schedule.
export function buildNextOccurrenceICS(meeting: ICSMeeting, now: Date = new Date()): string | null {
  if (!meeting.meetingSchedule || meeting.meetingSchedule.length === 0) return null;
  const occ = nextOccurrence(sortSessions(meeting.meetingSchedule), now, meeting.timezone);
  if (!occ) return null;

  const descParts: string[] = [];
  if (meeting.meetingTypes && meeting.meetingTypes.length) descParts.push(meeting.meetingTypes.join(', '));
  if (meeting.conferenceUrl) descParts.push(`Join online: ${meeting.conferenceUrl}`);
  if (meeting.conferencePhone) descParts.push(`Phone: ${meeting.conferencePhone}`);
  if (meeting.timezone) descParts.push(`Meeting time zone: ${meeting.timezone} (${sessionLabel(occ.session, { long: true })})`);
  descParts.push('Please verify the meeting is happening before you go.');

  const location = meeting.conferenceUrl || meeting.address || '';
  const uid = `sgf-${toICSDate(occ.start)}-${Math.abs(hashString(meeting.name)).toString(36)}@supportgroupfinder`;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Support Group Finder//Meeting//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${toICSDate(now)}`,
    `DTSTART:${toICSDate(occ.start)}`,
    `DTEND:${toICSDate(occ.end)}`,
    `SUMMARY:${escapeICS(meeting.name)}`,
    `DESCRIPTION:${escapeICS(descParts.join('\n'))}`,
    location ? `LOCATION:${escapeICS(location)}` : '',
    meeting.url ? `URL:${escapeICS(meeting.url)}` : '',
    'END:VEVENT',
    'END:VCALENDAR'
  ].filter(Boolean).map(foldLine);

  return lines.join('\r\n');
}

// Small stable string hash for the event UID.
function hashString(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return h;
}

// Human label for the next occurrence, e.g. "Mon, Jun 15 · 7:00 PM".
export function nextOccurrenceLabel(occ: NextOccurrence, timeZone?: string): string {
  const { day } = occ.session;
  const dateStr = new Intl.DateTimeFormat('en-US', {
    timeZone, weekday: 'short', month: 'short', day: 'numeric'
  }).format(occ.start);
  return `${dateStr} · ${formatTime(occ.session.time)} · ${DAY_NAMES[day]}s`;
}
