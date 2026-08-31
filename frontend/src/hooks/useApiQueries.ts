import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../services/apiClient';
import { uiEventBus } from '../services/uiEventBus';
import type {
  MasterMetaResponse,
  Invoice,
  PaginatedResponse,
  LedgerStatementResponse,
  Payment,
  AuditLog,
  DocumentType,
  PriceResolveResponse,
  Client,
  Product,
  UsageCheckResponse,
  PriceComparisonResponse,
} from '../types';

export const QUERY_KEYS = {
  meta: (includeArchived?: boolean) => ['meta', includeArchived] as const,
  dashboard: ['dashboard'] as const,
  priceResolve: (clientId?: number, productId?: number) => ['price-resolve', clientId, productId] as const,
  invoices: (filters?: Record<string, any>) => ['invoices', filters] as const,
  invoice: (id?: number) => ['invoice', id] as const,
  ledger: (clientId?: number, from?: string, to?: string) => ['ledger', clientId, from, to] as const,
  payments: (filters?: Record<string, any>) => ['payments', filters] as const,
  clientSummary: (id?: number) => ['client-summary', id] as const,
  auditLogs: ['audit-logs'] as const,
  clients: (filters?: Record<string, any>) => ['clients', filters] as const,
  products: (filters?: Record<string, any>) => ['products', filters] as const,
  inventory: ['inventory'] as const,
  clientUsage: (id?: number) => ['client-usage', id] as const,
  productUsage: (id?: number) => ['product-usage', id] as const,
  organizationUsage: ['organization-usage'] as const,
  priceComparison: (productId?: number, filters?: Record<string, any>) => ['price-comparison', productId, filters] as const,
};

// ----------------------------------------------------------------------
// QUERIES
// ----------------------------------------------------------------------

export function useMetaQuery(includeArchived: boolean = false) {
  return useQuery<MasterMetaResponse>({
    queryKey: QUERY_KEYS.meta(includeArchived),
    queryFn: () => apiClient.get<MasterMetaResponse>(`/meta${includeArchived ? '?include_archived=true' : ''}`),
  });
}

export function useDashboardQuery() {
  return useQuery<any>({
    queryKey: QUERY_KEYS.dashboard,
    queryFn: () => apiClient.get<any>('/dashboard/overview'),
  });
}

export const useOverviewQuery = useDashboardQuery;

export function useClientsQuery(filters?: Record<string, any>) {
  const queryParams = new URLSearchParams();
  if (filters) {
    Object.keys(filters).forEach((key) => {
      if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
        queryParams.set(key, String(filters[key]));
      }
    });
  }
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';

  return useQuery<PaginatedResponse<Client>>({
    queryKey: QUERY_KEYS.clients(filters),
    queryFn: () => apiClient.get<PaginatedResponse<Client>>(`/clients${queryString}`),
  });
}

export function useProductsQuery(filters?: Record<string, any>) {
  const queryParams = new URLSearchParams();
  if (filters) {
    Object.keys(filters).forEach((key) => {
      if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
        queryParams.set(key, String(filters[key]));
      }
    });
  }
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';

  return useQuery<PaginatedResponse<Product>>({
    queryKey: QUERY_KEYS.products(filters),
    queryFn: () => apiClient.get<PaginatedResponse<Product>>(`/products${queryString}`),
  });
}

export function useClientUsageQuery(id?: number) {
  return useQuery<UsageCheckResponse>({
    queryKey: QUERY_KEYS.clientUsage(id),
    queryFn: () => apiClient.get<UsageCheckResponse>(`/clients/${id}/usage`),
    enabled: Boolean(id),
  });
}

export function useProductUsageQuery(id?: number) {
  return useQuery<UsageCheckResponse>({
    queryKey: QUERY_KEYS.productUsage(id),
    queryFn: () => apiClient.get<UsageCheckResponse>(`/products/${id}/usage`),
    enabled: Boolean(id),
  });
}

export function useOrganizationUsageQuery() {
  return useQuery<UsageCheckResponse>({
    queryKey: QUERY_KEYS.organizationUsage,
    queryFn: () => apiClient.get<UsageCheckResponse>('/organization/usage'),
  });
}

export function usePriceComparisonQuery(productId?: number, filters?: { clientIds?: number[]; startDate?: string; endDate?: string; financialYear?: string }) {
  const queryParams = new URLSearchParams();
  if (filters?.clientIds && filters.clientIds.length > 0) {
    queryParams.set('client_ids', filters.clientIds.join(','));
  }
  if (filters?.startDate) queryParams.set('start_date', filters.startDate);
  if (filters?.endDate) queryParams.set('end_date', filters.endDate);
  if (filters?.financialYear) queryParams.set('financial_year', filters.financialYear);

  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';

  return useQuery<PriceComparisonResponse>({
    queryKey: QUERY_KEYS.priceComparison(productId, filters),
    queryFn: () => apiClient.get<PriceComparisonResponse>(`/products/${productId}/price-comparison${queryString}`),
    enabled: Boolean(productId),
  });
}

