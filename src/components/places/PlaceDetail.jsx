'use client';

import { useRef, useState } from 'react';
import { Actions, ActionsButton, ActionsGroup, ActionsLabel, Button, Link, Sheet, Toolbar } from 'konsta/react';
import { ArrowUpRightSquare, Camera, Heart, HeartFill, MapPin, StarFill } from 'framework7-icons/react';
import Avatar from '../Avatar';
import { Field, FieldGroup, TextInput } from '../FormRows';
import { useSession } from '../SessionProvider';
import { CATEGORIES, appleMapsUrl, deletePlace, deleteVisit, saveVisit, toggleLike } from '@/lib/places';

function Stars({ value, onChange, size = 22 }) {
  return (
    <span className="flex">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(n)}
          className={`flex h-9 items-center justify-center px-0.5 ${n <= (value ?? 0) ? 'text-together' : 'text-text-secondary/30'}`}
        >
          <StarFill style={{ fontSize: size }} />
        </button>
      ))}
    </span>
  );
}

function VisitForm({ place, onDone, onCancel }) {
  const { me, pair } = useSession();
  const input = useRef(null);
  const mine = place.visit?.ratings?.[me.id];
  const [date, setDate] = useState(place.visit?.visited_at ?? new Date().toISOString().slice(0, 10));
  const [rating, setRating] = useState(mine?.rating ?? 0);
  const [review, setReview] = useState(mine?.review ?? '');
  const [photos, setPhotos] = useState([]);
  const [busy, setBusy] = useState(false);

  return (
    <>
      <Toolbar top innerClassName="w-full! items-center! justify-between">
        <Link toolbar onClick={onCancel}>
          Cancel
        </Link>
        <span className="text-body font-semibold">We were there</span>
        <Link
          toolbar
          className={busy || !rating ? 'pointer-events-none opacity-40' : ''}
          onClick={async () => {
            setBusy(true);
            await saveVisit(place, { me, pair, date, rating, review, photos });
            onDone();
          }}
        >
          <b>Save</b>
        </Link>
      </Toolbar>
      <div className="pb-safe-8">
        <p className="px-4 pt-2 text-center text-title font-bold">{place.title}</p>
        <div className="mt-2 flex justify-center">
          <Stars value={rating} onChange={setRating} size={32} />
        </div>
        <FieldGroup>
          <Field label="When">
            <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <li className="px-4 py-2">
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="Short review"
              rows={2}
              className="w-full resize-none bg-transparent text-body outline-none placeholder:text-text-secondary/50"
            />
          </li>
        </FieldGroup>
        <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => setPhotos([...e.target.files])} />
        <button type="button" onClick={() => input.current?.click()} className="mx-4 mt-4 flex h-12 w-[calc(100%-2rem)] items-center justify-center gap-2 rounded-card bg-surface text-body text-primary">
          <Camera className="text-[20px]" />
          {photos.length ? `${photos.length} photo${photos.length > 1 ? 's' : ''} selected` : 'Add photos'}
        </button>
      </div>
    </>
  );
}

