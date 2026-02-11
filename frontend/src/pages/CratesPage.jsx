import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { FaBoxOpen, FaPlus, FaTrash, FaEdit } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import SongCard from '../components/songcard/SongCard';
import useCrateStore from '../stores/crateStore';

function CratesPage() {
  const { crateId } = useParams();
  const { crates, createCrate, deleteCrate, removeTrack, renameCrate } = useCrateStore();
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  const selectedCrate = crateId ? crates.find((c) => c.id === crateId) : null;

  const handleCreate = () => {
    const name = prompt('New crate name:');
    if (name?.trim()) createCrate(name.trim());
  };

  const handleRename = (crate) => {
    setEditingId(crate.id);
    setEditName(crate.name);
  };

  const handleSaveRename = (id) => {
    if (editName.trim()) renameCrate(id, editName.trim());
    setEditingId(null);
  };

  // Show selected crate's tracks
  if (selectedCrate) {
    return (
      <div className="max-w-7xl mx-auto pb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-xl bg-linear-to-br from-accent to-neon flex items-center justify-center">
            <FaBoxOpen className="text-white text-2xl" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-text-primary">{selectedCrate.name}</h1>
            <p className="text-text-secondary text-sm">{selectedCrate.tracks.length} tracks</p>
          </div>
        </div>

        {selectedCrate.tracks.length === 0 ? (
          <div className="text-center py-16">
            <FaBoxOpen className="text-text-muted text-4xl mx-auto mb-4" />
            <p className="text-text-muted text-lg">This crate is empty</p>
            <p className="text-text-muted text-sm mt-2">Search for tracks and add them here</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {selectedCrate.tracks.map((song) => (
              <SongCard
                key={song.id?.videoId}
                song={song}
                showRemove
                onRemove={() => removeTrack(selectedCrate.id, song.id?.videoId)}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Show all crates overview
  return (
    <div className="max-w-7xl mx-auto pb-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold bg-linear-to-r from-accent to-neon bg-clip-text text-transparent">
          My Crates
        </h1>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-medium border-none cursor-pointer transition-colors"
        >
          <FaPlus /> New Crate
        </motion.button>
      </div>

      {crates.length === 0 ? (
        <div className="text-center py-16">
          <FaBoxOpen className="text-text-muted text-5xl mx-auto mb-4" />
          <p className="text-text-muted text-lg">No crates yet</p>
          <p className="text-text-muted text-sm mt-2">
            Create crates to organize your tracks for sets
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {crates.map((crate) => (
              <motion.a
                key={crate.id}
                href={`/crates/${crate.id}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="group bg-bg-card border border-border rounded-xl p-5 hover:border-accent/40 hover:shadow-[0_8px_30px_var(--color-accent-glow)] transition-all duration-300 no-underline"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-lg bg-linear-to-br from-accent/20 to-neon/20 flex items-center justify-center">
                    <FaBoxOpen className="text-accent text-xl" />
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.preventDefault(); handleRename(crate); }}
                      className="w-7 h-7 flex items-center justify-center rounded bg-bg-hover text-text-muted hover:text-neon border-none cursor-pointer transition-colors text-xs"
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={(e) => { e.preventDefault(); deleteCrate(crate.id); }}
                      className="w-7 h-7 flex items-center justify-center rounded bg-bg-hover text-text-muted hover:text-danger border-none cursor-pointer transition-colors text-xs"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>

                {editingId === crate.id ? (
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={() => handleSaveRename(crate.id)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveRename(crate.id)}
                    autoFocus
                    onClick={(e) => e.preventDefault()}
                    className="text-lg font-semibold text-text-primary bg-bg-input border border-border rounded px-2 py-1 outline-none focus:border-accent w-full"
                  />
                ) : (
                  <h3 className="text-lg font-semibold text-text-primary mb-1">{crate.name}</h3>
                )}
                <p className="text-sm text-text-secondary">{crate.tracks.length} tracks</p>
              </motion.a>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

export default CratesPage;
