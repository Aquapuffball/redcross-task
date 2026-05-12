export type MunicipalityOption = {
  id: string;
  code: string;
  name: string;
  county: string | null;
};

export type OrganizationBranchContactApi = {
  branchName: string;
  branchType: string;
  phone: string | null;
  email: string | null;
  web: string | null;
};

export type BranchContactPersonApi = {
  role: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
};

export type OrganizationContactApiResponse = {
  branch: OrganizationBranchContactApi | null;
  contacts: BranchContactPersonApi[];
};

export type ImmigrationApiRow = {
  id: string;
  year: number;
  gender: string;
  immigrationReason: string;
  unit: string;
  value: string;
  municipality?: { code: string; name: string };
};

export type LeisureApiRow = {
  id: string;
  year: number;
  tableId: string;
  contentsCode: string;
  contentsLabel: string | null;
  value: string | null;
  status: string | null;
  municipality?: { code: string; name: string };
};

export type ActivitiesApiResponse = {
  activities: string[];
};

export type ComparisonDetailReady = {
  immigration: ImmigrationApiRow[];
  immigrationPreviousYear: ImmigrationApiRow[];
  leisure: LeisureApiRow[];
  activities: string[];
  organizationContact: OrganizationContactApiResponse;
};
