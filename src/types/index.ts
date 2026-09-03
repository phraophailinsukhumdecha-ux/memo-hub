export type MemoFieldType =
  | 'text' | 'textarea' | 'number' | 'date' | 'select' | 'email'
  | 'section_title'
  | 'company_header'
  | 'checkbox_group'
  | 'dropdown_select'
  | 'memo_type'
  | 'form_row'
  | 'body_text'
  | 'approval_grid';

export interface User {
  id: string;
  username: string;
  password?: string;
  email: string;
  displayName: string;
  role: 'admin' | 'user';
  department?: string;
  position?: string;
  isApprover?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Group {
  id: string;
  name: string;
  type: 'standard' | 'approve';
  description?: string;
  members: { userId: string; role: 'head' | 'member' }[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MemoTemplate {
  id: string;
  name: string;
  description?: string;
  fields: MemoField[];
  conditionId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemoField {
  id: string;
  name: string;
  label: string;
  type: MemoFieldType;
  required: boolean;
  options?: string[];
  placeholder?: string;
  fieldConfig?: unknown;
}

export interface CompanyHeaderConfig {
  logoUrl: string;
  companyName: string;
  addressLines: string[];
}

export interface CheckboxGroupConfig {
  options: string[];
  columns?: number;
}

export interface DropdownSelectConfig {
  options: string[];
  placeholder?: string;
}

export interface MemoTypeConfig {
  options: { value: string; label: string }[];
  affectedFields?: {
    fieldName: string;
    requiredByType?: string[];
    approvalColumnsByType?: Record<string, { title: string; subtitle?: string }[]>;
  }[];
}

export interface FormRowConfig {
  fields: {
    name: string;
    label: string;
    type: 'text' | 'date';
    placeholder?: string;
    width?: 'full' | 'half';
    requiredByType?: string[];
  }[];
}

export interface BodyTextConfig {
  defaultValue?: string;
  lines?: number;
  placeholder?: string;
}

export interface ApprovalGridConfig {
  columns: {
    title: string;
    subtitle?: string;
  }[];
  dynamicByType?: {
    memoType: string;
    columns: { title: string; subtitle?: string }[];
  }[];
  showTime?: boolean;
}

export interface MemoCondition {
  id: string;
  name: string;
  description?: string;
  matchType: 'job_description' | 'department' | 'customer' | 'supplier';
  matchValue: string;
  approvalRoute: ApprovalRoute[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApprovalRoute {
  level: number;
  approvalLevel: string;
  required: boolean;
}

export interface Memo {
  id: string;
  memoNumber: string;
  templateId: string;
  templateName: string;
  status: 'new' | 'waiting' | 'approved' | 'rejected' | 'cancel';
  title: string;
  formData: Record<string, unknown>;
  ownerId: string;
  ownerName: string;
  department?: string;
  approvalRoute: ApprovalRoute[];
  currentApprovalIndex: number;
  currentApprovalLevel?: string | null;
  approvals: Approval[];
  deadlineAt: Date;
  createdAt: Date;
  updatedAt: Date;
  waitingAt?: Date | null;
  closedAt?: Date | null;
}

export interface Approval {
  level: number;
  approvalLevel: string;
  approverId: string;
  approverName: string;
  action: 'approve' | 'reject';
  comment?: string;
  actedAt: Date;
}

export interface GlobalSettings {
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    password: string;
    fromEmail: string;
    fromName: string;
  };
  deadlineDays: number;
  positionOptions: string[];
  departmentOptions: string[];
  updatedAt?: Date;
  updatedBy?: string;
}

export interface EventLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

export interface Syslog {
  id: string;
  level: 'info' | 'warning' | 'error';
  category: 'auth' | 'api' | 'firebase' | 'system';
  message: string;
  userId?: string;
  userName?: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'new_memo' | 'approved' | 'rejected' | 'cancel';
  memoId?: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
}
