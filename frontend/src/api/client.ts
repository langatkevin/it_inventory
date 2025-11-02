import axios from 'axios';

import type {
  Asset,
  AssetListResponse,
  AssetTransitionRequest,
  AssetType,
  AssignmentWithAsset,
  DashboardSummary,
  OrganisationUnit,
  Person,
} from './types';

const baseURL = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000/api';

const api = axios.create({
  baseURL,
  timeout: 10000,
});

export const inventoryApi = {
  listAssets(params?: Record<string, unknown>) {
    return api.get<AssetListResponse>('/assets', { params }).then((res) => res.data);
  },
  getAsset(assetId: string) {
    return api.get<Asset>(`/assets/${assetId}`).then((res) => res.data);
  },
  transitionAsset(assetId: string, payload: AssetTransitionRequest) {
    return api.post<Asset>(`/assets/${assetId}/transition`, payload).then((res) => res.data);
  },
  listOrganisationUnits() {
    return api
      .get<OrganisationUnit[]>('/metadata/organisation-units')
      .then((res) => res.data);
  },
  listAssetTypes() {
    return api.get<AssetType[]>('/metadata/asset-types').then((res) => res.data);
  },
  listPeople() {
    return api.get<Person[]>('/people').then((res) => res.data);
  },
  getPersonAssignments(personId: string) {
    return api
      .get<AssignmentWithAsset[]>(`/people/${personId}/assignments`)
      .then((res) => res.data);
  },
  getDashboardSummary() {
    return api.get<DashboardSummary>('/dashboard/summary').then((res) => res.data);
  },
};

export default api;
