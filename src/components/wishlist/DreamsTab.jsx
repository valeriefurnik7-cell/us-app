'use client';

import { useRef, useState } from 'react';
import { Actions, ActionsButton, ActionsGroup, ActionsLabel, Link, Segmented, SegmentedButton, Sheet, Toolbar } from 'konsta/react';
import { Camera, ChevronDown, Plus, Sparkles } from 'framework7-icons/react';
import { EmptyState } from '../Screen';
import { Field, FieldGroup, TextInput } from '../FormRows';
import { useSession } from '../SessionProvider';
import { deleteDream, markDreamDone, reopenDream, saveDream } from '@/lib/wishlist';
import { errorMessage } from '@/lib/supabase';

const today = () => new Date().toISOString().slice(0, 10);

function DreamCard({ dream, onOpen }) {
  const { me, partner } = useSession();
  const whose = dream.owner_id === null ? 'Ours' : dream.owner_id === me.id ? 'Mine' : `${partner?.name ?? 'Her'}’s`;
  const image = dream.done_at ? dream.done_photoSrc ?? dream.image_urlSrc : dream.image_urlSrc;
  return (
    <button type="button" onClick={() => onOpen(dream)} className="relative aspect-[4/5] overflow-hidden rounded-card bg-surface text-start">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center bg-accent/15 text-primary">
          <Sparkles className="text-[40px]" />
        </span>
      )}
      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pt-8 pb-2.5 text-white">
        <span className="block text-subhead leading-snug font-semibold">{dream.title}</span>
        <span className="text-caption text-white/80">
          {dream.done_at ? `Came true · ${new Date(dream.done_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}` : whose}
        </span>
      </span>
    </button>
  );
}

function DreamForm({ dream, onClose }) {
  const { me, pair } = useSession();
  const input = useRef(null);
  const [title, setTitle] = useState(dream?.title ?? '');
  const [shared, setShared] = useState(dream ? dream.owner_id === null : true);
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(dream?.image_urlSrc ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function save() {
    setBusy(true);
    const { error } = await saveDream({ ...dream, title, shared }, { me, pair, image });
    if (error) {
      setError(errorMessage(error));
      setBusy(false);
    } else onClose(true);
  }

  return (
    <>
      <Toolbar top innerClassName="w-full! items-center! justify-between">
        <Link toolbar onClick={() => onClose(false)}>
          Cancel
        </Link>
        <span className="text-body font-semibold">{dream ? 'Edit dream' : 'New dream'}</span>
        <Link toolbar onClick={save} className={busy || !title.trim() ? 'pointer-events-none opacity-40' : ''}>
          <b>{dream ? 'Save' : 'Add'}</b>
        </Link>
      </Toolbar>
      <div className="pb-safe-8">
        <input
          ref={input}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const file = e.target.files[0];
            if (!file) return;
            setImage(file);
            setPreview(URL.createObjectURL(file));
          }}
        />
        <button type="button" onClick={() => input.current?.click()} className="mx-auto mt-3 flex h-32 w-28 items-center justify-center overflow-hidden rounded-card bg-surface text-primary">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : (
            <Camera className="text-[28px]" />
          )}
        </button>
        <FieldGroup>
          <Field label="Dream">
            <TextInput value={title} placeholder="See the northern lights" onChange={(e) => setTitle(e.target.value)} />
          </Field>
        </FieldGroup>
        <div className="mx-4 mt-4">
          <Segmented strong rounded>
            <SegmentedButton strong rounded active={shared} onClick={() => setShared(true)}>
              Ours
            </SegmentedButton>
            <SegmentedButton strong rounded active={!shared} onClick={() => setShared(false)}>
              Just mine
            </SegmentedButton>
          </Segmented>
        </div>
        {error && <p className="mx-8 mt-3 text-subhead text-danger">{error}</p>}
      </div>
    </>
  );
}

function DoneForm({ dream, onClose }) {
  const { pair } = useSession();
  const input = useRef(null);
  const [date, setDate] = useState(today());
  const [photo, setPhoto] = useState(null);
  const [busy, setBusy] = useState(false);

  return (
    <>
      <Toolbar top innerClassName="w-full! items-center! justify-between">
        <Link toolbar onClick={() => onClose(false)}>
          Cancel
        </Link>
        <span className="text-body font-semibold">It came true!</span>
        <Link
          toolbar
          className={busy ? 'pointer-events-none opacity-40' : ''}
          onClick={async () => {
            setBusy(true);
            await markDreamDone(dream, { pair, date, photo });
            onClose(true);
          }}
        >
          <b>Save</b>
        </Link>
      </Toolbar>
      <div className="pb-safe-8">
        <p className="px-4 pt-2 text-center text-title font-bold">{dream.title}</p>
        <FieldGroup>
          <Field label="When">
            <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </FieldGroup>
        <input ref={input} type="file" accept="image/*" hidden onChange={(e) => setPhoto(e.target.files[0] ?? null)} />
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="mx-4 mt-4 flex h-12 w-[calc(100%-2rem)] items-center justify-center gap-2 rounded-card bg-surface text-body text-primary"
        >
          <Camera className="text-[20px]" />
          {photo ? photo.name : 'Add a photo of the moment'}
        </button>
      </div>
    </>
  );
}

