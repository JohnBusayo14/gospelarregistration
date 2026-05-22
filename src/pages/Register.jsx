import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, ArrowRight, CheckCircle2, Minus, Plus, Ticket as TicketIcon, BedDouble, UserPlus,
  Users, IdCard, Armchair, Camera, X as XIcon, Mail, Lock, CreditCard, Globe, Wallet,
  Building2, Upload, Copy, ClipboardCheck, Clock,
} from 'lucide-react';
import { api } from '../api.js';
import { roomTypeLabel, GROUP_TYPES } from '../mockData.js';
import RsvpForm from '../components/RsvpForm.jsx';
import { templateBehavior } from '../templates.js';
import { useAuth } from '../authContext.jsx';
import { assignSeats } from '../lib/assignment.js';
import TicketTag from '../components/TicketTag.jsx';
import SeatMap from '../components/SeatMap.jsx';
import { PENDING_KEY } from './PaymentCallback.jsx';
import attendeeBg from '../assets/attendee-bg.jpg';

// The three payment providers also used by the mobile subscription flow.
// Order = recommended order on the picker. Paystack first because most
// church users in our footprint are NGN-paying and Paystack has the most
// local payment methods (cards, transfer, USSD, mobile money).
//
// The 'bank-transfer' option is conditionally appended at render time when
// the event has bank-account fields set — see PAYMENT_PROVIDERS_FOR(ev).
// `enabled: false` greys out the picker card and ignores clicks — kept here
// rather than removed from the array so the layout stays balanced and the
// providers can be flipped back on individually once they're live.
const PAYMENT_PROVIDERS = [
  { id: 'paystack',    label: 'Paystack',     hint: 'Cards, bank transfer, USSD, mobile money (NGN).',    icon: Wallet,     enabled: true  },
  { id: 'flutterwave', label: 'Flutterwave',  hint: 'Cards, M-Pesa, mobile money across Africa (NGN).',   icon: CreditCard, enabled: false },
  { id: 'stripe',      label: 'Stripe',       hint: 'International cards — Visa, Mastercard, Amex (USD).', icon: Globe,      enabled: false },
];
const BANK_TRANSFER_PROVIDER = {
  id: 'bank-transfer', label: 'Bank transfer',
  hint: 'Send the payment yourself and upload the receipt. The organizer approves manually.',
  icon: Building2,
};
function providersForEvent(ev) {
  if (ev?.bankAccountNumber) return [...PAYMENT_PROVIDERS, BANK_TRANSFER_PROVIDER];
  return PAYMENT_PROVIDERS;
}

function stashPending(reference, entry) {
  try {
    const all = JSON.parse(localStorage.getItem(PENDING_KEY) || '{}');
    all[reference] = entry;
    localStorage.setItem(PENDING_KEY, JSON.stringify(all));
  } catch { /* localStorage full or disabled — fall through; user will see an error on callback */ }
}

const STEPS = [
  { id: 'ticket',   label: 'Ticket' },
  { id: 'people',   label: 'Attendees' },
  { id: 'room',     label: 'Accommodation' },
  { id: 'seats',    label: 'Seats' },
  { id: 'review',   label: 'Review' },
];

function priceLabel(cents) {
  return cents ? `$${(cents / 100).toFixed(0)}` : 'Free';
}

// Option lists for the extended attendee profile. Edit these to match the
// denomination's actual taxonomy — they're declared here so option labels and
// validation stay in one place.
// Denomination-specific honorifics. Order is lay → clergy. Kept in lockstep
// with backend/data/membership.js TITLES — when one moves the other should.
const TITLES   = ['Brother', 'Sister', 'Deacon', 'Deaconess', 'Elder', 'Evangelist', 'Pastor'];
const SEXES   = ['Male', 'Female'];
// Church membership / role codes. The first three are the common public-facing
// values; the rest are internal role abbreviations (Accountant, Administrator,
// Head of Department, etc.) used by the denomination's records system.
const STATUSES = [
  'MEMBER', 'WORKER', 'OTHERS',
  'ACCT', 'ADM', 'ADP', 'AGE', 'AGO', 'AGS',
  'DED', 'GOD', 'NDN', 'SDP',
  'DRI', 'ELD', 'EVAG', 'GE', 'GO', 'GS',
  'HELPER', 'HOD', 'IP', 'NE',
  'PASTOR', 'RETIRED', 'RP', 'SEC', 'VISITOR',
];
const COUNTRIES = ['Nigeria', 'Ghana', 'Benin', 'Togo', 'Cameroon', 'Côte d’Ivoire', 'Kenya', 'South Africa', 'United Kingdom', 'United States', 'Canada', 'Other'];
const AGE_BRACKETS = ['Children (0-12)', 'Teenager (13-19)', 'Youth (20-35)', 'Adult (36-above)'];
const CONVENTION_LOCATIONS = ['Online Cluster', 'Main Auditorium', 'Overflow Hall', 'Regional Centre'];

// Region → District. Sourced from the denomination's records system; the
// values are presented as datalist hints so registrants can pick from the
// list OR type in a custom value when their location isn't listed.
const REGION_DISTRICTS = {
  // Numbered domestic regions
  'Region 1':  ['Mushin', 'Agege', 'Agbado', 'Alakuko', 'Region 1 Headquarter Church', 'Ayantuga', 'Regional Headquarters', 'Akute'],
  'Region 2':  ['Eleyele', 'Challenge', 'Jesutowoju', 'Oluyole', 'Apata', 'Region 2 Headquarter Church', 'House of Joy Mokola', 'Salvation Army Road', 'Regional Headquarters'],
  'Region 3':  ['Idanre', 'Moferere', 'Obanla', 'Olorunsogo', 'Tutugbua', 'Oke Ogba', 'Regional Headquarters', 'House of Favour (Extension of Regional Church)', 'Alade-Atosin'],
  'Region 4':  ['Benin', 'Delta', 'Etsako', 'Ogida', 'Okhoro', 'Sapele', 'Glory', 'Regional Headquarters'],
  'Region 5':  ['Nyanya', 'Abuja', 'Kubwa', 'Minna', 'Nyanyan'],
  'Region 6':  ['Ife', 'Moore', 'Ilesa', 'Modakeke', 'Ajebamidele', 'Oke Osun', 'Goshen', 'PPS 2', 'Liberty (Origbo)', 'Abundant Life'],
  'Region 7':  ['Eleweran', 'Abeokuta', 'Onikolobo', 'Grace', 'Iberekodo', 'Oke Sokori', 'Region 7 Headquarter Church', 'New Abeokuta', 'New Era (Isale Abetu)', 'Mount Zion', 'Shiloh'],
  'Region 8':  ['Akowojo', 'Egbe', 'Amuwo', 'Idimu', 'Ilasamaja', 'Kingdom House'],
  'Region 9':  ['Ondo', 'New Town', 'Ore', 'Ajegunle', 'Ile Oluji', 'Ademulegun', 'Odigbo', 'Beulah'],
  'Region 10': ['Ado', 'Okela', 'Ikere', 'Adebayo', 'Ikole', 'Pentecost Arena', 'Jubilee', 'Omuo', 'Ido', 'Aramoko'],
  'Region 11': ['Ojoo', 'Gospel Town', 'Oyo', 'Solution Arena', 'Oke Ogun', 'Moniya'],
  'Region 12': ['Ketu', 'Mowe', 'Matogun', 'Ogba', 'Agape', 'Wonders Cathedral', 'Alagbole'],
  'Region 13': ['Port-Harcourt', 'Owerri', 'Mercy', 'Sanctuary of His Glory', 'Goodness'],
  'Region 14': ['Ijebu', 'Remo', 'Ijebu Waterside', 'Oke Igbala', 'Unity', 'Ijebu Igbo Waterside', 'Ijebu Ife Waterside', 'Amazing Grace'],
  'Region 15': ['Ajara', 'Badagry', 'Aradagun', 'Okokomaiko', 'Ibereko', 'Igborosun', 'Border'],
  'Region 16': ['Ikare', 'Oka', 'Ajowa', 'Epinmi', 'Glory Land', 'Arigidi'],
  'Region 17': ['Alakia', 'Olorungbeja', 'Apomu', 'Aremo', 'Ode Aje', 'Victory Cathedral'],
  'Region 18': ['Osogbo', 'Ikirun', 'Ogbomoso', 'Ring Road', 'Ilorin', 'Railway Line'],
  'Region 19': ['Okitipupa', 'Ode Aye', 'Osoro', 'Bethel', 'Irele', 'Igbokoda', 'Achiever', 'Awoye', 'Iretolu', 'Gbeleju'],
  'Region 20': ['Kaduna', 'Sokoto', 'Kano', 'Jos', 'Sabo Kaduna'],
  'Region 21': ['Sango', 'Otta (Devine Mercy)', 'Ilaro', 'Ifo', 'Idiroko', 'Divine Favour', 'Owode Yewa', 'Ipokia', 'Dominion'],
  'Region 22': [],
  'Region 23': [],
  'Region 24': [],
  'Region 25': [],
  'Region 26': [],
  'Region 27': [],
  'Region 28': [],
  'Region 29': [],
  'Region 30': [],

  // International regions
  'Republic of Benin': ['1st District', 'ATLANTIQUE', 'ATACORA', 'BORGOU', 'MONO NORD', 'MONO SUD', 'LITTORAL', 'PLATEAU', 'QUEME', 'ZOU & COLLINE'],
  'Ghana':             ['Ghana'],
  'Republic of Niger': ['Republic of Niger'],
  'Kenya':             ['Kenya'],
  'Liberia':           ['DISTRICT ONE', 'DISTRICT TWO', 'DISTRICT THREE'],
  'Botswana':          ['Botswana'],
  'Cameroon':          ['Cameroon'],
  'Gabon':             ['Gabon'],
  'South Africa':      ['South Africa'],
  'Sierra Leone':      ['Sierra Leone'],
  'Togo':              ['Togo'],
  'Turkey':            ['Turkey'],
  'Egypt':             ['Egypt'],
  'United Kingdom':    ['United Kingdom'],
  'Ireland':           ['Ireland'],
  'Belgium':           ['Belgium'],
  'Australia':         ['Australia'],
  'North America':     ['North America'],
  'Asia':              ['UAE', 'ISRAEL', 'PHILLIPINES'],
  'Uganda':            ['Uganda'],
  'India':             ['India'],

  // GSF (Gospel Students' Fellowship) Fields
  'GSF Lagos Field':    ['Ikorodu', 'Itamaga', 'Ogijo', 'Ijede'],
  'GSF Ogun Field':     ['Owo', 'Okedogbon', 'Ifon', 'Irekari'],
  'GSF Oyo Field':      ['GSF Lagos Zone 1', 'GSF Lagos Zone 2', 'GSF Lagos Zone 3', 'GSF Lagos Zone 4', 'GSF Lagos Zone 5'],
  'GSF Kwara Field':    ['GSF Abeokuta Zone 1', 'GSF Abeokuta Zone 2', 'GSF Abeokuta Zone 3', 'GSF Ijebu Zone 1', 'GSF Ijebu Zone 2', 'GSF Ijebu Zone 3'],
  'GSF Ondo Field':     ['GSF Ibadan Zone 1', 'GSF Ibadan Zone 2', 'GSF Oyo Zone'],
  'GSF Osun Field':     ['GSF Ilorin Zone 1', 'GSF Ilorin Zone 2'],
  'GSF Benin Field':    ['GSF Akure Zone 1', 'GSF Akure Zone 2', 'GSF Ondo Zone', 'GSF Owo Zone'],
  'GSF Kogi Field':     ['GSF Ife Zone 1', 'GSF Ife Zone 2', 'GSF Osogbo Zone', 'GSF Ilesa Zone'],
  'GSF Abuja Field':    ['GSF Benin Zone', 'GSF Delta Zone', 'GSF Port Harcourt Zone', 'GSF Bayelsa Zone'],
  'GSF Diaspora Field': [],
  'GSF Ekiti Field':    [],
};
const REGIONS = Object.keys(REGION_DISTRICTS);

