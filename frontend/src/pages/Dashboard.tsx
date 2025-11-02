import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { inventoryApi } from '../api/client';
import { ErrorState, LoadingState } from '../components/Feedback';
import OffboardModal from '../components/OffboardModal';
import OnboardModal, { OnboardFormValues } from '../components/OnboardModal';
import StockAssetModal from '../components/StockAssetModal';
import StatsCard from '../components/StatsCard';
import DashboardCharts from '../components/DashboardCharts';
import type { AssetCreateRequest, PersonOffboardingRequest } from '../api/types';

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const [showOnboard, setShowOnboard] = useState(false);
  const [showOffboard, setShowOffboard] = useState(false);
  const [showStock, setShowStock] = useState(false);

  const summaryQuery = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => inventoryApi.getDashboardSummary(),
  });

  const peopleQuery = useQuery({
    queryKey: ['people'],
    queryFn: () => inventoryApi.listPeople(),
  });

  const locationsQuery = useQuery({
    queryKey: ['metadata', 'locations'],
    queryFn: () => inventoryApi.listOrganisationUnits(),
  });

  const assetTypesQuery = useQuery({
    queryKey: ['metadata', 'asset-types'],
    queryFn: () => inventoryApi.listAssetTypes(),
  });

  const assetModelsQuery = useQuery({
    queryKey: ['metadata', 'asset-models'],
    queryFn: () => inventoryApi.listAssetModels(),
  });

  const spareAssetsQuery = useQuery({
    queryKey: ['assets', 'spare-preview'],
    queryFn: () => inventoryApi.listAssets({ status: 'spare', size: 200 }),
  });

  const onboardMutation = useMutation({
    mutationFn: async (form: OnboardFormValues) => {
      await inventoryApi.transitionAsset(form.primaryAssetId, {
        action: 'deploy',
        person_id: form.personId,
        target_location_id: form.locationId,
        expected_return_date: form.expectedReturnDate,
        notes: form.notes,
        peripherals: form.peripherals.length ? form.peripherals : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['assets', 'spare-preview'] });
      queryClient.invalidateQueries({ queryKey: ['people'] });
      setShowOnboard(false);
    },
    onError: () => {
      alert('Failed to deploy hardware. Please review the details and try again.');
    },
  });

  const offboardMutation = useMutation({
    mutationFn: async ({ personId, payload }: { personId: string; payload: PersonOffboardingRequest }) => {
      return inventoryApi.offboardPerson(personId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['assets', 'spare-preview'] });
      queryClient.invalidateQueries({ queryKey: ['people'] });
      setShowOffboard(false);
    },
    onError: () => {
      alert('Failed to complete offboarding. Please try again.');
    },
  });

  const stockMutation = useMutation({
    mutationFn: (payload: AssetCreateRequest) => inventoryApi.createAsset(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['assets', 'spare-preview'] });
      setShowStock(false);
    },
    onError: () => {
      alert('Failed to add the asset to inventory. Please check the details and try again.');
    },
  });

  const summaryData = summaryQuery.data;
  const spareAssets = spareAssetsQuery.data?.items ?? [];
  const assetTypes = assetTypesQuery.data ?? [];
  const assetModels = assetModelsQuery.data ?? [];

  const disableOnboard = useMemo(
    () =>
      peopleQuery.isLoading ||
      locationsQuery.isLoading ||
      assetTypesQuery.isLoading ||
      spareAssetsQuery.isLoading ||
      !peopleQuery.data?.length ||
      !locationsQuery.data?.length ||
      spareAssets.length === 0,
    [
      peopleQuery.isLoading,
      locationsQuery.isLoading,
      assetTypesQuery.isLoading,
      spareAssetsQuery.isLoading,
      peopleQuery.data,
      locationsQuery.data,
      spareAssets.length,
    ],
  );

  const disableOffboard = useMemo(
    () =>
      peopleQuery.isLoading ||
      locationsQuery.isLoading ||
      !peopleQuery.data?.length ||
      !locationsQuery.data,
    [peopleQuery.isLoading, locationsQuery.isLoading, peopleQuery.data, locationsQuery.data],
  );

  const disableStock = useMemo(
    () =>
      locationsQuery.isLoading ||
      assetTypesQuery.isLoading ||
      assetModelsQuery.isLoading ||
      !assetTypes.length ||
      !assetModels.length,
    [
      locationsQuery.isLoading,
      assetTypesQuery.isLoading,
      assetModelsQuery.isLoading,
      assetTypes.length,
      assetModels.length,
    ],
  );

  if (summaryQuery.isLoading) {
    return <LoadingState label="Loading dashboard" />;
  }

  if (summaryQuery.isError || !summaryData) {
    return <ErrorState message="Failed to load dashboard summary." />;
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h3 className="text-base font-semibold text-slate-800">Onboard employee</h3>
            <p className="mt-1 text-sm text-slate-500">
              Deploy hardware, attach monitors, and start the assignment in one step.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <button
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-70"
              onClick={() => setShowOnboard(true)}
              disabled={disableOnboard}
            >
              Start onboarding
            </button>
            {disableOnboard ? (
              <span className="text-xs text-slate-400">
                Ensure people, locations, and spare assets are available to enable onboarding.
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h3 className="text-base font-semibold text-slate-800">Offboard employee</h3>
            <p className="mt-1 text-sm text-slate-500">
              Close assignments and move laptops and monitors back to spare, repair, or retirement.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <button
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70"
              onClick={() => setShowOffboard(true)}
              disabled={disableOffboard}
            >
              Start offboarding
            </button>
            {disableOffboard ? (
              <span className="text-xs text-slate-400">
                Add people and locations before running the offboarding workflow.
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h3 className="text-base font-semibold text-slate-800">Add inventory</h3>
            <p className="mt-1 text-sm text-slate-500">
              Register new laptops or monitors in spare without assigning them yet.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <button
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-70"
              onClick={() => setShowStock(true)}
              disabled={disableStock}
            >
              Add to store
            </button>
            {disableStock ? (
              <span className="text-xs text-slate-400">
                Ensure asset models and storage locations exist before adding stock.
              </span>
            ) : null}
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard title="Total assets" value={summaryData.total_assets} />
        <StatsCard title="Active" value={summaryData.active_assets} />
        <StatsCard title="In spare" value={summaryData.spare_assets} />
        <StatsCard title="Repair / Retired" value={`${summaryData.repair_assets} / ${summaryData.retired_assets}`} />
      </div>

      <DashboardCharts summary={summaryData} />

      {showOnboard &&
      peopleQuery.data &&
      locationsQuery.data &&
      assetTypesQuery.data &&
      spareAssetsQuery.data ? (
        <OnboardModal
          people={peopleQuery.data}
          locations={locationsQuery.data}
          spareAssets={spareAssets}
          assetTypes={assetTypes}
          loading={onboardMutation.isPending}
          onClose={() => setShowOnboard(false)}
          onSubmit={(form) => onboardMutation.mutateAsync(form)}
        />
      ) : null}

      {showOffboard && peopleQuery.data && locationsQuery.data ? (
        <OffboardModal
          people={peopleQuery.data}
          locations={locationsQuery.data}
          loading={offboardMutation.isPending}
          onClose={() => setShowOffboard(false)}
          onSubmit={(personId, payload) => offboardMutation.mutateAsync({ personId, payload })}
        />
      ) : null}

      {showStock && locationsQuery.data && assetTypesQuery.data && assetModelsQuery.data ? (
        <StockAssetModal
          assetTypes={assetTypes}
          assetModels={assetModels}
          locations={locationsQuery.data}
          loading={stockMutation.isPending}
          onClose={() => setShowStock(false)}
          onSubmit={(payload) => stockMutation.mutateAsync(payload)}
        />
      ) : null}
    </div>
  );
}
