import { create } from 'zustand';

// Panels, drawers and modals - one place so Esc and keyboard shortcuts can close them
const useUiStore = create((set) => ({
  sidebarOpen: typeof window === 'undefined' || window.innerWidth >= 1024,
  queueOpen: false,
  downloadsOpen: false,
  chatOpen: false,
  detailTrack: null, // search item shown in the track drawer
  modal: null, // { type: 'createCrate' | 'renameCrate' | 'confirm', ...props }

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebar: (sidebarOpen) => set({ sidebarOpen }),
  toggleQueue: () => set((s) => ({ queueOpen: !s.queueOpen, downloadsOpen: false })),
  toggleDownloads: () => set((s) => ({ downloadsOpen: !s.downloadsOpen, queueOpen: false })),
  setChat: (chatOpen) => set({ chatOpen }),
  openDetail: (detailTrack) => set({ detailTrack }),
  closeDetail: () => set({ detailTrack: null }),
  openModal: (modal) => set({ modal }),
  closeModal: () => set({ modal: null }),

  // Closes the top-most layer; returns true if something was closed
  closeTop: () => {
    let closed = false;
    set((s) => {
      closed = true;
      if (s.modal) return { modal: null };
      if (s.detailTrack) return { detailTrack: null };
      if (s.chatOpen) return { chatOpen: false };
      if (s.queueOpen || s.downloadsOpen) return { queueOpen: false, downloadsOpen: false };
      closed = false;
      return {};
    });
    return closed;
  },
}));

export default useUiStore;