export function useInventoryStockQuery() {
  return useQuery<any[]>({
    queryKey: QUERY_KEYS.inventory,
    queryFn: async () => {
      try {
        const res = await apiClient.get<any>('/inventory/summary');
        const items = res?.products || [];
        // Map backend flat structure to frontend expected nested structure
        return items.map((item: any) => ({
          id: item.id,
          product_id: item.id,
          current_quantity: item.available_stock,
          low_stock_threshold: item.min_stock_alert,
          product: {
            id: item.id,
            name: item.name,
            hsn_code: item.hsn_code,
            unit: item.unit,
            base_price: item.base_price,
          }
        }));
      } catch {
        return [];
      }
    },
  });
}

export function usePriceResolveQuery(clientId?: number, productId?: number) {
  return useQuery<PriceResolveResponse>({
    queryKey: QUERY_KEYS.priceResolve(clientId, productId),
    queryFn: () => apiClient.get<PriceResolveResponse>(`/price-resolve?client_id=${clientId}&product_id=${productId}`),
    enabled: Boolean(clientId && productId),
  });
}

export function useInvoicesQuery(filters?: Record<string, any>) {
  const queryParams = new URLSearchParams();
  if (filters) {
    Object.keys(filters).forEach((key) => {
      if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
        queryParams.set(key, String(filters[key]));
      }
    });
  }

  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';

  return useQuery<PaginatedResponse<Invoice> & { summary?: any }>({
    queryKey: QUERY_KEYS.invoices(filters),
    queryFn: () => apiClient.get<any>(`/invoices${queryString}`),
  });
}

export function useInvoiceQuery(id?: number) {
  return useQuery<Invoice>({
    queryKey: QUERY_KEYS.invoice(id),
    queryFn: () => apiClient.get<Invoice>(`/invoices/${id}`),
    enabled: Boolean(id),
  });
}

export function useLedgerQuery(clientId?: number | null, from?: string, to?: string) {
  const queryParams = new URLSearchParams();
  if (from) queryParams.set('from', from);
  if (to) queryParams.set('to', to);

  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';

  return useQuery<LedgerStatementResponse>({
    queryKey: QUERY_KEYS.ledger(clientId || undefined, from, to),
    queryFn: () => apiClient.get<LedgerStatementResponse>(`/ledgers/${clientId}${queryString}`),
    enabled: Boolean(clientId),
  });
}

export const useLedgerStatementQuery = useLedgerQuery;

export function usePaymentsHistoryQuery(filters?: Record<string, any>) {
  const queryParams = new URLSearchParams();
  if (filters) {
    Object.keys(filters).forEach((key) => {
      if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
        queryParams.set(key, String(filters[key]));
      }
    });
  }

  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';

  return useQuery<PaginatedResponse<Payment>>({
    queryKey: QUERY_KEYS.payments(filters),
    queryFn: () => apiClient.get<PaginatedResponse<Payment>>(`/payments/history${queryString}`),
  });
}

export const usePaymentsQuery = usePaymentsHistoryQuery;

export function useClientSummaryQuery(id?: number) {
  return useQuery<any>({
    queryKey: QUERY_KEYS.clientSummary(id),
    queryFn: () => apiClient.get<any>(`/clients/${id}/summary`),
    enabled: Boolean(id),
  });
}

export function useAuditLogsQuery() {
  return useQuery<PaginatedResponse<AuditLog>>({
    queryKey: QUERY_KEYS.auditLogs,
    queryFn: () => apiClient.get<PaginatedResponse<AuditLog>>('/audit-logs'),
  });
}

// ----------------------------------------------------------------------
// LIVE SYNCHRONIZATION MUTATIONS
// ----------------------------------------------------------------------

