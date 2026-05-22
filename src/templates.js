// Event templates — pre-built starting points for the most common Christian
// gathering types. Each entry exposes:
//   id          — kebab slug, used as the ?template= URL param.
//   name        — human label shown on the Templates page card.
//   tagline     — one-line pitch (shown under the name).
//   iconKey     — name of a lucide-react icon. Resolved on render so this
//                 module stays free of React imports.
//   coverColor  — Tailwind gradient class that lands on the event banner.
//   accentClass — Tailwind gradient class used for the template card itself
//                 on the Templates page (decorative only).
//   build()     — returns the partial event payload that CreateEvent merges
//                 into its empty form state. Anything the template doesn't
//                 specify uses the CreateEvent defaults.
//
// Why a build() function and not a static object: it lets templates set
// `id` collisions cleanly (e.g. ticket tier IDs unique per template) and
// keeps room for future runtime tweaks (e.g. defaulting startsAt to the
// next weekend) without breaking the shape.

const tier = (id, name, role, priceCents, capacity, description) => ({
  id, name, role, priceCents, capacity, sold: 0, description,
});

// Custom registration-question helper. When a template returns a non-empty
// `customQuestions` array, the registration page renders THAT list instead
// of the long default attendee form (firstName/lastName/city/region/etc).
// Question types: 'text' | 'textarea' | 'choice' (single) | 'email' | 'phone'.
// `options` is required for 'choice', ignored otherwise.
const q = (id, type, label, { required = false, options = null, placeholder = '' } = {}) => ({
  id, type, label, required, options, placeholder,
});

// ─────────────────────────────────────────────────────────────────────────────
// Quick RSVP essentials — the minimum identity needed for the backend to
// create a ticket and send a confirmation. Everything else (title, sex,
// status, age bracket, address, region/district/assembly, convention venue,
// dietary, emergency contacts, free-form notes) lives ONLY in the Detailed
// form (Register.jsx wizard), so guests aren't asked the same questions
// twice when they flip between Quick and Detailed.
// ─────────────────────────────────────────────────────────────────────────────

// NOTE: identity fields (first_name, last_name, email, phone) USED to be
// prepended here as STD_QUICK. They now live in RsvpForm.jsx as
// IDENTITY_QUESTIONS — always rendered at the top of every RSVP regardless
// of the template. That keeps the registration form tab's question designer
// focused on event-specific asks and removes the name/email/phone duplicate
// that was appearing on every church-activity form.
function churchActivityForm(eventSpecific = []) {
  return [...eventSpecific];
}

