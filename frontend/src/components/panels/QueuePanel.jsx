import { useState } from 'react';
import { FaGripVertical, FaTimes, FaVolumeUp } from 'react-icons/fa';
import usePlayerStore from '../../stores/playerStore';
import useUiStore from '../../stores/uiStore';
import { trackFields, formatTime, tracksLabel } from '../../lib/format';
import { Button } from '../ui/Button';
import SidePanel from './SidePanel';

function QueuePanel() {
  const { queue, queueIndex, playList, removeFromQueue, moveInQueue, clearQueue, isPlaying } = usePlayerStore();
  const close = () => useUiStore.getState().toggleQueue();
  const [dragFrom, setDragFrom] = useState(null);
  const [overIndex, setOverIndex] = useState(null);
  const total = queue.reduce((sum, t) => sum + (t.durationSeconds || 0), 0);

  return (
    <SidePanel
      title="Queue"
      subtitle={`${tracksLabel(queue.length)}${total ? ` · ${formatTime(total)}` : ''}`}
      onClose={close}
      actions={queue.length > 1 && <Button size="sm" variant="ghost" onClick={clearQueue}>Clear</Button>}
    >
      {queue.length === 0 ? (
        <p className="text-sm text-text-muted text-center px-6 py-16">The queue is empty. Play a track or choose “Add to queue”.</p>
      ) : (
        <ol className="list-none py-2">
          {queue.map((track, i) => {
            const t = trackFields(track);
            const current = i === queueIndex;
            return (
              <li
                key={t.videoId}
                draggable
                onDragStart={(e) => {
                  setDragFrom(i);
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOverIndex(i);
                }}
                onDragEnd={() => {
                  setDragFrom(null);
                  setOverIndex(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragFrom !== null) moveInQueue(dragFrom, i);
                  setDragFrom(null);
                  setOverIndex(null);
                }}
                className={`group flex items-center gap-2 px-3 py-1.5 mx-2 rounded-lg ${current ? 'bg-accent/10' : 'hover:bg-bg-hover'} ${overIndex === i && dragFrom !== i ? 'ring-1 ring-neon' : ''}`}
              >
                <FaGripVertical className="text-text-muted text-xs cursor-grab opacity-40 group-hover:opacity-100 shrink-0" aria-hidden />
                <button
                  type="button"
                  onClick={() => playList(queue, i)}
                  className="flex-1 min-w-0 flex items-center gap-3 text-left bg-transparent border-none p-0"
                  aria-label={`Play ${t.title}`}
                >
                  <span className="relative w-9 h-9 shrink-0 rounded overflow-hidden bg-bg-hover">
                    {t.thumbnailSmall && <img src={t.thumbnailSmall} alt="" className="w-full h-full object-cover" />}
                    {current && isPlaying && <span className="absolute inset-0 flex items-center justify-center bg-black/50"><FaVolumeUp className="text-accent text-xs" /></span>}
                  </span>
                  <span className="min-w-0">
                    <span className={`block text-sm truncate ${current ? 'text-accent' : 'text-text-primary'}`}>{t.title}</span>
                    <span className="block text-xs text-text-secondary truncate">{t.channel}</span>
                  </span>
                </button>
                <span className="text-[11px] text-text-muted tabular">{t.duration ? formatTime(t.duration) : ''}</span>
                {!current && (
                  <button type="button" aria-label={`Remove ${t.title} from queue`} onClick={() => removeFromQueue(t.videoId)} className="text-text-muted hover:text-danger bg-transparent border-none p-1 opacity-0 group-hover:opacity-100 focus-visible:opacity-100">
                    <FaTimes className="text-xs" />
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </SidePanel>
  );
}

export default QueuePanel;
