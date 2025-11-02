import { useMemo, useState } from 'react';

import type {
  Asset,
  AssetTransitionRequest,
  OrganisationUnit,
  Person,
} from '../api/types';

interface TransitionModalProps {
  asset: Asset;
  people: Person[];
  locations: OrganisationUnit[];
  loading?: boolean;
  onClose(): void;
  onSubmit(payload: AssetTransitionRequest): Promise<void>;
}

const actions: Array<{ value: AssetTransitionRequest['action']; label: string }> = [
  { value: 'deploy', label: 'Deploy to user' },
  { value: 'return', label: 'Return to spare pool' },
  { value: 'move', label: 'Move to location' },
  { value: 'repair', label: 'Mark under repair' },
  { value: 'retire', label: 'Retire asset' },
];

export default function TransitionModal({ asset, people, locations, loading, onClose, onSubmit }: TransitionModalProps) {
  const [action, setAction] = useState<AssetTransitionRequest['action']>('deploy');
  const [personId, setPersonId] = useState('');
  const [locationId, setLocationId] = useState(asset.location?.id ?? '');
  const [notes, setNotes] = useState('');
  const [expectedReturnDate, setExpectedReturnDate] = useState('');
  const [peripherals, setPeripherals] = useState('');

  const requiresPerson = action === 'deploy';
  const requiresLocation = action === 'deploy' || action === 'return' || action === 'move';

  const availablePeople = useMemo(() => people.sort((a, b) => a.full_name.localeCompare(b.full_name)), [people]);
  const availableLocations = useMemo(
    () => locations.sort((a, b) => a.name.localeCompare(b.name)),
    [locations],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (requiresPerson && !personId) {
      alert('Select a person for deployment.');
      return;
    }

    if (requiresLocation && !locationId) {
      alert('Select a destination location.');
      return;
    }

    const payload: AssetTransitionRequest = {
      action,
      notes: notes || undefined,
      person_id: requiresPerson ? personId : undefined,
      target_location_id: requiresLocation ? locationId : undefined,
      expected_return_date: expectedReturnDate ? new Date(expectedReturnDate).toISOString() : undefined,
      peripherals: peripherals
        ? peripherals
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean)
        : undefined,
    };

    await onSubmit(payload);
  }

  function actionDescription(currentAction: AssetTransitionRequest['action']) {
    switch (currentAction) {
      case 'deploy':
        return 'Assign the asset to a person and activate it.';
      case 'return':
        return 'Mark the asset as spare and move it back to storage.';
      case 'move':
        return 'Change the physical location without altering status.';
      case 'repair':
        return 'Flag the asset as under repair and capture notes.';
      case 'retire':
        return 'Retire the asset and archive its usage history.';
      default:
        return '';
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-xl">
        <header className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Manage asset</h2>
            <p className="text-sm text-slate-500">{asset.asset_tag ?? 'Untitled'} · {asset.asset_model.model_number}</p>
          </div>
          <button className="text-sm text-slate-400 hover:text-slate-600" onClick={onClose}>&times;</button>
        </header>
        <form onSubmit={handleSubmit} className="space-y-6 px-6 py-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium text-slate-600">Action</span>
              <select
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                value={action}
                onChange={(event) => setAction(event.target.value as AssetTransitionRequest['action'])}
              >
                {actions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              <span className="text-xs text-slate-400">{actionDescription(action)}</span>
            </label>
            {requiresPerson ? (
              <label className="flex flex-col gap-2 text-sm">
                <span className="font-medium text-slate-600">Assign to person</span>
                <select
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  value={personId}
                  onChange={(event) => setPersonId(event.target.value)}
                >
                  <option value="">Select person</option>
                  {availablePeople.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.full_name} {person.company ? `· ${person.company}` : ''}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <div />
            )}
            {requiresLocation ? (
              <label className="flex flex-col gap-2 text-sm">
                <span className="font-medium text-slate-600">Target location</span>
                <select
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  value={locationId}
                  onChange={(event) => setLocationId(event.target.value)}
                >
                  <option value="">Select location</option>
                  {availableLocations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name} ({location.category})
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {action === 'deploy' ? (
              <label className="flex flex-col gap-2 text-sm">
                <span className="font-medium text-slate-600">Expected return</span>
                <input
                  type="date"
                  className="rounded-lg border border-slate-300 px-3 py-2"
                  value={expectedReturnDate}
                  onChange={(event) => setExpectedReturnDate(event.target.value)}
                />
              </label>
            ) : null}
          </div>
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-slate-600">Notes</span>
            <textarea
              rows={3}
              className="rounded-lg border border-slate-300 px-3 py-2"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Anything to capture about this movement"
            />
          </label>
          {action === 'deploy' ? (
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium text-slate-600">Peripheral asset IDs</span>
              <input
                className="rounded-lg border border-slate-300 px-3 py-2"
                value={peripherals}
                onChange={(event) => setPeripherals(event.target.value)}
                placeholder="Comma separated asset IDs for monitors/peripherals"
              />
            </label>
          ) : null}
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-400">
              Current status: <strong className="text-slate-600">{asset.status.toUpperCase()}</strong>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? 'Saving…' : 'Execute action'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
