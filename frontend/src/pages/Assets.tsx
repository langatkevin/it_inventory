import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { inventoryApi } from '../api/client';
import type { Asset, AssetStatus, AssetTransitionRequest } from '../api/types';
import AssetTable from '../components/AssetTable';
import { ErrorState, LoadingState } from '../components/Feedback';
import TransitionModal from '../components/TransitionModal';
import useDebounce from '../hooks/useDebounce';

const statusFilters: Array<{ value: 'all' | AssetStatus; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'spare', label: 'Spare' },
  { value: 'repair', label: 'Repair' },
  { value: 'retired', label: 'Retired' },
];

export default function AssetsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | AssetStatus>('all');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  const debouncedSearch = useDebounce(search);
  const queryClient = useQueryClient();

  const listParams = useMemo(
    () => ({ page, search: debouncedSearch, status }),
    [page, debouncedSearch, status],
  );

  const assetsQuery = useQuery({
    queryKey: ['assets', listParams],
    keepPreviousData: true,
    queryFn: () =>
      inventoryApi.listAssets({
        page,
        search: debouncedSearch || undefined,
        status: status === 'all' ? undefined : status,
      }),
  });

  const locationsQuery = useQuery({
    queryKey: ['metadata', 'locations'],
    queryFn: () => inventoryApi.listOrganisationUnits(),
  });

  const peopleQuery = useQuery({
    queryKey: ['people'],
    queryFn: () => inventoryApi.listPeople(),
  });

  const transitionMutation = useMutation({
    mutationFn: (payload: AssetTransitionRequest) => {
      if (!selectedAsset) throw new Error('No asset selected');
      return inventoryApi.transitionAsset(selectedAsset.id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      setSelectedAsset(null);
    },
  });

  const isLoading = assetsQuery.isLoading;
  const isError = assetsQuery.isError;

  function openModal(asset: Asset) {
    setSelectedAsset(asset);
  }

  async function handleTransition(payload: AssetTransitionRequest) {
    await transitionMutation.mutateAsync(payload);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex gap-2">
          {statusFilters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => {
                setStatus(filter.value);
                setPage(1);
              }}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                status === filter.value
                  ? 'bg-brand-600 text-white shadow'
                  : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm md:w-64"
            placeholder="Search by asset tag or serial"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {isLoading ? (
        <LoadingState label="Loading assets" />
      ) : isError || !assetsQuery.data ? (
        <ErrorState message="Unable to load assets." />
      ) : (
        <>
          <AssetTable assets={assetsQuery.data.items} onSelect={openModal} />
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>
              Showing {(page - 1) * assetsQuery.data.size + 1}–
              {Math.min(page * assetsQuery.data.size, assetsQuery.data.total)} of {assetsQuery.data.total}
            </span>
            <div className="flex gap-2">
              <button
                className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-50"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page === 1}
              >
                Previous
              </button>
              <button
                className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-50"
                onClick={() => {
                  const maxPages = Math.ceil((assetsQuery.data?.total ?? 0) / assetsQuery.data.size);
                  setPage((prev) => Math.min(maxPages, prev + 1));
                }}
                disabled={page >= Math.ceil((assetsQuery.data.total || 0) / assetsQuery.data.size)}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      {selectedAsset && peopleQuery.data && locationsQuery.data ? (
        <TransitionModal
          asset={selectedAsset}
          people={peopleQuery.data}
          locations={locationsQuery.data}
          loading={transitionMutation.isPending}
          onClose={() => setSelectedAsset(null)}
          onSubmit={handleTransition}
        />
      ) : null}
    </div>
  );
}
