// Automatic seat + room assignment.
//
// Called once per registration batch from `api.register()` to allocate the
// physical placement of each attendee. The algorithm is deterministic and
// pure — given the same set of existing tickets it always produces the same
// result, which keeps the assignment stable across reloads.
//
// Returns parallel arrays of strings (one per attendee). When the event has
// no seating config, `seats[i]` is `''`. When the accommodation is omitted
// (commuter ticket, accommodation array empty), `rooms[i]` is `''`.

const ROW_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // skip I/O to avoid confusion with 1/0

function rowLabel(rowIndex) {
  // 0 → A, 25 → Z (we skipped I/O), 26 → AA, 27 → AB …
  const n = ROW_LETTERS.length;
  if (rowIndex < n) return ROW_LETTERS[rowIndex];
  const first  = ROW_LETTERS[Math.floor(rowIndex / n) - 1];
  const second = ROW_LETTERS[rowIndex % n];
  return `${first}${second}`;
}

// ─── Seat assignment ────────────────────────────────────────────────────────
//
// Returns up to `count` seat labels for a group of attendees in the same
// registration. Seats are picked in sequential order (row-major), preferring
// to keep the whole group on one row when there's room.
export function assignSeats({ event, existingTickets, count }) {
  if (!event?.seating?.rows || !event?.seating?.seatsPerRow) return Array(count).fill('');
  const { rows, seatsPerRow } = event.seating;
  const taken = new Set();
  for (const t of existingTickets) {
    if (t.eventId === event.id && t.seatLabel) taken.add(t.seatLabel);
  }

  const labelFor = (r, c) => `${rowLabel(r)}${c + 1}`;

  // 1. Try to seat the whole group on one row.
  if (count > 1) {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c + count <= seatsPerRow; c++) {
        let ok = true;
        for (let k = 0; k < count; k++) {
          if (taken.has(labelFor(r, c + k))) { ok = false; break; }
        }
        if (ok) {
          const out = [];
          for (let k = 0; k < count; k++) {
            const lbl = labelFor(r, c + k);
            out.push(lbl); taken.add(lbl);
          }
          return out;
        }
      }
    }
  }

  // 2. Spill into individual next-available seats.
  const out = [];
  outer: for (let r = 0; r < rows; r++) {
    for (let c = 0; c < seatsPerRow; c++) {
      const lbl = labelFor(r, c);
      if (taken.has(lbl)) continue;
      out.push(lbl); taken.add(lbl);
      if (out.length === count) break outer;
    }
  }
  // Pad with '' if we couldn't fit everyone (event oversold).
  while (out.length < count) out.push('');
  return out;
}

// ─── Room assignment ───────────────────────────────────────────────────────
//
// For shared rooms: pack into partially-filled rooms before opening new ones.
// For private rooms: each room belongs to one party — open a fresh room for
// every new registration, even if it's a single person.
// For groups: try to seat the whole batch in one room when capacity permits.
export function assignRooms({ event, accommodation, existingTickets, count }) {
  if (!accommodation || !accommodation.id) return Array(count).fill('');

  const beds = Math.max(1, accommodation.bedsPerRoom || accommodation.capacity || 1);
  // 'none' / commuter accommodation: no physical room to assign.
  if (accommodation.type === 'none' || beds === 0) return Array(count).fill('');

  const totalRooms = Math.max(1, Math.ceil((accommodation.capacity || beds) / beds));

  // Occupancy per existing room number for this event + accommodation.
  const occupancy = new Array(totalRooms + 1).fill(0); // 1-indexed
  const ROOM_RE = /· Room (\d+) ·/;
  for (const t of existingTickets) {
    if (t.eventId !== event.id || t.accommodationId !== accommodation.id || !t.roomLabel) continue;
    const m = ROOM_RE.exec(t.roomLabel);
    if (!m) continue;
    const n = parseInt(m[1], 10);
    if (n >= 1 && n <= totalRooms) occupancy[n] += 1;
  }

  const labelFor = (roomNum, bedNum) =>
    `${accommodation.name} · Room ${roomNum} · Bed ${bedNum}`;

  // Helper: pick a target room number for a party of N. Returns null if none fits.
  function pickRoom(forCount) {
    if (accommodation.sharing === 'private') {
      // First completely empty room.
      for (let r = 1; r <= totalRooms; r++) {
        if (occupancy[r] === 0 && forCount <= beds) return r;
      }
      return null;
    }
    // Shared: prefer the most-full room that still has room for the whole party.
    let best = null;
    let bestOcc = -1;
    for (let r = 1; r <= totalRooms; r++) {
      const free = beds - occupancy[r];
      if (free >= forCount && occupancy[r] > bestOcc) { best = r; bestOcc = occupancy[r]; }
    }
    return best;
  }

  // Pass 1: try to fit the whole group in one room.
  const out = Array(count).fill('');
  const target = pickRoom(count);
  if (target !== null) {
    for (let i = 0; i < count; i++) {
      occupancy[target] += 1;
      out[i] = labelFor(target, occupancy[target]);
    }
    return out;
  }

  // Pass 2: spill — assign each attendee individually.
  for (let i = 0; i < count; i++) {
    const r = pickRoom(1);
    if (r === null) { out[i] = ''; continue; } // oversold
    occupancy[r] += 1;
    out[i] = labelFor(r, occupancy[r]);
  }
  return out;
}
