import { create } from 'zustand';
import { load, save } from '../lib/storage';

const idOf = (t) => t?.id?.videoId;

const useCrateStore = create((set, get) => {
  // Every mutation persists
  const commit = (crates) => {
    save('dj-crates', crates);
    set({ crates });
  };
  const mapCrate = (crateId, fn) => commit(get().crates.map((c) => (c.id === crateId ? fn(c) : c)));

  return {
    crates: load('dj-crates', []),

    createCrate: (name) => {
      const crate = { id: Date.now().toString(), name, tracks: [], createdAt: new Date().toISOString() };
      commit([...get().crates, crate]);
      return crate;
    },

    /** Returns the deleted crate so the caller can offer Undo. */
    deleteCrate: (crateId) => {
      const crates = get().crates;
      const index = crates.findIndex((c) => c.id === crateId);
      commit(crates.filter((c) => c.id !== crateId));
      return { crate: crates[index], index };
    },

    restoreCrate: ({ crate, index }) => {
      const crates = [...get().crates];
      crates.splice(index, 0, crate);
      commit(crates);
    },

    renameCrate: (crateId, name) => mapCrate(crateId, (c) => ({ ...c, name })),

    /** @returns {boolean} false if the track was already in the crate */
    addTrack: (crateId, track) => {
      const crate = get().crates.find((c) => c.id === crateId);
      if (!crate || crate.tracks.some((t) => idOf(t) === idOf(track))) return false;
      mapCrate(crateId, (c) => ({ ...c, tracks: [...c.tracks, track] }));
      return true;
    },

    addTracks: (crateId, tracks) => {
      let added = 0;
      mapCrate(crateId, (c) => {
        const ids = new Set(c.tracks.map(idOf));
        const fresh = tracks.filter((t) => !ids.has(idOf(t)));
        added = fresh.length;
        return { ...c, tracks: [...c.tracks, ...fresh] };
      });
      return added;
    },

    /** Returns what was removed so it can be undone. */
    removeTrack: (crateId, videoId) => {
      const crate = get().crates.find((c) => c.id === crateId);
      const index = crate?.tracks.findIndex((t) => idOf(t) === videoId) ?? -1;
      if (index < 0) return null;
      const track = crate.tracks[index];
      mapCrate(crateId, (c) => ({ ...c, tracks: c.tracks.filter((t) => idOf(t) !== videoId) }));
      return { crateId, track, index };
    },

    restoreTrack: ({ crateId, track, index }) => mapCrate(crateId, (c) => {
      const tracks = [...c.tracks];
      tracks.splice(index, 0, track);
      return { ...c, tracks };
    }),

    moveTrack: (crateId, from, to) => mapCrate(crateId, (c) => {
      const tracks = [...c.tracks];
      const [moved] = tracks.splice(from, 1);
      tracks.splice(to, 0, moved);
      return { ...c, tracks };
    }),

    isTrackSaved: (videoId) => get().crates.some((c) => c.tracks.some((t) => idOf(t) === videoId)),
  };
});

export default useCrateStore;