export function useCreateInvoiceMutation() {
  const queryClient = useQueryClient();
  return useMutation<Invoice, Error, any>({
    mutationFn: (payload) => apiClient.post<Invoice>('/invoices', payload),
    onSuccess: () => {
      uiEventBus.emit({ type: 'INVOICE_CREATED' });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
  });
}

export function useUpdateInvoiceMutation() {
  const queryClient = useQueryClient();
  return useMutation<Invoice, Error, { id: number; data: any }>({
    mutationFn: ({ id, data }) => apiClient.put<Invoice>(`/invoices/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.invoice(variables.id) });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
  });
}

export function useFinalizeInvoiceMutation() {
  const queryClient = useQueryClient();
  return useMutation<Invoice, Error, number>({
    mutationFn: (id) => apiClient.post<Invoice>(`/invoices/${id}/finalize`),
    onSuccess: (_, id) => {
      uiEventBus.emit({ type: 'INVOICE_FINALIZED', payload: { invoiceId: id } });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.invoice(id) });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['ledger'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['client-summary'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
  });
}

export function useConvertDocumentMutation() {
  const queryClient = useQueryClient();
  return useMutation<Invoice, Error, { id: number; target_type: DocumentType }>({
    mutationFn: ({ id, target_type }) => apiClient.post<Invoice>(`/documents/${id}/convert`, { target_type }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
  });
}

export function useCancelInvoiceMutation() {
  const queryClient = useQueryClient();
  return useMutation<Invoice, Error, number>({
    mutationFn: (id) => apiClient.post<Invoice>(`/invoices/${id}/cancel`),
    onSuccess: (_, id) => {
      uiEventBus.emit({ type: 'INVOICE_CANCELLED', payload: { invoiceId: id } });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.invoice(id) });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['ledger'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['client-summary'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
  });
}

export function useRecordPaymentMutation() {
  const queryClient = useQueryClient();
  return useMutation<{ payment: Payment; allocated_amount: number; unallocated_amount: number }, Error, any>({
    mutationFn: (payload) => apiClient.post('/payments', payload),
    onSuccess: (data) => {
      uiEventBus.emit({ type: 'PAYMENT_RECEIVED', payload: { amount: data.payment.amount } });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['ledger'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['client-summary'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
  });
}

export function useAllocatePaymentMutation() {
  const queryClient = useQueryClient();
  return useMutation<any, Error, { paymentId: number; invoice_id: number; amount: number }>({
    mutationFn: ({ paymentId, invoice_id, amount }) => apiClient.post(`/payments/${paymentId}/allocate`, { invoice_id, amount }),
    onSuccess: () => {
      uiEventBus.emit({ type: 'PAYMENT_ALLOCATED' });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['ledger'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['client-summary'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
  });
}

export function useAutoAllocateMutation() {
  const queryClient = useQueryClient();
  return useMutation<any, Error, number>({
    mutationFn: (paymentId) => apiClient.post(`/payments/${paymentId}/auto-allocate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['ledger'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useRecordStockMovementMutation() {
  const queryClient = useQueryClient();
  return useMutation<any, Error, { productId: number; payload: any }>({
    mutationFn: ({ productId, payload }) => apiClient.post(`/inventory/transactions`, { product_id: productId, ...payload }),
    onSuccess: (_, variables) => {
      const type = variables.payload?.type;
      if (type === 'IN') uiEventBus.emit({ type: 'INVENTORY_STOCK_IN' });
      else if (type === 'OUT') uiEventBus.emit({ type: 'INVENTORY_STOCK_OUT' });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useCreateClientMutation() {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: (payload) => apiClient.post('/clients', payload),
    onSuccess: () => {
      uiEventBus.emit({ type: 'CUSTOMER_CREATED' });
      queryClient.invalidateQueries({ queryKey: ['meta'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
  });
}

export function useCreateProductMutation() {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: (payload) => apiClient.post('/products', payload),
    onSuccess: () => {
      uiEventBus.emit({ type: 'PRODUCT_CREATED' });
      queryClient.invalidateQueries({ queryKey: ['meta'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
  });
}

// ----------------------------------------------------------------------
// LIFECYCLE MUTATIONS (ARCHIVE, RESTORE, PERMANENT DELETE)
// ----------------------------------------------------------------------

export function useArchiveClientMutation() {
  const queryClient = useQueryClient();
  return useMutation<any, Error, { id: number; reason?: string }>({
    mutationFn: ({ id, reason }) => apiClient.post(`/clients/${id}/archive`, { reason }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['meta'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.clientUsage(variables.id) });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
  });
}

export function useRestoreClientMutation() {
  const queryClient = useQueryClient();
  return useMutation<any, Error, number>({
    mutationFn: (id) => apiClient.post(`/clients/${id}/restore`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['meta'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.clientUsage(id) });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
  });
}

export function useDeleteClientMutation() {
  const queryClient = useQueryClient();
  return useMutation<any, Error, number>({
    mutationFn: (id) => apiClient.delete(`/clients/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meta'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
  });
}

export function useArchiveProductMutation() {
  const queryClient = useQueryClient();
  return useMutation<any, Error, { id: number; reason?: string }>({
    mutationFn: ({ id, reason }) => apiClient.post(`/products/${id}/archive`, { reason }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['meta'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.productUsage(variables.id) });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
  });
}

export function useRestoreProductMutation() {
  const queryClient = useQueryClient();
  return useMutation<any, Error, number>({
    mutationFn: (id) => apiClient.post(`/products/${id}/restore`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['meta'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.productUsage(id) });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
  });
}

export function useDeleteProductMutation() {
  const queryClient = useQueryClient();
  return useMutation<any, Error, number>({
    mutationFn: (id) => apiClient.delete(`/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meta'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
  });
}
