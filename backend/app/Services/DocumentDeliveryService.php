<?php

namespace App\Services;

use App\Models\Invoice;

class DocumentDeliveryService
{
    public function __construct(
        protected FilenameBuilderService $filenameBuilder
    ) {}

    /**
     * Prepare email-ready document delivery payload without sending SMTP emails.
     */
    public function prepareDelivery(Invoice $invoice): array
    {
        $invoice->loadMissing(['organization', 'client']);

        $org = $invoice->organization;
        $client = $invoice->client;
        $docType = $invoice->document_type;
        $taxMode = $invoice->tax_mode ?: 'taxable';
        $number = $invoice->invoice_number ?: ('Draft #' . $invoice->id);
        $grandTotalStr = '₹' . number_format((float) $invoice->total_amount, 2);

        $docTitle = match ($docType) {
            'quote'    => 'Quote / Estimate',
            'proforma' => 'Proforma Invoice',
            'challan'  => 'Delivery Challan',
            default    => ($taxMode === 'non_taxable' ? 'Commercial Bill' : 'Tax Invoice'),
        };

        $filename = $this->filenameBuilder->buildFilename($invoice);
        $subject = "{$docTitle} {$number} — {$client->name}";

        $suggestedBody = "Dear {$client->name},\n\n";
        $suggestedBody .= "Please find attached {$docTitle} {$number} for {$grandTotalStr}.\n\n";
        $suggestedBody .= "If you have any questions, please contact {$org->name}.\n\n";
        $suggestedBody .= "Thank you for your business.\n\n";
        $suggestedBody .= "Regards,\n{$org->name}";

        return [
            'invoice_id'           => $invoice->id,
            'invoice_number'       => $number,
            'document_type'        => $docType,
            'tax_mode'             => $taxMode,
            'filename'             => $filename,
            'subject'              => $subject,
            'suggested_body'       => $suggestedBody,
            'recipient'            => [
                'name'         => $client->name,
                'company_name' => $client->company_name,
                'phone'        => $client->contact_phone,
                'whatsapp'     => $client->contact_whatsapp,
            ],
            'organization'         => [
                'name'  => $org->name,
                'state' => $org->state,
            ],
            'total_amount'         => (float) $invoice->total_amount,
            'is_email_configured'  => false,
            'delivery_note'        => 'Email delivery service will be connected in a later phase. You may copy details or use mailto.',
        ];
    }
}
