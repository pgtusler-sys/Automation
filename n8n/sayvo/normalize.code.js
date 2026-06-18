// ============================================================================
// Normalize node — "IHL - Post Outbound GHL Disposition to LeadMailbox"
// n8n workflow id: 2qDVTxvir6iZkVY9  (n8n.quetalk.ai)
// This is the SOURCE OF TRUTH for the Code node. Confirmed working 2026-06-16.
// ============================================================================

// ===================== CONFIG =====================
const BASE = 'https://api.leadmailbox.com/v2';
// Lead Status drives the left-sidebar Status Groups (NOT call_status, NOT field_121).
// API param unconfirmed (lead_status vs status) -> we send BOTH; LMB ignores the unused key.
const BOOKED_STATUS     = 'Qualified Booked';      // exact Lead Status leaf (case-sensitive)
const NOT_BOOKED_STATUS = 'Contacted Not Booked';  // exact Lead Status leaf (case-sensitive)
const PASS_TO_SAYVO     = 'Pass to SayVo';         // exact Lead Status leaf (case-sensitive) — retry/re-queue bucket

// Owner assignment: LeadMailbox only accepts the integer 'userid'. GHL is the source of truth and
// sends the assigned user at body.user { firstName, lastName, email }. We map name+email -> userid.
// ROUND_ROBIN is only a fallback if GHL sends no recognizable owner.
const LO_MAP = [
  { test: /milo|david|dmilo/,         userid: 100173 }, // David Milo (dmilo@ihlend.com)
  { test: /colapinto|mike|michael/,   userid: 107230 }, // Mike Colapinto (mike@ihlend.com)
];
const ROUND_ROBIN = [100173, 107230]; // fallback only (David Milo, Mike Colapinto)

const DANGEROUS_STATUSES = new Set(['New', 'Return Requested']);
const MAP = {
  'qualified booked':     { status: BOOKED_STATUS,     label: 'Qualified Booked',        booked: true  },
  'booked':               { status: BOOKED_STATUS,     label: 'Qualified Booked',        booked: true  },
  'meeting booked':       { status: BOOKED_STATUS,     label: 'Qualified Booked',        booked: true  },
  'qualified didnt book': { status: NOT_BOOKED_STATUS, label: "Qualified - Didn't Book", booked: false },
  'qualified no book':    { status: NOT_BOOKED_STATUS, label: "Qualified - Didn't Book", booked: false },
  'unqualified':          { status: NOT_BOOKED_STATUS, label: 'Unqualified',             booked: false },
  'not interested':       { status: NOT_BOOKED_STATUS, label: 'Not Interested',          booked: false },
  'busy':                 { status: NOT_BOOKED_STATUS, label: 'Busy',                    booked: false },
  'voicemail':            { status: PASS_TO_SAYVO,     label: 'Voicemail',               booked: false },
  'ai voicemail':         { status: PASS_TO_SAYVO,     label: 'Voicemail',               booked: false },
  'wrong contact':        { status: PASS_TO_SAYVO,     label: 'Wrong Contact',           booked: false },
  'call failed':          { status: PASS_TO_SAYVO,     label: 'Call Failed',             booked: false },
  'error':                { status: PASS_TO_SAYVO,     label: 'Error',                   booked: false },
  'ai error':             { status: PASS_TO_SAYVO,     label: 'Error',                   booked: false },
  'other':                { status: NOT_BOOKED_STATUS, label: 'Other',                   booked: false },
  'ai other':             { status: NOT_BOOKED_STATUS, label: 'Other',                   booked: false },
};
// ==================================================

