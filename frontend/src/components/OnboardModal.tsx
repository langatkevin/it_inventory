import { useMemo, useState } from 'react';

import type { Asset, AssetType, OrganisationUnit, Person } from '../api/types';

export interface OnboardFormValues {
  personId: string;
  primaryAssetId: string;
  locationId: string;
  expectedReturnDate?: string;
  notes?: string;
  peripherals: string[];
}

interface OnboardModalProps {
  people: Person[];
  locations: OrganisationUnit[];
  spareAssets: Asset[];
  assetTypes: AssetType[];
  loading?: boolean;
  onClose(): void;
  onSubmit(form: OnboardFormValues): Promise<void>;
}

function assetLabel(asset: Asset, typeName: string) {
  const tag = asset.asset_tag ?? 'Untitled';
  const serial = asset.serial_number ? ` · ${asset.serial_number}` : '';
  return `${tag}${serial} (${typeName || 'Unknown type'})`;
}

export default function OnboardModal({
  people,
  locations,
  spareAssets,
  assetTypes,
  loading,
  onClose,
  onSubmit,
}: OnboardModalProps) {
  const [personId, setPersonId] = useState('');
  const [primaryAssetId, setPrimaryAssetId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [expectedReturnDate, setExpectedReturnDate] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedPeripherals, setSelectedPeripherals] = useState<string[]>([]);

  const sortedPeople = useMemo(
    () => [...people].sort((a, b) => a.full_name.localeCompare(b.full_name)),
    [people],
  );

  const sortedLocations = useMemo(
    () => [...locations].sort((a, b) => a.name.localeCompare(b.name)),
    [locations],
  );

  const typeLookup = useMemo(() => {
    const map = new Map<string, string>();
    assetTypes.forEach((type) => map.set(type.id, type.name));
    return map;
  }, [assetTypes]);

  const spareAssetsSorted = useMemo(
    () =>
      [...spareAssets].sort((a, b) => {
        const nameA = a.asset_tag ?? a.asset_model.model_number;
        const nameB = b.asset_tag ?? b.asset_model.model_number;
        return nameA.localeCompare(nameB);
      }),
    [spareAssets],
  );

  const monitorAssets = useMemo(
    () =>
      spareAssetsSorted.filter((asset) => {
        const typeName = (typeLookup.get(asset.asset_model.asset_type_id) ?? '').toLowerCase();
        return typeName.includes('monitor');
      }),
    [spareAssetsSorted, typeLookup],
  );

  const nonMonitorAssets = useMemo(
    () =>
      spareAssetsSorted.filter((asset) => {
        const typeName = (typeLookup.get(asset.asset_model.asset_type_id) ?? '').toLowerCase();
        return !typeName.includes('monitor');
      }),
    [spareAssetsSorted, typeLookup],
  );

  function togglePeripheral(assetId: string) {
    setSelectedPeripherals((current) => {
      if (current.includes(assetId)) {
        return current.filter((item) => item !== assetId);
      }
      return [...current, assetId];
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!personId) {
      alert('Select a person to assign hardware to.');
      return;
    }

    if (!primaryAssetId) {
      alert('Select a primary asset to deploy.');
      return;
    }

    if (!locationId) {
      alert('Choose the destination location for the deployment.');
      return;
    }

    const peripherals = selectedPeripherals.filter((peripheralId) => peripheralId !== primaryAssetId);

    await onSubmit({
      personId,
      primaryAssetId,
      locationId,
      expectedReturnDate: expectedReturnDate ? new Date(expectedReturnDate).toISOString() : undefined,
      notes: notes || undefined,
      peripherals,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-xl">
        <header className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Onboard employee</h2>
            <p className="text-sm text-slate-500">Deploy a laptop and peripherals in one step.</p>
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
              <span className="font-medium text-slate-600">Primary asset</span>
              <select
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                value={primaryAssetId}
                onChange={(event) => {
                  const value = event.target.value;
                  setPrimaryAssetId(value);
                  setSelectedPeripherals((current) => current.filter((item) => item !== value));
                }}
              >
                <option value="">Select spare asset</option>
                {nonMonitorAssets.map((asset) => {
                  const typeName = typeLookup.get(asset.asset_model.asset_type_id) ?? '';
                  return (
                    <option key={asset.id} value={asset.id}>
                      {assetLabel(asset, typeName)}
                    </option>
                  );
                })}
                {!nonMonitorAssets.length ? <option disabled>No spare assets available</option> : null}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium text-slate-600">Deployment location</span>
              <select
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                value={locationId}
                onChange={(event) => setLocationId(event.target.value)}
              >
                <option value="">Select location</option>
                {sortedLocations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name} ({location.category})
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium text-slate-600">Expected return</span>
              <input
                type="date"
                className="rounded-lg border border-slate-300 px-3 py-2"
                value={expectedReturnDate}
                onChange={(event) => setExpectedReturnDate(event.target.value)}
              />
            </label>
          </div>
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-slate-600">Notes</span>
            <textarea
              rows={3}
              className="rounded-lg border border-slate-300 px-3 py-2"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Optional deployment notes"
            />
          </label>
          {monitorAssets.length ? (
            <div className="rounded-lg border border-slate-200 p-4">
              <span className="text-sm font-medium text-slate-600">Assign monitors</span>
              <p className="text-xs text-slate-400">
                Selected monitors will be linked to the primary asset and activated automatically.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {monitorAssets.map((asset) => {
                  const typeName = typeLookup.get(asset.asset_model.asset_type_id) ?? 'Monitor';
                  const disabled = asset.id === primaryAssetId;
                  return (
                    <label
                      key={asset.id}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                        disabled ? 'border-slate-200 bg-slate-50 text-slate-300' : 'border-slate-200'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="rounded border-slate-300"
                        checked={selectedPeripherals.includes(asset.id)}
                        disabled={disabled}
                        onChange={() => togglePeripheral(asset.id)}
                      />
                      <span>{assetLabel(asset, typeName)}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400">No spare monitors detected. You can attach monitors later if needed.</p>
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Only spare assets appear in the list. Update inventory to make more available.
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
                {loading ? 'Deploying…' : 'Deploy hardware'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
