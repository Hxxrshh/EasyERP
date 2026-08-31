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
  default_gst_template?: string;
  default_non_gst_template?: string;
  is_archived?: boolean;
  archived_at?: string | null;
  archived_by?: number | null;
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
  short_name?: string;
  state: string;
  gst_number?: string | null;
  default_due_days: number;
  billing_address?: string;
  phone?: string;
  contact_phone?: string;
  contact_whatsapp?: string;
  preferred_template?: string | null;
  is_archived?: boolean;
  archived_at?: string | null;
  archived_by?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface Product {
  id: number;
  organization_id: number;
  name: string;
  short_name?: string;
  hsn_code?: string;
  unit: string;
  base_price: number;
  default_gst_rate: number;
  is_archived?: boolean;
  archived_at?: string | null;
  archived_by?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface UsageCheckResponse {
  client_id?: number;
  client_name?: string;
  product_id?: number;
  product_name?: string;
  organization_id?: number;
  organization_name?: string;
  is_archived: boolean;
  invoices_count?: number;
  documents_count?: number;
  payments_count?: number;
  outstanding_amount?: number;
  last_transaction_date?: string | null;
  invoice_items_count?: number;
  inventory_transactions_count?: number;
  clients_count?: number;
  products_count?: number;
  has_transactions: boolean;
  can_permanently_delete: boolean;
  blocking_reason?: string | null;
}

export interface HistoricalSale {
  item_id: number;
  invoice_id: number;
  invoice_number: string;
  rate: number;
  quantity: number;
  gst_rate: number;
  unit: string;
  date: string;
  formatted_date: string;
}

export interface ClientComparisonItem {
  client: {
    id: number;
    name: string;
    company_name?: string;
    short_name?: string;
    gst_number?: string;
    is_archived?: boolean;
  };
  latest_sale: HistoricalSale | null;
  history: HistoricalSale[];
}

export interface ComparisonMetrics {
  total_clients_compared: number;
  clients_with_sales: number;
  lowest: {
    rate: number;
    client_id: number;
    client_name: string;
    invoice_number: string;
    date: string;
  } | null;
  highest: {
    rate: number;
    client_id: number;
    client_name: string;
    invoice_number: string;
    date: string;
  } | null;
  average: number;
  spread: number;
  base_price: number;
}

export interface PriceComparisonResponse {
  product: {
    id: number;
    name: string;
    short_name?: string;
    hsn_code?: string;
    unit: string;
    base_price: number;
  };
  metrics: ComparisonMetrics;
  comparisons: ClientComparisonItem[];
}

export interface TemplateMeta {
  key: string;
  name: string;
  category: 'GST' | 'Non-GST';
  tax_mode: 'taxable' | 'non_taxable';
  description: string;
}

export interface TemplateResolveResponse {
  template_key: string;
  reason: 'client_preference' | 'organization_default' | 'system_fallback';
  source_label: string;
}

export interface PriceResolveResponse {
  resolved_rate: number;
  source: 'client_last_sale' | 'org_last_sale' | 'base_price';
  source_label: string;
  last_sale_date: string | null;
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
  price_source_label?: string;
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
  tax_mode?: 'taxable' | 'non_taxable';
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
