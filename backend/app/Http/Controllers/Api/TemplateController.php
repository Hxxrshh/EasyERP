<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\ClientDocumentTemplate;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Organization;
use App\Models\Product;
use App\Services\AuditLogService;
use App\Services\DocumentDeliveryService;
use App\Services\FilenameBuilderService;
use App\Services\PdfExportService;
use App\Services\TemplateWarehouseService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TemplateController extends Controller
{
    public function index(Request $request, TemplateWarehouseService $warehouseService): JsonResponse
    {
        $orgId = $request->attributes->get('active_organization_id');
        $org = Organization::findOrFail($orgId);

        return response()->json([
            'available_templates'       => $warehouseService->getWarehouseCatalog(),
            'default_gst_template'     => $org->default_gst_template ?? 'gst_classic',
            'default_non_gst_template' => $org->default_non_gst_template ?? 'non_gst_classic',
        ]);
    }

    public function resolve(Request $request, TemplateWarehouseService $warehouseService): JsonResponse
    {
        $orgId = $request->attributes->get('active_organization_id');
        $org = Organization::findOrFail($orgId);

        $clientId = $request->query('client_id');
        $taxMode = $request->query('tax_mode', 'taxable');
        $docType = $request->query('document_type', 'invoice');

        $client = null;
        if ($clientId) {
            $client = Client::where('id', $clientId)
                ->where('organization_id', $orgId)
                ->first();
        }

        $resolution = $warehouseService->resolveTemplate($org, $client, $docType, $taxMode);
        return response()->json($resolution);
    }

    public function updateDefaults(Request $request, AuditLogService $auditService, TemplateWarehouseService $warehouseService): JsonResponse
    {
        $role = $request->attributes->get('active_role');
        if ($role !== 'admin') {
            return response()->json(['message' => 'Only Organization Administrators can update default invoice templates.'], 403);
        }

        $validated = $request->validate([
            'default_gst_template'     => 'required|string',
            'default_non_gst_template' => 'required|string',
        ]);

        if (!$warehouseService->validateCompatibility($validated['default_gst_template'], 'invoice', 'taxable')) {
            return response()->json(['message' => 'Default GST template is incompatible with taxable GST invoices.'], 422);
        }

        if (!$warehouseService->validateCompatibility($validated['default_non_gst_template'], 'invoice', 'non_taxable')) {
            return response()->json(['message' => 'Default Non-GST template is incompatible with non-taxable commercial bills.'], 422);
        }

        $orgId = $request->attributes->get('active_organization_id');
        $userId = $request->user()?->id;
        $org = Organization::findOrFail($orgId);

        $beforeData = $org->toArray();

        $org->update([
            'default_gst_template'     => $validated['default_gst_template'],
            'default_non_gst_template' => $validated['default_non_gst_template'],
        ]);

        $auditService->log(
            $orgId,
            $userId,
            'organization_templates_updated',
            $org,
            $org->id,
            $beforeData,
            $org->fresh()->toArray()
        );

        return response()->json([
            'message'                  => 'Organization default templates updated successfully.',
            'default_gst_template'     => $org->default_gst_template,
            'default_non_gst_template' => $org->default_non_gst_template,
        ]);
    }

    public function getClientTemplates(int $clientId, Request $request): JsonResponse
    {
        $orgId = $request->attributes->get('active_organization_id');
        $client = Client::where('id', $clientId)->where('organization_id', $orgId)->first();

        if (!$client) {
            return response()->json(['message' => 'Client not found or unauthorized.'], 404);
        }

        $configs = ClientDocumentTemplate::where('organization_id', $orgId)
            ->where('client_id', $clientId)
            ->get();

        return response()->json([
            'client_id'  => $clientId,
            'templates'  => $configs,
        ]);
    }

    public function setClientTemplate(int $clientId, Request $request, TemplateWarehouseService $warehouseService, AuditLogService $auditService): JsonResponse
    {
        $role = $request->attributes->get('active_role');
        if ($role === 'auditor') {
            return response()->json(['message' => 'Auditor role is read-only.'], 403);
        }

        $orgId = $request->attributes->get('active_organization_id');
        $client = Client::where('id', $clientId)->where('organization_id', $orgId)->first();

        if (!$client) {
            return response()->json(['message' => 'Client not found or unauthorized.'], 404);
        }

        $validated = $request->validate([
            'document_type' => 'required|string|in:invoice,quote,proforma,challan',
            'tax_mode'      => 'required|string|in:taxable,non_taxable',
            'template_key'  => 'required|string',
        ]);

        if (!$warehouseService->validateCompatibility($validated['template_key'], $validated['document_type'], $validated['tax_mode'])) {
            return response()->json([
                'message' => "Template '{$validated['template_key']}' is incompatible with {$validated['tax_mode']} {$validated['document_type']} documents."
            ], 422);
        }

        $meta = $warehouseService->getTemplateMeta($validated['template_key']);
        $version = $meta['version'] ?? 'v1';

        $config = ClientDocumentTemplate::updateOrCreate(
            [
                'organization_id' => $orgId,
                'client_id'       => $clientId,
                'document_type'   => $validated['document_type'],
                'tax_mode'        => $validated['tax_mode'],
            ],
            [
                'template_key'     => $validated['template_key'],
                'template_version' => $version,
            ]
        );

        $auditService->log(
            $orgId,
            $request->user()?->id,
            'client_template_configured',
            $config,
            $config->id,
            null,
            $config->toArray()
        );

        return response()->json($config);
    }

    public function deleteClientTemplate(int $clientId, Request $request): JsonResponse
    {
        $role = $request->attributes->get('active_role');
        if ($role === 'auditor') {
            return response()->json(['message' => 'Auditor role is read-only.'], 403);
        }

        $orgId = $request->attributes->get('active_organization_id');
        $validated = $request->validate([
            'document_type' => 'required|string',
            'tax_mode'      => 'required|string',
        ]);

        ClientDocumentTemplate::where('organization_id', $orgId)
            ->where('client_id', $clientId)
            ->where('document_type', $validated['document_type'])
            ->where('tax_mode', $validated['tax_mode'])
            ->delete();

        return response()->json(['message' => 'Client template preference reset successfully.']);
    }

    public function streamPdf(int $id, Request $request, PdfExportService $pdfService, FilenameBuilderService $filenameBuilder): mixed
    {
        $orgId = $request->attributes->get('active_organization_id');
        $invoice = Invoice::where('organization_id', $orgId)->find($id);

        if (!$invoice) {
            return response()->json(['message' => 'Invoice not found.'], 404);
        }

        $overrideTemplateKey = $request->query('template_key');
        // Finalized invoices are snapshot-locked to their stored template_key
        if ($invoice->status === 'finalized') {
            $overrideTemplateKey = null;
        }

        $pdfBinary = $pdfService->renderInvoicePdf($invoice, $overrideTemplateKey);
        $filename = $filenameBuilder->buildFilename($invoice);

        return response($pdfBinary, 200, [
            'Content-Type'        => 'application/pdf',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    public function streamPreviewHtml(int $id, Request $request, PdfExportService $pdfService): mixed
    {
        $orgId = $request->attributes->get('active_organization_id');
        $invoice = Invoice::where('organization_id', $orgId)->find($id);

        if (!$invoice) {
            return response()->json(['message' => 'Invoice not found.'], 404);
        }

        $overrideTemplateKey = $request->query('template_key');
        if ($invoice->status === 'finalized') {
            $overrideTemplateKey = null;
        }

        $html = $pdfService->renderInvoiceHtml($invoice, $overrideTemplateKey);

        return response($html, 200, [
            'Content-Type' => 'text/html; charset=UTF-8',
        ]);
    }

    public function previewDemoHtml(Request $request, PdfExportService $pdfService): mixed
    {
        $orgId = $request->attributes->get('active_organization_id');
        $org = Organization::find($orgId) ?: new Organization([
            'name'            => 'Apex Industrial Corporation',
            'address'         => 'Plot 42, GIDC Industrial Estate, Vatva',
            'gst_number'      => '24AAACA1234F1Z5',
            'state'           => 'Gujarat',
            'bank_name'       => 'State Bank of India',
            'bank_account_no' => '309988771122',
            'bank_ifsc'       => 'SBIN0001234',
            'upi_id'          => 'apexind@sbi',
        ]);

        $demoClient = new Client([
            'name'            => 'RR Packaging Pvt Ltd',
            'company_name'    => 'RR Packaging Division',
            'short_name'      => 'rr_pack',
            'gst_number'      => '24ABCDE9876F1Z2',
            'state'           => 'Gujarat',
            'billing_address' => '102 Industrial Highway, Sanand, Ahmedabad',
        ]);

        $templateKey = $request->query('template_key', 'gst_classic');
        $docType = $request->query('document_type', 'invoice');
        $taxMode = $request->query('tax_mode', 'taxable');

        $dummyInvoice = new Invoice([
            'id'              => 999,
            'organization_id' => $org->id ?: 1,
            'client_id'       => 1,
            'document_type'   => $docType,
            'tax_mode'        => $taxMode,
            'invoice_number'  => 'DEMO-001/26-27',
            'date'            => date('Y-m-d'),
            'due_date'        => date('Y-m-d', strtotime('+30 days')),
            'subtotal'        => 12500.00,
            'cgst_total'      => $taxMode === 'non_taxable' ? 0 : 1125.00,
            'sgst_total'      => $taxMode === 'non_taxable' ? 0 : 1125.00,
            'igst_total'      => 0.00,
            'total_gst'       => $taxMode === 'non_taxable' ? 0 : 2250.00,
            'total_amount'    => $taxMode === 'non_taxable' ? 12500.00 : 14750.00,
            'paid_amount'     => 0.00,
            'status'          => 'draft',
            'template_key'    => $templateKey,
            'template_version' => 'v1',
        ]);

        $dummyInvoice->setRelation('organization', $org);
        $dummyInvoice->setRelation('client', $demoClient);

        $item1 = new InvoiceItem([
            'quantity' => 100,
            'rate'     => 85.00,
            'gst_rate' => $taxMode === 'non_taxable' ? 0 : 18.00,
            'amount'   => $taxMode === 'non_taxable' ? 8500.00 : 10030.00,
        ]);
        $item1->setRelation('product', new Product(['name' => 'HDPE Granules Grade-A', 'hsn_code' => '3901', 'unit' => 'KGS']));

        $item2 = new InvoiceItem([
            'quantity' => 50,
            'rate'     => 80.00,
            'gst_rate' => $taxMode === 'non_taxable' ? 0 : 18.00,
            'amount'   => $taxMode === 'non_taxable' ? 4000.00 : 4720.00,
        ]);
        $item2->setRelation('product', new Product(['name' => 'Polypropylene Bags 50kg', 'hsn_code' => '3923', 'unit' => 'NOS']));

        $dummyInvoice->setRelation('items', collect([$item1, $item2]));

        $html = $pdfService->renderInvoiceHtml($dummyInvoice, $templateKey);

        return response($html, 200, [
            'Content-Type' => 'text/html; charset=UTF-8',
        ]);
    }

    public function prepareDelivery(int $id, Request $request, DocumentDeliveryService $deliveryService): JsonResponse
    {
        $orgId = $request->attributes->get('active_organization_id');
        $invoice = Invoice::where('organization_id', $orgId)->find($id);

        if (!$invoice) {
            return response()->json(['message' => 'Invoice not found.'], 404);
        }

        $deliveryPayload = $deliveryService->prepareDelivery($invoice);
        return response()->json($deliveryPayload);
    }
}
