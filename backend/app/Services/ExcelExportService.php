<?php

namespace App\Services;

use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class ExcelExportService
{
    private function saveSpreadsheetToBinary(Spreadsheet $spreadsheet): string
    {
        $tempFile = tempnam(sys_get_temp_dir(), 'xlsx_');
        $writer = new Xlsx($spreadsheet);
        $writer->save($tempFile);
        $binary = file_get_contents($tempFile);
        @unlink($tempFile);
        return $binary;
    }

    /**
     * Generate Client Ledger XLSX with 3 sheets (Ledger, Invoice Details, Payments)
     */
    public function generateLedgerXlsx(array $data): string
    {
        $spreadsheet = new Spreadsheet();

        // -------------------------------------------------------------
        // Sheet 1: Ledger Statement
        // -------------------------------------------------------------
        $sheet1 = $spreadsheet->getActiveSheet();
        $sheet1->setTitle('Ledger');

        $headers1 = ['Date', 'Type', 'Document No.', 'Description', 'Debit (₹)', 'Credit (₹)', 'Running Balance (₹)', 'Due Date', 'Status', 'Payment Mode', 'Transaction Reference'];
        $sheet1->fromArray($headers1, null, 'A1');

        $rowIdx = 2;
        // Opening balance row
        $sheet1->fromArray(['', 'Opening Balance', '', 'Opening Balance', 0.00, 0.00, (float) $data['opening_balance'], '', '', '', ''], null, "A{$rowIdx}");
        $rowIdx++;

        foreach ($data['statement'] as $row) {
            $sheet1->setCellValue("A{$rowIdx}", $row['date']);
            $sheet1->setCellValue("B{$rowIdx}", $row['entry_type']);
            $sheet1->setCellValue("C{$rowIdx}", $row['invoice_number'] ?? '');
            $sheet1->setCellValue("D{$rowIdx}", $row['description']);
            $sheet1->setCellValue("E{$rowIdx}", (float) $row['debit']);
            $sheet1->setCellValue("F{$rowIdx}", (float) $row['credit']);
            $sheet1->setCellValue("G{$rowIdx}", (float) $row['running_balance']);
            $sheet1->setCellValue("H{$rowIdx}", $row['due_date'] ?? '');
            $sheet1->setCellValue("I{$rowIdx}", $row['status'] ?? '');
            $sheet1->setCellValue("J{$rowIdx}", $row['payment_mode'] ?? '');
            $sheet1->setCellValue("K{$rowIdx}", $row['transaction_reference'] ?? '');
            $rowIdx++;
        }

        // -------------------------------------------------------------
        // Sheet 2: Invoice Details
        // -------------------------------------------------------------
        $sheet2 = $spreadsheet->createSheet();
        $sheet2->setTitle('Invoice Details');

        $headers2 = ['Invoice Number', 'Invoice Date', 'Client', 'Product Name', 'HSN Code', 'Quantity', 'Unit', 'Rate (₹)', 'Taxable Value (₹)', 'GST Rate (%)', 'CGST (₹)', 'SGST (₹)', 'IGST (₹)', 'Total Amount (₹)'];
        $sheet2->fromArray($headers2, null, 'A1');

        $rowIdx = 2;
        foreach ($data['period_invoices'] as $inv) {
            foreach ($inv->items as $item) {
                $sheet2->setCellValue("A{$rowIdx}", $inv->invoice_number);
                $sheet2->setCellValue("B{$rowIdx}", $inv->date->format('Y-m-d'));
                $sheet2->setCellValue("C{$rowIdx}", $inv->client?->name);
                $sheet2->setCellValue("D{$rowIdx}", $item->product?->name);
                $sheet2->setCellValue("E{$rowIdx}", $item->product?->hsn_code ?? 'NA');
                $sheet2->setCellValue("F{$rowIdx}", (int) $item->quantity);
                $sheet2->setCellValue("G{$rowIdx}", $item->product?->unit ?? 'NOS');
                $sheet2->setCellValue("H{$rowIdx}", (float) $item->rate);
                $sheet2->setCellValue("I{$rowIdx}", (float) $item->taxable_amount);
                $sheet2->setCellValue("J{$rowIdx}", (float) $item->gst_rate);
                $sheet2->setCellValue("K{$rowIdx}", (float) $item->cgst_amount);
                $sheet2->setCellValue("L{$rowIdx}", (float) $item->sgst_amount);
                $sheet2->setCellValue("M{$rowIdx}", (float) $item->igst_amount);
                $sheet2->setCellValue("N{$rowIdx}", (float) $item->amount);
                $rowIdx++;
            }
        }

        // -------------------------------------------------------------
        // Sheet 3: Payments
        // -------------------------------------------------------------
        $sheet3 = $spreadsheet->createSheet();
        $sheet3->setTitle('Payments');

        $headers3 = ['Payment ID', 'Payment Date', 'Client', 'Total Amount (₹)', 'Allocated Amount (₹)', 'Unallocated Amount (₹)', 'Payment Mode', 'Transaction Reference', 'Notes'];
        $sheet3->fromArray($headers3, null, 'A1');

        $rowIdx = 2;
        foreach ($data['period_payments'] as $pay) {
            $amount = (float) $pay->amount;
            $unallocated = (float) $pay->unallocated_amount;
            $allocated = round($amount - $unallocated, 2);

            $sheet3->setCellValue("A{$rowIdx}", $pay->id);
            $sheet3->setCellValue("B{$rowIdx}", $pay->payment_date->format('Y-m-d'));
            $sheet3->setCellValue("C{$rowIdx}", $pay->client?->name);
            $sheet3->setCellValue("D{$rowIdx}", $amount);
            $sheet3->setCellValue("E{$rowIdx}", $allocated);
            $sheet3->setCellValue("F{$rowIdx}", $unallocated);
            $sheet3->setCellValue("G{$rowIdx}", $pay->payment_mode);
            $sheet3->setCellValue("H{$rowIdx}", $pay->transaction_reference ?? '');
            $sheet3->setCellValue("I{$rowIdx}", $pay->notes ?? '');
            $rowIdx++;
        }

        return $this->saveSpreadsheetToBinary($spreadsheet);
    }

    /**
     * Generate Invoice Register XLSX
     */
    public function generateInvoiceRegisterXlsx(array $data): string
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Invoice Register');

        $headers = ['Invoice Number', 'Tax Mode', 'Invoice Date', 'Due Date', 'Client Name', 'Client GSTIN', 'Client State', 'Taxable Amount (₹)', 'CGST (₹)', 'SGST (₹)', 'IGST (₹)', 'Total GST (₹)', 'Grand Total (₹)', 'Paid Amount (₹)', 'Outstanding (₹)', 'Payment Status'];
        $sheet->fromArray($headers, null, 'A1');

        $rowIdx = 2;
        foreach ($data['invoices'] as $inv) {
            $taxModeLabel = ($inv['tax_mode'] ?? 'taxable') === 'non_taxable' ? 'Non-Taxable' : 'Taxable (GST)';
            $sheet->setCellValue("A{$rowIdx}", $inv['invoice_number']);
            $sheet->setCellValue("B{$rowIdx}", $taxModeLabel);
            $sheet->setCellValue("C{$rowIdx}", $inv['date']);
            $sheet->setCellValue("D{$rowIdx}", $inv['due_date'] ?? '');
            $sheet->setCellValue("E{$rowIdx}", $inv['client_name']);
            $sheet->setCellValue("F{$rowIdx}", $inv['client_gstin'] ?? 'URP');
            $sheet->setCellValue("G{$rowIdx}", $inv['client_state']);
            $sheet->setCellValue("H{$rowIdx}", (float) $inv['taxable_amount']);
            $sheet->setCellValue("I{$rowIdx}", (float) $inv['cgst_amount']);
            $sheet->setCellValue("J{$rowIdx}", (float) $inv['sgst_amount']);
            $sheet->setCellValue("K{$rowIdx}", (float) $inv['igst_amount']);
            $sheet->setCellValue("L{$rowIdx}", (float) $inv['total_gst']);
            $sheet->setCellValue("M{$rowIdx}", (float) $inv['grand_total']);
            $sheet->setCellValue("N{$rowIdx}", (float) $inv['paid_amount']);
            $sheet->setCellValue("O{$rowIdx}", (float) $inv['outstanding']);
            $sheet->setCellValue("P{$rowIdx}", $inv['status']);
            $rowIdx++;
        }

        // Totals Row
        $totals = $data['totals'];
        $sheet->setCellValue("A{$rowIdx}", 'TOTALS');
        $sheet->setCellValue("H{$rowIdx}", (float) $totals['taxable_amount']);
        $sheet->setCellValue("I{$rowIdx}", (float) $totals['cgst_amount']);
        $sheet->setCellValue("J{$rowIdx}", (float) $totals['sgst_amount']);
        $sheet->setCellValue("K{$rowIdx}", (float) $totals['igst_amount']);
        $sheet->setCellValue("L{$rowIdx}", (float) $totals['total_gst']);
        $sheet->setCellValue("M{$rowIdx}", (float) $totals['grand_total']);
        $sheet->setCellValue("N{$rowIdx}", (float) $totals['paid_amount']);
        $sheet->setCellValue("O{$rowIdx}", (float) $totals['outstanding']);

        return $this->saveSpreadsheetToBinary($spreadsheet);
    }

    /**
     * Generate GSTR-1 XLSX with 3 sheets (B2B, B2C, HSN Summary)
     */
    public function generateGstr1Xlsx(array $data): string
    {
        $spreadsheet = new Spreadsheet();

        // -------------------------------------------------------------
        // Sheet 1: B2B Invoices
        // -------------------------------------------------------------
        $sheet1 = $spreadsheet->getActiveSheet();
        $sheet1->setTitle('b2b');

        $headers1 = ['GSTIN/UIN of Recipient', 'Receiver Name', 'Invoice Number', 'Invoice Date', 'Invoice Value (₹)', 'Place Of Supply', 'Reverse Charge', 'Invoice Type', 'E-Commerce GSTIN', 'Rate (%)', 'Taxable Value (₹)', 'Cess Amount'];
        $sheet1->fromArray($headers1, null, 'A1');

        $rowIdx = 2;
        foreach ($data['b2b_invoices'] as $inv) {
            $sheet1->setCellValue("A{$rowIdx}", $inv['customer_gstin']);
            $sheet1->setCellValue("B{$rowIdx}", $inv['customer_name']);
            $sheet1->setCellValue("C{$rowIdx}", $inv['invoice_number']);
            $sheet1->setCellValue("D{$rowIdx}", $inv['invoice_date']);
            $sheet1->setCellValue("E{$rowIdx}", (float) $inv['invoice_value']);
            $sheet1->setCellValue("F{$rowIdx}", $inv['place_of_supply']);
            $sheet1->setCellValue("G{$rowIdx}", $inv['reverse_charge']);
            $sheet1->setCellValue("H{$rowIdx}", $inv['invoice_type']);
            $sheet1->setCellValue("I{$rowIdx}", '');
            $sheet1->setCellValue("J{$rowIdx}", '');
            $sheet1->setCellValue("K{$rowIdx}", (float) $inv['taxable_amount']);
            $sheet1->setCellValue("L{$rowIdx}", 0);
            $rowIdx++;
        }

        // -------------------------------------------------------------
        // Sheet 2: B2C Invoices
        // -------------------------------------------------------------
        $sheet2 = $spreadsheet->createSheet();
        $sheet2->setTitle('b2c');

        $headers2 = ['Invoice Number', 'Invoice Date', 'Customer Name', 'Place Of Supply', 'Invoice Value (₹)', 'Taxable Amount (₹)', 'CGST (₹)', 'SGST (₹)', 'IGST (₹)'];
        $sheet2->fromArray($headers2, null, 'A1');

        $rowIdx = 2;
        foreach ($data['b2c_invoices'] as $inv) {
            $sheet2->setCellValue("A{$rowIdx}", $inv['invoice_number']);
            $sheet2->setCellValue("B{$rowIdx}", $inv['invoice_date']);
            $sheet2->setCellValue("C{$rowIdx}", $inv['customer_name']);
            $sheet2->setCellValue("D{$rowIdx}", $inv['place_of_supply']);
            $sheet2->setCellValue("E{$rowIdx}", (float) $inv['invoice_value']);
            $sheet2->setCellValue("F{$rowIdx}", (float) $inv['taxable_amount']);
            $sheet2->setCellValue("G{$rowIdx}", (float) $inv['cgst_amount']);
            $sheet2->setCellValue("H{$rowIdx}", (float) $inv['sgst_amount']);
            $sheet2->setCellValue("I{$rowIdx}", (float) $inv['igst_amount']);
            $rowIdx++;
        }

        // -------------------------------------------------------------
        // Sheet 3: HSN Summary
        // -------------------------------------------------------------
        $sheet3 = $spreadsheet->createSheet();
        $sheet3->setTitle('hsn');

        $headers3 = ['HSN', 'Description', 'UQC', 'Total Quantity', 'Total Value (₹)', 'Taxable Value (₹)', 'Integrated Tax Amount (₹)', 'Central Tax Amount (₹)', 'State/UT Tax Amount (₹)', 'Cess Amount (₹)'];
        $sheet3->fromArray($headers3, null, 'A1');

        $rowIdx = 2;
        foreach ($data['hsn_summary'] as $hsn) {
            $sheet3->setCellValue("A{$rowIdx}", $hsn['hsn_code']);
            $sheet3->setCellValue("B{$rowIdx}", $hsn['description']);
            $sheet3->setCellValue("C{$rowIdx}", $hsn['uqc']);
            $sheet3->setCellValue("D{$rowIdx}", (int) $hsn['total_quantity']);
            $sheet3->setCellValue("E{$rowIdx}", (float) ($hsn['taxable_value'] + $hsn['total_tax']));
            $sheet3->setCellValue("F{$rowIdx}", (float) $hsn['taxable_value']);
            $sheet3->setCellValue("G{$rowIdx}", (float) $hsn['igst_amount']);
            $sheet3->setCellValue("H{$rowIdx}", (float) $hsn['cgst_amount']);
            $sheet3->setCellValue("I{$rowIdx}", (float) $hsn['sgst_amount']);
            $sheet3->setCellValue("J{$rowIdx}", 0);
            $rowIdx++;
        }

        return $this->saveSpreadsheetToBinary($spreadsheet);
    }

    /**
     * Generate Audit Trail XLSX
     */
    public function generateAuditXlsx(array $data): string
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Audit Logs');

        $headers = ['Log ID', 'Timestamp', 'User Name', 'User Email', 'Action', 'Entity Type', 'Entity ID', 'Before Data', 'After Data'];
        $sheet->fromArray($headers, null, 'A1');

        $rowIdx = 2;
        foreach ($data['logs'] as $log) {
            $sheet->setCellValue("A{$rowIdx}", $log['id']);
            $sheet->setCellValue("B{$rowIdx}", $log['created_at']);
            $sheet->setCellValue("C{$rowIdx}", $log['user_name']);
            $sheet->setCellValue("D{$rowIdx}", $log['user_email'] ?? '');
            $sheet->setCellValue("E{$rowIdx}", $log['action']);
            $sheet->setCellValue("F{$rowIdx}", $log['auditable_type']);
            $sheet->setCellValue("G{$rowIdx}", $log['auditable_id']);
            $sheet->setCellValue("H{$rowIdx}", $log['before_data'] ? json_encode($log['before_data']) : '');
            $sheet->setCellValue("I{$rowIdx}", $log['after_data'] ? json_encode($log['after_data']) : '');
            $rowIdx++;
        }

        return $this->saveSpreadsheetToBinary($spreadsheet);
    }
}