export const EVENT_TEMPLATES = [
  {
    id: 'wedding',
    name: 'Wedding Ceremony',
    tagline: 'A formal RSVP-style template for the couple, family, and invited guests.',
    iconKey: 'Heart',
    coverColor: 'from-amber-400 to-pink-500',
    accentClass: 'from-pink-400 to-rose-500',
    build: () => ({
      title: 'Wedding Ceremony',
      tagline: 'Join us as we celebrate our union',
      summary: 'A sacred service of vows and covenant, followed by a reception with family and friends.',
      location: '',
      coverColor: 'from-amber-400 to-pink-500',
      schedule: [
        {
          day: 'Wedding day',
          items: [
            '2:00 PM — Guests arrive & seating',
            '3:00 PM — Processional',
            '3:15 PM — Worship & prayer',
            '3:30 PM — Vows & exchange of rings',
            '3:45 PM — Pronouncement & recessional',
            '5:00 PM — Reception begins',
          ],
        },
      ],
      ticketTypes: [
        tier('wedding-guest', 'RSVP — Guest', 'attendee', 0, 150, 'Reserved seating for invited guests.'),
        tier('wedding-vip',   'Family & Bridal Party', 'attendee', 0, 30, 'Reserved seats up front for family and bridal party.'),
      ],
      seating: { rows: 12, seatsPerRow: 14 },
      requiresLogin: false,
      // Wedding RSVP is intentionally short. Identity (name, email, phone)
      // is collected by RsvpForm.jsx's IDENTITY_QUESTIONS block — these are
      // ONLY the event-specific asks.
      customQuestions: [
        q('rsvp',           'choice',   'Will you be able to make it?',               { required: true,
          options: ['Yes, I\'ll be there', 'No, I can\'t make it', 'Tentative — I\'ll confirm soon'] }),
        q('plus_one',       'choice',   'Are you bringing someone special with you?', { required: true,
          options: ['No, just me', 'Yes, a plus-one'] }),
        q('plus_one_name',  'text',     "If yes, what's their name?",                 { required: false, placeholder: "Plus-one's name" }),
        q('side',           'choice',   "Whose side are you with?",                   { required: false,
          options: ['Bride', 'Groom', 'Both', 'Prefer not to say'] }),
        q('dietary',        'text',     'Any dietary requirements?',                  { required: false, placeholder: 'e.g. vegetarian, no nuts' }),
        q('song_request',   'text',     "A song you'd love to hear at the reception?",{ required: false, placeholder: 'Song & artist' }),
        q('note',           'textarea', 'A note for the couple?',                     { required: false, placeholder: 'Optional well-wishes…' }),
      ],
    }),
  },
  {
    id: 'baby-dedication',
    name: 'Baby Dedication',
    tagline: 'A short service template for dedicating a child before the church family.',
    iconKey: 'Baby',
    coverColor: 'from-orange-400 to-rose-500',
    accentClass: 'from-rose-300 to-orange-400',
    build: () => ({
      title: 'Baby Dedication Service',
      tagline: 'Presenting our child to the Lord',
      summary: 'A short, joyful service in which the family commits to raising the child in the faith, joined by godparents, family, and the church community.',
      location: '',
      coverColor: 'from-orange-400 to-rose-500',
      schedule: [
        {
          day: 'Dedication Sunday',
          items: [
            'Opening prayer',
            'Worship',
            'Scripture reading',
            'Family vows & dedication',
            'Blessing & laying on of hands',
            'Closing reception',
          ],
        },
      ],
      ticketTypes: [
        tier('dedication-rsvp',   'RSVP — Family & guest', 'attendee', 0, 80, 'Free RSVP for family, godparents, and friends.'),
        tier('dedication-church', 'Church family',          'attendee', 0, 120, 'Open to the wider church.'),
      ],
      seating: { rows: 8, seatsPerRow: 12 },
      requiresLogin: false,
      customQuestions: churchActivityForm([
        q('relation',  'choice',   'How are you related to the family?', { required: true,
          options: ['Parent', 'Godparent', 'Family', 'Friend', 'Church member'] }),
        q('baby_name', 'text',     "Baby's name (if you know it)",       { required: false, placeholder: "Baby's name" }),
        q('attending', 'choice',   'Will you be there?',                 { required: true,
          options: ['Yes', 'No', 'Tentative'] }),
        q('blessing',  'textarea', 'A blessing or note for the family?', { required: false, placeholder: 'Optional…' }),
      ]),
    }),
  },
  {
    id: 'graduation-ordination',
    name: 'Graduation / Ordination',
    tagline: 'A milestone-celebration template for graduates or those being ordained.',
    iconKey: 'GraduationCap',
    coverColor: 'from-violet-500 to-fuchsia-600',
    accentClass: 'from-violet-500 to-fuchsia-600',
    build: () => ({
      title: 'Graduation & Ordination Service',
      tagline: 'Commissioning our graduates for the work ahead',
      summary: 'A formal service of commissioning, charge, and prayer. Graduates and ordinands will be presented before the congregation, followed by photographs and refreshments.',
      location: '',
      coverColor: 'from-violet-500 to-fuchsia-600',
      schedule: [
        {
          day: 'Commissioning Sunday',
          items: [
            'Processional',
            'Opening worship',
            'Charge to the graduates',
            'Presentation of certificates',
            'Prayer of commissioning',
            'Photographs & refreshments',
          ],
        },
      ],
      ticketTypes: [
        tier('grad-graduate', 'Graduate / Ordinand', 'speaker',  0, 40,  'For the graduates and ordinands themselves — guarantees front-row seating.'),
        tier('grad-guest',    'Guest of graduate',   'attendee', 0, 200, 'Family and friends of the graduates.'),
        tier('grad-staff',    'Faculty / Staff',     'staff',    0, 30,  'Faculty, staff, and presenters.'),
      ],
      seating: { rows: 15, seatsPerRow: 16 },
      requiresLogin: false,
      customQuestions: churchActivityForm([
        q('relation',      'choice', 'You are joining as a…',                { required: true,
          options: ['Graduate / Ordinand', 'Family of graduate', 'Friend', 'Faculty / Staff'] }),
        q('graduate_name', 'text',   "Whose graduation are you celebrating?",{ required: false, placeholder: "Graduate's name" }),
        q('guest_count',   'choice', 'How many seats do you need?',          { required: true,
          options: ['1', '2', '3', '4', '5 or more'] }),
        q('photographs',   'choice', 'Will you be staying for photographs?', { required: false,
          options: ['Yes', 'No'] }),
        q('note',          'textarea','A congratulations note?',             { required: false, placeholder: 'Optional…' }),
      ]),
    }),
  },
  {
    id: 'workers-meeting',
    name: 'Workers Meeting & Leadership Training',
    tagline: 'Internal training for volunteers, workers, and leaders across departments.',
    iconKey: 'Users',
    coverColor: 'from-emerald-400 to-teal-600',
    accentClass: 'from-emerald-500 to-teal-700',
    build: () => ({
      title: 'Workers Meeting & Leadership Training',
      tagline: 'Equipping leaders for the work of ministry',
      summary: 'A working session for workers and ministry leaders. Includes vision, training, departmental break-outs, and prayer.',
      location: '',
      coverColor: 'from-emerald-400 to-teal-600',
      schedule: [
        {
          day: 'Training day',
          items: [
            '9:00 AM — Arrival & devotion',
            '9:30 AM — Vision update',
            '10:30 AM — Plenary teaching',
            '12:00 PM — Lunch',
            '1:00 PM — Departmental break-outs',
            '3:00 PM — Q&A and closing prayer',
          ],
        },
      ],
      ticketTypes: [
        tier('wm-worker',     'Worker',          'staff', 0, 80,  'For active workers and volunteers.'),
        tier('wm-leader',     'Department head', 'staff', 0, 25,  'For HoDs and ministry leaders.'),
        tier('wm-new-worker', 'New worker',      'staff', 0, 40,  'For newcomers being onboarded into a department.'),
      ],
      requiresLogin: true,
      customQuestions: churchActivityForm([
        q('department',    'choice',   'Which department do you serve in?',  { required: true,
          options: ['Ushering', 'Worship / Choir', 'Children Church', 'Media / Tech', 'Hospitality', 'Security', 'Other'] }),
        q('role_title',    'text',     'Your role / title in the department',{ required: false, placeholder: 'e.g. Sectional Head, Assistant' }),
        q('years_serving', 'choice',   'How long have you been serving?',    { required: false,
          options: ['Less than 1 year', '1–3 years', '4–7 years', '8+ years'] }),
        q('lead_session',  'choice',   'Are you leading a session?',         { required: false,
          options: ['Yes', 'No'] }),
        q('training_need', 'textarea', 'What training would help you most?', { required: false, placeholder: 'Optional — helps us plan next year' }),
      ]),
    }),
  },
  {
    id: 'children-church',
    name: 'Children Church Event',
    tagline: 'A kid-friendly program template with parent + worker registration.',
    iconKey: 'Smile',
    coverColor: 'from-sky-400 to-indigo-600',
    accentClass: 'from-sky-400 to-indigo-600',
    build: () => ({
      title: 'Children Church Special Program',
      tagline: 'A day of fun, faith, and discovery for our kids',
      summary: 'A special program for our children: worship, Bible story, games, crafts, and snacks. Parents are welcome to stay or drop off.',
      location: '',
      coverColor: 'from-sky-400 to-indigo-600',
      schedule: [
        {
          day: 'Program day',
          items: [
            '10:00 AM — Arrival & check-in',
            '10:15 AM — Worship & dance',
            '10:45 AM — Bible story',
            '11:15 AM — Crafts & activity stations',
            '12:00 PM — Snacks',
            '12:30 PM — Pick-up',
          ],
        },
      ],
      ticketTypes: [
        tier('cc-child',   'Child (ages 4–12)', 'attendee', 0, 80, 'Free registration per child. One ticket per child, please.'),
        tier('cc-toddler', 'Toddler (ages 0–3)','attendee', 0, 20, 'Toddlers must be accompanied by a parent or guardian.'),
        tier('cc-worker',  'Children Church worker', 'staff', 0, 25, 'Volunteers serving at this program.'),
      ],
      seating: { rows: 6, seatsPerRow: 10 },
      requiresLogin: false,
      customQuestions: churchActivityForm([
        q('child_name',    'text',   "Child's name",                            { required: true,  placeholder: "Child's full name" }),
        q('child_age',     'choice', "Child's age",                             { required: true,
          options: ['0–3 (toddler)', '4–6', '7–9', '10–12'] }),
        q('allergies',     'text',   'Any allergies or medical notes?',         { required: false, placeholder: 'e.g. peanut allergy, asthma' }),
        q('pickup_person', 'text',   "Who else can pick up your child?",        { required: false, placeholder: 'Name + relation' }),
      ]),
    }),
  },
  {
    id: 'church-retreat',
    name: 'Church Retreat',
    tagline: 'A multi-day retreat template with accommodation and tiered tickets.',
    iconKey: 'Tent',
    coverColor: 'from-emerald-400 to-teal-600',
    accentClass: 'from-teal-500 to-emerald-700',
    build: () => ({
      title: 'Annual Church Retreat',
      tagline: 'Three days of worship, teaching, and rest',
      summary: 'A weekend away from the noise. Worship, sound teaching, prayer, and time with the church family — all in a place built for rest.',
      location: '',
      coverColor: 'from-emerald-400 to-teal-600',
      schedule: [
        {
          day: 'Friday',
          items: [
            '4:00 PM — Arrival & check-in',
            '6:00 PM — Dinner',
            '7:30 PM — Opening worship & welcome',
          ],
        },
        {
          day: 'Saturday',
          items: [
            '7:30 AM — Devotion',
            '9:00 AM — Plenary teaching',
            '11:00 AM — Group sessions',
            '1:00 PM — Lunch & free time',
            '5:00 PM — Recreation',
            '7:30 PM — Evening worship & teaching',
          ],
        },
        {
          day: 'Sunday',
          items: [
            '9:00 AM — Closing service & communion',
            '12:00 PM — Lunch',
            '2:00 PM — Departure',
          ],
        },
      ],
      ticketTypes: [
        tier('rt-regular', 'Regular',       'attendee', 35000, 120, 'Three-day attendance with full accommodation and meals.'),
        tier('rt-student', 'Student',       'attendee', 20000,  40, 'For students — valid ID required at check-in.'),
        tier('rt-family',  'Family of four','attendee', 100000, 20, 'Family rate covering two adults and two children.'),
        tier('rt-worker',  'Worker',        'staff',        0,  30, 'For volunteers and ministry workers.'),
      ],
      accommodation: [{
        id: 'lodging', name: 'On-site lodge', type: 'lodge', sharing: 'shared',
        bedsPerRoom: 4, priceCents: 0, capacity: 80, taken: 0,
        description: 'Shared rooms, four beds per room. Linens provided.',
      }],
      requiresLogin: true,
      customQuestions: churchActivityForm([
        q('attending_days',  'choice', 'Which days will you attend?',        { required: true,
          options: ['All three days', 'Friday + Saturday', 'Saturday + Sunday', 'Saturday only', 'Sunday only'] }),
        q('room_preference', 'choice', 'Accommodation preference',           { required: true,
          options: ['Shared lodge (default)', 'Private room (if available)', 'Off-site / I will arrange my own'] }),
        q('medical',         'text',   'Anything we should know medically?', { required: false, placeholder: 'Optional — kept confidential' }),
        q('expectation',     'textarea','What are you most looking forward to?', { required: false, placeholder: 'Optional' }),
      ]),
    }),
  },
  {
    id: 'convention',
    name: 'Convention / Annual Conference',
    tagline: 'A multi-day conference template with tiered tickets and sessions.',
    iconKey: 'Megaphone',
    coverColor: 'from-slate-700 to-slate-900',
    accentClass: 'from-slate-700 to-slate-900',
    build: () => ({
      title: 'Annual Conference',
      tagline: 'Three days of inspired teaching, worship, and fellowship',
      summary: 'Our flagship gathering — guest ministers, plenary sessions, workshops, and worship. Open to all believers.',
      location: '',
      coverColor: 'from-slate-700 to-slate-900',
      schedule: [
        {
          day: 'Day 1',
          items: [
            '3:00 PM — Registration opens',
            '6:00 PM — Opening rally',
            '7:30 PM — Plenary 1',
          ],
        },
        {
          day: 'Day 2',
          items: [
            '8:00 AM — Morning devotion',
            '9:00 AM — Plenary 2',
            '11:00 AM — Workshops',
            '2:00 PM — Workshops',
            '6:00 PM — Evening service',
          ],
        },
        {
          day: 'Day 3',
          items: [
            '8:00 AM — Devotion',
            '9:00 AM — Plenary 3',
            '11:00 AM — Closing service & communion',
            '1:00 PM — Departure',
          ],
        },
      ],
      ticketTypes: [
        tier('cv-general', 'General admission', 'attendee', 0,     500, 'Free entry to all plenary sessions.'),
        tier('cv-premium', 'Premium pass',      'attendee', 25000, 80,  'Reserved seating, workshop priority, and welcome packet.'),
        tier('cv-student', 'Student',           'attendee', 0,     100, 'Free for students with valid ID.'),
        tier('cv-worker',  'Worker / Volunteer','staff',    0,     50,  'For event workers and volunteers.'),
        tier('cv-speaker', 'Speaker / Minister','speaker',  0,     20,  'For guest ministers and speakers.'),
      ],
      seating: { rows: 20, seatsPerRow: 20 },
      requiresLogin: false,
      customQuestions: churchActivityForm([
        q('attending_days', 'choice', 'Which days will you attend?',              { required: true,
          options: ['All three days', 'Day 1 only', 'Day 2 only', 'Day 3 only', 'Day 1 + 2', 'Day 2 + 3'] }),
        q('workshops',      'choice', 'Which workshop track interests you most?', { required: false,
          options: ['Worship & Music', 'Leadership', 'Family & Marriage', 'Evangelism', 'Youth Ministry', 'Undecided'] }),
        q('accommodation_need', 'choice', 'Do you need accommodation?',           { required: false,
          options: ['No, I have my own', 'Yes — please recommend options', 'Yes — already booked with the host'] }),
        q('first_time',     'choice', 'Is this your first conference with us?',   { required: false,
          options: ['Yes', 'No'] }),
      ]),
    }),
  },
  {
    id: 'youth-program',
    name: 'Youth Program',
    tagline: 'An energetic gathering template for teens and young adults.',
    iconKey: 'Music',
    coverColor: 'from-orange-400 to-rose-500',
    accentClass: 'from-orange-400 to-rose-500',
    build: () => ({
      title: 'Youth Program',
      tagline: 'For the next generation',
      summary: 'Worship, the word, and time together — designed for teens and young adults.',
      location: '',
      coverColor: 'from-orange-400 to-rose-500',
      schedule: [
        {
          day: 'Program night',
          items: [
            '5:00 PM — Doors open & ice-breakers',
            '5:30 PM — Worship',
            '6:00 PM — The word',
            '6:45 PM — Small-group discussion',
            '7:30 PM — Refreshments & fellowship',
          ],
        },
      ],
      ticketTypes: [
        tier('yp-youth',     'Youth (ages 13–25)', 'attendee', 0, 150, 'Free entry for youth.'),
        tier('yp-firsttime', 'First-timer',        'attendee', 0, 40,  'First time joining us? This is for you — front-row welcome.'),
        tier('yp-leader',    'Youth leader',       'staff',    0, 20,  'For youth leaders and volunteers.'),
      ],
      seating: { rows: 10, seatsPerRow: 14 },
      requiresLogin: false,
      customQuestions: churchActivityForm([
        q('parent_phone', 'phone',  "Parent's phone (if under 18)",         { required: false, placeholder: '+234…' }),
        q('first_time',   'choice', 'Is this your first time joining us?',  { required: true,
          options: ['Yes — first time!', 'No, I come regularly'] }),
        q('invited_by',   'text',   'Who invited you?',                     { required: false, placeholder: 'A friend, family member, or social post' }),
        q('interests',    'choice', 'What topics are you most into?',       { required: false,
          options: ['Worship', 'Bible study', 'Career / future', 'Relationships', 'Mental health', 'Social impact'] }),
      ]),
    }),
  },
  {
    id: 'christian-movie-night',
    name: 'Christian Movie Night',
    tagline: 'A short RSVP for the movie night that continues into a full attendee detail form.',
    iconKey: 'Film',
    coverColor: 'from-indigo-500 to-purple-700',
    accentClass: 'from-indigo-500 to-purple-700',
    build: () => ({
      title: 'Christian Movie Night',
      tagline: 'Faith, popcorn, and a powerful story on the big screen',
      summary: 'An evening of film, fellowship, and reflection. Light refreshments before the screening; group discussion afterwards.',
      location: '',
      coverColor: 'from-indigo-500 to-purple-700',
      schedule: [
        {
          day: 'Movie night',
          items: [
            '6:30 PM — Doors open & snacks',
            '7:00 PM — Welcome & opening prayer',
            '7:15 PM — Film screening',
            '9:15 PM — Group reflection & discussion',
            '9:45 PM — Closing prayer',
          ],
        },
      ],
      ticketTypes: [
        tier('mn-general', 'General admission', 'attendee', 0, 120, 'Free seat for the screening + light refreshments.'),
        tier('mn-family',  'Family of four',   'attendee', 0,  20, 'Block of four contiguous seats for one family.'),
        tier('mn-worker',  'Volunteer / Crew', 'staff',    0,  15, 'For ushers, tech, and snack-bar volunteers.'),
      ],
      seating: { rows: 10, seatsPerRow: 14 },
      requiresLogin: false,
      // Quick RSVP intentionally short — only basic info ABOUT the movie
      // event. Identity (name/email/phone) is added by RsvpForm's
      // IDENTITY_QUESTIONS. After this short RSVP, the attendee continues
      // into the full wizard (ticket → personal → seat → review) — see
      // templateBehavior('christian-movie-night').
      customQuestions: churchActivityForm([
        q('screening',   'choice', 'Which screening will you attend?', { required: true,
          options: ['This Friday 7:00 PM', 'This Saturday 4:00 PM', 'This Saturday 7:00 PM', 'Other / will confirm'] }),
        q('party_size',  'choice', 'How many of you are coming?',      { required: true,
          options: ['Just me', '2 of us', '3 of us', '4 of us', '5 or more'] }),
        q('snack_pack',  'choice', 'Want a snack pack (popcorn + drink)?', { required: false,
          options: ['Yes please', 'No thanks', "I'll buy on the night"] }),
        q('first_time',  'choice', 'Is this your first movie night with us?', { required: false,
          options: ['Yes — first time', 'No, I come regularly'] }),
        q('note',        'textarea', 'Anything we should know (accessibility, allergies)?', { required: false, placeholder: 'Optional' }),
      ]),
    }),
  },
  {
    id: 'mens-fellowship',
    name: "Men's Fellowship",
    tagline: 'A breakfast / meeting template for the men of the church.',
    iconKey: 'Coffee',
    coverColor: 'from-emerald-400 to-teal-600',
    accentClass: 'from-emerald-500 to-emerald-700',
    build: () => ({
      title: "Men's Fellowship",
      tagline: 'Breakfast, brotherhood, and the Word',
      summary: 'A morning of food, prayer, and a short message — built for the men of the church to gather, encourage one another, and grow together.',
      location: '',
      coverColor: 'from-emerald-400 to-teal-600',
      schedule: [
        {
          day: 'Fellowship morning',
          items: [
            '7:30 AM — Doors open',
            '8:00 AM — Breakfast',
            '8:45 AM — Worship & prayer',
            '9:00 AM — The word',
            '9:45 AM — Open discussion',
            '10:30 AM — Closing prayer',
          ],
        },
      ],
      ticketTypes: [
        tier('mf-rsvp',  'RSVP — Member',  'attendee', 0, 100, 'Free RSVP. Helps us cater accurately.'),
        tier('mf-guest', 'Guest invite',   'attendee', 0, 30,  'Invite a friend or visitor.'),
      ],
      seating: { rows: 6, seatsPerRow: 10 },
      requiresLogin: false,
      customQuestions: churchActivityForm([
        q('attending',      'choice',   'Will you be there?',                 { required: true,
          options: ['Yes', 'No', 'Tentative'] }),
        q('plus_one',       'choice',   'Bringing a friend or visitor?',      { required: true,
          options: ['No, just me', 'Yes, a guest'] }),
        q('plus_one_name',  'text',     "Your guest's name",                  { required: false, placeholder: "Guest's name" }),
        q('prayer_request', 'textarea', 'A prayer request for the brothers?', { required: false, placeholder: 'Optional — kept confidential' }),
      ]),
    }),
  },
];

