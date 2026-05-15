import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Ticket as TicketIcon, Mail, CalendarDays, BedDouble } from 'lucide-react';
import { api } from '../api.js';
import { groupTypeStyle } from '../mockData.js';

function qrSrc(code) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(code)}`;
}

export default function Tickets() {
  const [email, setEmail] = useState('');
  const [tickets, setTickets] = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.listTickets('').then(setTickets);
  }, []);

  async function lookup(e) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    const list = await api.listTickets(email);
    setTickets(list);
    setSearched(true);
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">My tickets</h1>
        <p className="text-sm text-zinc-500 mt-1">Look up your tickets by email.</p>
      </div>

      <form onSubmit={lookup} className="card p-5 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="input pl-9"
          />
        </div>
        <button className="btn-primary" disabled={loading}>
          {loading ? 'Searching…' : 'Find tickets'}
        </button>
      </form>

      <div className="grid md:grid-cols-2 gap-4">
        {tickets.length === 0 ? (
          <div className="card p-10 text-center text-zinc-500 md:col-span-2">
            {searched ? 'No tickets found for that email.' : 'Enter your email to find your tickets.'}
          </div>
        ) : (
          tickets.map((t) => {
            const g = t.groupName ? groupTypeStyle(t.groupType) : null;
            return (
              <Link key={t.code} to={`/tickets/${t.code}`} className="card p-5 flex gap-4 items-center hover:ring-brand-300 hover:shadow-md transition">
                <img src={qrSrc(t.code)} alt={`QR for ${t.code}`} className="h-28 w-28 rounded-lg ring-1 ring-zinc-200" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <TicketIcon className="h-4 w-4 text-brand-600" />
                    <span className="font-mono text-sm font-bold">{t.code}</span>
                  </div>
                  <div className="mt-1 font-bold tracking-tight truncate">{t.eventTitle}</div>
                  <div className="text-xs text-zinc-500 mt-1 flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {new Date(t.purchasedAt).toLocaleDateString()}
                  </div>
                  <div className="text-xs text-zinc-600 mt-1">{t.attendeeName}</div>
                  {t.ticketTypeName && (
                    <div className="text-xs text-zinc-500 mt-0.5">{t.ticketTypeName}</div>
                  )}
                  {t.accommodationName && (
                    <div className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1">
                      <BedDouble className="h-3 w-3" /> {t.accommodationName}
                    </div>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {t.groupName && (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${g?.chip || 'bg-zinc-100 text-zinc-700'}`}>
                        {g && <span>{g.emoji}</span>}
                        <span className="truncate max-w-[140px]">{t.groupName}</span>
                      </span>
                    )}
                    <span className={`chip ${t.status === 'checked-in' ? 'chip-selected' : t.status === 'confirmed' ? '' : ''}`}>
                      {t.status}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
