<?php

namespace App\Services;

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
                Generated automatically on {$data['generated_at']} | LR Billing System
            </div>
        </body>
        </html>";

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

            <div class='footer'>Generated on {$data['generated_at']} | LR Billing</div>
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

            <div class='footer'>Generated on {$data['generated_at']} | LR Billing</div>
        </body>
        </html>";

        $dompdf->loadHtml($html);
        $dompdf->render();

        return $dompdf->output();
    }
}
