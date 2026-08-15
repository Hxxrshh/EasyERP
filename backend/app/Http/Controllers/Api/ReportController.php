<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AuditLogService;
use App\Services\CsvExportService;
use App\Services\ExcelExportService;
use App\Services\PdfExportService;
use App\Services\ReportDataService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use InvalidArgumentException;

class ReportController extends Controller
{
    public function __construct(
        protected ReportDataService $reportDataService,
        protected PdfExportService $pdfExportService,
        protected ExcelExportService $excelExportService,
        protected CsvExportService $csvExportService,
        protected AuditLogService $auditService
    ) {}

    /**
     * Export Client Ledger (PDF or XLSX)
     * GET /api/v1/ledgers/{clientId}/export
     */
    public function exportLedger(int $clientId, Request $request): Response|JsonResponse
    {
        $request->validate([
            'from'           => 'nullable|date_format:Y-m-d',
            'to'             => 'nullable|date_format:Y-m-d',
            'financial_year' => 'nullable|string',
            'format'         => 'nullable|in:pdf,xlsx',
        ]);

        $orgId = $request->attributes->get('active_organization_id');
        $userId = $request->user()?->id;
        $format = $request->query('format', 'pdf');

        try {
            $data = $this->reportDataService->getLedgerReport(
                $clientId,
                $orgId,
                $request->query('from'),
                $request->query('to'),
                $request->query('financial_year')
            );

            // Audit log report export
            $this->auditService->log(
                $orgId,
                $userId,
                'report_generated',
                'ClientLedger',
                $clientId,
                null,
                ['format' => $format, 'from' => $data['from'], 'to' => $data['to']]
            );

            if ($format === 'xlsx') {
                $content = $this->excelExportService->generateLedgerXlsx($data);
                $filename = "Ledger_Client_{$clientId}_" . date('Ymd_His') . ".xlsx";

                return response($content, 200, [
                    'Content-Type'        => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'Content-Disposition' => "attachment; filename=\"{$filename}\"",
                ]);
            }

            // Default PDF
            $content = $this->pdfExportService->renderLedgerPdf($data);
            $filename = "Ledger_Client_{$clientId}_" . date('Ymd_His') . ".pdf";

            return response($content, 200, [
                'Content-Type'        => 'application/pdf',
                'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            ]);
        } catch (InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    /**
     * Export Invoice Register Report
     * GET /api/v1/reports/invoices
     */
    public function invoiceRegister(Request $request): Response|JsonResponse
    {
        $request->validate([
            'from'           => 'nullable|date_format:Y-m-d',
            'to'             => 'nullable|date_format:Y-m-d',
            'financial_year' => 'nullable|string',
            'client_id'      => 'nullable|integer',
            'format'         => 'nullable|in:pdf,xlsx,json',
        ]);

        $orgId = $request->attributes->get('active_organization_id');
        $userId = $request->user()?->id;
        $format = $request->query('format', 'json');

        try {
            $data = $this->reportDataService->getInvoiceRegisterReport(
                $orgId,
                $request->query('client_id') ? (int) $request->query('client_id') : null,
                $request->query('from'),
                $request->query('to'),
                $request->query('financial_year')
            );

            $this->auditService->log(
                $orgId,
                $userId,
                'report_generated',
                'InvoiceRegister',
                $orgId,
                null,
                ['format' => $format, 'from' => $data['from'], 'to' => $data['to']]
            );

            if ($format === 'pdf') {
                $content = $this->pdfExportService->renderInvoiceRegisterPdf($data);
                $filename = "Invoice_Register_" . date('Ymd_His') . ".pdf";

                return response($content, 200, [
                    'Content-Type'        => 'application/pdf',
                    'Content-Disposition' => "attachment; filename=\"{$filename}\"",
                ]);
            }

            if ($format === 'xlsx') {
                $content = $this->excelExportService->generateInvoiceRegisterXlsx($data);
                $filename = "Invoice_Register_" . date('Ymd_His') . ".xlsx";

                return response($content, 200, [
                    'Content-Type'        => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'Content-Disposition' => "attachment; filename=\"{$filename}\"",
                ]);
            }

            return response()->json($data);
        } catch (InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    /**
     * Export GSTR-1 Tax Report Data
     * GET /api/v1/reports/gstr1
     */
    public function gstr1(Request $request): Response|JsonResponse
    {
        $request->validate([
            'from'           => 'nullable|date_format:Y-m-d',
            'to'             => 'nullable|date_format:Y-m-d',
            'financial_year' => 'nullable|string',
            'format'         => 'nullable|in:xlsx,csv,json',
        ]);

        $orgId = $request->attributes->get('active_organization_id');
        $userId = $request->user()?->id;
        $format = $request->query('format', 'json');

        try {
            $data = $this->reportDataService->getGstr1Report(
                $orgId,
                $request->query('from'),
                $request->query('to'),
                $request->query('financial_year')
            );

            $this->auditService->log(
                $orgId,
                $userId,
                'report_generated',
                'GSTR1',
                $orgId,
                null,
                ['format' => $format, 'from' => $data['from'], 'to' => $data['to']]
            );

            if ($format === 'xlsx') {
                $content = $this->excelExportService->generateGstr1Xlsx($data);
                $filename = "GSTR1_" . date('Ymd_His') . ".xlsx";

                return response($content, 200, [
                    'Content-Type'        => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'Content-Disposition' => "attachment; filename=\"{$filename}\"",
                ]);
            }

            if ($format === 'csv') {
                $content = $this->csvExportService->generateGstr1Csv($data);
                $filename = "GSTR1_" . date('Ymd_His') . ".csv";

                return response($content, 200, [
                    'Content-Type'        => 'text/csv',
                    'Content-Disposition' => "attachment; filename=\"{$filename}\"",
                ]);
            }

            return response()->json($data);
        } catch (InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    /**
     * Export Audit Trail Report Data
     * GET /api/v1/reports/audit
     */
    public function auditReport(Request $request): Response|JsonResponse
    {
        $request->validate([
            'from'        => 'nullable|date_format:Y-m-d',
            'to'          => 'nullable|date_format:Y-m-d',
            'user_id'     => 'nullable|integer',
            'action'      => 'nullable|string',
            'entity_type' => 'nullable|string',
            'format'      => 'nullable|in:pdf,xlsx,csv,json',
        ]);

        $orgId = $request->attributes->get('active_organization_id');
        $userId = $request->user()?->id;
        $format = $request->query('format', 'json');

        try {
            $data = $this->reportDataService->getAuditReport(
                $orgId,
                $request->query('user_id') ? (int) $request->query('user_id') : null,
                $request->query('action'),
                $request->query('entity_type'),
                $request->query('from'),
                $request->query('to')
            );

            if ($format === 'pdf') {
                $content = $this->pdfExportService->renderAuditReportPdf($data);
                $filename = "Audit_Report_" . date('Ymd_His') . ".pdf";

                return response($content, 200, [
                    'Content-Type'        => 'application/pdf',
                    'Content-Disposition' => "attachment; filename=\"{$filename}\"",
                ]);
            }

            if ($format === 'xlsx') {
                $content = $this->excelExportService->generateAuditXlsx($data);
                $filename = "Audit_Report_" . date('Ymd_His') . ".xlsx";

                return response($content, 200, [
                    'Content-Type'        => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'Content-Disposition' => "attachment; filename=\"{$filename}\"",
                ]);
            }

            if ($format === 'csv') {
                $content = $this->csvExportService->generateAuditCsv($data);
                $filename = "Audit_Report_" . date('Ymd_His') . ".csv";

                return response($content, 200, [
                    'Content-Type'        => 'text/csv',
                    'Content-Disposition' => "attachment; filename=\"{$filename}\"",
                ]);
            }

            return response()->json($data);
        } catch (InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }
}
