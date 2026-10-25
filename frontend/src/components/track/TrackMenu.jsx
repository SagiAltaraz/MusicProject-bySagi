import {
  FaEllipsisH, FaListUl, FaStepForward, FaBoxOpen, FaPlus, FaDownload, FaWaveSquare, FaYoutube, FaInfoCircle, FaTrash,
} from 'react-icons/fa';
import { Popover, MenuItem, MenuLabel } from '../ui/Popover';
import { IconButton } from '../ui/Button';
import useTrackActions from '../../hooks/useTrackActions';
import { DOWNLOAD_FORMATS } from '../../stores/settingsStore';

/** "⋯" menu with every track action. */
function TrackMenu({ song, onRemove, removeLabel = 'Remove from crate', side = 'bottom' }) {
  const a = useTrackActions(song);

  return (
    <Popover
      side={side}
      className="w-60 max-h-[70vh] overflow-y-auto"
      renderTrigger={({ toggle, props }) => (
        <IconButton label="More actions" size="sm" onClick={(e) => { e.stopPropagation(); toggle(); }} {...props}>
          <FaEllipsisH />
        </IconButton>
      )}
    >
      {(close) => {
        const run = (fn) => () => { fn(); close(); };
        return (
          <>
            <MenuItem icon={<FaStepForward />} onClick={run(a.playNext)}>Play next</MenuItem>
            <MenuItem icon={<FaListUl />} onClick={run(a.queue)}>Add to queue</MenuItem>
            <MenuItem icon={<FaInfoCircle />} onClick={run(a.openDetail)}>Track details</MenuItem>
            <MenuItem icon={<FaWaveSquare />} onClick={run(a.analyze)} hint="BPM, key and loudness - no file saved">Analyze</MenuItem>

            <MenuLabel>Add to crate</MenuLabel>
            {a.crates.map((crate) => (
              <MenuItem key={crate.id} icon={<FaBoxOpen />} onClick={run(() => a.addToCrate(crate))}>{crate.name}</MenuItem>
            ))}
            <MenuItem icon={<FaPlus />} onClick={run(a.newCrateWith)}>New crate…</MenuItem>

            <MenuLabel>Download as</MenuLabel>
            {DOWNLOAD_FORMATS.map((f) => (
              <MenuItem key={f.value} icon={<FaDownload />} onClick={run(() => a.download(f.value))} hint={f.detail}>{f.label}</MenuItem>
            ))}

            <div className="h-px bg-border my-1" />
            <MenuItem icon={<FaYoutube />} onClick={run(a.openYoutube)}>Open on YouTube</MenuItem>
            {onRemove && <MenuItem icon={<FaTrash />} danger onClick={run(onRemove)}>{removeLabel}</MenuItem>}
          </>
        );
      }}
    </Popover>
  );
}

export default TrackMenu;
