/**
 * Represents a statistical card's data structure on the dashboard.
 */
export interface DashboardStat {
  title: string;
  value: string | number;
  description?: string;
  loading?: boolean;
  error?: boolean;
}

/**
 * Represents an API Key associated with a User (Company).
 */
export interface ApiKey {
  id: string;
  label?: string;
  isActive: boolean;
  lastUsedAt?: string;
  createdAt?: string;
  [key: string]: unknown;
}

/**
 * Represents a registered business/company using the system.
 */
export interface User {
  id: string;
  name: string;      // Usually the Company Name
  userName: string;  // MRA Login Username
  ebsId: string;     // EBS Identification
  areaCode: number;
  createdAt: string;
  apiKeys?: ApiKey[];
  [key: string]: unknown;
}

/**
 * Represents a single audit instance (Fiscalisation attempt).
 */
export interface AuditRecord {
  id: string;
  status: 'SUCCESS' | 'FAILED';
  fiscalisedAt: string; // Internal date format "dd/MM/yyyy, HH:mm:ss"
  [key: string]: unknown;
}

/**
 * Represents the health check result of the remote MRA API.
 */
export interface HealthStatus {
  status: 'Operational' | 'Unreachable';
}
