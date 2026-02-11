import { create } from 'zustand';

// Load crates from localStorage
const loadCrates = () => {
  try {
    return JSON.parse(localStorage.getItem('dj-crates') || '[]');
  } catch {
    return [];
  }
};

const saveCrates = (crates) => {
  localStorage.setItem('dj-crates', JSON.stringify(crates));
};

const useCrateStore = create((set, get) => ({
  crates: loadCrates(),

  // Create a new crate
  createCrate: (name) => {
    const newCrate = {
      id: Date.now().toString(),
      name,
      tracks: [],
      createdAt: new Date().toISOString(),
    };
    const updated = [...get().crates, newCrate];
    saveCrates(updated);
    set({ crates: updated });
    return newCrate;
  },

  // Delete a crate
  deleteCrate: (crateId) => {
    const updated = get().crates.filter((c) => c.id !== crateId);
    saveCrates(updated);
    set({ crates: updated });
  },

  // Add track to a crate
  addTrack: (crateId, track) => {
    const updated = get().crates.map((crate) => {
      if (crate.id !== crateId) return crate;
      // Prevent duplicates
      if (crate.tracks.some((t) => t.id?.videoId === track.id?.videoId)) return crate;
      return { ...crate, tracks: [...crate.tracks, track] };
    });
    saveCrates(updated);
    set({ crates: updated });
  },

  // Remove track from a crate
  removeTrack: (crateId, videoId) => {
    const updated = get().crates.map((crate) => {
      if (crate.id !== crateId) return crate;
      return {
        ...crate,
        tracks: crate.tracks.filter((t) => t.id?.videoId !== videoId),
      };
    });
    saveCrates(updated);
    set({ crates: updated });
  },

  // Rename a crate
  renameCrate: (crateId, newName) => {
    const updated = get().crates.map((crate) =>
      crate.id === crateId ? { ...crate, name: newName } : crate
    );
    saveCrates(updated);
    set({ crates: updated });
  },

  // Check if a track is in any crate
  isTrackSaved: (videoId) => {
    return get().crates.some((crate) =>
      crate.tracks.some((t) => t.id?.videoId === videoId)
    );
  },
}));

export default useCrateStore;
