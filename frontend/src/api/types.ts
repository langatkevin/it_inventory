export type AssetStatus = 'active' | 'spare' | 'repair' | 'retired';
export type OperationState = 'normal' | 'incident' | 'repair' | 'decommissioned';

export interface OrganisationUnit {
  id: string;
  name: string;
  category: 'department' | 'warehouse' | 'archive' | 'vendor';
  description?: string | null;
}

export interface Person {
  id: string;
  full_name: string;
  username?: string | null;
  email?: string | null;
  company?: string | null;
  department_id?: string | null;
  reports_to_id?: string | null;
}

export interface AssetType {
  id: string;
  name: string;
  category: string;
  description?: string | null;
}

export interface AssetModel {
  id: string;
  manufacturer?: string | null;
  model_number: string;
  asset_type_id: string;
  default_description?: string | null;
}

export interface AssetSummary {
  id: string;
  asset_tag?: string | null;
  serial_number?: string | null;
  status: AssetStatus;
  description?: string | null;
}

export interface Assignment {
  id: string;
  person: Person;
  start_date: string;
  end_date?: string | null;
  expected_return_date?: string | null;
  primary_device: boolean;
  notes?: string | null;
}

export interface AssignmentWithAsset extends Assignment {
  asset: AssetSummary;
}

export interface AssetRelation {
  id: string;
  child_asset_id: string;
  relation_type: 'attached_to' | 'peripheral_of';
  child?: AssetSummary;
}

export interface Asset {
  id: string;
  asset_tag?: string | null;
  serial_number?: string | null;
  status: AssetStatus;
  operation_state: OperationState;
  description?: string | null;
  notes?: string | null;
  purchase_date?: string | null;
  supplier?: string | null;
  asset_model: AssetModel;
  location?: OrganisationUnit | null;
  assignments: Assignment[];
  relationships: AssetRelation[];
}

export interface AssetEvent {
  id: string;
  asset_id: string;
  action: 'created' | 'assignment_started' | 'assignment_ended' | 'status_changed' | 'location_changed' | 'note';
  actor?: string | null;
  from_status?: AssetStatus | null;
  to_status?: AssetStatus | null;
  from_location?: string | null;
  to_location?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface AssetListResponse {
  items: Asset[];
  total: number;
  page: number;
  size: number;
}

export interface DashboardSummary {
  total_assets: number;
  active_assets: number;
  spare_assets: number;
  repair_assets: number;
  retired_assets: number;
  assets_by_type: Record<string, number>;
  assets_by_department: Record<string, number>;
}

export type OffboardDisposition = 'spare' | 'repair' | 'retire';

export interface AssetTransitionRequest {
  action: 'deploy' | 'return' | 'repair' | 'retire' | 'move';
  target_status?: AssetStatus;
  target_location_id?: string;
  person_id?: string;
  expected_return_date?: string;
  notes?: string;
  peripherals?: string[];
}

export interface AssignmentPayload {
  person_id: string;
  expected_return_date?: string;
  primary_device?: boolean;
  notes?: string;
  monitors?: string[];
}

export interface OffboardAssetPlan {
  asset_id: string;
  disposition: OffboardDisposition;
  target_location_id?: string;
  notes?: string;
}

export interface PersonOffboardingRequest {
  disposition: OffboardDisposition;
  target_location_id?: string;
  notes?: string;
  overrides?: OffboardAssetPlan[];
}

export interface PersonOffboardingResult {
  processed_assets: Asset[];
}

export interface AssetCreateRequest {
  asset_tag?: string;
  serial_number?: string;
  asset_model_id: string;
  status: AssetStatus;
  operation_state?: OperationState;
  purchase_date?: string;
  supplier?: string;
  description?: string;
  location_id?: string;
  notes?: string;
}
