<?php

namespace App\Services;

class CsvExportService
{
    /**
     * Generate GSTR-1 CSV (B2B and B2C combined with section header)
     */
    public function generateGstr1Csv(array $data): string
    {
        $handle = fopen('php://temp', 'r+');

        // B2B Section
        fputcsv($handle, ['--- B2B INVOICES ---']);
        fputcsv($handle, ['GSTIN/UIN of Recipient', 'Receiver Name', 'Invoice Number', 'Invoice Date', 'Invoice Value', 'Place Of Supply', 'Reverse Charge', 'Invoice Type', 'Taxable Value', 'Total Tax Amount']);

        foreach ($data['b2b_invoices'] as $inv) {
            fputcsv($handle, [
                $inv['customer_gstin'],
                $inv['customer_name'],
                $inv['invoice_number'],
                $inv['invoice_date'],
                $inv['invoice_value'],
                $inv['place_of_supply'],
                $inv['reverse_charge'],
                $inv['invoice_type'],
                $inv['taxable_amount'],
                $inv['total_tax_amount'],
            ]);
        }

        fputcsv($handle, []);

        // B2C Section
        fputcsv($handle, ['--- B2C INVOICES ---']);
        fputcsv($handle, ['Invoice Number', 'Invoice Date', 'Customer Name', 'Place Of Supply', 'Invoice Value', 'Taxable Amount', 'CGST Amount', 'SGST Amount', 'IGST Amount']);

        foreach ($data['b2c_invoices'] as $inv) {
            fputcsv($handle, [
                $inv['invoice_number'],
                $inv['invoice_date'],
                $inv['customer_name'],
                $inv['place_of_supply'],
                $inv['invoice_value'],
                $inv['taxable_amount'],
                $inv['cgst_amount'],
                $inv['sgst_amount'],
                $inv['igst_amount'],
            ]);
        }

        fputcsv($handle, []);

        // HSN Summary Section
        fputcsv($handle, ['--- HSN SUMMARY ---']);
        fputcsv($handle, ['HSN', 'Description', 'UQC', 'Total Quantity', 'Taxable Value', 'CGST Amount', 'SGST Amount', 'IGST Amount', 'Total Tax']);

        foreach ($data['hsn_summary'] as $hsn) {
            fputcsv($handle, [
                $hsn['hsn_code'],
                $hsn['description'],
                $hsn['uqc'],
                $hsn['total_quantity'],
                $hsn['taxable_value'],
                $hsn['cgst_amount'],
                $hsn['sgst_amount'],
                $hsn['igst_amount'],
                $hsn['total_tax'],
            ]);
        }

        rewind($handle);
        $csv = stream_get_contents($handle);
        fclose($handle);

        return $csv;
    }

    /**
     * Generate Audit Log CSV
     */
    public function generateAuditCsv(array $data): string
    {
        $handle = fopen('php://temp', 'r+');

        fputcsv($handle, ['Log ID', 'Timestamp', 'User Name', 'User Email', 'Action', 'Target Entity', 'Target ID', 'Before Data', 'After Data']);

        foreach ($data['logs'] as $log) {
            fputcsv($handle, [
                $log['id'],
                $log['created_at'],
                $log['user_name'],
                $log['user_email'] ?? '',
                $log['action'],
                $log['auditable_type'],
                $log['auditable_id'],
                $log['before_data'] ? json_encode($log['before_data']) : '',
                $log['after_data'] ? json_encode($log['after_data']) : '',
            ]);
        }

        rewind($handle);
        $csv = stream_get_contents($handle);
        fclose($handle);

        return $csv;
    }
}
