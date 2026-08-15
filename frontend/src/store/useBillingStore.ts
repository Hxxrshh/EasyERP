import { create } from 'zustand';
import type { DocumentType } from '../types';

export interface DraftLineItem {
  product_id: number;
  quantity: number;
  rate: number;
  gst_rate: number;
}

export type TabKey = 'overview' | 'billing' | 'customers' | 'products' | 'payments' | 'ledger' | 'documents' | 'reports' | 'audit';

interface BillingUIState {
  activeTab: TabKey;
  selectedClientId: number | null;
  selectedDocumentType: DocumentType;
  draftItems: DraftLineItem[];
  isWhatsAppDrawerOpen: boolean;

  // UI Actions
  setActiveTab: (tab: TabKey) => void;
  setSelectedClientId: (clientId: number | null) => void;
  setSelectedDocumentType: (type: DocumentType) => void;
  setDraftItems: (items: DraftLineItem[]) => void;
  addDraftItem: (item: DraftLineItem) => void;
  removeDraftItem: (index: number) => void;
  clearDraft: () => void;
  setWhatsAppDrawerOpen: (open: boolean) => void;
}

export const useBillingStore = create<BillingUIState>((set) => ({
  activeTab: 'overview',
  selectedClientId: null,
  selectedDocumentType: 'quote',
  draftItems: [],
  isWhatsAppDrawerOpen: false,

  setActiveTab: (tab) => set({ activeTab: tab }),
  setSelectedClientId: (selectedClientId) => set({ selectedClientId }),
  setSelectedDocumentType: (selectedDocumentType) => set({ selectedDocumentType }),
  setDraftItems: (draftItems) => set({ draftItems }),
  addDraftItem: (item) => set((state) => ({ draftItems: [...state.draftItems, item] })),
  removeDraftItem: (index) =>
    set((state) => ({ draftItems: state.draftItems.filter((_, i) => i !== index) })),
  clearDraft: () => set({ draftItems: [], selectedClientId: null }),
  setWhatsAppDrawerOpen: (isWhatsAppDrawerOpen) => set({ isWhatsAppDrawerOpen }),
}));