export default function DreamsTab({ dreams, loading, adding, onAddClose, onChanged }) {
  const [menu, setMenu] = useState(null);
  const [editing, setEditing] = useState(null);
  const [doneFor, setDoneFor] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showArchive, setShowArchive] = useState(false);

  const open = dreams.filter((d) => !d.done_at);
  const archive = dreams.filter((d) => d.done_at).sort((a, b) => b.done_at.localeCompare(a.done_at));
  const closeSheet = (setter) => (changed) => {
    setter(null);
    if (changed) onChanged();
  };

  return (
    <>
      {loading ? (
        <div className="mx-4 mt-3 grid grid-cols-2 gap-3">
          {[0, 1].map((i) => (
            <div key={i} className="aspect-[4/5] animate-pulse rounded-card bg-surface" />
          ))}
        </div>
      ) : open.length === 0 && archive.length === 0 ? (
        <EmptyState title="No dreams yet" text="Big wishes — ours or just yours" />
      ) : (
        <div className="mx-4 mt-3 grid grid-cols-2 gap-3">
          {open.map((d) => (
            <DreamCard key={d.id} dream={d} onOpen={setMenu} />
          ))}
          <button
            type="button"
            onClick={() => setEditing({ dream: null })}
            className="flex aspect-[4/5] flex-col items-center justify-center gap-1 rounded-card border-2 border-dashed border-text-secondary/25 text-subhead font-semibold text-primary"
          >
            <Plus className="text-[24px]" />
            Add dream
          </button>
        </div>
      )}

      {archive.length > 0 && (
        <section className="mx-4 mt-6">
          <button type="button" onClick={() => setShowArchive(!showArchive)} className="flex h-11 w-full items-center justify-between px-1">
            <span className="text-caption font-semibold tracking-wide text-text-secondary uppercase">Came true · {archive.length}</span>
            <ChevronDown className={`text-[16px] text-text-secondary transition-transform ${showArchive ? 'rotate-180' : ''}`} />
          </button>
          {showArchive && (
            <div className="grid grid-cols-2 gap-3">
              {archive.map((d) => (
                <DreamCard key={d.id} dream={d} onOpen={setMenu} />
              ))}
            </div>
          )}
        </section>
      )}

      <Sheet opened={Boolean(editing) || adding} onBackdropClick={() => (adding ? onAddClose(false) : setEditing(null))} className="w-full">
        {(editing || adding) && (
          <DreamForm
            dream={editing?.dream ?? null}
            onClose={(changed) => {
              setEditing(null);
              onAddClose(false);
              if (changed) onChanged();
            }}
          />
        )}
      </Sheet>
      <Sheet opened={Boolean(doneFor)} onBackdropClick={() => setDoneFor(null)} className="w-full">
        {doneFor && <DoneForm dream={doneFor} onClose={closeSheet(setDoneFor)} />}
      </Sheet>

      <Actions opened={Boolean(menu)} onBackdropClick={() => setMenu(null)}>
        <ActionsGroup>
          <ActionsLabel>{menu?.title}</ActionsLabel>
          {menu && !menu.done_at && (
            <ActionsButton
              bold
              onClick={() => {
                setDoneFor(menu);
                setMenu(null);
              }}
            >
              It came true
            </ActionsButton>
          )}
          {menu?.done_at && (
            <ActionsButton
              onClick={async () => {
                await reopenDream(menu);
                setMenu(null);
                onChanged();
              }}
            >
              Not yet, after all
            </ActionsButton>
          )}
          <ActionsButton
            onClick={() => {
              setEditing({ dream: menu });
              setMenu(null);
            }}
          >
            Edit
          </ActionsButton>
          <ActionsButton
            className="text-danger!"
            onClick={() => {
              setConfirmDelete(menu);
              setMenu(null);
            }}
          >
            Delete
          </ActionsButton>
        </ActionsGroup>
        <ActionsGroup>
          <ActionsButton bold onClick={() => setMenu(null)}>
            Cancel
          </ActionsButton>
        </ActionsGroup>
      </Actions>

      <Actions opened={Boolean(confirmDelete)} onBackdropClick={() => setConfirmDelete(null)}>
        <ActionsGroup>
          <ActionsLabel>Delete “{confirmDelete?.title}”?</ActionsLabel>
          <ActionsButton
            className="text-danger!"
            onClick={async () => {
              await deleteDream(confirmDelete);
              setConfirmDelete(null);
              onChanged();
            }}
          >
            Delete
          </ActionsButton>
        </ActionsGroup>
        <ActionsGroup>
          <ActionsButton bold onClick={() => setConfirmDelete(null)}>
            Cancel
          </ActionsButton>
        </ActionsGroup>
      </Actions>
    </>
  );
}
