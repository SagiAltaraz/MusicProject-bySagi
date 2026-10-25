import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useUiStore from '../stores/uiStore';
import useCrateStore from '../stores/crateStore';
import { toast } from '../stores/toastStore';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';

function CrateNameModal({ modal, close }) {
  const renaming = modal.type === 'renameCrate';
  const [name, setName] = useState(renaming ? modal.crate.name : '');
  const { createCrate, renameCrate, addTrack } = useCrateStore.getState();
  const navigate = useNavigate();

  const submit = (e) => {
    e.preventDefault();
    const clean = name.trim();
    if (!clean) return;
    if (renaming) {
      renameCrate(modal.crate.id, clean);
    } else {
      const crate = createCrate(clean);
      if (modal.withTrack) {
        addTrack(crate.id, modal.withTrack);
        toast({ tone: 'success', title: `Created ${clean} with 1 track`, duration: 2500 });
      } else {
        navigate(`/crates/${crate.id}`);
      }
    }
    close();
  };

  return (
    <Modal
      title={renaming ? 'Rename crate' : 'New crate'}
      onClose={close}
      footer={(
        <>
          <Button variant="ghost" onClick={close}>Cancel</Button>
          <Button variant="primary" type="submit" form="crate-name-form" disabled={!name.trim()}>{renaming ? 'Save' : 'Create'}</Button>
        </>
      )}
    >
      <form id="crate-name-form" onSubmit={submit}>
        <label className="block text-xs text-text-secondary mb-1.5" htmlFor="crate-name">Name</label>
        <input
          id="crate-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          placeholder="e.g. Saturday warm-up, Peak time, Closing"
          className="w-full h-10 px-3 bg-bg-input border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent"
        />
      </form>
    </Modal>
  );
}

function ConfirmModal({ modal, close }) {
  return (
    <Modal
      title={modal.title}
      onClose={close}
      footer={(
        <>
          <Button variant="ghost" onClick={close}>Cancel</Button>
          <Button variant={modal.danger ? 'danger' : 'primary'} onClick={() => { modal.onConfirm(); close(); }}>{modal.confirmLabel || 'OK'}</Button>
        </>
      )}
    >
      <p className="text-sm text-text-secondary">{modal.message}</p>
    </Modal>
  );
}

/** Renders whichever modal uiStore.modal describes. */
function ModalHost() {
  const modal = useUiStore((s) => s.modal);
  const close = useUiStore((s) => s.closeModal);
  if (!modal) return null;
  if (modal.type === 'createCrate' || modal.type === 'renameCrate') return <CrateNameModal modal={modal} close={close} />;
  if (modal.type === 'confirm') return <ConfirmModal modal={modal} close={close} />;
  return null;
}

export default ModalHost;
