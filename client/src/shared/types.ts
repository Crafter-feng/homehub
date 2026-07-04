// === Core Entity Types (manually synced from server/db/schema) ===

export interface Item {
  id: number;
  familyId: number;
  productId: number | null;
  name: string;
  type: string;
  barcode: string | null;
  categoryId: number | null;
  locationId: number | null;
  quantity: number;
  unit: string;
  minStock: number | null;
  brand: string | null;
  shop: string | null;
  notes: string | null;
  image: string | null;
  customFields: Record<string, unknown> | null;
  currentState: string | null;
  stateChangedAt: Date | null;
  cycleCount: number | null;
  purchasePrice: number | null;
  currency: string | null;
  lastPrice: number | null;
  avgPrice: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  purchaseDate: Date | null;
  expiryDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StockTransaction {
  id: number;
  itemId: number;
  batchId: number | null;
  type: 'add' | 'consume' | 'transfer' | 'adjust';
  quantity: number;
  unit: string;
  fromLocationId: number | null;
  toLocationId: number | null;
  userId: number;
  source: 'manual' | 'barcode' | 'nfc' | 'rfid' | 'voice' | 'vision' | 'mcp';
  note: string | null;
  createdAt: Date;
}

export interface Location {
  id: number;
  familyId: number;
  name: string;
  parentId: number | null;
  level: number;
  image: string | null;
  notes: string | null;
  sortOrder: number;
  createdAt: Date;
}

export interface Category {
  id: number;
  familyId: number;
  name: string;
  icon: string | null;
  notes: string | null;
  parentId: number | null;
  sortOrder: number;
}

export interface User {
  id: number;
  email: string;
  name: string;
  passwordHash: string;
  avatar: string | null;
  role?: 'admin' | 'editor' | 'viewer';
  createdAt: Date;
  updatedAt: Date;
}

export interface Family {
  id: number;
  name: string;
  inviteCode: string;
  createdAt: Date;
}

export interface FamilyMember {
  id: number;
  userId: number;
  familyId: number;
  role: 'admin' | 'editor' | 'viewer';
  joinedAt: Date;
}

export interface TriggerBinding {
  id: number;
  familyId: number;
  code: string;
  codeType: 'nfc' | 'qr' | 'barcode' | 'rfid';
  targetType: 'item' | 'location' | 'recipe' | 'action';
  targetId: number;
  actionOverride: string | null;
  label: string | null;
  notes: string | null;
  lastReadAt: Date | null;
  readCount: number;
  createdAt: Date;
}

export interface Notification {
  id: number;
  familyId: number;
  userId: number | null;
  title: string;
  message: string;
  type: 'expiry' | 'low_stock' | 'chore_due' | 'system' | 'custom';
  isRead: boolean;
  relatedType: string | null;
  relatedId: number | null;
  createdAt: Date;
}

export interface Product {
  id: number;
  familyId: number;
  name: string;
  barcode: string | null;
  categoryId: number | null;
  unit: string;
  brand: string | null;
  image: string | null;
  defaultPrice: number | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// === API Response Types ===

export interface ApiResponse<T> {
  code: number;
  data: T;
  message: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// === Pagination Query ===

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
