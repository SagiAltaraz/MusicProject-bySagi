import { create } from 'zustand';

let nextId = 1;

/**
 * toast({ title, message?, tone?: 'info'|'success'|'error', action?: {label, onClick}, duration? })
 */
const useToastStore = create((set, get) => ({
  toasts: [],

  toast: ({ duration = 5000, tone = 'info', ...rest }) => {
    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts.slice(-4), { id, tone, ...rest }] }));
    if (duration) setTimeout(() => get().dismiss(id), duration);
    return id;
  },

  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = (opts) => useToastStore.getState().toast(opts);

export default useToastStore;
