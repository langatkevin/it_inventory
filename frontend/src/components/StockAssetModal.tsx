import { useMemo, useState } from 'react';

import type {
  AssetCreateRequest,
  AssetModel,
  AssetStatus,
  AssetType,
  OrganisationUnit,
} from '../api/types';

interface StockAssetModalProps {
  assetTypes: AssetType[];
  assetModels: AssetModel[];
  locations: OrganisationUnit[];
  loading?: boolean;
  onClose(): void;
  onSubmit(payload: AssetCreateRequest): Promise<void>;
}

const STATUS_OPTIONS: Array<{ value: AssetStatus; label: string }> = [
  { value: 'spare', label: 'In spare' },
  { value: 'active', label: 'Active' },
  { value: 'repair', label: 'In repair' },
  { value: 'retired', label: 'Retired' },
];

export default function StockAssetModal({
  assetTypes,
  assetModels,
  locations,
  loading,
  onClose,
  onSubmit,
}: StockAssetModalProps) {
  const [assetTypeId, setAssetTypeId] = useState('');
  const [assetModelId, setAssetModelId] = useState('');
  const [assetTag, setAssetTag] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [status, setStatus] = useState<AssetStatus>('spare');
  const [locationId, setLocationId] = useState('');
  const [description, setDescription] = useState('');
  const [supplier, setSupplier] = useState('');
  const [notes, setNotes] = useState('');

  const sortedTypes = useMemo(
    () => [...assetTypes].sort((a, b) => a.name.localeCompare(b.name)),
    [assetTypes],
  );

  const filteredModels = useMemo(() => {
    const models = assetTypeId
      ? assetModels.filter((model) => model.asset_type_id === assetTypeId)
      : assetModels;
    return [...models].sort((a, b) => a.model_number.localeCompare(b.model_number));
  }, [assetModels, assetTypeId]);

  const sortedLocations = useMemo(
    () => [...locations].sort((a, b) => a.name.localeCompare(b.name)),
    [locations],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!assetModelId) {
      alert('Select an asset model before saving.');
      return;
    }

    const payload: AssetCreateRequest = {
      asset_model_id: assetModelId,
      status,
      operation_state: 'normal',
      asset_tag: assetTag || undefined,
      serial_number: serialNumber || undefined,
      location_id: locationId || undefined,
      description: description || undefined,
      supplier: supplier || undefined,
      notes: notes || undefined,
    };

    await onSubmit(payload);

    setAssetTag('');
    setSerialNumber('');
    setNotes('');
  }

  function resetModelSelection(newTypeId: string) {
    setAssetTypeId(newTypeId);
    setAssetModelId('');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-xl">
        <header className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Add hardware to inventory</h2>
            <p className="text-sm text-slate-500">
              Capture new laptops or monitors without assigning them yet.
            </p>
          </div>
          <button className="text-xl leading-none text-slate-400 hover:text-slate-600" onClick={onClose}>
            &times;
          </button>
        </header>
        <form onSubmit={handleSubmit} className="space-y-6 px-6 py-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium text-slate-600">Asset type</span>
              <select
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                value={assetTypeId}
                onChange={(event) => resetModelSelection(event.target.value)}
              >
                <option value="">All types</option>
                {sortedTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium text-slate-600">Asset model</span>
              <select
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                value={assetModelId}
                onChange={(event) => setAssetModelId(event.target.value)}
              >
                <option value="">Select model</option>
                {filteredModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.model_number} {model.manufacturer ? `· ${model.manufacturer}` : ''}
                  </option>
                ))}
                {!filteredModels.length ? <option disabled>No models found</option> : null}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium text-slate-600">Asset tag</span>
              <input
                className="rounded-lg border border-slate-300 px-3 py-2"
                value={assetTag}
                onChange={(event) => setAssetTag(event.target.value)}
                placeholder="e.g. LAP1001"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium text-slate-600">Serial number</span>
              <input
                className="rounded-lg border border-slate-300 px-3 py-2"
                value={serialNumber}
                onChange={(event) => setSerialNumber(event.target.value)}
                placeholder="Manufacturer serial"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium text-slate-600">Status</span>
              <select
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                value={status}
                onChange={(event) => setStatus(event.target.value as AssetStatus)}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium text-slate-600">Storage location</span>
              <select
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                value={locationId}
                onChange={(event) => setLocationId(event.target.value)}
              >
                <option value="">Unspecified</option>
                {sortedLocations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name} ({location.category})
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-slate-600">Description</span>
            <textarea
              rows={2}
              className="rounded-lg border border-slate-300 px-3 py-2"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Optional description or configuration notes"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium text-slate-600">Supplier</span>
              <input
                className="rounded-lg border border-slate-300 px-3 py-2"
                value={supplier}
                onChange={(event) => setSupplier(event.target.value)}
                placeholder="Optional vendor name"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium text-slate-600">Internal notes</span>
              <textarea
                rows={2}
                className="rounded-lg border border-slate-300 px-3 py-2"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Visible to admins only"
              />
            </label>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Assets added here remain unassigned until deployed.</span>
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
                {loading ? 'Saving…' : 'Add to inventory'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
