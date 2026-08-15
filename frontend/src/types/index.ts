export interface User {
  id: number;
  name: string;
  email: string;
  organizations?: Organization[];
  created_at?: string;
  updated_at?: string;
}

export interface Organization {
  id: number;
  name: string;
  state: string;
  gst_number: string | null;
  address?: string;
  bank_details?: string;
  upi_id?: string;
  pivot?: {
    user_id: number;
    organization_id: number;
    role: 'admin' | 'operator' | 'auditor';
  };
}

export interface Client {
  id: number;
  organization_id: number;
  name: string;
  company_name?: string;
  state: string;
  gst_number?: string | null;
  default_due_days: number;
  billing_address?: string;
  phone?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Product {
  id: number;
  organization_id: number;
  name: string;
  hsn_code?: string;
  unit: string;
  base_price: number;
  default_gst_rate: number;
  created_at?: string;
  updated_at?: string;
}

export interface InvoiceItem {
  id?: number;
  invoice_id?: number;
  product_id: number;
  product?: Product;
  quantity: number;
  rate: number;
  gst_rate: number;
  taxable_amount?: number;
  cgst_rate?: number;
  sgst_rate?: number;
  igst_rate?: number;
  cgst_amount?: number;
  sgst_amount?: number;
  igst_amount?: number;
  amount?: number;
}

export type DocumentType = 'quote' | 'proforma' | 'challan' | 'invoice';
export type InvoiceStatus = 'draft' | 'finalized' | 'cancelled';

export interface Invoice {
  id: number;
  organization_id: number;
  client_id: number;
  client?: Client;
  items?: InvoiceItem[];
  document_type: DocumentType;
  invoice_number: string | null;
  date: string;
  due_date?: string;
  subtotal: number;
  cgst_total: number;
  sgst_total: number;
  igst_total: number;
  total_gst: number;
  total_amount: number;
  paid_amount: number;
  status: InvoiceStatus;
  template_key?: string;
  finalized_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PaymentAllocation {
  id: number;
  payment_id: number;
  invoice_id: number;
  invoice?: Invoice;
  amount_applied: number;
}

export interface Payment {
  id: number;
  organization_id: number;
  client_id: number;
  client?: Client;
  user_id?: number;
  user?: User;
  amount: number;
  unallocated_amount: number;
  payment_date: string;
  payment_mode: string;
  transaction_reference?: string;
  notes?: string;
  allocations?: PaymentAllocation[];
  created_at?: string;
  updated_at?: string;
}

export interface LedgerEntry {
  entry_type: 'invoice' | 'payment';
  date: string;
  id: number;
  invoice_id?: number;
  payment_id?: number;
  invoice_number?: string;
  document_type?: DocumentType;
  description: string;
  debit: number;
  credit: number;
  running_balance: number;
  due_date?: string;
  paid_amount?: number;
  outstanding_amount?: number;
  status?: string;
  payment_mode?: string;
  transaction_reference?: string;
  allocated_amount?: number;
  unallocated_amount?: number;
  allocations?: PaymentAllocation[];
  created_at?: string;
}

export interface LedgerStatementResponse {
  client: Client;
  opening_balance: number;
  current_outstanding: number;
  statement: LedgerEntry[];
}

export interface AuditLog {
  id: number;
  organization_id: number;
  user_id?: number;
  user?: User;
  action: string;
  auditable_type: string;
  auditable_id: number;
  before_data?: Record<string, any> | null;
  after_data?: Record<string, any> | null;
  created_at: string;
}

export interface MasterMetaResponse {
  organizations: Organization[];
  clients: Client[];
  products: Product[];
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
}

export interface ApiErrorResponse {
  message: string;
  errors?: Record<string, string[]>;
}
