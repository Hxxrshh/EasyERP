import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../services/apiClient';
import type {
  MasterMetaResponse,
  Invoice,
  PaginatedResponse,
  LedgerStatementResponse,
  Payment,
  AuditLog,
  DocumentType,
} from '../types';

export const QUERY_KEYS = {
  meta: ['meta'] as const,
  priceResolve: (clientId?: number, productId?: number) => ['price-resolve', clientId, productId] as const,
  invoices: (filters?: Record<string, any>) => ['invoices', filters] as const,
  invoice: (id?: number) => ['invoice', id] as const,
  ledger: (clientId?: number, from?: string, to?: string) => ['ledger', clientId, from, to] as const,
  auditLogs: ['audit-logs'] as const,
};

// ----------------------------------------------------------------------
// QUERIES
// ----------------------------------------------------------------------

export function useMetaQuery() {
  return useQuery<MasterMetaResponse>({
    queryKey: QUERY_KEYS.meta,
    queryFn: () => apiClient.get<MasterMetaResponse>('/meta'),
  });
}

export function usePriceResolveQuery(clientId?: number, productId?: number) {
  return useQuery<{ price: number; source: string }>({
    queryKey: QUERY_KEYS.priceResolve(clientId, productId),
    queryFn: () => apiClient.get<{ price: number; source: string }>(`/price-resolve?client_id=${clientId}&product_id=${productId}`),
    enabled: Boolean(clientId && productId),
  });
}

export function useInvoicesQuery(filters?: { document_type?: string; status?: string; page?: number }) {
  const queryParams = new URLSearchParams();
  if (filters?.document_type) queryParams.set('document_type', filters.document_type);
  if (filters?.status) queryParams.set('status', filters.status);
  if (filters?.page) queryParams.set('page', String(filters.page));

  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';

  return useQuery<PaginatedResponse<Invoice>>({
    queryKey: QUERY_KEYS.invoices(filters),
    queryFn: () => apiClient.get<PaginatedResponse<Invoice>>(`/invoices${queryString}`),
  });
}

export function useInvoiceQuery(id?: number) {
  return useQuery<Invoice>({
    queryKey: QUERY_KEYS.invoice(id),
    queryFn: () => apiClient.get<Invoice>(`/invoices/${id}`),
    enabled: Boolean(id),
  });
}

export function useLedgerQuery(clientId?: number, from?: string, to?: string) {
  const queryParams = new URLSearchParams();
  if (from) queryParams.set('from', from);
  if (to) queryParams.set('to', to);

  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';

  return useQuery<LedgerStatementResponse>({
    queryKey: QUERY_KEYS.ledger(clientId, from, to),
    queryFn: () => apiClient.get<LedgerStatementResponse>(`/ledgers/${clientId}${queryString}`),
    enabled: Boolean(clientId),
  });
}

export function useAuditLogsQuery() {
  return useQuery<PaginatedResponse<AuditLog>>({
    queryKey: QUERY_KEYS.auditLogs,
    queryFn: () => apiClient.get<PaginatedResponse<AuditLog>>('/audit-logs'),
  });
}

// ----------------------------------------------------------------------
// MUTATIONS
// ----------------------------------------------------------------------

export function useCreateInvoiceMutation() {
  const queryClient = useQueryClient();
  return useMutation<Invoice, Error, any>({
    mutationFn: (payload) => apiClient.post<Invoice>('/invoices', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
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
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
  });
}

export function useFinalizeInvoiceMutation() {
  const queryClient = useQueryClient();
  return useMutation<Invoice, Error, number>({
    mutationFn: (id) => apiClient.post<Invoice>(`/invoices/${id}/finalize`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.invoice(id) });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['ledger'] });
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
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
  });
}

export function useCancelInvoiceMutation() {
  const queryClient = useQueryClient();
  return useMutation<Invoice, Error, number>({
    mutationFn: (id) => apiClient.post<Invoice>(`/invoices/${id}/cancel`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.invoice(id) });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['ledger'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
  });
}

export function useRecordPaymentMutation() {
  const queryClient = useQueryClient();
  return useMutation<{ payment: Payment; allocated_amount: number; unallocated_amount: number }, Error, any>({
    mutationFn: (payload) => apiClient.post('/payments', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['ledger'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
  });
}

export function useAllocatePaymentMutation() {
  const queryClient = useQueryClient();
  return useMutation<any, Error, { paymentId: number; invoice_id: number; amount: number }>({
    mutationFn: ({ paymentId, invoice_id, amount }) => apiClient.post(`/payments/${paymentId}/allocate`, { invoice_id, amount }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['ledger'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
  });
}