export function getTemplate(id) {
  if (!id) return null;
  return EVENT_TEMPLATES.find((t) => t.id === id) || null;
}

// Per-template behavior flags that aren't part of the persisted event row
// (so they don't need to round-trip through the backend). Keyed by template
// id — Register.jsx + RsvpForm.jsx read this at render to decide whether
// the Quick RSVP should "Continue" into the full wizard and whether to
// hide the location fields on the People step.
//
// rsvpContinueToWizard
//   true  → Quick RSVP captures the answers, renames its submit button to
//           "Continue", hides its seat-picker, and hands control back to
//           the wizard. The wizard then runs ticket → personal → seat →
//           review and posts both the wizard data AND the RSVP answers
//           (as customAnswers) in a single api.register call.
//   false → Quick RSVP submits directly via api.register (default).
//
// hidePersonalLocation
//   true  → People step skips City / Country / Region / District /
//           Assembly / Convention Location (and their required-field
//           validators). Useful for events where the venue is local-only
//           and the church-membership location taxonomy is overkill.
// Templates with the "Quick RSVP → Continue → full wizard" flow and a
// trimmed People step (no City / Country / Region / District / Assembly /
// Convention Location). Casual / family / cross-audience events:
//
//   christian-movie-night, wedding, baby-dedication, graduation-ordination,
//   children-church, youth-program, mens-fellowship
//
// Church-internal programs (workers-meeting, church-retreat, convention)
// are intentionally NOT listed here — they keep the church-membership
// taxonomy (region/district/assembly/convention) because that's how the
// organizer reports attendance back to the denomination.
const CONTINUE_AND_TRIM = {
  rsvpContinueToWizard: true,
  hidePersonalLocation: true,
};
const TEMPLATE_BEHAVIOR = {
  'christian-movie-night': CONTINUE_AND_TRIM,
  'wedding':               CONTINUE_AND_TRIM,
  'baby-dedication':       CONTINUE_AND_TRIM,
  'graduation-ordination': CONTINUE_AND_TRIM,
  'children-church':       CONTINUE_AND_TRIM,
  'youth-program':         CONTINUE_AND_TRIM,
  'mens-fellowship':       CONTINUE_AND_TRIM,
};
const DEFAULT_BEHAVIOR = {
  rsvpContinueToWizard: false,
  hidePersonalLocation: false,
};
export function templateBehavior(id) {
  return TEMPLATE_BEHAVIOR[id] || DEFAULT_BEHAVIOR;
}