const clean = (s) => (s || '').toString().toLowerCase()
  .replace(/[‘’ʼ']/g, '')
  .replace(/[‐-―-]/g, ' ')
  .replace(/\s+/g, ' ').trim();

const body = $json.body || {};
const c = body.customData || body || {};
const notes = (c.lead_notes || c.note_html || '').toString();
const leadid = (c.leadid || c.lead_id || c.LeadID || body.leadid
  || (notes.match(/LeadMailbox Lead ID:\s*(\d+)/i) || [])[1]
  || '').toString().trim();
const disp = clean(c.stage_name || c.disposition || c.call_category || c.status);
const m = MAP[disp] || null;

// Resolve the GHL-assigned owner (body.user) -> LMB userid. Match on name + email together.
const u = body.user || {};
const ownerName = [u.firstName, u.lastName].filter(Boolean).join(' ');
const ownerRaw = (c.owner_name || c.assigned_user || c.assigned_to || c.owner || c.lo_name || ownerName || '').toString();
const ownerEmail = (u.email || c.owner_email || '').toString();
const ownerMatch = clean(ownerRaw + ' ' + ownerEmail);
let ownerUserid = null;
for (const lo of LO_MAP) { if (lo.test.test(ownerMatch)) { ownerUserid = lo.userid; break; } }

// Assign only on booked dispositions. Prefer GHL's owner; fall back to round-robin if none recognized.
let userid = null;
if (m && m.booked) {
  if (ownerUserid) {
    userid = ownerUserid;
  } else {
    const sd = $getWorkflowStaticData('global');
    sd.rr = ((typeof sd.rr === 'number' ? sd.rr : -1) + 1) % ROUND_ROBIN.length;
    userid = ROUND_ROBIN[sd.rr];
  }
}

// Lead Status (bucket) -> status group. AI Status (field_121) -> granular disposition.
// LeadMailbox shows the note as PLAIN TEXT, so GHL's HTML (<br>, <b>, dividers) looks messy.
// Rebuild a clean note: convert to text, pull just the useful pieces, drop tags/dividers/
// empty fields/redundant contact block/footer. (GHL may still truncate upstream; we can't fix that.)
const toText = (html) => (html || '')
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<[^>]+>/g, '')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;/gi, "'");

const srcText = toText(c.note_html || c.note || '');
const pick = (re) => { const mm = srcText.match(re); return mm ? mm[1].trim() : ''; };

const summary    = (c.summary || c.ai_summary || pick(/Summary:\s*([\s\S]*?)(?:\n\s*-{3,}|$)/i)).toString().trim();
const recording  = (c.recording_url || pick(/Call Recording:\s*(\S+)/i)).toString().trim();
const callId     = (c.call_id || pick(/Call ID:\s*(.+)/i)).toString().trim();
const priorNotes = (c.lead_notes_prior || pick(/Lead Notes \(Prior to speaking\):\s*(.+)/i)).toString().trim();
const transcript = (c.transcript || pick(/Transcript:\s*([\s\S]*?)(?:\n\s*-{3,}|\n*For any questions[\s\S]*$|$)/i)).toString().trim();

const noteLines = [];
noteLines.push('AI Disposition: ' + (m && m.label ? m.label : (disp || 'Unknown')));
if (summary)    noteLines.push('', 'Summary:', summary);
if (priorNotes) noteLines.push('', 'Lead Notes: ' + priorNotes);
if (recording)  noteLines.push('', 'Recording: ' + recording);
if (callId)     noteLines.push('Call ID: ' + callId);
if (transcript) noteLines.push('', 'Transcript:', transcript);
const noteFinal = noteLines.join('\n');

const patch = Object.assign(
  m && m.status ? { lead_status: m.status, status: m.status } : {}, // Lead Status (sending both candidate params)
  m && m.label ? { field_121: m.label } : {},                       // AI Status = granular disposition
  c.appointment ? { field_122: c.appointment } : {},
  c.appointment_time ? { field_122: c.appointment_time } : {},
  recording ? { field_124: recording } : {},                        // AI Recording (best-effort field)
  summary ? { field_125: summary } : {},                            // AI Summary (Dan-confirmed field)
  noteFinal ? { note: noteFinal } : {},
  userid ? { userid } : {},
);

const statusValue = m ? m.status : null;
const dangerous = statusValue ? DANGEROUS_STATUSES.has(statusValue) : false;

return [{ json: {
  base: BASE,
  leadid,
  ready: !!(m && leadid && !dangerous),
  reason: !leadid ? 'Missing LeadMailbox leadid.' : (!m ? 'Unmapped disposition: ' + (disp || '(empty)') : (dangerous ? 'Refusing dangerous LeadMailbox status: ' + statusValue : null)),
  disposition_in: disp,
  status_key: 'lead_status|status',
  status_value: statusValue,
  booked: !!(m && m.booked),
  owner_in: ownerName || ownerEmail,
  owner_userid: ownerUserid,
  userid: userid,
  patch_body: patch,
  raw: c,
}}];
