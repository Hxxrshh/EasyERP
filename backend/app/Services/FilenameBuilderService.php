<?php

namespace App\Services;

use App\Models\Invoice;

class FilenameBuilderService
{
    /**
     * Build client-ready, OS-safe filename for document export/attachment.
     */
    public function buildFilename(Invoice $invoice): string
    {
        $invoice->loadMissing('client');

        $docType = $invoice->document_type;
        $taxMode = $invoice->tax_mode ?: 'taxable';
        $number = $invoice->invoice_number ?: ('DRAFT-' . $invoice->id);
        $clientName = $invoice->client?->short_name ?: ($invoice->client?->name ?: 'Customer');

        $prefix = match ($docType) {
            'quote'    => 'Quote',
            'proforma' => 'Proforma',
            'challan'  => 'Delivery-Challan',
            default    => ($taxMode === 'non_taxable' ? 'Bill' : 'Tax-Invoice'),
        };

        $rawFilename = "{$prefix}-{$number}-{$clientName}.pdf";
        return $this->sanitizeFilename($rawFilename);
    }

    /**
     * Sanitize filename to ensure compatibility across macOS, Windows, and Linux.
     */
    public function sanitizeFilename(string $filename): string
    {
        $info = pathinfo($filename);
        $ext = isset($info['extension']) ? '.' . $info['extension'] : '';
        $name = isset($info['extension']) ? substr($filename, 0, -strlen($ext)) : $filename;

        // Replace invalid filesystem characters with hyphens
        $sanitized = preg_replace('/[\\/\\\\:\*\?"<>\|]/', '-', $name);
        // Replace spaces with hyphens
        $sanitized = str_replace(' ', '-', $sanitized);
        // Collapse consecutive hyphens
        $sanitized = preg_replace('/-+/', '-', $sanitized);
        $sanitized = trim($sanitized, '-');

        return $sanitized . $ext;
    }
}
