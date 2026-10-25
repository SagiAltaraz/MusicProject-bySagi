import usePlayerStore from '../stores/playerStore';
import useCrateStore from '../stores/crateStore';
import useDownloadStore from '../stores/downloadStore';
import useSettingsStore from '../stores/settingsStore';
import useTrackMetaStore from '../stores/trackMetaStore';
import useUiStore from '../stores/uiStore';
import { toast } from '../stores/toastStore';

export const TRACK_MIME = 'application/x-djcrate-track';

/** Everything a user can do with one track, shared by cards, rows, drawer and chat. */
export default function useTrackActions(song) {
  const videoId = song?.id?.videoId;
  const crates = useCrateStore((s) => s.crates);

  return {
    videoId,
    crates,
    play: () => usePlayerStore.getState().playTrack(song),
    playNext: () => {
      usePlayerStore.getState().playNextInQueue(song);
      toast({ tone: 'info', title: 'Playing next', duration: 2000 });
    },
    queue: () => {
      const added = usePlayerStore.getState().addToQueue(song);
      toast({ tone: 'info', title: added ? 'Added to queue' : 'Already in the queue', duration: 2000 });
    },
    download: (profile = useSettingsStore.getState().downloadFormat) => useDownloadStore.getState().start(song, profile),
    analyze: () => useTrackMetaStore.getState().analyze(videoId),
    addToCrate: (crate) => {
      const added = useCrateStore.getState().addTrack(crate.id, song);
      toast({ tone: added ? 'success' : 'info', title: added ? `Added to ${crate.name}` : `Already in ${crate.name}`, duration: 2500 });
    },
    newCrateWith: () => useUiStore.getState().openModal({ type: 'createCrate', withTrack: song }),
    openDetail: () => useUiStore.getState().openDetail(song),
    openYoutube: () => window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank', 'noopener'),
    dragProps: {
      draggable: true,
      onDragStart: (e) => {
        e.dataTransfer.setData(TRACK_MIME, JSON.stringify(song));
        e.dataTransfer.effectAllowed = 'copy';
      },
    },
  };
}