function districtsFor(region) {
  return region ? (REGION_DISTRICTS[region] || []) : [];
}

// Map the new bracket onto the legacy ageGroup the rest of the app reads.
function ageGroupFromBracket(bracket) {
  if (bracket === 'Children (0-12)') return 'child';
  if (bracket === 'Teenager (13-19)') return 'teen';
  return 'adult';
}

// Pull seat labels off a list of tickets, dropping the empty/missing ones.
// Used to feed the SeatMap component the set of seats it should grey out.
function extractSeatLabels(tickets) {
  return (tickets || []).map((t) => t.seatLabel || '').filter(Boolean);
}

function emptyAttendee() {
  return {
    // Names — kept under firstName/lastName for API compatibility,
    // displayed as "Other Names" / "Surname" in the UI.
    firstName: '', lastName: '',
    title: '', sex: '', maritalStatus: '',
    city: '', country: 'Nigeria',
    region: '', district: '', assembly: '',
    ageBracket: '', ageGroup: 'adult',
    phone: '', email: '',
    conventionLocation: 'Online Cluster',
    otherInfo: '',
    dietary: '', emergencyName: '', emergencyPhone: '',
    // Optional headshot — data URL (data:image/jpeg;base64,…) so badge,
    // ticket and PDFs can all render without a CDN round-trip. Auto-fills
    // from a saved Gospeler ID when the registrant uses the lookup.
    photo: '',
  };
}