function Detail({ place, onClose, onEdit }) {
  const { me, partner } = useSession();
  const [visiting, setVisiting] = useState(false);
  const [confirm, setConfirm] = useState(null); // 'place' | 'visit'
  const mine = place.added_by === me.id;
  const author = mine ? me : partner;
  const liked = place.likes.includes(me.id);
  const category = CATEGORIES.find((c) => c.id === place.category)?.label;

  if (visiting) return <VisitForm place={place} onCancel={() => setVisiting(false)} onDone={() => { setVisiting(false); onClose(true, true); }} />;

  return (
    <>
      <Toolbar top innerClassName="w-full! items-center! justify-between">
        <Link toolbar onClick={() => onEdit(place)}>
          Edit
        </Link>
        <Link toolbar onClick={() => onClose(false)}>
          <b>Done</b>
        </Link>
      </Toolbar>
      <div className="max-h-[80vh] overflow-auto pb-safe-8">
        {place.image_urlSrc && (
          <div className="mx-4 aspect-[2/1] overflow-hidden rounded-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={place.image_urlSrc} alt="" className="h-full w-full object-cover" />
          </div>
        )}
        <div className="flex items-start gap-3 px-4 pt-3">
          <div className="min-w-0 flex-1">
            <p className="text-title font-bold">{place.title}</p>
            <p className="text-subhead text-text-secondary">{[category, place.city, place.address].filter(Boolean).join(' · ')}</p>
          </div>
          {!mine && (
            <button
              type="button"
              aria-label="Me too"
              onClick={async () => {
                await toggleLike(place, me);
                onClose(true, true);
              }}
              className={`flex h-11 w-11 items-center justify-center rounded-full ${liked ? 'bg-danger/15 text-danger' : 'bg-surface-2 text-text-secondary'}`}
            >
              {liked ? <HeartFill className="text-[22px]" /> : <Heart className="text-[22px]" />}
            </button>
          )}
        </div>

        <div className="mx-4 mt-3 flex items-center gap-2 text-subhead text-text-secondary">
          <Avatar who={mine ? 'me' : 'her'} name={author?.name} src={author?.avatar} className="h-6! w-6! text-[11px]!" />
          Added by {mine ? 'you' : author?.name}
          {place.likes.length > 0 && (
            <span className="flex items-center gap-1 text-danger">
              · <HeartFill className="text-[13px]" /> {mine ? `${partner?.name ?? 'She'} wants too` : liked ? 'You want too' : ''}
            </span>
          )}
        </div>
        {place.note && <p className="mx-4 mt-3 rounded-card bg-surface p-3 text-body">“{place.note}”</p>}

        <a href={appleMapsUrl(place)} target="_blank" rel="noreferrer" className="mx-4 mt-4 flex h-12 items-center justify-center gap-2 rounded-card bg-surface text-body text-primary">
          <MapPin className="text-[18px]" />
          Open in Maps
          <ArrowUpRightSquare className="text-[16px]" />
        </a>

        {place.visit ? (
          <section className="mx-4 mt-4 rounded-card bg-surface p-4">
            <p className="text-caption font-semibold tracking-wide text-text-secondary uppercase">
              Been · {new Date(`${place.visit.visited_at}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            {[
              [me, 'me'],
              [partner, 'her'],
            ].map(([who, color]) => {
              const r = who && place.visit.ratings?.[who.id];
              return r ? (
                <div key={who.id} className="mt-3 flex items-start gap-3">
                  <Avatar who={color} name={who.name} src={who.avatar} />
                  <div>
                    <Stars value={r.rating} size={18} />
                    {r.review && <p className="text-body">{r.review}</p>}
                  </div>
                </div>
              ) : null;
            })}
            {place.visit.photoSrcs.length > 0 && (
              <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
                {place.visit.photoSrcs.map((src) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={src} src={src} alt="" className="h-24 w-24 shrink-0 rounded-control object-cover" />
                ))}
              </div>
            )}
            <div className="mt-3 flex gap-2">
              <Button rounded tonal small onClick={() => setVisiting(true)}>
                {place.visit.ratings?.[me.id] ? 'Edit my rating' : 'Add my rating'}
              </Button>
              <Button rounded clear small className="text-danger!" onClick={() => setConfirm('visit')}>
                Not been yet
              </Button>
            </div>
          </section>
        ) : (
          <div className="mx-4 mt-4">
            <Button large rounded onClick={() => setVisiting(true)}>
              We were there
            </Button>
          </div>
        )}

        <button type="button" onClick={() => setConfirm('place')} className="mx-4 mt-6 h-12 w-[calc(100%-2rem)] rounded-card bg-surface text-body text-danger">
          Delete place
        </button>
      </div>

      <Actions opened={Boolean(confirm)} onBackdropClick={() => setConfirm(null)}>
        <ActionsGroup>
          <ActionsLabel>{confirm === 'place' ? `Delete “${place.title}”?` : 'Remove the visit, ratings and photos?'}</ActionsLabel>
          <ActionsButton
            className="text-danger!"
            onClick={async () => {
              const what = confirm;
              setConfirm(null);
              if (what === 'place') {
                await deletePlace(place);
                onClose(true);
              } else {
                await deleteVisit(place);
                onClose(true, true);
              }
            }}
          >
            Delete
          </ActionsButton>
        </ActionsGroup>
        <ActionsGroup>
          <ActionsButton bold onClick={() => setConfirm(null)}>
            Cancel
          </ActionsButton>
        </ActionsGroup>
      </Actions>
    </>
  );
}

/** onClose(changed, keepOpen) */
export default function PlaceDetail({ place, onClose, onEdit }) {
  return (
    <Sheet opened={Boolean(place)} onBackdropClick={() => onClose(false)} className="w-full">
      {place && <Detail key={place.id} place={place} onClose={onClose} onEdit={onEdit} />}
    </Sheet>
  );
}
