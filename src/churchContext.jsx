import { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api.js';

// Tracks the church the admin is currently managing — the SaaS tenant scope.
// Persists to localStorage so refreshing the admin doesn't lose context.
const CURRENT_KEY = 'gospelar.currentChurchId.v1';
const Ctx = createContext({ church: null, churches: [], setCurrent: () => {}, reload: () => {} });

export function ChurchProvider({ children }) {
  const [churches, setChurches] = useState([]);
  const [currentId, setCurrentId] = useState(() => {
    try { return localStorage.getItem(CURRENT_KEY) || ''; } catch { return ''; }
  });

  async function reload() {
    const list = await api.listChurches();
    setChurches(list);
    if (!currentId && list[0]) setCurrentId(list[0].id);
  }
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, []);

  function setCurrent(id) {
    setCurrentId(id);
    try { localStorage.setItem(CURRENT_KEY, id); } catch {}
  }

  const church = churches.find((c) => c.id === currentId) || null;

  return (
    <Ctx.Provider value={{ church, churches, setCurrent, reload }}>
      {children}
    </Ctx.Provider>
  );
}

export function useChurch() {
  return useContext(Ctx);
}
