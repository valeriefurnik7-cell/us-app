'use client';

import { useState } from 'react';
import NextLink from '@/components/AppLink';
import { Actions, ActionsButton, ActionsGroup, ActionsLabel, Progressbar } from 'konsta/react';
import { Airplane, MapPin, Plus } from 'framework7-icons/react';
import Avatar from '../Avatar';
import { useSession } from '../SessionProvider';
import TripSheet, { QuickTripSheet } from './TripSheet';
import { TRIP_STATUSES, deleteQuickTrip, money, tripDates, useTrips } from '@/lib/trips';

const STATUS_STYLE = { planned: 'bg-surface-2 text-text', going: 'bg-accent text-white', done: 'bg-together/20 text-together' };

function TripCard({ trip }) {
  const { me, partner } = useSession();
  const mine = trip.author_id === me.id;
  const author = mine ? me : partner;
  const status = TRIP_STATUSES.find((s) => s.id === trip.status);
  const myBudget = trip.budgets.find((b) => b.profile_id === me.id);
  const spent = trip.expenses.filter((e) => e.profile_id === me.id).reduce((sum, e) => sum + Number(e.amount), 0);
  const visited = trip.stops.filter((s) => s.visited).length;

  return (
    <NextLink href={`/plans/trips/${trip.id}`} className="block overflow-hidden rounded-card bg-surface">
      <div className="relative aspect-[2/1] bg-surface-2">
        {trip.cover_urlSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={trip.cover_urlSrc} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full items-center justify-center text-text-secondary">
            <Airplane className="text-[40px]" />
          </span>
        )}
        <span className={`absolute start-3 top-3 rounded-full px-2.5 py-0.5 text-caption font-semibold ${STATUS_STYLE[trip.status]}`}>{status?.label}</span>
      </div>
      <div className="p-3">
        <div className="flex items-center gap-2">
          <p className="min-w-0 flex-1 truncate text-body font-semibold">{trip.destination}</p>
          <Avatar who={mine ? 'me' : 'her'} name={author?.name} src={author?.avatar} className="h-8! w-8! text-[13px]!" />
        </div>
        <p className="text-subhead text-text-secondary">
          {[tripDates(trip), trip.shared ? 'Together' : 'Solo', trip.stops.length ? `places ${visited}/${trip.stops.length}` : null].filter(Boolean).join(' · ')}
        </p>
        {myBudget?.amount > 0 && (
          <div className="mt-2">
            <Progressbar progress={Math.min(1, spent / myBudget.amount)} className={spent > myBudget.amount ? '[&_span]:bg-danger!' : ''} />
            <p className="mt-1 text-caption text-text-secondary">
              {money(spent, myBudget.currency)} of {money(myBudget.amount, myBudget.currency)}
            </p>
          </div>
        )}
      </div>
    </NextLink>
  );
}

export default function TripsTab({ adding, onAddClose }) {
  const { me } = useSession();
  const trips = useTrips();
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickMenu, setQuickMenu] = useState(null);
  const list = trips.data?.trips ?? [];
  const quick = trips.data?.quick ?? [];
  const upcoming = list.filter((t) => t.status !== 'done');
  const been = list.filter((t) => t.status === 'done');

  return (
    <>
      <button
        type="button"
        onClick={() => onAddClose(true)}
        className="mx-4 mt-3 flex h-14 w-[calc(100%-2rem)] items-center justify-center gap-2 rounded-card border-2 border-dashed border-text-secondary/25 text-body font-semibold text-primary"
      >
        <Plus className="text-[20px]" />
        Add destination
      </button>

      {trips.loading ? (
        <div className="mx-4 mt-3 space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="aspect-[2/1] animate-pulse rounded-card bg-surface" />
          ))}
        </div>
      ) : (
        <>
          {upcoming.length > 0 && <div className="mx-4 mt-3 space-y-3">{upcoming.map((t) => <TripCard key={t.id} trip={t} />)}</div>}

          <section className="mx-4 mt-6">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-caption font-semibold tracking-wide text-text-secondary uppercase">Where we’ve been</h3>
              <button type="button" onClick={() => setQuickOpen(true)} className="h-11 text-subhead text-primary">
                + Quick mark
              </button>
            </div>
            {been.length === 0 && quick.length === 0 ? (
              <p className="rounded-card bg-surface px-4 py-6 text-center text-subhead text-text-secondary">Past trips and quick “I was there” marks show up here.</p>
            ) : (
              <div className="space-y-3">
                {been.map((t) => (
                  <TripCard key={t.id} trip={t} />
                ))}
                {quick.length > 0 && (
                  <ul className="overflow-hidden rounded-card bg-surface">
                    {quick.map((q) => (
                      <li key={q.id}>
                        <button
                          type="button"
                          onClick={() => q.profile_id === me.id && setQuickMenu(q)}
                          className="flex min-h-12 w-full items-center gap-3 border-b border-text-secondary/15 px-4 text-start"
                        >
                          <MapPin className={`text-[18px] ${q.profile_id === me.id ? 'text-me' : 'text-her'}`} />
                          <span className="flex-1 text-body">{q.city}</span>
                          <span className="text-subhead text-text-secondary">{tripDates(q)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>
        </>
      )}

      <TripSheet
        opened={adding}
        trip={null}
        onClose={(changed) => {
          onAddClose(false);
          if (changed) trips.reload();
        }}
      />
      <QuickTripSheet
        opened={quickOpen}
        onClose={(changed) => {
          setQuickOpen(false);
          if (changed) trips.reload();
        }}
      />
      <Actions opened={Boolean(quickMenu)} onBackdropClick={() => setQuickMenu(null)}>
        <ActionsGroup>
          <ActionsLabel>{quickMenu?.city}</ActionsLabel>
          <ActionsButton
            className="text-danger!"
            onClick={async () => {
              await deleteQuickTrip(quickMenu);
              setQuickMenu(null);
              trips.reload();
            }}
          >
            Delete mark
          </ActionsButton>
        </ActionsGroup>
        <ActionsGroup>
          <ActionsButton bold onClick={() => setQuickMenu(null)}>
            Cancel
          </ActionsButton>
        </ActionsGroup>
      </Actions>
    </>
  );
}
