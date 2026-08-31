export type UIEventType =
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_ALLOCATED'
  | 'INVOICE_CREATED'
  | 'INVOICE_FINALIZED'
  | 'INVOICE_CANCELLED'
  | 'LEDGER_LOADING'
  | 'LEDGER_READY'
  | 'PARSER_STARTED'
  | 'PARSER_COMPLETED'
  | 'INVENTORY_STOCK_IN'
  | 'INVENTORY_STOCK_OUT'
  | 'LOW_STOCK'
  | 'EXPORT_STARTED'
  | 'EXPORT_SUCCESS'
  | 'EXPORT_ERROR'
  | 'GST_CALCULATED'
  | 'CUSTOMER_CREATED'
  | 'PRODUCT_CREATED'
  | 'CORRECTION_APPROVED'
  | 'CORRECTION_REJECTED'
  | 'API_ERROR';

export interface UIEvent {
  type: UIEventType;
  payload?: any;
}

export type UIEventSubscriber = (event: UIEvent) => void;

class UIEventBus {
  private subscribers: Set<UIEventSubscriber> = new Set();

  /**
   * Subscribe to all UI events.
   * Returns an unsubscribe function.
   */
  subscribe(callback: UIEventSubscriber): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Emit an event to all subscribers.
   */
  emit(event: UIEvent) {
    // Process async to avoid blocking the main thread from the caller's stack
    setTimeout(() => {
      this.subscribers.forEach((callback) => {
        try {
          callback(event);
        } catch (err) {
          console.error('Error in UIEventBus subscriber:', err);
        }
      });
    }, 0);
  }
}

// Export singleton instance
export const uiEventBus = new UIEventBus();
