<?php

namespace App\Services;

use App\Models\Invoice;
use Dompdf\Dompdf;
use Dompdf\Options;

class PdfExportService
{
    protected function getDompdfInstance(): Dompdf
    {
        $options = new Options();
        $options->set('isHtml5ParserEnabled', true);
        $options->set('isRemoteEnabled', false);
        $options->set('defaultFont', 'Helvetica');

        return new Dompdf($options);
    }

    /**
     * Render Invoice HTML string based on template_key & tax_mode
     */
    public function renderInvoiceHtml(Invoice $invoice, ?string $overrideTemplateKey = null): string
    {
        $invoice->loadMissing(['organization', 'client', 'items.product']);
        $org = $invoice->organization;
        $client = $invoice->client;
        $items = $invoice->items ?? [];

        $templateKey = $overrideTemplateKey ?: ($invoice->template_key ?: 'gst_classic');
        $taxMode = $invoice->tax_mode ?: 'taxable';
        $docType = $invoice->document_type ?: 'invoice';

        $docTypeLabel = match ($docType) {
            'quote'    => 'QUOTATION / COMMERCIAL PROPOSAL',
            'proforma' => 'PROFORMA INVOICE',
            'challan'  => 'DELIVERY / DISPATCH CHALLAN',
            default    => ($taxMode === 'non_taxable' ? 'COMMERCIAL BILL' : 'TAX INVOICE'),
        };

        $invNo = $invoice->invoice_number ?: 'DRAFT';
        $invDate = $invoice->date ? (is_string($invoice->date) ? date('d M Y', strtotime($invoice->date)) : $invoice->date->format('d M Y')) : date('d M Y');
        $dueDate = $invoice->due_date ? (is_string($invoice->due_date) ? date('d M Y', strtotime($invoice->due_date)) : $invoice->due_date->format('d M Y')) : 'N/A';

        $isInterstate = (bool) (
            $client &&
            $org &&
            strtolower(trim((string) $client->state)) !== strtolower(trim((string) $org->state))
        );

        if ($docType === 'challan' || $templateKey === 'challan_industrial' || $templateKey === 'challan_warehouse') {
            return $this->buildChallanHtml($templateKey, $docTypeLabel, $invNo, $invDate, $dueDate, $org, $client, $items, $invoice);
        }

        if ($docType === 'quote' || str_contains($templateKey, 'quote')) {
            return $this->buildQuoteHtml($templateKey, $docTypeLabel, $invNo, $invDate, $dueDate, $org, $client, $items, $invoice, $taxMode);
        }

        if ($docType === 'proforma' || str_contains($templateKey, 'proforma')) {
            return $this->buildProformaHtml($templateKey, $docTypeLabel, $invNo, $invDate, $dueDate, $org, $client, $items, $invoice, $taxMode);
        }

        if ($templateKey === 'non_gst_classic' || $templateKey === 'non_gst_modern' || $templateKey === 'non_gst_simple' || $taxMode === 'non_taxable') {
            return $this->buildNonGstInvoiceHtml($templateKey, $docTypeLabel, $invNo, $invDate, $dueDate, $org, $client, $items, $invoice);
        }

        return $this->buildGstInvoiceHtml($templateKey, $docTypeLabel, $invNo, $invDate, $dueDate, $org, $client, $items, $invoice, $isInterstate);
    }

    /**
     * Render Invoice PDF binary stream
     */
    public function renderInvoicePdf(Invoice $invoice, ?string $overrideTemplateKey = null): string
    {
        $html = $this->renderInvoiceHtml($invoice, $overrideTemplateKey);

        $dompdf = $this->getDompdfInstance();
        $dompdf->loadHtml($html);
        $dompdf->render();

        return $dompdf->output();
    }

    /**
     * Template A, B, C, D, F — GST Invoices
     */
    private function buildGstInvoiceHtml(string $templateKey, string $docTypeLabel, string $invNo, string $invDate, string $dueDate, $org, $client, $items, Invoice $invoice, bool $isInterstate): string
    {
        $subtotal = number_format($invoice->subtotal, 2);
        $cgst = number_format($invoice->cgst_total, 2);
        $sgst = number_format($invoice->sgst_total, 2);
        $igst = number_format($invoice->igst_total, 2);
        $totalGst = number_format($invoice->total_gst, 2);
        $grandTotal = number_format($invoice->total_amount, 2);

        // Distinct Visual Layout Switch
        if ($templateKey === 'gst_modern') {
            // Template B — Modern Business Invoice (Spacious, rounded cards, dark header bar)
            return $this->renderGstModern($docTypeLabel, $invNo, $invDate, $dueDate, $org, $client, $items, $invoice, $isInterstate, $subtotal, $cgst, $sgst, $igst, $totalGst, $grandTotal);
        }

        if ($templateKey === 'gst_industrial') {
            // Template C — Industrial & Warehouse Dispatch Invoice (GIDC GIDC packaging info, dense grid, transport details)
            return $this->renderGstIndustrial($docTypeLabel, $invNo, $invDate, $dueDate, $org, $client, $items, $invoice, $isInterstate, $subtotal, $cgst, $sgst, $igst, $totalGst, $grandTotal);
        }

        if ($templateKey === 'gst_corporate') {
            // Template D — Corporate Executive Invoice (Prominent corporate header, metadata panel, remittance grid)
            return $this->renderGstCorporate($docTypeLabel, $invNo, $invDate, $dueDate, $org, $client, $items, $invoice, $isInterstate, $subtotal, $cgst, $sgst, $igst, $totalGst, $grandTotal);
        }

        // Default & gst_classic / gst_detailed: Template A & F — Traditional Ledger Layout
        return $this->renderGstClassic($templateKey, $docTypeLabel, $invNo, $invDate, $dueDate, $org, $client, $items, $invoice, $isInterstate, $subtotal, $cgst, $sgst, $igst, $totalGst, $grandTotal);
    }

