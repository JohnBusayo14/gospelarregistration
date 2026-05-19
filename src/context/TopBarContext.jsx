// TopBarContext.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Per-screen contextual top bar. Pages register a title + an array of action
// buttons via the `useTopBar` hook; AppLayout reads the same context and
// renders the bar. When a page unmounts the registration is automatically
// cleared so the next route starts with an empty action set.
//
// Usage from a page:
//
//   useTopBar({
//     title: 'Registrations',
//     actions: [
//       { id: 'refresh', icon: RefreshCcw, label: 'Refresh',    onClick: reload },
//       { id: 'export',  icon: Download,   label: 'Export CSV', onClick: exportCsv, primary: true },
//     ],
//   });
// ─────────────────────────────────────────────────────────────────────────────

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const TopBarContext = createContext({
  title: '',
  actions: [],
  setTitle: () => {},
  setActions: () => {},
});

export function TopBarProvider({ children }) {
  const [title,   setTitle]   = useState('');
  const [actions, setActions] = useState([]);
  const value = useMemo(
    () => ({ title, actions, setTitle, setActions }),
    [title, actions],
  );
  return <TopBarContext.Provider value={value}>{children}</TopBarContext.Provider>;
}

export function useTopBarContext() {
  return useContext(TopBarContext);
}

// Convenience hook for pages — register title + actions on mount, clear on
// unmount. Pass a deps array so the hook can refresh when the page's local
// state (callbacks, counts) changes.
export function useTopBar({ title = '', actions = [] } = {}, deps = []) {
  const { setTitle, setActions } = useContext(TopBarContext);
  useEffect(() => {
    setTitle(title);
    setActions(actions);
    return () => {
      setTitle('');
      setActions([]);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
