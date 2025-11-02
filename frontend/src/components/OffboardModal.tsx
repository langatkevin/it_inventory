import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { inventoryApi } from '../api/client';
import type {
  AssignmentWithAsset,
  OffboardAssetPlan,
  OffboardDisposition,
  OrganisationUnit,
  Person,
  PersonOffboardingRequest,
} from '../api/types';
import StatusBadge from './StatusBadge';

interface OffboardModalProps {
  people: Person[];
  locations: OrganisationUnit[];
  loading?: boolean;
  onClose(): void;
  onSubmit(personId: string, payload: PersonOffboardingRequest): Promise<void>;
}

type AssetOverrideState = {
  disposition: OffboardDisposition | 'inherit';
  notes: string;
  locationId: string;
};

const dispositionOptions: Array<{ value: OffboardDisposition; label: string }> = [
  { value: 'spare', label: 'Return to spare pool' },
  { value: 'repair', label: 'Send for repair' },
  { value: 'retire', label: 'Retire asset' },
];

export default function OffboardModal({
  people,
  locations,
  loading,
  onClose,
  onSubmit,
}: OffboardModalProps) {
  const [personId, setPersonId] = useState('');
  const [defaultDisposition, setDefaultDisposition] = useState<OffboardDisposition>('spare');
  const [defaultLocationId, setDefaultLocationId] = useState('');
  const [notes, setNotes] = useState('');
  const [overrides, setOverrides] = useState<Record<string, AssetOverrideState>>({});

  const assignmentsQuery = useQuery({
    queryKey: ['people', personId, 'assignments'],
    enabled: Boolean(personId),
    queryFn: () => inventoryApi.getPersonAssignments(personId as string),
  });

  useEffect(() => {
    setOverrides({});
  }, [personId]);

  const sortedPeople = useMemo(
    () => [...people].sort((a, b) => a.full_name.localeCompare(b.full_name)),
    [people],
  );

  const sortedLocations = useMemo(
    () => [...locations].sort((a, b) => a.name.localeCompare(b.name)),
    [locations],
  );

  const activeAssignments: AssignmentWithAsset[] = useMemo(() => {
    if (!assignmentsQuery.data) return [];
    return assignmentsQuery.data.filter((assignment) => assignment.end_date === null);
  }, [assignmentsQuery.data]);

  function updateOverride(assetId: string, updater: (prev: AssetOverrideState) => AssetOverrideState) {
    setOverrides((current) => {
      const previous = current[assetId] ?? { disposition: 'inherit', notes: '', locationId: '' };
      return { ...current, [assetId]: updater(previous) };
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!personId) {
      alert('Select a person to offboard.');
      return;
    }

    if (!activeAssignments.length) {
      alert('Selected person has no active assignments.');
      return;
    }

    const overridePlans: OffboardAssetPlan[] = [];

    for (const assignment of activeAssignments) {
      const state = overrides[assignment.asset.id];
      if (!state) {
        continue;
      }
      const chosenDisposition =
        state.disposition === 'inherit' ? defaultDisposition : state.disposition;
      const finalNotes = state.notes.trim() || undefined;
      const finalLocationId = state.locationId || undefined;

      const dispositionDiff =
        state.disposition !== 'inherit' && state.disposition !== defaultDisposition;
      const locationDiff =
        finalLocationId && finalLocationId !== (defaultLocationId || undefined);

      if (!dispositionDiff && !locationDiff && !finalNotes) {
        continue;
      }

      overridePlans.push({
        asset_id: assignment.asset.id,
        disposition: chosenDisposition,
        target_location_id: finalLocationId,
        notes: finalNotes,
      });
    }

    const payload: PersonOffboardingRequest = {
      disposition: defaultDisposition,
      target_location_id: defaultLocationId || undefined,
      notes: notes || undefined,
      overrides: overridePlans.length ? overridePlans : undefined,
    };

    await onSubmit(personId, payload);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-xl">
        <header className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Offboard employee</h2>
            <p className="text-sm text-slate-500">
              Close assignments and move all hardware in a single workflow.
            </p>
          </div>
          <button className="text-xl leading-none text-slate-400 hover:text-slate-600" onClick={onClose}>
            &times;
          </button>
        </header>
        <form onSubmit={handleSubmit} className="space-y-6 px-6 py-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium text-slate-600">Person</span>
              <select
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                value={personId}
                onChange={(event) => setPersonId(event.target.value)}
              >
                <option value="">Select person</option>
                {sortedPeople.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.full_name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium text-slate-600">Default disposition</span>
              <select
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                value={defaultDisposition}
                onChange={(event) => setDefaultDisposition(event.target.value as OffboardDisposition)}
              >
                {dispositionOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <span className="text-xs text-slate-400">
                Per-asset overrides can be set below if required.
              </span>
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium text-slate-600">Default destination</span>
              <select
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                value={defaultLocationId}
                onChange={(event) => setDefaultLocationId(event.target.value)}
              >
                <option value="">Keep current or auto-select</option>
                {sortedLocations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name} ({location.category})
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium text-slate-600">Overall notes</span>
              <textarea
                rows={3}
                className="rounded-lg border border-slate-300 px-3 py-2"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Optional note captured against each transition"
              />
            </label>
          </div>

          {personId ? (
            assignmentsQuery.isLoading ? (
              <p className="text-sm text-slate-500">Loading assignments…</p>
            ) : assignmentsQuery.isError ? (
              <p className="text-sm text-rose-500">Unable to load assignments for this person.</p>
            ) : !activeAssignments.length ? (
              <p className="text-sm text-slate-500">
                No active assignments found. Assets will remain untouched.
              </p>
            ) : (
              <div className="space-y-4">
                {activeAssignments.map((assignment) => {
                  const state =
                    overrides[assignment.asset.id] ??
                    ({
                      disposition: 'inherit',
                      notes: '',
                      locationId: '',
                    } as AssetOverrideState);
                  return (
                    <div
                      key={assignment.id}
                      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-700">
                            {assignment.asset.asset_tag ?? 'Untitled asset'}
                          </div>
                          <div className="text-xs text-slate-400">
                            Assigned {new Date(assignment.start_date).toLocaleDateString()}
                          </div>
                        </div>
                        <StatusBadge status={assignment.asset.status} />
                      </div>
                      <div className="mt-4 grid gap-3 md:grid-cols-3">
                        <label className="flex flex-col gap-2 text-sm">
                          <span className="font-medium text-slate-600">Disposition</span>
                          <select
                            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                            value={state.disposition}
                            onChange={(event) =>
                              updateOverride(assignment.asset.id, (prev) => ({
                                ...prev,
                                disposition: event.target.value as AssetOverrideState['disposition'],
                              }))
                            }
                          >
                            <option value="inherit">Use default</option>
                            {dispositionOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="flex flex-col gap-2 text-sm">
                          <span className="font-medium text-slate-600">Override location</span>
                          <select
                            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                            value={state.locationId}
                            onChange={(event) =>
                              updateOverride(assignment.asset.id, (prev) => ({
                                ...prev,
                                locationId: event.target.value,
                              }))
                            }
                          >
                            <option value="">Use default</option>
                            {sortedLocations.map((location) => (
                              <option key={location.id} value={location.id}>
                                {location.name} ({location.category})
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="flex flex-col gap-2 text-sm md:col-span-1">
                          <span className="font-medium text-slate-600">Notes</span>
                          <textarea
                            rows={2}
                            className="rounded-lg border border-slate-300 px-3 py-2"
                            value={state.notes}
                            onChange={(event) =>
                              updateOverride(assignment.asset.id, (prev) => ({
                                ...prev,
                                notes: event.target.value,
                              }))
                            }
                            placeholder="Optional override notes"
                          />
                        </label>
                      </div>
                      <p className="mt-2 text-xs text-slate-400">
                        Any linked monitors will follow the selected disposition automatically.
                      </p>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            <p className="text-sm text-slate-500">Select a person to review assigned assets.</p>
          )}

          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Monitors and peripherals linked to each asset are updated automatically.
            </span>
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
                {loading ? 'Processing…' : 'Complete offboarding'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
