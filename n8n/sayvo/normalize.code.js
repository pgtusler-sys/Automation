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
  'voicemail':            { status: NOT_BOOKED_STATUS, label: 'Voicemail',               booked: false },
  'ai voicemail':         { status: NOT_BOOKED_STATUS, label: 'Voicemail',               booked: false },
  'wrong contact':        { status: NOT_BOOKED_STATUS, label: 'Wrong Contact',           booked: false },
  'call failed':          { status: NOT_BOOKED_STATUS, label: 'Call Failed',             booked: false },
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
// Tidy the GHL-built note_html: drop empty "Label:" lines and collapse runs of <br>.
// NOTE: this only tidies — if GHL truncated the note upstream, n8n cannot un-truncate it.
const cleanNoteHtml = (html) => {
  if (!html) return '';
  const parts = html.split(/<br\s*\/?>/i);
  const kept = parts.filter((seg) => {
    const t = seg.replace(/&nbsp;/gi, ' ').trim();
    if (t === '') return true;                       // keep blanks; collapsed below
    return !/^[^:<>\n]{1,40}:\s*$/.test(t);          // drop "Label:" with empty value
  });
  return kept.join('<br>')
    .replace(/(?:<br>\s*){3,}/gi, '<br><br>')        // collapse 3+ breaks to 2
    .replace(/^(?:<br>\s*)+/i, '')                   // trim leading breaks
    .replace(/(?:<br>\s*)+$/i, '')                   // trim trailing breaks
    .trim();
};

const noteBody = cleanNoteHtml((c.note_html || c.note || '').toString());
const dispLine = (m && m.label) ? ('AI Disposition: ' + m.label) : '';
const noteFinal = [dispLine, noteBody].filter(Boolean).join('<br><br>');

const patch = Object.assign(
  m && m.status ? { lead_status: m.status, status: m.status } : {}, // Lead Status (sending both candidate params)
  m && m.label ? { field_121: m.label } : {},                       // AI Status = granular disposition
  c.appointment ? { field_122: c.appointment } : {},
  c.appointment_time ? { field_122: c.appointment_time } : {},
  c.transcript_url ? { field_123: c.transcript_url } : {},
  c.transcript ? { field_123: c.transcript } : {},
  c.recording_url ? { field_124: c.recording_url } : {},
  (c.summary || c.ai_summary) ? { field_125: c.summary || c.ai_summary } : {},
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