    private function renderGstClassic($templateKey, $docTypeLabel, $invNo, $invDate, $dueDate, $org, $client, $items, $invoice, $isInterstate, $subtotal, $cgst, $sgst, $igst, $totalGst, $grandTotal): string
    {
        $itemRows = '';
        foreach ($items as $idx => $item) {
            $sl = $idx + 1;
            $pName = htmlspecialchars($item->product?->name ?? 'Custom Product');
            $hsn = htmlspecialchars($item->product?->hsn_code ?? 'N/A');
            $unit = htmlspecialchars($item->product?->unit ?? 'NOS');
            $qty = number_format($item->quantity, 2);
            $rate = number_format($item->rate, 2);
            $taxable = number_format($item->taxable_amount ?? ($item->quantity * $item->rate), 2);
            $gstRate = number_format($item->gst_rate, 1);
            $itemTotal = number_format($item->amount, 2);

            $itemRows .= "
            <tr>
                <td style='text-align: center; border: 1px solid #000;'>{$sl}</td>
                <td style='border: 1px solid #000;'><strong>{$pName}</strong><br><small style='color: #444;'>HSN: {$hsn} | Unit: {$unit}</small></td>
                <td style='text-align: center; border: 1px solid #000;'>{$qty}</td>
                <td style='text-align: right; border: 1px solid #000;'>₹{$rate}</td>
                <td style='text-align: right; border: 1px solid #000;'>₹{$taxable}</td>
                <td style='text-align: center; border: 1px solid #000;'>{$gstRate}%</td>
                <td style='text-align: right; border: 1px solid #000; font-weight: bold;'>₹{$itemTotal}</td>
            </tr>";
        }

        return "
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Helvetica, sans-serif; font-size: 11px; color: #000; margin: 15px; }
                .outer-border { border: 2px solid #000; padding: 12px; }
                .title-hdr { text-align: center; font-size: 18px; font-weight: bold; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 10px; text-transform: uppercase; }
                .box-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
                .box-table td { border: 1px solid #000; padding: 6px; vertical-align: top; }
                table.data-grid { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
                table.data-grid th { background-color: #e2e8f0; border: 1px solid #000; padding: 6px; font-size: 10px; text-transform: uppercase; }
                .totals-box { width: 50%; margin-left: auto; border-collapse: collapse; }
                .totals-box td { border: 1px solid #000; padding: 5px 8px; text-align: right; }
            </style>
        </head>
        <body>
            <div class='outer-border'>
                <div class='title-hdr'>{$docTypeLabel}</div>
                <div style='font-size: 10px; text-align: center; margin-bottom: 8px;'>Template: <strong>" . strtoupper($templateKey) . "</strong></div>
                <table class='box-table'>
                    <tr>
                        <td style='width: 50%;'>
                            <strong>SELLER / SUPPLIER:</strong><br>
                            <strong style='font-size: 13px;'>{$org->name}</strong><br>
                            {$org->address}<br>
                            GSTIN: <strong>" . ($org->gst_number ?? 'N/A') . "</strong> | State: {$org->state}
                        </td>
                        <td style='width: 50%;'>
                            <strong>BUYER / RECIPIENT:</strong><br>
                            <strong style='font-size: 13px;'>{$client->name}</strong><br>
                            " . ($client->billing_address ? "{$client->billing_address}<br>" : "") . "
                            GSTIN: <strong>" . ($client->gst_number ?? 'URP') . "</strong> | State: {$client->state}
                        </td>
                    </tr>
                    <tr>
                        <td><strong>Invoice No:</strong> {$invNo}<br><strong>Invoice Date:</strong> {$invDate}</td>
                        <td><strong>Payment Due Date:</strong> {$dueDate}<br><strong>Tax Mode:</strong> Taxable (GST)</td>
                    </tr>
                </table>

                <table class='data-grid'>
                    <thead>
                        <tr>
                            <th style='width: 5%;'>#</th>
                            <th style='width: 40%;'>Item Description</th>
                            <th style='width: 10%;'>Qty</th>
                            <th style='width: 15%; text-align: right;'>Rate (₹)</th>
                            <th style='width: 15%; text-align: right;'>Taxable (₹)</th>
                            <th style='width: 10%;'>GST %</th>
                            <th style='width: 15%; text-align: right;'>Total (₹)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {$itemRows}
                    </tbody>
                </table>

                <table style='width: 100%;'>
                    <tr>
                        <td style='width: 50%; vertical-align: top;'>
                            <div style='border: 1px solid #000; padding: 8px; font-size: 10px;'>
                                <strong>BANK & PAYMENT DETAILS:</strong><br>
                                Bank: {$org->bank_name}<br>
                                A/c No: {$org->bank_account_no}<br>
                                IFSC: {$org->bank_ifsc}<br>
                                UPI: {$org->upi_id}
                            </div>
                        </td>
                        <td style='width: 50%; vertical-align: top;'>
                            <table class='totals-box'>
                                <tr><td>Taxable Subtotal:</td><td>₹{$subtotal}</td></tr>
                                " . ($isInterstate ? "<tr><td>IGST Total:</td><td>₹{$igst}</td></tr>" : "<tr><td>CGST Total:</td><td>₹{$cgst}</td></tr><tr><td>SGST Total:</td><td>₹{$sgst}</td></tr>") . "
                                <tr style='font-weight: bold; background: #e2e8f0;'><td>GRAND TOTAL:</td><td>₹{$grandTotal}</td></tr>
                            </table>
                        </td>
                    </tr>
                </table>
                <div style='margin-top: 20px; text-align: right; font-size: 10px;'>For <strong>{$org->name}</strong><br><br><br>Authorized Signatory</div>
            </div>
        </body>
        </html>";
    }

    private function renderGstModern($docTypeLabel, $invNo, $invDate, $dueDate, $org, $client, $items, $invoice, $isInterstate, $subtotal, $cgst, $sgst, $igst, $totalGst, $grandTotal): string
    {
        $itemRows = '';
        foreach ($items as $idx => $item) {
            $pName = htmlspecialchars($item->product?->name ?? 'Custom Product');
            $hsn = htmlspecialchars($item->product?->hsn_code ?? 'N/A');
            $unit = htmlspecialchars($item->product?->unit ?? 'NOS');
            $qty = number_format($item->quantity, 2);
            $rate = number_format($item->rate, 2);
            $itemTotal = number_format($item->amount, 2);
            $bg = $idx % 2 === 0 ? '#ffffff' : '#f8fafc';

            $itemRows .= "
            <tr style='background-color: {$bg};'>
                <td style='padding: 10px; color: #64748b;'>0" . ($idx + 1) . "</td>
                <td style='padding: 10px;'><strong style='color: #0f172a;'>{$pName}</strong><br><span style='font-size: 9px; color: #64748b;'>HSN Code: {$hsn}</span></td>
                <td style='padding: 10px; text-align: center;'>{$qty} {$unit}</td>
                <td style='padding: 10px; text-align: right;'>₹{$rate}</td>
                <td style='padding: 10px; text-align: right; font-weight: bold; color: #0284c7;'>₹{$itemTotal}</td>
            </tr>";
        }

        return "
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Helvetica, sans-serif; font-size: 11px; color: #334155; margin: 20px; }
                .top-bar { background: #0284c7; color: #ffffff; padding: 18px; border-radius: 6px; margin-bottom: 20px; }
                .top-title { font-size: 22px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
                .grid-2 { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                .grid-2 td { vertical-align: top; width: 50%; }
                .card { background: #f1f5f9; padding: 12px; border-radius: 6px; }
                table.modern-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                table.modern-table th { background: #0f172a; color: #ffffff; text-align: left; padding: 10px; font-size: 10px; text-transform: uppercase; }
                .grand-pill { background: #0284c7; color: #ffffff; font-size: 16px; font-weight: bold; padding: 10px 14px; border-radius: 6px; text-align: right; }
            </style>
        </head>
        <body>
            <div class='top-bar'>
                <table style='width: 100%; color: #fff;'>
                    <tr>
                        <td>
                            <div class='top-title'>{$docTypeLabel}</div>
                            <div style='font-size: 11px; opacity: 0.9;'>{$org->name} | Template: <strong>GST_MODERN</strong></div>
                        </td>
                        <td style='text-align: right;'><div style='font-size: 16px; font-weight: bold;'># {$invNo}</div><div>Date: {$invDate}</div></td>
                    </tr>
                </table>
            </div>

            <table class='grid-2'>
                <tr>
                    <td style='padding-right: 10px;'>
                        <div class='card'>
                            <strong style='color: #0284c7; font-size: 10px; text-transform: uppercase;'>Billed To:</strong><br>
                            <strong style='font-size: 13px; color: #0f172a;'>{$client->name}</strong><br>
                            {$client->billing_address}<br>
                            GSTIN: <strong>" . ($client->gst_number ?? 'URP') . "</strong>
                        </div>
                    </td>
                    <td style='padding-left: 10px;'>
                        <div class='card'>
                            <strong style='color: #0284c7; font-size: 10px; text-transform: uppercase;'>Billed By:</strong><br>
                            <strong style='font-size: 13px; color: #0f172a;'>{$org->name}</strong><br>
                            {$org->address}<br>
                            GSTIN: <strong>" . ($org->gst_number ?? 'N/A') . "</strong>
                        </div>
                    </td>
                </tr>
            </table>

            <table class='modern-table'>
                <thead>
                    <tr>
                        <th style='width: 8%;'>#</th>
                        <th style='width: 47%;'>Item & Specification</th>
                        <th style='width: 15%; text-align: center;'>Qty</th>
                        <th style='width: 15%; text-align: right;'>Unit Rate</th>
                        <th style='width: 15%; text-align: right;'>Amount</th>
                    </tr>
                </thead>
                <tbody>{$itemRows}</tbody>
            </table>

            <table style='width: 100%;'>
                <tr>
                    <td style='width: 50%; vertical-align: top;'>
                        <div style='font-size: 10px; color: #64748b;'>
                            <strong>UPI Payment:</strong> {$org->upi_id}<br>
                            <strong>A/c:</strong> {$org->bank_account_no} ({$org->bank_name})
                        </div>
                    </td>
                    <td style='width: 50%; vertical-align: top;'>
                        <div class='grand-pill'>Grand Total: ₹{$grandTotal}</div>
                    </td>
                </tr>
            </table>
        </body>
        </html>";
    }

    private function renderGstIndustrial($docTypeLabel, $invNo, $invDate, $dueDate, $org, $client, $items, $invoice, $isInterstate, $subtotal, $cgst, $sgst, $igst, $totalGst, $grandTotal): string
    {
        $itemRows = '';
        foreach ($items as $idx => $item) {
            $pName = htmlspecialchars($item->product?->name ?? 'Industrial Item');
            $hsn = htmlspecialchars($item->product?->hsn_code ?? 'N/A');
            $unit = htmlspecialchars($item->product?->unit ?? 'KGS');
            $qty = number_format($item->quantity, 2);
            $rate = number_format($item->rate, 2);
            $itemTotal = number_format($item->amount, 2);

            $itemRows .= "
            <tr>
                <td style='border: 1px solid #334155; text-align: center;'>0" . ($idx + 1) . "</td>
                <td style='border: 1px solid #334155;'><strong>{$pName}</strong> [HSN: {$hsn}]</td>
                <td style='border: 1px solid #334155; text-align: center;'>{$qty} {$unit}</td>
                <td style='border: 1px solid #334155; text-align: right;'>₹{$rate}</td>
                <td style='border: 1px solid #334155; text-align: right; font-weight: bold;'>₹{$itemTotal}</td>
            </tr>";
        }

        return "
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Helvetica, sans-serif; font-size: 10.5px; color: #0f172a; margin: 15px; }
                .ind-bar { background: #0891b2; color: #fff; padding: 10px; font-size: 16px; font-weight: bold; text-align: center; text-transform: uppercase; }
                .dispatch-box { border: 1px solid #0891b2; padding: 8px; margin-bottom: 12px; background: #ecfeff; font-size: 10px; }
                table.ind-grid { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
                table.ind-grid th { background: #155e75; color: #fff; border: 1px solid #334155; padding: 6px; font-size: 10px; }
            </style>
        </head>
        <body>
            <div class='ind-bar'>{$docTypeLabel} — INDUSTRIAL DISPATCH</div>
            <div class='dispatch-box'>
                <strong>GIDC DISPATCH NOTICE | DOC #: {$invNo} | DATE: {$invDate}</strong><br>
                Vehicle / Transport: GIDC-TRUCK-01 | Dispatch State: {$org->state}
            </div>

            <table style='width: 100%; margin-bottom: 12px;'>
                <tr>
                    <td style='width: 50%; border: 1px solid #334155; padding: 8px;'>
                        <strong>MANUFACTURER / SUPPLIER:</strong><br>
                        <strong>{$org->name}</strong><br>
                        {$org->address}<br>
                        GSTIN: {$org->gst_number}
                    </td>
                    <td style='width: 50%; border: 1px solid #334155; padding: 8px;'>
                        <strong>CONSIGNEE / BUYER:</strong><br>
                        <strong>{$client->name}</strong><br>
                        {$client->billing_address}<br>
                        GSTIN: {$client->gst_number}
                    </td>
                </tr>
            </table>

            <table class='ind-grid'>
                <thead>
                    <tr>
                        <th style='width: 8%;'>S.No</th>
                        <th style='width: 50%;'>Material / Description</th>
                        <th style='width: 14%;'>Dispatch Qty</th>
                        <th style='width: 14%; text-align: right;'>Rate</th>
                        <th style='width: 14%; text-align: right;'>Net Value</th>
                    </tr>
                </thead>
                <tbody>{$itemRows}</tbody>
            </table>

            <div style='text-align: right; font-size: 14px; font-weight: bold; background: #0891b2; color: #fff; padding: 8px;'>
                Invoice Total Amount: ₹{$grandTotal}
            </div>
        </body>
        </html>";
    }

    private function renderGstCorporate($docTypeLabel, $invNo, $invDate, $dueDate, $org, $client, $items, $invoice, $isInterstate, $subtotal, $cgst, $sgst, $igst, $totalGst, $grandTotal): string
    {
        $itemRows = '';
        foreach ($items as $idx => $item) {
            $pName = htmlspecialchars($item->product?->name ?? 'Product Item');
            $hsn = htmlspecialchars($item->product?->hsn_code ?? 'N/A');
            $unit = htmlspecialchars($item->product?->unit ?? 'NOS');
            $qty = number_format($item->quantity, 2);
            $rate = number_format($item->rate, 2);
            $itemTotal = number_format($item->amount, 2);

            $itemRows .= "
            <tr style='border-bottom: 1px solid #e2e8f0;'>
                <td style='padding: 8px; font-weight: bold; color: #4338ca;'>0" . ($idx + 1) . "</td>
                <td style='padding: 8px;'><strong>{$pName}</strong> (HSN: {$hsn})</td>
                <td style='padding: 8px; text-align: center;'>{$qty} {$unit}</td>
                <td style='padding: 8px; text-align: right;'>₹{$rate}</td>
                <td style='padding: 8px; text-align: right; font-weight: bold; color: #1e1b4b;'>₹{$itemTotal}</td>
            </tr>";
        }

        return "
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Helvetica, sans-serif; font-size: 11px; color: #1e1b4b; margin: 20px; }
                .corp-hdr { border-bottom: 4px solid #4338ca; padding-bottom: 12px; margin-bottom: 16px; }
                .corp-title { font-size: 22px; font-weight: bold; color: #4338ca; text-transform: uppercase; }
            </style>
        </head>
        <body>
            <div class='corp-hdr'>
                <table style='width: 100%;'>
                    <tr>
                        <td><div class='corp-title'>{$docTypeLabel}</div><div style='font-size: 12px; font-weight: bold;'>{$org->name}</div></td>
                        <td style='text-align: right;'><strong>Doc No:</strong> {$invNo}<br><strong>Date:</strong> {$invDate}</td>
                    </tr>
                </table>
            </div>

            <table style='width: 100%; margin-bottom: 16px;'>
                <tr>
                    <td style='width: 50%; vertical-align: top; background: #e0e7ff; padding: 10px; border-radius: 4px;'>
                        <strong style='color: #4338ca;'>CLIENT CORPORATE ACCOUNT:</strong><br>
                        <strong>{$client->name}</strong><br>
                        {$client->billing_address}<br>
                        GSTIN: {$client->gst_number}
                    </td>
                    <td style='width: 50%; vertical-align: top; padding-left: 15px;'>
                        <strong>REMITTANCE BANK DETAILS:</strong><br>
                        Bank: <strong>{$org->bank_name}</strong><br>
                        A/c No: <strong>{$org->bank_account_no}</strong><br>
                        IFSC: <strong>{$org->bank_ifsc}</strong>
                    </td>
                </tr>
            </table>

            <table style='width: 100%; border-collapse: collapse; margin-bottom: 16px;'>
                <thead style='background: #4338ca; color: #fff;'>
                    <tr>
                        <th style='padding: 8px; text-align: left;'>#</th>
                        <th style='padding: 8px; text-align: left;'>Description</th>
                        <th style='padding: 8px; text-align: center;'>Qty</th>
                        <th style='padding: 8px; text-align: right;'>Rate</th>
                        <th style='padding: 8px; text-align: right;'>Total</th>
                    </tr>
                </thead>
                <tbody>{$itemRows}</tbody>
            </table>

            <div style='text-align: right; font-size: 16px; font-weight: bold; color: #4338ca;'>
                Total Payable: ₹{$grandTotal}
            </div>
        </body>
        </html>";
    }

    private function buildNonGstInvoiceHtml(string $templateKey, string $docTypeLabel, string $invNo, string $invDate, string $dueDate, $org, $client, $items, Invoice $invoice): string
    {
        $itemRows = '';
        foreach ($items as $idx => $item) {
            $sl = $idx + 1;
            $pName = htmlspecialchars($item->product?->name ?? 'Custom Product');
            $unit = htmlspecialchars($item->product?->unit ?? 'NOS');
            $qty = number_format($item->quantity, 2);
            $rate = number_format($item->rate, 2);
            $itemTotal = number_format($item->quantity * $item->rate, 2);

            $itemRows .= "
            <tr>
                <td style='text-align: center; border-bottom: 1px solid #cbd5e1; padding: 8px;'>{$sl}</td>
                <td style='border-bottom: 1px solid #cbd5e1; padding: 8px;'><strong>{$pName}</strong> <small style='color: #64748b;'>(Unit: {$unit})</small></td>
                <td style='text-align: center; border-bottom: 1px solid #cbd5e1; padding: 8px;'>{$qty}</td>
                <td style='text-align: right; border-bottom: 1px solid #cbd5e1; padding: 8px;'>₹{$rate}</td>
                <td style='text-align: right; border-bottom: 1px solid #cbd5e1; padding: 8px; font-weight: bold;'>₹{$itemTotal}</td>
            </tr>";
        }

        $subtotal = number_format($invoice->subtotal, 2);
        $grandTotal = number_format($invoice->total_amount, 2);

        $accentColor = match ($templateKey) {
            'non_gst_modern' => '#d97706',
            default          => '#334155',
        };

        return "
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Helvetica, sans-serif; font-size: 11px; color: #1e293b; margin: 20px; }
                .header-table { width: 100%; border-bottom: 3px solid {$accentColor}; padding-bottom: 12px; margin-bottom: 16px; }
                .doc-title { font-size: 20px; font-weight: bold; color: {$accentColor}; text-transform: uppercase; }
            </style>
        </head>
        <body>
            <table class='header-table'>
                <tr>
                    <td>
                        <div class='doc-title'>{$docTypeLabel}</div>
                        <div style='font-size: 11px; color: #475569;'>Non-Taxable Order | Template: " . strtoupper($templateKey) . "</div>
                    </td>
                    <td style='text-align: right;'>
                        <div style='font-size: 14px; font-weight: bold;'>Bill #: {$invNo}</div>
                        <div>Date: {$invDate}</div>
                    </td>
                </tr>
            </table>

            <table style='width: 100%; margin-bottom: 16px;'>
                <tr>
                    <td style='width: 50%;'>
                        <strong>ISSUED BY:</strong><br>
                        <strong>{$org->name}</strong><br>
                        {$org->address}
                    </td>
                    <td style='width: 50%;'>
                        <strong>ISSUED TO:</strong><br>
                        <strong>{$client->name}</strong><br>
                        {$client->billing_address}
                    </td>
                </tr>
            </table>

            <table style='width: 100%; border-collapse: collapse; margin-bottom: 16px;'>
                <thead style='background: {$accentColor}; color: #fff;'>
                    <tr>
                        <th style='padding: 8px;'>#</th>
                        <th style='padding: 8px; text-align: left;'>Item Description</th>
                        <th style='padding: 8px; text-align: center;'>Qty</th>
                        <th style='padding: 8px; text-align: right;'>Rate</th>
                        <th style='padding: 8px; text-align: right;'>Total</th>
                    </tr>
                </thead>
                <tbody>{$itemRows}</tbody>
            </table>

            <div style='text-align: right; font-size: 16px; font-weight: bold; color: {$accentColor};'>
                Grand Total Payable: ₹{$grandTotal}
            </div>
        </body>
        </html>";
    }

    private function buildQuoteHtml(string $templateKey, string $docTypeLabel, string $invNo, string $invDate, string $dueDate, $org, $client, $items, Invoice $invoice, string $taxMode): string
    {
        $itemRows = '';
        foreach ($items as $idx => $item) {
            $pName = htmlspecialchars($item->product?->name ?? 'Custom Item');
            $qty = number_format($item->quantity, 2);
            $rate = number_format($item->rate, 2);
            $itemTotal = number_format($item->amount, 2);

            $itemRows .= "
            <tr>
                <td style='padding: 8px; border-bottom: 1px solid #cbd5e1;'>0" . ($idx + 1) . "</td>
                <td style='padding: 8px; border-bottom: 1px solid #cbd5e1;'><strong>{$pName}</strong></td>
                <td style='padding: 8px; border-bottom: 1px solid #cbd5e1; text-align: center;'>{$qty}</td>
                <td style='padding: 8px; border-bottom: 1px solid #cbd5e1; text-align: right;'>₹{$rate}</td>
                <td style='padding: 8px; border-bottom: 1px solid #cbd5e1; text-align: right; font-weight: bold;'>₹{$itemTotal}</td>
            </tr>";
        }

        return "
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Helvetica, sans-serif; font-size: 11px; color: #581c87; margin: 20px; }
                .quote-hdr { border-bottom: 3px solid #7e22ce; padding-bottom: 10px; margin-bottom: 15px; }
                .quote-title { font-size: 22px; font-weight: bold; color: #7e22ce; }
            </style>
        </head>
        <body>
            <div class='quote-hdr'>
                <table style='width: 100%;'>
                    <tr>
                        <td><div class='quote-title'>{$docTypeLabel}</div><div style='color: #6b21a8;'>Prepared by {$org->name}</div></td>
                        <td style='text-align: right;'><strong>Quote #:</strong> {$invNo}<br><strong>Valid Until:</strong> {$dueDate}</td>
                    </tr>
                </table>
            </div>

            <div style='background: #faf5ff; padding: 10px; border-radius: 6px; margin-bottom: 15px;'>
                <strong>PROPOSAL PREPARED FOR:</strong> <strong>{$client->name}</strong> ({$client->company_name})
            </div>

            <table style='width: 100%; border-collapse: collapse; margin-bottom: 15px;'>
                <thead style='background: #7e22ce; color: #fff;'>
                    <tr>
                        <th style='padding: 8px;'>#</th>
                        <th style='padding: 8px; text-align: left;'>Proposed Item / Scope</th>
                        <th style='padding: 8px; text-align: center;'>Qty</th>
                        <th style='padding: 8px; text-align: right;'>Unit Rate</th>
                        <th style='padding: 8px; text-align: right;'>Estimated Total</th>
                    </tr>
                </thead>
                <tbody>{$itemRows}</tbody>
            </table>

            <div style='text-align: right; font-size: 16px; font-weight: bold; color: #7e22ce;'>
                Estimated Proposal Total: ₹" . number_format($invoice->total_amount, 2) . "
            </div>
        </body>
        </html>";
    }

    private function buildProformaHtml(string $templateKey, string $docTypeLabel, string $invNo, string $invDate, string $dueDate, $org, $client, $items, Invoice $invoice, string $taxMode): string
    {
        $itemRows = '';
        foreach ($items as $idx => $item) {
            $pName = htmlspecialchars($item->product?->name ?? 'Proforma Item');
            $qty = number_format($item->quantity, 2);
            $rate = number_format($item->rate, 2);
            $itemTotal = number_format($item->amount, 2);

            $itemRows .= "
            <tr>
                <td style='padding: 8px; border-bottom: 1px solid #cbd5e1;'>0" . ($idx + 1) . "</td>
                <td style='padding: 8px; border-bottom: 1px solid #cbd5e1;'><strong>{$pName}</strong></td>
                <td style='padding: 8px; border-bottom: 1px solid #cbd5e1; text-align: center;'>{$qty}</td>
                <td style='padding: 8px; border-bottom: 1px solid #cbd5e1; text-align: right;'>₹{$rate}</td>
                <td style='padding: 8px; border-bottom: 1px solid #cbd5e1; text-align: right; font-weight: bold;'>₹{$itemTotal}</td>
            </tr>";
        }

        return "
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Helvetica, sans-serif; font-size: 11px; color: #0369a1; margin: 20px; }
                .proforma-hdr { background: #0284c7; color: #fff; padding: 12px; font-size: 18px; font-weight: bold; text-align: center; }
            </style>
        </head>
        <body>
            <div class='proforma-hdr'>{$docTypeLabel} (ADVANCE PAYMENT REQUEST)</div>
            <div style='margin-top: 10px; margin-bottom: 15px;'>
                <strong>Proforma Doc #:</strong> {$invNo} | <strong>Date:</strong> {$invDate} | <strong>Client:</strong> {$client->name}
            </div>

            <table style='width: 100%; border-collapse: collapse; margin-bottom: 15px;'>
                <thead style='background: #0369a1; color: #fff;'>
                    <tr>
                        <th style='padding: 8px;'>#</th>
                        <th style='padding: 8px; text-align: left;'>Item</th>
                        <th style='padding: 8px; text-align: center;'>Qty</th>
                        <th style='padding: 8px; text-align: right;'>Rate</th>
                        <th style='padding: 8px; text-align: right;'>Proforma Amount</th>
                    </tr>
                </thead>
                <tbody>{$itemRows}</tbody>
            </table>

            <div style='text-align: right; font-size: 16px; font-weight: bold; color: #0284c7;'>
                Advance Amount Due: ₹" . number_format($invoice->total_amount, 2) . "
            </div>
        </body>
        </html>";
    }

    private function buildChallanHtml(string $templateKey, string $docTypeLabel, string $invNo, string $invDate, string $dueDate, $org, $client, $items, Invoice $invoice): string
    {
        $itemRows = '';
        foreach ($items as $idx => $item) {
            $pName = htmlspecialchars($item->product?->name ?? 'Goods Item');
            $unit = htmlspecialchars($item->product?->unit ?? 'NOS');
            $qty = number_format($item->quantity, 2);

            $itemRows .= "
            <tr>
                <td style='padding: 8px; border: 1px solid #475569; text-align: center;'>0" . ($idx + 1) . "</td>
                <td style='padding: 8px; border: 1px solid #475569;'><strong>{$pName}</strong></td>
                <td style='padding: 8px; border: 1px solid #475569; text-align: center; font-weight: bold;'>{$qty} {$unit}</td>
                <td style='padding: 8px; border: 1px solid #475569; text-align: center;'>GOODS DISPATCHED IN SOUND CONDITION</td>
            </tr>";
        }

        return "
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Helvetica, sans-serif; font-size: 11px; color: #0f172a; margin: 20px; }
                .challan-hdr { background: #334155; color: #fff; padding: 12px; font-size: 18px; font-weight: bold; text-align: center; text-transform: uppercase; }
            </style>
        </head>
        <body>
            <div class='challan-hdr'>{$docTypeLabel}</div>
            <div style='margin: 12px 0;'>
                <strong>Challan No:</strong> {$invNo} | <strong>Dispatch Date:</strong> {$invDate}
            </div>

            <table style='width: 100%; border-collapse: collapse; margin-bottom: 20px;'>
                <thead style='background: #475569; color: #fff;'>
                    <tr>
                        <th style='padding: 8px; border: 1px solid #475569;'>#</th>
                        <th style='padding: 8px; border: 1px solid #475569; text-align: left;'>Goods Description</th>
                        <th style='padding: 8px; border: 1px solid #475569; text-align: center;'>Quantity</th>
                        <th style='padding: 8px; border: 1px solid #475569; text-align: center;'>Remarks</th>
                    </tr>
                </thead>
                <tbody>{$itemRows}</tbody>
            </table>

            <table style='width: 100%; margin-top: 40px;'>
                <tr>
                    <td style='width: 50%;'>Receiver's Signature & Seal: ___________________</td>
                    <td style='width: 50%; text-align: right;'>For <strong>{$org->name}</strong><br><br>Authorized Dispatcher</td>
                </tr>
            </table>
        </body>
        </html>";
    }

    /**
     * Render Client Ledger Report PDF
     */
    public function renderLedgerPdf(array $data): string
    {
        $dompdf = $this->getDompdfInstance();

        $org = $data['organization'];
        $client = $data['client'];
        $opening = number_format($data['opening_balance'], 2);
        $closing = number_format($data['closing_balance'], 2);
        $periodStr = ($data['from'] && $data['to']) ? "{$data['from']} to {$data['to']}" : "All Time";
        if ($data['financial_year']) {
            $periodStr .= " (FY {$data['financial_year']})";
        }

        $rowsHtml = '';
        foreach ($data['statement'] as $row) {
            $debitStr = $row['debit'] > 0 ? number_format($row['debit'], 2) : '-';
            $creditStr = $row['credit'] > 0 ? number_format($row['credit'], 2) : '-';
            $balanceStr = number_format($row['running_balance'], 2);

            $rowsHtml .= "
            <tr>
                <td>{$row['date']}</td>
                <td>{$row['description']}</td>
                <td style='text-align: right;'>{$debitStr}</td>
                <td style='text-align: right;'>{$creditStr}</td>
                <td style='text-align: right; font-weight: bold;'>{$balanceStr}</td>
            </tr>";
        }

        $html = "
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Helvetica, sans-serif; font-size: 11px; color: #333; margin: 20px; }
                .header { border-bottom: 2px solid #2563eb; padding-bottom: 10px; margin-bottom: 20px; }
                .title { font-size: 18px; font-weight: bold; color: #1e3a8a; }
                .meta-table { width: 100%; margin-bottom: 15px; }
                .meta-table td { vertical-align: top; width: 50%; }
                table.data-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                table.data-table th, table.data-table td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
                table.data-table th { background-color: #f1f5f9; font-weight: bold; color: #1e293b; }
                .summary-box { background: #f8fafc; border: 1px solid #cbd5e1; padding: 10px; margin-top: 15px; text-align: right; font-size: 12px; }
                .footer { font-size: 9px; color: #64748b; margin-top: 30px; text-align: center; }
            </style>
        </head>
        <body>
            <div class='header'>
                <div class='title'>ACCOUNT STATEMENT / LEDGER</div>
                <div style='font-size: 12px; color: #475569;'>Period: {$periodStr}</div>
            </div>

            <table class='meta-table'>
                <tr>
                    <td>
                        <strong>{$org->name}</strong><br>
                        {$org->address}<br>
                        GSTIN: " . ($org->gst_number ?? 'N/A') . "<br>
                        State: {$org->state}
                    </td>
                    <td>
                        <strong>Client: {$client->name}</strong><br>
                        " . ($client->company_name ? "{$client->company_name}<br>" : "") . "
                        " . ($client->billing_address ? "{$client->billing_address}<br>" : "") . "
                        GSTIN: " . ($client->gst_number ?? 'URP') . "<br>
                        State: {$client->state}
                    </td>
                </tr>
            </table>

            <div style='margin-bottom: 8px; font-size: 11px;'>
                <strong>Opening Balance: ₹{$opening}</strong>
            </div>

            <table class='data-table'>
                <thead>
                    <tr>
                        <th style='width: 15%;'>Date</th>
                        <th style='width: 40%;'>Particulars / Reference</th>
                        <th style='width: 15%; text-align: right;'>Debit (₹)</th>
                        <th style='width: 15%; text-align: right;'>Credit (₹)</th>
                        <th style='width: 15%; text-align: right;'>Running Balance (₹)</th>
                    </tr>
                </thead>
                <tbody>
                    {$rowsHtml}
                </tbody>
            </table>

            <div class='summary-box'>
                <strong>Closing Outstanding Balance: ₹{$closing}</strong>
            </div>

            <div class='footer'>
                Generated automatically on {$data['generated_at']} | ACCURA Financial Operations Platform
            </div>
        </body>
        </html>";

        $dompdf = $this->getDompdfInstance();
        $dompdf->loadHtml($html);
        $dompdf->render();

        return $dompdf->output();
    }

    /**
     * Render Invoice Register Report PDF
     */
    public function renderInvoiceRegisterPdf(array $data): string
    {
        $dompdf = $this->getDompdfInstance();

        $org = $data['organization'];
        $totals = $data['totals'];
        $periodStr = ($data['from'] && $data['to']) ? "{$data['from']} to {$data['to']}" : "All Time";
        if ($data['financial_year']) {
            $periodStr .= " (FY {$data['financial_year']})";
        }

        $rowsHtml = '';
        foreach ($data['invoices'] as $inv) {
            $taxableStr = number_format($inv['taxable_amount'], 2);
            $cgstStr = number_format($inv['cgst_amount'], 2);
            $sgstStr = number_format($inv['sgst_amount'], 2);
            $igstStr = number_format($inv['igst_amount'], 2);
            $grandStr = number_format($inv['grand_total'], 2);

            $rowsHtml .= "
            <tr>
                <td>{$inv['invoice_number']}</td>
                <td>{$inv['date']}</td>
                <td>{$inv['client_name']}</td>
                <td>" . ($inv['client_gstin'] ?? 'URP') . "</td>
                <td style='text-align: right;'>{$taxableStr}</td>
                <td style='text-align: right;'>{$cgstStr}</td>
                <td style='text-align: right;'>{$sgstStr}</td>
                <td style='text-align: right;'>{$igstStr}</td>
                <td style='text-align: right; font-weight: bold;'>{$grandStr}</td>
                <td>{$inv['status']}</td>
            </tr>";
        }

        $html = "
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Helvetica, sans-serif; font-size: 10px; color: #333; margin: 15px; }
                .title { font-size: 16px; font-weight: bold; color: #1e3a8a; margin-bottom: 5px; }
                table.data-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                table.data-table th, table.data-table td { border: 1px solid #cbd5e1; padding: 5px 6px; text-align: left; }
                table.data-table th { background-color: #f1f5f9; font-weight: bold; }
                .footer { font-size: 8px; color: #64748b; margin-top: 20px; text-align: center; }
            </style>
        </head>
        <body>
            <div class='title'>INVOICE REGISTER REPORT</div>
            <div>Organization: <strong>{$org->name}</strong> (GSTIN: " . ($org->gst_number ?? 'N/A') . ") | Period: {$periodStr}</div>

            <table class='data-table'>
                <thead>
                    <tr>
                        <th>Inv #</th>
                        <th>Date</th>
                        <th>Client</th>
                        <th>GSTIN</th>
                        <th style='text-align: right;'>Taxable (₹)</th>
                        <th style='text-align: right;'>CGST (₹)</th>
                        <th style='text-align: right;'>SGST (₹)</th>
                        <th style='text-align: right;'>IGST (₹)</th>
                        <th style='text-align: right;'>Total (₹)</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    {$rowsHtml}
                </tbody>
                <tfoot>
                    <tr style='font-weight: bold; background-color: #f8fafc;'>
                        <td colspan='4'>Total (" . count($data['invoices']) . " invoices)</td>
                        <td style='text-align: right;'>" . number_format($totals['taxable_amount'], 2) . "</td>
                        <td style='text-align: right;'>" . number_format($totals['cgst_amount'], 2) . "</td>
                        <td style='text-align: right;'>" . number_format($totals['sgst_amount'], 2) . "</td>
                        <td style='text-align: right;'>" . number_format($totals['igst_amount'], 2) . "</td>
                        <td style='text-align: right;'>" . number_format($totals['grand_total'], 2) . "</td>
                        <td></td>
                    </tr>
                </tfoot>
            </table>

            <div class='footer'>Generated on {$data['generated_at']} | ACCURA Financial Operations Platform</div>
        </body>
        </html>";

        $dompdf->loadHtml($html);
        $dompdf->render();

        return $dompdf->output();
    }

    /**
     * Render Audit Report PDF
     */
    public function renderAuditReportPdf(array $data): string
    {
        $dompdf = $this->getDompdfInstance();

        $org = $data['organization'];

        $rowsHtml = '';
        foreach ($data['logs'] as $log) {
            $userStr = $log['user_name'] . ($log['user_email'] ? " ({$log['user_email']})" : "");

            $rowsHtml .= "
            <tr>
                <td>{$log['id']}</td>
                <td>{$log['created_at']}</td>
                <td>{$userStr}</td>
                <td>{$log['action']}</td>
                <td>{$log['auditable_type']} #{$log['auditable_id']}</td>
            </tr>";
        }

        $html = "
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Helvetica, sans-serif; font-size: 10px; color: #333; margin: 15px; }
                .title { font-size: 16px; font-weight: bold; color: #1e3a8a; margin-bottom: 5px; }
                table.data-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                table.data-table th, table.data-table td { border: 1px solid #cbd5e1; padding: 5px 6px; text-align: left; }
                table.data-table th { background-color: #f1f5f9; font-weight: bold; }
                .footer { font-size: 8px; color: #64748b; margin-top: 20px; text-align: center; }
            </style>
        </head>
        <body>
            <div class='title'>AUDIT TRAIL LOG REPORT</div>
            <div>Organization: <strong>{$org->name}</strong></div>

            <table class='data-table'>
                <thead>
                    <tr>
                        <th>Log ID</th>
                        <th>Timestamp</th>
                        <th>User</th>
                        <th>Action</th>
                        <th>Target Entity</th>
                    </tr>
                </thead>
                <tbody>
                    {$rowsHtml}
                </tbody>
            </table>

            <div class='footer'>Generated on {$data['generated_at']} | ACCURA Financial Operations Platform</div>
        </body>
        </html>";

        $dompdf->loadHtml($html);
        $dompdf->render();

        return $dompdf->output();
    }
}