// File → data URL with a hard size cap. We resize client-side so big iPhone
// photos don't bloat the registration POST (or the attendee_profile JSONB);
// the badge avatar is ~50px on screen and ~70px on the printable PDF, so
// 512px is already overkill.
function fileToResizedDataUrl(file, maxDim = 512, quality = 0.82) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('No file'));
    if (!file.type?.startsWith('image/')) return reject(new Error('Please pick an image file.'));
    if (file.size > 8 * 1024 * 1024) return reject(new Error('Image is too large (max 8MB).'));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.onload  = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('That file is not a valid image.'));
      img.onload  = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.round(img.width  * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function Register() {
  const { id } = useParams();
  const nav = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  // Invite mode: triggered by the public /r/:eventId share link. Strips the
  // "back to event" link (recipient was invited to this one event — there's
  // nothing to go back to) and forces the layout into a tighter single-
  // column mobile-first shell with a sticky footer for the step controls.
  const inviteMode = location.pathname.startsWith('/r/');

  // Auth — gates registration when the creator marked the event as
  // "signed-in users only" (requires_login), and binds the primary
  // attendee's email to the user's account so the resulting ticket
  // reliably surfaces on their Tickets page (the backend matches on
  // attendee_email OR registered_by_user_id, so the autofill is belt-
  // and-suspenders insurance, not the only safeguard).
  const { isAuthenticated, user } = useAuth();
  // Referrer tag — preserved from the share link (?ref=...) and attached to
  // every ticket created in this session for attribution reporting.
  const referrer = (searchParams.get('ref') || '').trim().slice(0, 60);
  const [ev, setEv] = useState(null);
  const [stepIdx, setStepIdx] = useState(0);

  const [ticketTypeId, setTicketTypeId] = useState('');
  const [paymentProvider, setPaymentProvider] = useState('paystack');
  const [quantity, setQuantity] = useState(1);
  const [attendees, setAttendees] = useState([emptyAttendee()]);

  // Bind the primary attendee's email to the signed-in account so the
  // ticket lands in /tickets afterward. Only fires when the field is empty
  // (or already matches) — never clobbers a value the user just typed,
  // since the lookup might fail and they could be mid-edit. Pairs with
  // the `readOnly` flag on the input below.
  //
  // emailOverridden: when the registrant explicitly clicks "Use a different
  // email", the auto-bind effect stops re-syncing and the input unlocks so
  // they can type any address (useful for registering a spouse, a child,
  // a colleague, etc.). Stays off by default — most signed-in users
  // genuinely want the ticket on their own /tickets page.
  const [emailOverridden, setEmailOverridden] = useState(false);
  useEffect(() => {
    if (emailOverridden) return;
    const accountEmail = user?.email ? String(user.email).toLowerCase() : '';
    if (!accountEmail) return;
    setAttendees((prev) => {
      if (!prev.length) return prev;
      const current = String(prev[0].email || '').toLowerCase();
      if (current === accountEmail) return prev;
      return [{ ...prev[0], email: accountEmail }, ...prev.slice(1)];
    });
  }, [user?.email, emailOverridden]);
  const [accommodationId, setAccommodationId] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState(null);

  // Bank-transfer fields — only meaningful when paymentProvider === 'bank-transfer'.
  // proofImage holds the JPEG data URL of the screenshot; reference is what
  // the attendee typed in their banking app's "narration" / "purpose" field.
  const [bankProofImage,        setBankProofImage]        = useState('');
  const [bankTransferReference, setBankTransferReference] = useState('');
  const [bankBusy,              setBankBusy]              = useState(false);
  const [bankCopied,            setBankCopied]            = useState('');  // 'account' | 'amount' | ''

  // When the event template defines customQuestions, the registrant gets a
  // choice between the short RSVP form (default) and the long default
  // wizard. Setting this anywhere else has no effect — only meaningful
  // when ev.customQuestions has entries.
  const [formStyle, setFormStyle] = useState('quick'); // 'quick' | 'detailed'

  // RSVP answers captured from the Quick form when a template runs in
  // "continue to wizard" mode (e.g. christian-movie-night). Stays null
  // for templates that submit the RSVP directly. When non-null, the
  // final api.register call includes them as `customAnswers` so the
  // RSVP responses still land on every minted ticket.
  const [rsvpAnswers, setRsvpAnswers] = useState(null);

  // Seat selection. Parallel array of seat labels — index aligns with
  // `attendees[]`. '' means "no choice yet" and will fall back to the
  // backend's auto-assigner. Existing seats for this event are loaded
  // separately so the map can grey them out.
  const [seatPicks, setSeatPicks] = useState([]);
  const [takenSeats, setTakenSeats] = useState([]);

  // Distinguishes "still fetching" from "fetched but missing", so we can
  // replace the infinite "Loading…" with a real not-found message when the
  // share link points at an event this client can't see (most commonly when
  // a phone opens the link but the backend is unreachable, so the
  // localStorage fallback runs and doesn't have the event).
  const [loading, setLoading]   = useState(true);
  const [loadError, setLoadErr] = useState('');

  // Group registration: church groups / families / departments register
  // together. `groupMode === 'group'` shows a 3-field card on the People step
  // and stamps every minted ticket with the same groupId server-side.
  const [groupMode, setGroupMode] = useState('individual'); // 'individual' | 'group'
  const [groupType, setGroupType] = useState('church');
  const [groupName, setGroupName] = useState('');
  const [groupLeadEmail, setGroupLeadEmail] = useState('');

  // Per-attendee Gospeler ID lookup state. Keyed by attendee index so each
  // card has its own input/error/loading state without touching the attendee
  // object itself (which gets sent to the backend as-is).
  // Shape: { [i]: { code, loading, error, filled } }
  const [lookups, setLookups] = useState({});
  const setLookup = (i, partial) =>
    setLookups((p) => ({ ...p, [i]: { ...(p[i] || {}), ...partial } }));

  // Index of the attendee whose Gospeler-ID modal is currently open, or
  // null when no modal is showing. Driven by the IdCard icon button on
  // each attendee block — opens a focused modal instead of inlining the
  // long code-entry form into the attendee card.
  const [gospelerModalIdx, setGospelerModalIdx] = useState(null);

  // Resolve a Gospeler ID code and patch the matching attendee with the
  // returned profile. Fallback-or-replace: every field that the ID has
  // overwrites the attendee field; missing fields leave existing values
  // alone, so a user can pre-type then look up without losing their input.
  // Close the Gospeler-ID modal as soon as the lookup for the open
  // attendee succeeds (lookups[i].filled becomes truthy). Errors leave
  // the modal open so the user can correct the code in place.
  useEffect(() => {
    if (gospelerModalIdx !== null && lookups[gospelerModalIdx]?.filled) {
      setGospelerModalIdx(null);
    }
  }, [gospelerModalIdx, lookups]);

  async function autoFillFromGospelerId(i) {
    const code = (lookups[i]?.code || '').trim();
    if (!code) {
      setLookup(i, { error: 'Enter your Gospeler ID code first.' });
      return;
    }
    setLookup(i, { loading: true, error: '', filled: '' });
    try {
      const g = await api.getGospelerByCode(code);
      // Split full_name → "Other Names" + "Surname". Heuristic: last
      // whitespace-separated token = lastName, rest = firstName. Matches the
      // mobile form's split convention so a roundtrip is stable.
      const parts = String(g.full_name || '').trim().split(/\s+/);
      const last  = parts.length > 1 ? parts.pop() : '';
      const first = parts.join(' ');
      const bracket = g.age_bracket || '';
      setAttendees((prev) => prev.map((x, y) => y === i ? {
        ...x,
        firstName:      first   || x.firstName,
        lastName:       last    || x.lastName,
        title:          g.title         || x.title,
        sex:            g.gender        || x.sex,
        maritalStatus:  g.church_status || x.maritalStatus,
        ageBracket:     bracket         || x.ageBracket,
        ageGroup:       ageGroupFromBracket(bracket || x.ageBracket),
        phone:          g.phone         || x.phone,
        email:          g.email         || x.email,
        city:           g.city          || x.city,
        country:        g.country       || x.country,
        region:         g.region        || x.region,
        district:       g.district      || x.district,
        assembly:       g.assembly      || x.assembly,
        emergencyName:  g.emergency_contact_name  || x.emergencyName,
        emergencyPhone: g.emergency_contact_phone || x.emergencyPhone,
        // Gospeler ID stores photo as raw base64 (no data: prefix). Wrap as a
        // JPEG data URL — the upload path uses the same shape so the badge /
        // ticket / PDF renderers don't have to branch on origin.
        photo: g.photo_base64
          ? (String(g.photo_base64).startsWith('data:')
              ? g.photo_base64
              : `data:image/jpeg;base64,${g.photo_base64}`)
          : x.photo,
      } : x));
      setLookup(i, { loading: false, error: '', filled: g.gospeler_code });
    } catch (err) {
      setLookup(i, {
        loading: false,
        error: err.status === 404
          ? 'No Gospeler ID matches that code. Double-check the spelling.'
          : (err.message || 'Could not look up that ID. Try again in a moment.'),
      });
    }
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadErr('');
    api.getEvent(id)
      .then((data) => {
        if (cancelled) return;
        setEv(data || null);
        if (data?.ticketTypes?.[0])   setTicketTypeId(data.ticketTypes[0].id);
        if (data?.accommodation?.[0]) setAccommodationId(data.accommodation[0].id);
      })
      .catch((e) => {
        if (cancelled) return;
        setEv(null);
        setLoadErr(e?.message || 'Could not load this event.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    // Fetch existing tickets so the seat map can grey out taken seats. Best-
    // effort: don't block the form on this; if it fails we just start with
    // an empty taken-set and the seats step refetches when it opens.
    api.listEventTickets(id)
      .then((rows) => { if (!cancelled) setTakenSeats(extractSeatLabels(rows)); })
      .catch(() => { if (!cancelled) setTakenSeats([]); });

    return () => { cancelled = true; };
  }, [id]);

  const ticketType = useMemo(
    () => ev?.ticketTypes.find((t) => t.id === ticketTypeId),
    [ev, ticketTypeId],
  );
  const accommodation = useMemo(
    () => ev?.accommodation.find((a) => a.id === accommodationId),
    [ev, accommodationId],
  );

  // Resize attendees array whenever quantity changes.
  useEffect(() => {
    setAttendees((prev) => {
      if (quantity === prev.length) return prev;
      if (quantity > prev.length) {
        return [...prev, ...Array(quantity - prev.length).fill(0).map(emptyAttendee)];
      }
      return prev.slice(0, quantity);
    });
    // Keep seatPicks in sync so we don't end up with stale picks for
    // attendees that no longer exist (or undefined slots for new ones).
    setSeatPicks((prev) => {
      const out = prev.slice(0, quantity);
      while (out.length < quantity) out.push('');
      return out;
    });
  }, [quantity]);

  // When the user arrives at the seats step, re-fetch taken seats so a seat
  // freshly claimed by someone else gets greyed out before the picker is
  // interacted with. Stale here means a double-booking attempt.
  useEffect(() => {
    if (STEPS[stepIdx]?.id !== 'seats' || !ev?.seating?.rows) return;
    let cancelled = false;
    api.listEventTickets(id).then((rows) => {
      if (!cancelled) setTakenSeats(extractSeatLabels(rows));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [stepIdx, id, ev]);

  if (loading) return <div className="text-zinc-500">Loading…</div>;
  if (!ev) {
    return (
      <div className="card p-10 text-center space-y-4">
        <h1 className="text-xl font-extrabold tracking-tight">Event not found</h1>
        <p className="text-sm text-zinc-500">
          We couldn’t find an event with id <span className="font-mono text-ink">{id}</span>
          {' '}from this device. The share link may have been created against a different
          backend, or the event hasn’t been published yet.
        </p>
        {loadError && (
          <p className="text-xs text-muted-coral">{loadError}</p>
        )}
        <div className="flex flex-wrap gap-2 justify-center pt-2">
          <Link to="/events" className="btn-soft">Browse events</Link>
          <Link to="/" className="btn-soft">Home</Link>
        </div>
      </div>
    );
  }

  // Login-required gate. The creator marked this event as signed-in only —
  // show a friendly sign-in prompt instead of the form, with a redirect
  // back to this page so the user lands on the registration screen after
  // signing in. Render before the form so unauthenticated registrants
  // never see the fields (and we don't waste a POST that the backend
  // would reject with 401 anyway).
  if (ev.requiresLogin && !isAuthenticated) {
    const redirectTo = encodeURIComponent(location.pathname + location.search);
    return (
      <div className="card p-8 text-center space-y-4 max-w-md mx-auto">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 ring-1 ring-brand-200 mx-auto">
          <Lock className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-extrabold tracking-tight">Sign in to register</h1>
        <p className="text-sm text-on-surface-variant">
          The organiser made <strong>{ev.title}</strong> sign-in only. Use Google or a magic-link email — it takes a few seconds and you'll come straight back here to complete your registration.
        </p>
        <div className="pt-2">
          <Link to={`/login?redirect=${redirectTo}`} className="btn-primary inline-flex">
            Sign in to continue
          </Link>
        </div>
      </div>
    );
  }

  const totalCents =
    (ticketType?.priceCents || 0) * quantity +
    (accommodation?.priceCents || 0) * quantity;
  const ticketLeft = (ticketType?.capacity || 0) - (ticketType?.sold || 0);

  // The seats and accommodation steps are both optional — we skip them when
  // the event has no corresponding config. Compare by step id so the index
  // math doesn't drift if the step order changes again.
  const stepId = STEPS[stepIdx]?.id;
  const hasSeating = !!(ev?.seating?.rows && ev?.seating?.seatsPerRow);
  const hasAccommodation = (ev?.accommodation?.length || 0) > 0;

  function validateStep() {
    setError('');
    if (stepId === 'ticket') {
      if (!ticketType) { setError('Pick a ticket type.'); return false; }
      if (quantity > ticketLeft) { setError(`Only ${ticketLeft} of this ticket left.`); return false; }
    }
    if (stepId === 'people') {
      if (groupMode === 'group') {
        if (!groupName.trim()) { setError('Group name is required.'); return false; }
        if (groupLeadEmail && !/^\S+@\S+\.\S+$/.test(groupLeadEmail)) {
          setError('Lead contact email must be a valid email (or leave blank).');
          return false;
        }
      }
      for (let i = 0; i < attendees.length; i++) {
        const a = attendees[i];
        const tag = `Attendee ${i + 1}`;
        if (!a.lastName.trim())   { setError(`${tag}: Surname is required.`);        return false; }
        if (!a.firstName.trim())  { setError(`${tag}: Other Names are required.`);   return false; }
        if (!a.title)             { setError(`${tag}: Title is required.`);          return false; }
        if (!a.sex)               { setError(`${tag}: Sex is required.`);            return false; }
        if (!a.maritalStatus)     { setError(`${tag}: Status is required.`);         return false; }
        // Location fields are required for the standard form, but suppressed
        // entirely for templates that opt out (e.g. christian-movie-night)
        // — the Contact & Location block is hidden in that case, so we'd
        // be blocking the user on fields they can't see.
        if (!behavior.hidePersonalLocation) {
          if (!a.city.trim())       { setError(`${tag}: City of Residence is required.`); return false; }
          if (!a.country)           { setError(`${tag}: Country is required.`);        return false; }
          if (!a.region)            { setError(`${tag}: Region is required.`);         return false; }
          if (!a.district)          { setError(`${tag}: District is required.`);       return false; }
          if (!a.assembly)          { setError(`${tag}: Assembly is required.`);       return false; }
        }
        if (!a.ageBracket)        { setError(`${tag}: Age Bracket is required.`);    return false; }
        if (!a.phone.trim())      { setError(`${tag}: Phone Number is required.`);   return false; }
        if (a.email && !/^\S+@\S+\.\S+$/.test(a.email)) {
          setError(`${tag}: E-mail Address must be valid (or leave blank).`); return false;
        }
        if (!behavior.hidePersonalLocation && !a.conventionLocation) {
          setError(`${tag}: Convention Location is required.`); return false;
        }
        if (!a.emergencyName.trim())  { setError(`${tag}: Emergency contact name is required.`);  return false; }
        if (!a.emergencyPhone.trim()) { setError(`${tag}: Emergency contact phone is required.`); return false; }
      }
    }
    if (stepId === 'room') {
      if (hasAccommodation && !accommodation) {
        setError('Pick an accommodation option.');
        return false;
      }
    }
    if (stepId === 'seats') {
      // Seat selection is mandatory for seated events: registrants must
      // explicitly pick every seat in the order before continuing. Auto-
      // assign is no longer the fallback — the share-link recipient sees
      // the map and chooses, the same way they would at a kiosk.
      const picked = seatPicks.filter(Boolean).length;
      if (picked < quantity) {
        const remaining = quantity - picked;
        setError(
          picked === 0
            ? `Pick ${quantity} seat${quantity === 1 ? '' : 's'} on the map before continuing.`
            : `Pick ${remaining} more seat${remaining === 1 ? '' : 's'} before continuing.`,
        );
        return false;
      }
    }
    if (stepId === 'review') {
      if (!consent) { setError('Please agree to the event terms.'); return false; }
    }
    return true;
  }

  // Find the next/previous visible step, honoring skip-when-unconfigured.
  function findStep(from, dir) {
    let i = from + dir;
    while (i >= 0 && i < STEPS.length) {
      const sid = STEPS[i].id;
      if (sid === 'room'  && !hasAccommodation) { i += dir; continue; }
      if (sid === 'seats' && !hasSeating)       { i += dir; continue; }
      return i;
    }
    return Math.max(0, Math.min(STEPS.length - 1, from + dir));
  }

  function next() {
    if (!validateStep()) return;
    setStepIdx((s) => findStep(s, +1));
  }
  function back() {
    setStepIdx((s) => findStep(s, -1));
  }

  async function submit() {
    if (!validateStep()) return;
    setSubmitting(true);
    try {
      // Build the optional group block. Leave it null for solo registrations
      // so server can branch on `payload.group` without truthy gymnastics.
      const groupPayload = groupMode === 'group' ? {
        type:      groupType,
        name:      groupName.trim(),
        leadEmail: groupLeadEmail.trim() || (attendees[0]?.email || ''),
      } : null;

      // Seats are mandatory for seated events: validateStep enforces a full
      // selection before this code runs, so we trust seatPicks here. For
      // un-seated events we pass null so the backend doesn't try to assign.
      const seatLabels = hasSeating ? seatPicks : null;

      const registerPayload = {
        ticketTypeId,
        accommodationId: accommodation ? accommodationId : null,
        attendees,
        group: groupPayload,
        seatLabels,
        referrer: referrer || null,
        // Only attached when the template ran Quick RSVP first and handed
        // off to this wizard (e.g. christian-movie-night). The backend
        // stores the bag on every minted ticket in custom_answers JSONB
        // so the organizer can read the RSVP responses from the ticket
        // detail page later.
        ...(rsvpAnswers ? { customAnswers: rsvpAnswers } : {}),
      };

      // Paid path — kick off the payment, stash the registration payload
      // keyed by the provider's reference, and redirect to the gateway.
      // PaymentCallback.jsx picks it back up after the user returns.
      if ((ticketType?.priceCents || 0) > 0) {
        const payerEmail = (attendees[0]?.email || user?.email || '').trim();
        if (!payerEmail) {
          setError("The first attendee's email is required for payment.");
          setSubmitting(false);
          return;
        }

        // Bank-transfer fork — skip the online-provider redirect. Attendee
        // sends money themselves and uploads a screenshot for the organizer
        // to approve manually. We POST a pending row and surface a
        // "Waiting for approval" confirmation screen.
        if (paymentProvider === 'bank-transfer') {
          if (!bankProofImage) {
            setError('Please upload a screenshot of your bank transfer.');
            setSubmitting(false);
            return;
          }
          try {
            const pending = await api.submitPendingRegistration(id, {
              ...registerPayload,
              proofImage: bankProofImage,
              transferReference: bankTransferReference || null,
            });
            setConfirmation({
              pending: true,
              pendingId: pending.id,
              message: pending.message,
              eventTitle: ev.title,
            });
          } catch (err) {
            setError(err.message || 'Could not submit your registration.');
          } finally {
            setSubmitting(false);
          }
          return;
        }

        const callbackUrl = `${window.location.origin}/payments/callback`;
        const init = await api.initializeEventPayment({
          eventId:         id,
          provider:        paymentProvider,
          email:           payerEmail,
          ticketTypeId,
          accommodationId: accommodation ? accommodationId : null,
          quantity,
          callbackUrl,
        });
        if (!init?.ok || !init.authorizationUrl) {
          setError(init?.error || 'Could not start the payment.');
          setSubmitting(false);
          return;
        }
        stashPending(init.reference, {
          eventId:             id,
          provider:            init.provider,
          paymentSessionToken: init.paymentSessionToken,
          payload:             registerPayload,
          createdAt:           Date.now(),
        });
        // window.location (not navigate) — the user is leaving the SPA.
        window.location.href = init.authorizationUrl;
        return;
      }

      // Free path — original behaviour.
      const result = await api.register(id, registerPayload);

      // Fire confirmation channels for each ticket — kicked off in parallel,
      // failures non-blocking. Email always; SMS only if the attendee provided
      // a phone (the SMS endpoint also re-checks the opt-in flag server-side).
      //
      // Group/family registrations: the primary registrant (attendee 1 or the
      // group lead) also receives a copy of every ticket so they have the
      // whole batch in their inbox without each attendee forwarding theirs.
      // The backend dedupes per-recipient so the primary attendee doesn't
      // get their own ticket twice.
      const primaryEmail = (
        (groupMode === 'group' && groupLeadEmail) || attendees[0]?.email || ''
      ).trim().toLowerCase();

      // Pass the full ticket object — not just the code — because on a fresh
      // device the ticket lives only on the backend; a code-only lookup hits
      // localStorage, finds nothing, and silently skips the send.
      (result.tickets || []).forEach((t) => {
        const ownerEmail = (t.attendeeEmail || '').trim().toLowerCase();
        if (ownerEmail) api.sendConfirmationEmail(t);
        // CC the primary registrant on every ticket whose owner email differs
        // (or is blank — covers attendees who didn't provide their own email).
        if (primaryEmail && primaryEmail !== ownerEmail) {
          api.sendConfirmationEmail(t, primaryEmail);
        }
        if (t.attendeePhone) api.sendConfirmationSms(t);
      });

      // Schedule pre-event reminders. Two windows by default (T-1 day,
      // T-1 hour) — backend dedupe key is (ticketCode, kind), so re-running
      // submit on a network retry won't double-queue.
      if (ev?.startsAt) {
        const startMs = new Date(ev.startsAt).getTime();
        const dayBefore  = new Date(startMs - 24 * 60 * 60 * 1000).toISOString();
        const hourBefore = new Date(startMs -  1 * 60 * 60 * 1000).toISOString();
        (result.tickets || []).forEach((t) => {
          if (startMs - Date.now() > 24 * 60 * 60 * 1000) {
            api.scheduleReminder({ ticket: t, sendAt: dayBefore,  kind: 'event_t_minus_1d', channels: ['email'] });
          }
          if (startMs - Date.now() > 1 * 60 * 60 * 1000) {
            api.scheduleReminder({ ticket: t, sendAt: hourBefore, kind: 'event_t_minus_1h', channels: ['email'] });
          }
        });
      }

      setConfirmation(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  // Short RSVP-form branch — when the event template defines customQuestions
  // we default to the short form, but render a toggle at the top so the
  // registrant can flip to the detailed default wizard if they prefer. The
  // toggle is hidden once the user is on the confirmation screen.
  const hasCustomForm = !!ev?.customQuestions?.length;
  const behavior = templateBehavior(ev?.templateId);

  // Hand-off from Quick RSVP back to this page. Two shapes:
  //   { tickets: [...] }                — legacy: RsvpForm submitted directly,
  //                                       show the confirmation screen.
  //   { continueToWizard, answers }     — continueMode: RsvpForm captured the
  //                                       answers but did NOT post anything,
  //                                       so we flip into the wizard with the
  //                                       identity fields pre-applied to
  //                                       attendee #1.
  function handleRsvpComplete(result) {
    if (result?.continueToWizard) {
      const a = result.answers || {};
      setRsvpAnswers(a);
      setAttendees((prev) => {
        if (!prev.length) return prev;
        const head = { ...prev[0] };
        const first = String(a.first_name || a.name || '').trim();
        const last  = String(a.last_name || '').trim();
        const email = String(a.email || '').trim().toLowerCase();
        const phone = String(a.phone || '').trim();
        if (first) head.firstName = first;
        if (last)  head.lastName  = last;
        if (email) head.email     = email;
        if (phone) head.phone     = phone;
        return [head, ...prev.slice(1)];
      });
      setFormStyle('detailed');
      setStepIdx(0);
      return;
    }
    setConfirmation(result);
  }

  if (hasCustomForm && !confirmation && formStyle === 'quick') {
    // Same split-screen shell the wizard uses on /r/:id — image pinned to
    // the right half on md+, RSVP form flows in the left half. Mobile
    // keeps the single centered column.
    const rsvpBg = ev?.bannerUrl || attendeeBg;
    return (
      <>
        {inviteMode && (
          <div
            className="hidden md:block fixed inset-y-0 right-0 w-1/2 bg-cover bg-center z-0"
            style={{ backgroundImage: `url(${rsvpBg})` }}
            aria-hidden
          />
        )}
        <div className={`relative z-10 ${
          inviteMode
            ? 'md:mr-[50%] md:max-w-none md:pl-8 md:pr-10 md:py-6 max-w-xl mx-auto'
            : 'max-w-xl mx-auto'
        } space-y-4`}>
          {/* In continue-mode the Quick RSVP IS step 0 of one flow, not an
              alternative to the wizard — so the Quick/Detailed toggle is
              hidden to keep the path linear. */}
          {!behavior.rsvpContinueToWizard && (
            <FormStyleToggle current="quick" onChange={setFormStyle} />
          )}
          <RsvpForm
            event={ev}
            onComplete={handleRsvpComplete}
            continueMode={behavior.rsvpContinueToWizard}
          />
        </div>
      </>
    );
  }

  if (confirmation) {
    // Bank-transfer flow ends in a pending state — no ticket yet, attendee
    // waits for the organizer to approve before tickets + emails are
    // issued. Distinct UI so the user doesn't expect a code at the door.
    if (confirmation.pending) {
      return (
        <div className="max-w-lg mx-auto card p-6 sm:p-8 space-y-5 text-center">
          <div className="space-y-3">
            <Clock className="h-12 w-12 text-calm-amber mx-auto" />
            <h1 className="text-2xl font-extrabold tracking-tight">Waiting for approval</h1>
            <p className="text-zinc-600 text-sm leading-relaxed">
              {confirmation.message
                || `We've received your registration for ${confirmation.eventTitle || 'this event'}. The organizer will verify your transfer and email your ticket once approved — usually within 24 hours.`}
            </p>
          </div>
          <div className="rounded-xl bg-calm-amber/10 border border-calm-amber/30 p-4 text-sm text-zinc-700 leading-relaxed">
            Keep an eye on your inbox. If the transfer can't be verified you'll
            get an email with the reason and a link to re-submit.
          </div>
          {ev?.id && (
            <Link to={`/r/${ev.id}`} className="btn-soft inline-flex">Back to event</Link>
          )}
        </div>
      );
    }

    const codes = confirmation.tickets || [];
    const groupRow = codes[0]?.groupName
      ? GROUP_TYPES.find((g) => g.id === codes[0].groupType) || null
      : null;
    return (
      <div className="max-w-lg mx-auto card p-6 sm:p-8 space-y-5">
        <div className="text-center space-y-3">
          <CheckCircle2 className="h-12 w-12 text-tertiary mx-auto" />
          <h1 className="text-2xl font-extrabold tracking-tight">You’re registered!</h1>
          {groupRow && (
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${groupRow.chip}`}>
              <span>{groupRow.emoji}</span>
              <span>{codes[0].groupName}</span>
              <span className="text-zinc-500 font-normal">· {codes.length} {codes.length === 1 ? 'ticket' : 'tickets'}</span>
            </div>
          )}
          <p className="text-zinc-600 text-sm">
            {codes.length === 1
              ? codes[0].attendeeEmail
                ? <>Confirmation sent to <strong>{codes[0].attendeeEmail}</strong>.</>
                : <>Your ticket is ready. Save the code below.</>
              : <>You have <span className="font-bold">{codes.length}</span> tickets. A confirmation has been sent to each attendee with an email on file.</>}
          </p>
        </div>

        {/* Mail-first banner: every confirmation email carries the ticket,
            badge and filled-form PDFs as attachments AND inline download
            buttons, so the recipient never has to come back to the website
            to grab their copies. Surface that prominently here so the
            primary CTA is "go check your inbox", not "open another page". */}
        <div className="rounded-xl ring-1 ring-brand-200 bg-brand-50/60 p-4 text-sm text-on-surface">
          <div className="font-bold tracking-tight mb-1 flex items-center gap-2">
            <Mail className="h-4 w-4 text-brand-700" /> Check your email
          </div>
          <p className="text-on-surface-variant">
            Your <strong>ticket</strong>, <strong>badge</strong> and the <strong>filled registration form</strong> are attached to the confirmation email
            {codes[0]?.attendeeEmail ? <> we just sent to <strong>{codes[0].attendeeEmail}</strong></> : null}.
            Tap the attachments (or the download buttons in the email body) to save them — no need to come back here.
          </p>
        </div>

        {/* Inline tag preview — gives the registrant something to show right
            now without first clicking through. Multi-ticket batches show all
            attendees stacked. */}
        <div className="space-y-2">
          {codes.slice(0, 4).map((t) => (
            <TicketTag key={t.code} ticket={t} compact={codes.length > 1} showQr={codes.length === 1} />
          ))}
          {codes.length > 4 && (
            <p className="text-xs text-zinc-500 text-center">
              + {codes.length - 4} more — open “View tickets” to see them all.
            </p>
          )}
        </div>

        {/* Action row. In invite mode the only "back" link is suppressed —
            the recipient was sent here for one event and has nothing to
            browse back to. */}
        <div className="flex flex-wrap gap-2 justify-center pt-1">
          {!inviteMode && codes.length === 1 && (
            <Link to={`/tickets/${codes[0].code}`} className="btn-primary">View ticket</Link>
          )}
          {!inviteMode && codes.length > 1 && (
            <Link to="/tickets" className="btn-primary">View tickets</Link>
          )}
          {!inviteMode && codes[0] && (
            <Link to={`/tickets/${codes[0].code}/badge`} className="btn-soft">
              <IdCard className="h-4 w-4" /> Print badge
            </Link>
          )}
          {!inviteMode && codes[0] && (
            <Link to={`/tickets/${codes[0].code}/email`} className="btn-soft">Preview email</Link>
          )}
          {!inviteMode && <Link to="/events" className="btn-soft">Back to events</Link>}
        </div>
      </div>
    );
  }

  // Compute visible step index (skipping seats / accommodation when the event
  // doesn't have them) so the progress bar and "Step N of M" label match what
  // the user actually sees. Used only by the mobile-first stepper.
  const visibleSteps = STEPS.filter((s) => {
    if (s.id === 'room'  && !hasAccommodation) return false;
    if (s.id === 'seats' && !hasSeating)       return false;
    return true;
  });
  const visibleIdx = Math.max(0, visibleSteps.findIndex((s) => s.id === stepId));
  const visibleCount = visibleSteps.length;
  const progressPct = Math.round(((visibleIdx + 1) / visibleCount) * 100);

  // Sign-in-style split layout: form pinned to the left half of the
  // viewport, image pinned to the right. Enabled for every step in invite
  // mode so the recipient sees a consistent two-pane registration shell.
  // On mobile (under md) the image hides and the form takes full width.
  //
  // Image source resolves to the event's own banner if the creator set
  // one, falling back to the bundled attendeeBg illustration. Either way
  // the visual anchor sits next to the form for the entire flow.
  const splitLayout = inviteMode;
  const splitBg     = ev?.bannerUrl || attendeeBg;

  return (
    <>
    {splitLayout && (
      <div
        className="hidden md:block fixed inset-y-0 right-0 w-1/2 bg-cover bg-center z-0"
        style={{ backgroundImage: `url(${splitBg})` }}
        aria-hidden
      />
    )}
    <div className={`relative z-10 ${
      splitLayout
        ? 'md:mr-[50%] md:max-w-none md:pl-8 md:pr-10 md:py-6 max-w-3xl mx-auto'
        : (inviteMode ? 'max-w-md mx-auto' : 'max-w-3xl mx-auto')
    } space-y-5`}>
      {/* Form-style toggle — only when the event template offers a short
          custom form AND isn't in "continue to wizard" mode. Continue-mode
          treats the Quick RSVP as step 0 of one linear flow, so flipping
          back would be confusing. */}
      {hasCustomForm && !behavior.rsvpContinueToWizard && (
        <FormStyleToggle current="detailed" onChange={setFormStyle} />
      )}

      {/* Back-link only on the desktop/admin flow. Invite-mode recipients
          were sent the link for this event specifically; there's no prior
          page on this device to go back to. */}
      {!inviteMode && (
        <Link to={`/events/${id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-500 hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> Back to event
        </Link>
      )}

      <div>
        <h1 className={`${inviteMode ? 'text-2xl' : 'text-3xl'} font-extrabold tracking-tight`}>
          {inviteMode ? ev.title : 'Register'}
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          {inviteMode ? 'Reserve your spot in a few quick steps' : <>for {ev.title}</>}
        </p>
      </div>

      {/* Step indicator — minimal "Step N of M · Label" row. The horizontal
          progress-fill bar and the full pill row of step labels used to live
          here; both were removed because the count line already tells the
          user where they are, and the bar competed visually with the form
          card directly below. */}
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-on-surface-variant">
        <span>Step {visibleIdx + 1} of {visibleCount}</span>
        <span className="text-on-surface-variant/40">·</span>
        <span className="text-brand-700">{STEPS[stepIdx]?.label}</span>
      </div>

      {/* Step body. Tighter padding on phones so the form gets every pixel
          of horizontal room — the location/contact grid in particular is
          unusable when the card eats 24px on each side of a 360px screen. */}
      <div className="card p-4 sm:p-6">
        {stepId === 'ticket' && (
          <div className="space-y-5">
            <h2 className="font-bold tracking-tight flex items-center gap-2">
              <TicketIcon className="h-4 w-4 text-brand-600" /> Select a ticket
            </h2>
            <div className="space-y-2">
              {ev.ticketTypes.map((t) => {
                const left = (t.capacity || 0) - (t.sold || 0);
                const disabled = left <= 0;
                return (
                  <label
                    key={t.id}
                    className={`flex items-center gap-3 p-4 rounded-lg ring-1 cursor-pointer transition ${
                      disabled ? 'opacity-50 cursor-not-allowed ring-outline-variant/15'
                      : ticketTypeId === t.id ? 'ring-primary-600 bg-primary-50/60'
                      : 'ring-outline-variant/15 hover:ring-outline-variant/40'
                    }`}
                  >
                    <input
                      type="radio" name="tt"
                      checked={ticketTypeId === t.id}
                      onChange={() => !disabled && setTicketTypeId(t.id)}
                      disabled={disabled}
                      className="accent-brand-600"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold">{t.name}</div>
                      <div className="text-xs text-zinc-500 mt-0.5">{t.description}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold tabular">{priceLabel(t.priceCents)}</div>
                      <div className="text-xs text-zinc-500">{disabled ? 'Sold out' : `${left} left`}</div>
                    </div>
                  </label>
                );
              })}
            </div>

            <div>
              <label className="label">Quantity</label>
              <div className="inline-flex items-center rounded-lg ring-1 ring-outline-variant/20 bg-white">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="px-3 py-2 hover:bg-zinc-50 disabled:opacity-30"
                  disabled={quantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="px-4 tabular font-bold">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(ticketLeft || 10, q + 1))}
                  className="px-3 py-2 hover:bg-zinc-50 disabled:opacity-30"
                  disabled={quantity >= (ticketLeft || 10)}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs text-zinc-500 mt-2">
                One attendee form per ticket. You can buy up to {ticketLeft || 0} of this type.
              </p>
            </div>
          </div>
        )}

        {stepId === 'people' && (
          <div className="space-y-5">
            {/* On mobile only — the fixed left-half image is hidden on
                mobile, so show a short banner version of it at the top of
                the form to keep some visual anchor. */}
            <div
              className="md:hidden h-40 -mx-4 sm:-mx-0 rounded-2xl overflow-hidden bg-cover bg-center shadow-md ring-1 ring-black/5"
              style={{ backgroundImage: `url(${attendeeBg})` }}
              aria-hidden
            />
            <div className="space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-700/80">
                Step 2 of {visibleCount}
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-on-surface">
                Who's coming?
              </h2>
              <p className="text-[13px] text-on-surface-variant max-w-md leading-relaxed">
                Tell us a little about each attendee so we can prep their badge and seat.
              </p>
            </div>

            <h2 className="font-bold tracking-tight flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-brand-600" /> Attendee details
            </h2>

            {/* Group mode toggle — registrar picks "I'm registering a group"
                to surface 3 extra fields. Skips the 3-field block entirely
                for solo registrations so the form stays light by default. */}
            <div className="rounded-lg ring-1 ring-outline-variant/20 p-3 bg-zinc-50/40">
              <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
                Registration type
              </div>
              <div className="inline-flex rounded-lg ring-1 ring-outline-variant/20 bg-white overflow-hidden">
                <button
                  type="button"
                  onClick={() => setGroupMode('individual')}
                  className={`px-4 py-2 text-sm font-semibold inline-flex items-center gap-2 ${
                    groupMode === 'individual' ? 'bg-brand-50 text-brand-700' : 'text-zinc-600 hover:bg-zinc-50'
                  }`}
                >
                  <UserPlus className="h-4 w-4" /> Individual
                </button>
                <button
                  type="button"
                  onClick={() => setGroupMode('group')}
                  className={`px-4 py-2 text-sm font-semibold inline-flex items-center gap-2 border-l border-zinc-200 ${
                    groupMode === 'group' ? 'bg-brand-50 text-brand-700' : 'text-zinc-600 hover:bg-zinc-50'
                  }`}
                >
                  <Users className="h-4 w-4" /> Group
                </button>
              </div>

              {groupMode === 'group' && (
                <div className="mt-4 grid sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-3">
                    <label className="label">Group type</label>
                    <div className="flex flex-wrap gap-2">
                      {GROUP_TYPES.map((g) => (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => setGroupType(g.id)}
                          className={`px-3 py-1.5 rounded-full text-sm font-semibold ring-1 transition ${
                            groupType === g.id
                              ? 'ring-brand-600 bg-brand-50 text-brand-700'
                              : 'ring-zinc-200 text-zinc-600 hover:ring-zinc-300'
                          }`}
                        >
                          <span className="mr-1">{g.emoji}</span>{g.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label">Group name</label>
                    <input
                      className="input"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      placeholder={
                        groupType === 'church'     ? 'e.g. Cell Group 12, Lagos Province' :
                        groupType === 'family'     ? 'e.g. The Adeyemi Family' :
                                                     'e.g. Choir Department'
                      }
                    />
                  </div>
                  <div>
                    <label className="label">Lead contact email</label>
                    <input
                      type="email"
                      className="input"
                      value={groupLeadEmail}
                      onChange={(e) => setGroupLeadEmail(e.target.value)}
                      placeholder="(defaults to attendee 1)"
                    />
                  </div>
                </div>
              )}
            </div>

            {attendees.map((a, i) => {
              // Patcher — sets one field; clears the district when the region
              // changes so we never save a stale combination from the datalist.
              const patch = (delta) => setAttendees((p) => p.map((x, y) => y === i ? { ...x, ...delta } : x));
              const onRegion   = (e) => patch({ region: e.target.value, district: '' });
              const onBracket  = (e) => patch({ ageBracket: e.target.value, ageGroup: ageGroupFromBracket(e.target.value) });

              const districts = districtsFor(a.region);
              const regionListId   = `reg-list-${i}`;
              const districtListId = `dist-list-${i}`;

              return (
                <div key={i} className="surface-inset p-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="font-display font-bold text-on-surface">Attendee {i + 1}</div>
                    <span className="chip">{i === 0 ? 'Primary' : `#${i + 1}`}</span>
                  </div>

                  {/* — Gospeler ID auto-fill —
                      The long code-entry block was replaced with a single
                      icon button. Clicking it opens a focused modal
                      (rendered once at the root of this screen) where the
                      user types the GSP-2026-XXXXXXXX code. Successful
                      lookup writes back into the attendee fields and shows
                      the chip below as confirmation. */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setGospelerModalIdx(i)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg ring-1 ring-brand-200 bg-brand-50/40 hover:bg-brand-50 text-xs font-semibold text-brand-700 transition"
                      title="Auto-fill from your Gospeler ID"
                    >
                      <IdCard className="h-3.5 w-3.5" strokeWidth={2} />
                      Use Gospeler ID
                    </button>
                    {lookups[i]?.filled && (
                      <span className="inline-flex items-center gap-1 text-xs text-tertiary font-semibold">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Filled from {lookups[i].filled}
                      </span>
                    )}
                  </div>

                  {/* — Personal — */}
                  <div className="space-y-4">
                    <div className="text-[10px] font-semibold tracking-[0.14em] uppercase text-on-surface-variant">
                      Personal
                    </div>

                    {/* — Headshot upload (optional). Lands on the badge + ticket
                        PDFs that go out in the confirmation email. Skipped
                        silently when the registrant doesn't add one. — */}
                    <PhotoPicker
                      value={a.photo}
                      onChange={(dataUrl) => patch({ photo: dataUrl })}
                    />

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="label">Surname *</label>
                        <input className="input" placeholder="E.g. Doe" value={a.lastName}
                          onChange={(e) => patch({ lastName: e.target.value })} />
                      </div>
                      <div>
                        <label className="label">Other Names *</label>
                        <input className="input" placeholder="E.g. John" value={a.firstName}
                          onChange={(e) => patch({ firstName: e.target.value })} />
                      </div>
                      <div>
                        <label className="label">Title *</label>
                        <select className="input" value={a.title} onChange={(e) => patch({ title: e.target.value })}>
                          <option value="">Select Title</option>
                          {TITLES.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="label">Sex *</label>
                        <select className="input" value={a.sex} onChange={(e) => patch({ sex: e.target.value })}>
                          <option value="">Select Sex</option>
                          {SEXES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="label">Status *</label>
                        <select className="input" value={a.maritalStatus} onChange={(e) => patch({ maritalStatus: e.target.value })}>
                          <option value="">Select Status</option>
                          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="label">Age Bracket *</label>
                        <select className="input" value={a.ageBracket} onChange={onBracket}>
                          <option value="">Age Bracket</option>
                          {AGE_BRACKETS.map((b) => <option key={b} value={b}>{b}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* — Contact & Location — */}
                  <div className="space-y-4">
                    <div className="text-[10px] font-semibold tracking-[0.14em] uppercase text-on-surface-variant">
                      {behavior.hidePersonalLocation ? 'Contact' : 'Contact & Location'}
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="label">Phone Number *</label>
                        <input className="input" placeholder="Phone Number" value={a.phone}
                          onChange={(e) => patch({ phone: e.target.value })} />
                      </div>
                      <div>
                        <label className="label">E-mail Address</label>
                        {(() => {
                          // Only the FIRST attendee gets the auto-bind to
                          // the account email (so the ticket lands in their
                          // Tickets page). Override unlocks the field so
                          // they can type any address — useful for
                          // registering a spouse, child, colleague, etc.
                          const isAccountBound = i === 0 && !!user?.email;
                          const locked = isAccountBound && !emailOverridden;
                          return (
                            <>
                              <input
                                type="email"
                                className={`input ${locked ? 'bg-zinc-100 cursor-not-allowed' : ''}`}
                                placeholder="E-mail"
                                value={a.email}
                                onChange={(e) => patch({ email: e.target.value })}
                                readOnly={locked}
                                title={locked ? 'Bound to your account email — click "Use a different email" below to override.' : undefined}
                              />
                              {isAccountBound && (
                                <div className="mt-1 flex items-start justify-between gap-3 flex-wrap">
                                  {locked ? (
                                    <p className="text-[11px] text-on-surface-variant inline-flex items-center gap-1">
                                      <Lock className="h-3 w-3" strokeWidth={2.25} />
                                      Bound to your account so the ticket appears in your Tickets page.
                                    </p>
                                  ) : (
                                    <p className="text-[11px] text-on-surface-variant inline-flex items-center gap-1">
                                      Using a different email — this ticket won't appear in your /tickets list.
                                    </p>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (emailOverridden) {
                                        // Revert to account email
                                        setEmailOverridden(false);
                                        patch({ email: String(user.email || '').toLowerCase() });
                                      } else {
                                        // Unlock + clear so the user can type
                                        setEmailOverridden(true);
                                        patch({ email: '' });
                                      }
                                    }}
                                    className="text-[11px] font-semibold text-brand-600 hover:text-brand-700 underline-offset-2 hover:underline shrink-0"
                                  >
                                    {emailOverridden ? 'Use my account email' : 'Use a different email'}
                                  </button>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                      {/* Location-y fields — hidden for templates that opt
                          out (e.g. christian-movie-night), since their venue
                          is local-only and the church-membership taxonomy
                          (region / district / assembly / convention) is
                          overkill for casual events. */}
                      {!behavior.hidePersonalLocation && (
                        <>
                          <div>
                            <label className="label">City of Residence *</label>
                            <input className="input" placeholder="City of Residence" value={a.city}
                              onChange={(e) => patch({ city: e.target.value })} />
                          </div>
                          <div>
                            <label className="label">Country *</label>
                            <select className="input" value={a.country} onChange={(e) => patch({ country: e.target.value })}>
                              {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="label">Region *</label>
                            <input
                              className="input"
                              list={regionListId}
                              value={a.region}
                              onChange={onRegion}
                              placeholder="Select Region (or type your own)"
                              autoComplete="off"
                            />
                            <datalist id={regionListId}>
                              {REGIONS.map((r) => <option key={r} value={r} />)}
                            </datalist>
                          </div>
                          <div>
                            <label className="label">District *</label>
                            <input
                              className="input"
                              list={districtListId}
                              value={a.district}
                              onChange={(e) => patch({ district: e.target.value })}
                              placeholder={a.region ? 'Select District (or type your own)' : 'Type or pick from list'}
                              autoComplete="off"
                            />
                            <datalist id={districtListId}>
                              {districts.map((d) => <option key={d} value={d} />)}
                            </datalist>
                          </div>
                          <div className="sm:col-span-2">
                            <label className="label">Assembly *</label>
                            <input
                              className="input"
                              value={a.assembly}
                              onChange={(e) => patch({ assembly: e.target.value })}
                              placeholder="Type your assembly name"
                              autoComplete="off"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="label">Convention Location *</label>
                            <select className="input" value={a.conventionLocation}
                              onChange={(e) => patch({ conventionLocation: e.target.value })}>
                              {CONVENTION_LOCATIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* — Other — */}
                  <div className="space-y-4">
                    <div className="text-[10px] font-semibold tracking-[0.14em] uppercase text-on-surface-variant">
                      Other
                    </div>
                    <div>
                      <label className="label">Other Information</label>
                      <textarea
                        className="input min-h-[5rem] resize-y"
                        placeholder="Anything else the organisers should know"
                        value={a.otherInfo}
                        onChange={(e) => patch({ otherInfo: e.target.value })}
                      />
                    </div>
                    <div className="grid sm:grid-cols-3 gap-4">
                      <div>
                        <label className="label">Dietary needs</label>
                        <input className="input" value={a.dietary}
                          onChange={(e) => patch({ dietary: e.target.value })} />
                      </div>
                      <div>
                        <label className="label">Emergency contact name *</label>
                        <input className="input" value={a.emergencyName}
                          onChange={(e) => patch({ emergencyName: e.target.value })} />
                      </div>
                      <div>
                        <label className="label">Emergency contact phone *</label>
                        <input className="input" value={a.emergencyPhone}
                          onChange={(e) => patch({ emergencyPhone: e.target.value })} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {stepId === 'room' && (
          <div className="space-y-5">
            <h2 className="font-bold tracking-tight flex items-center gap-2">
              <BedDouble className="h-4 w-4 text-brand-600" /> Accommodation
            </h2>
            <p className="text-xs text-zinc-500">One option for the whole group ({quantity} {quantity === 1 ? 'person' : 'people'}).</p>
            <div className="space-y-2">
              {ev.accommodation.map((a) => {
                const cap = a.capacity || 0;
                const left = cap - (a.taken || 0);
                const disabled = left < quantity;
                const pct = cap ? Math.min(100, Math.round(((a.taken || 0) / cap) * 100)) : 0;
                return (
                  <label
                    key={a.id}
                    className={`block p-4 rounded-lg ring-1 cursor-pointer transition ${
                      disabled ? 'opacity-50 cursor-not-allowed ring-outline-variant/15'
                      : accommodationId === a.id ? 'ring-primary-600 bg-primary-50/60'
                      : 'ring-outline-variant/15 hover:ring-outline-variant/40'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio" name="acc"
                        checked={accommodationId === a.id}
                        onChange={() => !disabled && setAccommodationId(a.id)}
                        disabled={disabled}
                        className="mt-1 accent-brand-600"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold">{a.name}</div>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          <span className="chip">{roomTypeLabel(a.type)}</span>
                          <span className={`chip ${a.sharing === 'private' ? 'chip-selected' : ''}`}>
                            {a.sharing === 'private' ? 'Private' : 'Shared'}
                          </span>
                        </div>
                        {a.description && <div className="text-xs text-zinc-500 mt-1.5">{a.description}</div>}
                      </div>
                      <div className="text-right">
                        <div className="font-bold tabular">
                          {a.priceCents ? `+${priceLabel(a.priceCents)}/person` : 'Included'}
                        </div>
                        <div className="text-xs text-zinc-500">
                          {disabled ? `Need ${quantity}, ${left} left` : `${left} of ${cap} left`}
                        </div>
                      </div>
                    </div>
                    {cap > 0 && (
                      <div className="mt-3 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${pct >= 100 ? 'bg-muted-coral' : pct >= 80 ? 'bg-calm-amber' : 'bg-brand-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {stepId === 'seats' && hasSeating && (
          <div className="space-y-5">
            <h2 className="font-bold tracking-tight flex items-center gap-2">
              <Armchair className="h-4 w-4 text-brand-600" /> Choose your seats
            </h2>
            <p className="text-xs text-zinc-500">
              Pick {quantity} seat{quantity === 1 ? '' : 's'} on the map below to continue. Use
              Auto-pick to place your group together quickly, or tap a seat again to clear it.
              You can't finish registration without selecting every seat.
            </p>
            <div className="text-xs text-on-surface-variant tabular">
              <strong className="text-on-surface">{seatPicks.filter(Boolean).length}</strong> of {quantity} seat{quantity === 1 ? '' : 's'} picked
            </div>
            <SeatMap
              rows={ev.seating.rows}
              seatsPerRow={ev.seating.seatsPerRow}
              takenSeats={takenSeats}
              selected={seatPicks}
              quantity={quantity}
              onToggle={(label) => {
                setSeatPicks((prev) => {
                  // Toggle off if already selected.
                  if (prev.includes(label)) return prev.map((s) => s === label ? '' : s);
                  // Fill the first empty slot, otherwise drop the oldest pick.
                  const out = [...prev];
                  const slot = out.findIndex((s) => !s);
                  if (slot >= 0) out[slot] = label;
                  else out[0] = label;
                  return out;
                });
              }}
              onAutoPick={() => {
                // Use the same assigner the backend would, so the suggestion
                // mirrors what auto-assignment would have produced — but feed
                // it pseudo-tickets for the already-taken set so the picker
                // never suggests a seat someone else has.
                const pseudoExisting = takenSeats.map((seatLabel) => ({
                  eventId: ev.id, seatLabel,
                }));
                const picks = assignSeats({
                  event: ev,
                  existingTickets: pseudoExisting,
                  count: quantity,
                });
                setSeatPicks(picks);
              }}
            />
          </div>
        )}

        {stepId === 'review' && (
          <div className="space-y-5">
            <h2 className="font-bold tracking-tight">Review &amp; confirm</h2>
            <dl className="text-sm space-y-2">
              <Row label="Event" value={ev.title} />
              {groupMode === 'group' && (
                <Row label="Group" value={
                  <span>
                    <span className="font-semibold">{groupName}</span>
                    <span className="text-zinc-500"> · {GROUP_TYPES.find((g) => g.id === groupType)?.label}</span>
                  </span>
                } />
              )}
              <Row label="Ticket" value={`${ticketType?.name} × ${quantity}`} />
              {accommodation && <Row label="Accommodation" value={`${accommodation.name} × ${quantity}`} />}
              {hasSeating && (
                <Row
                  label="Seats"
                  value={
                    seatPicks.filter(Boolean).length === quantity
                      ? <span className="font-mono tabular">{seatPicks.filter(Boolean).join(', ')}</span>
                      : <span className="text-muted-coral italic">Not yet picked — go back to the seat map</span>
                  }
                />
              )}
              <Row label="Attendees" value={
                <ul className="text-right space-y-2">
                  {attendees.map((a, i) => (
                    <li key={i}>
                      <div className="font-semibold text-on-surface">
                        {[a.title, a.firstName, a.lastName].filter(Boolean).join(' ')}
                      </div>
                      <div className="text-xs text-on-surface-variant">
                        {[a.sex, a.ageBracket, a.maritalStatus].filter(Boolean).join(' · ')}
                      </div>
                      <div className="text-xs text-on-surface-variant">
                        {[a.assembly, a.district, a.region].filter(Boolean).join(' · ')}
                      </div>
                      <div className="text-xs text-on-surface-variant">
                        {[a.phone, a.email].filter(Boolean).join(' · ')} · {a.conventionLocation}
                      </div>
                    </li>
                  ))}
                </ul>
              } />
              <Row label="Total" value={<span className="font-extrabold text-base">{priceLabel(totalCents)}</span>} />
            </dl>

            {(ticketType?.priceCents || 0) > 0 && (
              <div className="space-y-3 pt-2">
                <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">
                  Payment method
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
                  {providersForEvent(ev).map(({ id: pid, label, hint, icon: Icon, enabled }) => {
                    const selected = paymentProvider === pid;
                    // `enabled` is undefined for bank-transfer (legacy entry)
                    // and true/false on the three card processors. Treat
                    // undefined as enabled so we don't break bank-transfer.
                    const disabled = enabled === false;
                    // Inner-wrapper trick: filter:blur applied to a button
                    // bleeds onto every child, including the "Coming soon"
                    // pill. Putting the blur on an inner div lets the pill
                    // sit *outside* that div and stay crisp.
                    return (
                      <button
                        type="button"
                        key={pid}
                        onClick={() => !disabled && setPaymentProvider(pid)}
                        disabled={disabled}
                        aria-disabled={disabled}
                        title={disabled ? 'Coming soon' : undefined}
                        className={`relative overflow-hidden text-left rounded-xl ring-1 transition ${
                          disabled
                            ? 'ring-zinc-200 bg-white/40 cursor-not-allowed'
                            : selected
                              ? 'ring-primary-600 bg-primary-50/60 shadow-glow'
                              : 'ring-zinc-200 hover:ring-zinc-300 bg-white/60'
                        }`}
                      >
                        {disabled && (
                          <span className="absolute top-1.5 right-1.5 z-10 inline-flex items-center rounded-full bg-zinc-900/85 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-white">
                            Coming soon
                          </span>
                        )}
                        <div className={`p-3 ${disabled ? 'blur-[1.5px] opacity-60 grayscale' : ''}`}>
                          <div className="flex items-center gap-2">
                            <span className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                              selected ? 'bg-primary-600 text-white' : 'bg-zinc-100 text-zinc-700'
                            }`}>
                              <Icon className="h-4 w-4" strokeWidth={2.25} />
                            </span>
                            <span className="font-bold text-sm">{label}</span>
                          </div>
                          <p className="mt-1.5 text-[10px] text-on-surface-variant leading-snug">{hint}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {paymentProvider === 'bank-transfer' ? (
                  <BankTransferPanel
                    ev={ev}
                    totalCents={totalCents}
                    proofImage={bankProofImage}
                    setProofImage={setBankProofImage}
                    transferReference={bankTransferReference}
                    setTransferReference={setBankTransferReference}
                    busy={bankBusy}
                    setBusy={setBankBusy}
                    copied={bankCopied}
                    setCopied={setBankCopied}
                  />
                ) : (
                  <p className="text-[11px] text-on-surface-variant">
                    You'll be redirected to <strong>{PAYMENT_PROVIDERS.find((p) => p.id === paymentProvider)?.label}</strong> to complete payment. Your ticket is issued automatically once payment clears.
                  </p>
                )}
              </div>
            )}

            <label className="flex items-start gap-2 text-sm text-zinc-700">
              <input type="checkbox" className="mt-1" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              <span>I agree to the event terms and acknowledge that photos may be taken during the event.</span>
            </label>
          </div>
        )}

        {error && <div className="mt-4 text-sm text-muted-coral">{error}</div>}
      </div>

      {/* Footer nav. Two variants:
          - Invite mode: pinned to the bottom of the viewport so the
            primary action is always one tap away. The fixed band uses a
            safe-area inset so it clears the iOS home indicator and a
            white-to-transparent gradient so the content above it doesn't
            cut off mid-text.
          - Default: in-flow row below the card. */}
      {inviteMode ? (
        <>
          <div className="h-4" />
          {/* Fixed CTA band. md:right-1/2 keeps it confined to the form's
              left-half column on desktop so it doesn't bleed across the
              right-side image; on mobile it still stretches edge-to-edge. */}
          <div className="fixed inset-x-0 md:right-1/2 bottom-0 z-30 print:hidden pointer-events-none">
            <div className="bg-gradient-to-t from-white via-white to-white/0 pt-6 pb-[max(env(safe-area-inset-bottom),12px)]">
              <div className="mx-auto max-w-md px-4 pointer-events-auto">
                <div className="flex items-center gap-2">
                  <button
                    onClick={back}
                    disabled={stepIdx === 0}
                    className="btn-soft !py-3 disabled:opacity-40"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only sm:not-sr-only">Back</span>
                  </button>
                  {stepIdx < STEPS.length - 1 ? (
                    <button onClick={next} className="btn-primary !py-3 flex-1 justify-center">
                      Continue <ArrowRight className="h-4 w-4" />
                    </button>
                  ) : (
                    <button onClick={submit} disabled={submitting} className="btn-primary !py-3 flex-1 justify-center">
                      {submitting
                        ? ((ticketType?.priceCents || 0) > 0
                            ? (paymentProvider === 'bank-transfer' ? 'Submitting…' : 'Redirecting…')
                            : 'Submitting…')
                        : (ticketType?.priceCents || 0) > 0
                          ? (paymentProvider === 'bank-transfer'
                              ? `Submit for approval · ${priceLabel(totalCents)}`
                              : `Pay ${priceLabel(totalCents)}`)
                          : `Confirm · ${priceLabel(totalCents)}`}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-between">
          <button onClick={back} disabled={stepIdx === 0} className="btn-soft">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          {stepIdx < STEPS.length - 1 ? (
            <button onClick={next} className="btn-primary">
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button onClick={submit} disabled={submitting} className="btn-primary">
              {submitting
                ? ((ticketType?.priceCents || 0) > 0
                    ? (paymentProvider === 'bank-transfer' ? 'Submitting…' : 'Redirecting to payment…')
                    : 'Submitting…')
                : (ticketType?.priceCents || 0) > 0
                  ? (paymentProvider === 'bank-transfer'
                      ? `Submit for approval · ${priceLabel(totalCents)}`
                      : `Pay ${priceLabel(totalCents)} ·  ${PAYMENT_PROVIDERS.find((p) => p.id === paymentProvider)?.label}`)
                  : `Complete registration · ${priceLabel(totalCents)}`}
            </button>
          )}
        </div>
      )}
    </div>

    {/* Gospeler-ID auto-fill modal. Mounted once at the root; the icon
        button on each attendee block flips gospelerModalIdx to that
        attendee's index. Backdrop click or Cancel closes; a successful
        lookup closes the modal via the useEffect above. */}
    {gospelerModalIdx !== null && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        onClick={() => setGospelerModalIdx(null)}
        role="dialog"
        aria-modal="true"
      >
        <div
          className="bg-white rounded-2xl shadow-ambient-lg max-w-sm w-full p-6 space-y-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-display text-base font-bold tracking-tight text-on-surface inline-flex items-center gap-2">
              <IdCard className="h-5 w-5 text-brand-600" strokeWidth={2} />
              Use your Gospeler ID
            </h3>
            <button
              type="button"
              onClick={() => setGospelerModalIdx(null)}
              className="h-8 w-8 rounded-full grid place-items-center text-zinc-500 hover:text-on-surface hover:bg-zinc-100 transition"
              aria-label="Close"
            >
              <XIcon className="h-4 w-4" strokeWidth={2.25} />
            </button>
          </div>
          <p className="text-xs text-zinc-600">
            Enter your code (looks like <span className="font-mono">GSP-2026-XXXXXXXX</span>) to auto-fill the form from your saved profile.
          </p>
          <input
            className="input w-full font-mono uppercase tracking-wide"
            placeholder="GSP-2026-XXXXXXXX"
            value={lookups[gospelerModalIdx]?.code || ''}
            onChange={(e) => setLookup(gospelerModalIdx, {
              code: e.target.value.toUpperCase(),
              error: '',
              filled: '',
            })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                autoFillFromGospelerId(gospelerModalIdx);
              }
            }}
            autoComplete="off"
            spellCheck={false}
            autoFocus
          />
          {lookups[gospelerModalIdx]?.error && (
            <p className="text-xs text-muted-coral">{lookups[gospelerModalIdx].error}</p>
          )}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => setGospelerModalIdx(null)}
              className="btn-ghost flex-1"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => autoFillFromGospelerId(gospelerModalIdx)}
              disabled={lookups[gospelerModalIdx]?.loading}
              className="btn-primary flex-1 whitespace-nowrap"
            >
              {lookups[gospelerModalIdx]?.loading ? 'Looking up…' : 'Auto-fill'}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

function Row({ label, value }) {
  return (
    <div className="py-3 flex items-start justify-between gap-4">
      <dt className="text-xs font-bold uppercase tracking-wider text-zinc-500 pt-0.5">{label}</dt>
      <dd className="text-right text-ink">{value}</dd>
    </div>
  );
}

// Compact headshot picker — renders a preview + Choose / Remove buttons.
// Resizes to ≤512px JPEG so the resulting data URL stays under ~80KB even
// for camera-roll source images, which keeps the registration POST small
// and the attendee_profile JSONB readable.
function PhotoPicker({ value, onChange }) {
  const [error, setError] = useState('');
  const [busy, setBusy]   = useState(false);

  async function onPick(e) {
    setError('');
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file later
    if (!file) return;
    setBusy(true);
    try {
      const dataUrl = await fileToResizedDataUrl(file);
      onChange(dataUrl);
    } catch (err) {
      setError(err.message || 'Could not load that image.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-4 rounded-lg ring-1 ring-outline-variant/20 bg-white/60 p-3">
      <div className="h-16 w-16 rounded-xl overflow-hidden ring-1 ring-outline-variant/20 bg-zinc-100 flex items-center justify-center flex-shrink-0">
        {value ? (
          <img src={value} alt="Attendee photo" className="h-full w-full object-cover" />
        ) : (
          <Camera className="h-6 w-6 text-zinc-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-on-surface">Photo (optional)</div>
        <div className="text-xs text-on-surface-variant mt-0.5">
          Adds your headshot to the badge and the ticket PDFs.
        </div>
        {error && <div className="text-xs text-muted-coral mt-1">{error}</div>}
        <div className="flex gap-2 mt-2">
          <label className="btn-soft cursor-pointer">
            <Camera className="h-4 w-4" />
            {busy ? 'Loading…' : value ? 'Change photo' : 'Choose photo'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onPick}
              disabled={busy}
            />
          </label>
          {value && (
            <button
              type="button"
              onClick={() => { onChange(''); setError(''); }}
              className="btn-ghost"
            >
              <XIcon className="h-4 w-4" /> Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Form-style toggle — pill-segmented switch rendered above the form on
// events whose template defines customQuestions. The two options share the
// same submit + confirmation paths; the only difference is which UI the
// registrant fills out.
function FormStyleToggle({ current, onChange }) {
  const options = [
    { id: 'quick',    label: 'Quick RSVP',    sub: 'A few questions' },
    { id: 'detailed', label: 'Detailed form', sub: 'All attendee fields' },
  ];
  return (
    <div className="card p-1 grid grid-cols-2 gap-1">
      {options.map(({ id, label, sub }) => {
        const active = id === current;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={`text-left rounded-xl px-4 py-2.5 transition ${
              active
                ? 'text-white shadow-glow'
                : 'text-on-surface-variant hover:bg-surface-variant/60 hover:text-on-surface'
            }`}
            style={active ? { backgroundImage: 'linear-gradient(135deg, #0b3a8a 0%, #1656c2 100%)' } : undefined}
            aria-pressed={active}
          >
            <div className="text-xs font-bold uppercase tracking-[0.08em]">{label}</div>
            <div className={`text-[10px] mt-0.5 ${active ? 'text-white/80' : 'text-on-surface-variant'}`}>{sub}</div>
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BankTransferPanel — appears below the payment-provider picker when the
// attendee selects "Bank transfer". Shows the event's bank account details
// with copy-to-clipboard, prompts for a screenshot upload, and captures an
// optional transfer reference.
//
// The image is read as a JPEG data URL with the same canvas-resize pattern
// the event banner uses (CreateEvent.jsx) so the payload stays under the
// backend's 10 MB body limit. The actual submission happens in the parent
// submit() handler when paymentProvider === 'bank-transfer'.
// ─────────────────────────────────────────────────────────────────────────────
function BankTransferPanel({
  ev, totalCents,
  proofImage, setProofImage,
  transferReference, setTransferReference,
  busy, setBusy,
  copied, setCopied,
}) {
  const amountLabel = `₦${(totalCents / 100).toLocaleString()}`;

  async function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type?.startsWith('image/')) {
      alert('Please pick an image (JPEG or PNG).');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      alert('Screenshot is over 8 MB. Crop or compress before uploading.');
      return;
    }
    setBusy(true);
    try {
      const dataUrl = await fileToProofDataUrl(file);
      setProofImage(dataUrl);
    } catch (err) {
      alert(err?.message || 'Could not process the image.');
    } finally {
      setBusy(false);
    }
  }

  async function copy(value, tag) {
    try {
      await navigator.clipboard?.writeText(value);
      setCopied(tag);
      setTimeout(() => setCopied(''), 1500);
    } catch { /* clipboard blocked — user can long-press */ }
  }

  return (
    <div className="rounded-xl ring-1 ring-zinc-200 bg-white/70 p-4 space-y-4">
      <div>
        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
          Bank account details
        </div>
        <div className="mt-2 space-y-2">
          <Row3 label="Bank"    value={ev.bankName || '—'} />
          <Row3
            label="Account number"
            value={<span className="font-mono tabular text-base">{ev.bankAccountNumber}</span>}
            onCopy={ev.bankAccountNumber ? () => copy(ev.bankAccountNumber, 'account') : null}
            copied={copied === 'account'}
          />
          <Row3 label="Account name" value={ev.bankAccountName || '—'} />
          <Row3
            label="Amount to send"
            value={<span className="font-bold tabular text-base">{amountLabel}</span>}
            onCopy={() => copy(String(totalCents / 100), 'amount')}
            copied={copied === 'amount'}
          />
        </div>
        {ev.bankTransferInstructions && (
          <p className="mt-3 text-[12px] text-zinc-600 leading-relaxed whitespace-pre-wrap rounded-md bg-zinc-50 p-3">
            {ev.bankTransferInstructions}
          </p>
        )}
      </div>

      <div>
        <label className="label">Screenshot of your transfer</label>
        {!proofImage ? (
          <label className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed border-zinc-300 hover:border-primary-400 hover:bg-primary-50/30 cursor-pointer transition">
            <Upload className="h-5 w-5 text-zinc-500" strokeWidth={2} />
            <span className="text-sm text-zinc-700 flex-1">
              {busy ? 'Processing…' : 'Tap to upload screenshot'}
              <span className="block text-[11px] text-zinc-500 mt-0.5">JPEG or PNG, up to 8 MB</span>
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onFile}
              disabled={busy}
            />
          </label>
        ) : (
          <div className="relative">
            <img
              src={proofImage}
              alt="Transfer screenshot"
              className="w-full max-h-72 object-contain rounded-xl bg-zinc-100"
            />
            <button
              type="button"
              onClick={() => setProofImage('')}
              className="absolute top-2 right-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-ambient text-zinc-600 hover:text-red-600"
              title="Remove screenshot"
              aria-label="Remove screenshot"
            >
              <XIcon className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        )}
      </div>

      <div>
        <label className="label">Transfer reference (optional)</label>
        <input
          className="input"
          value={transferReference}
          onChange={(e) => setTransferReference(e.target.value)}
          placeholder="What you typed in the narration field, if any"
          maxLength={120}
        />
      </div>

      <p className="text-[11px] text-on-surface-variant leading-relaxed">
        <strong>What happens next:</strong> the organizer will verify your transfer and
        email your ticket once approved — usually within 24 hours. Your seat is
        held in the meantime.
      </p>
    </div>
  );
}

function Row3({ label, value, onCopy, copied }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">{label}</span>
      <span className="flex items-center gap-2 text-on-surface">
        <span className="truncate max-w-[16rem]">{value}</span>
        {onCopy && (
          <button
            type="button"
            onClick={onCopy}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-on-surface-variant hover:text-primary-700 hover:bg-primary-50"
            title="Copy"
            aria-label="Copy"
          >
            {copied ? <ClipboardCheck className="h-4 w-4 text-tertiary" strokeWidth={2.25} /> : <Copy className="h-4 w-4" strokeWidth={1.75} />}
          </button>
        )}
      </span>
    </div>
  );
}

// Reads a user-picked image File into a resized JPEG data URL. Same shape
// as CreateEvent.jsx's fileToBannerDataUrl but capped tighter — a transfer
// screenshot doesn't need 1600px and the backend body limit is 10 MB.
function fileToProofDataUrl(file, maxDim = 1400, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Image format not supported'));
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.round(img.width  * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
