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
      requiresLogin: false,
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
      requiresLogin: false,
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
      requiresLogin: false,
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
      requiresLogin: false,
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
      requiresLogin: false,
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
      requiresLogin: false,
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
      requiresLogin: false,
    }),
  },
];

export function getTemplate(id) {
  if (!id) return null;
  return EVENT_TEMPLATES.find((t) => t.id === id) || null;
}
