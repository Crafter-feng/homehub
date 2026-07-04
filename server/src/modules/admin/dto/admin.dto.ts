export class SystemStatsResponse {
  totalUsers: number;
  totalFamilies: number;
  totalItems: number;
  totalScans: number;
}

export class UserListResponse {
  id: number;
  email: string;
  name: string;
  avatar: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class FamilyListResponse {
  id: number;
  name: string;
  inviteCode: string;
  createdAt: Date;
  memberCount: number;
}

export class ApiTokenListResponse {
  id: number;
  userId: number;
  familyId: number;
  name: string;
  tokenPrefix: string;
  permissions: string[];
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  isRevoked: boolean;
  createdAt: Date;
}
