<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Product;
use App\Services\AuditLogService;
use App\Services\MasterLifecycleService;
use App\Services\PriceIntelligenceService;
use App\Services\ProductPriceComparisonService;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class MasterController extends Controller
{
    public function getMeta(Request $request): JsonResponse
    {
        $orgId = $request->attributes->get('active_organization_id');
        $user = $request->user();

        $includeArchived = filter_var($request->query('include_archived', false), FILTER_VALIDATE_BOOLEAN);

        $clientsQuery = Client::where('organization_id', $orgId);
        $productsQuery = Product::where('organization_id', $orgId);

        if (!$includeArchived) {
            $clientsQuery->where('is_archived', false);
            $productsQuery->where('is_archived', false);
        }

        return response()->json([
            'organizations' => $user->organizations,
            'clients'       => $clientsQuery->orderBy('name')->get(),
            'products'      => $productsQuery->orderBy('name')->get(),
        ]);
    }

    public function getClients(Request $request): JsonResponse
    {
        $orgId = $request->attributes->get('active_organization_id');
        $includeArchived = filter_var($request->query('include_archived', false), FILTER_VALIDATE_BOOLEAN);

        $query = Client::where('organization_id', $orgId);

        if (!$includeArchived) {
            $query->where('is_archived', false);
        }

        if ($request->has('search')) {
            $search = $request->query('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('company_name', 'like', "%{$search}%")
                  ->orWhere('gst_number', 'like', "%{$search}%");
            });
        }

        $clients = $query->orderBy('name')->paginate($request->query('per_page', 50));
        return response()->json($clients);
    }

    public function getProducts(Request $request): JsonResponse
    {
        $orgId = $request->attributes->get('active_organization_id');
        $includeArchived = filter_var($request->query('include_archived', false), FILTER_VALIDATE_BOOLEAN);

        $query = Product::where('organization_id', $orgId);

        if (!$includeArchived) {
            $query->where('is_archived', false);
        }

        if ($request->has('search')) {
            $search = $request->query('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('hsn_code', 'like', "%{$search}%")
                  ->orWhere('short_name', 'like', "%{$search}%");
            });
        }

        $products = $query->orderBy('name')->paginate($request->query('per_page', 50));
        return response()->json($products);
    }

    public function resolvePrice(Request $request, PriceIntelligenceService $priceService): JsonResponse
    {
        $orgId = $request->attributes->get('active_organization_id');

        $request->validate([
            'client_id'  => 'required|integer',
            'product_id' => 'required|integer',
        ]);

        $client = Client::where('id', $request->client_id)
            ->where('organization_id', $orgId)
            ->first();

        $product = Product::where('id', $request->product_id)
            ->where('organization_id', $orgId)
            ->first();

        if (!$client || !$product) {
            return response()->json(['message' => 'Unauthorized or entity not found in this organization.'], 403);
        }

        $details = $priceService->resolveUnitPriceDetails(
            $orgId,
            $client->id,
            $product->id
        );

        return response()->json($details);
    }

    public function storeClient(Request $request, AuditLogService $auditLogService): JsonResponse
    {
        $user = $request->user();
        $orgId = $request->attributes->get('active_organization_id');
        $role = $request->attributes->get('active_role');

        if ($role === 'auditor') {
            return response()->json(['message' => 'Auditor role is read-only.'], 403);
        }

        $validated = $request->validate([
            'name'             => 'required|string|max:255',
            'company_name'     => 'nullable|string|max:255',
            'short_name'       => 'nullable|string|max:50',
            'gst_number'       => 'nullable|string|max:15',
            'billing_address'  => 'nullable|string',
            'state'            => 'required|string|max:100',
            'default_due_days' => 'nullable|integer|min:0',
            'contact_phone'    => 'nullable|string|max:20',
            'contact_whatsapp' => 'nullable|string|max:20',
        ]);

        $shortName = $validated['short_name'] ?? Str::slug($validated['name'], '_');

        $client = Client::create([
            'organization_id'   => $orgId,
            'name'              => $validated['name'],
            'company_name'      => $validated['company_name'] ?? null,
            'short_name'        => $shortName,
            'gst_number'        => $validated['gst_number'] ?? null,
            'billing_address'   => $validated['billing_address'] ?? null,
            'state'             => $validated['state'],
            'default_due_days'  => $validated['default_due_days'] ?? 30,
            'contact_phone'     => $validated['contact_phone'] ?? null,
            'contact_whatsapp'  => $validated['contact_whatsapp'] ?? null,
        ]);

        $auditLogService->log(
            $orgId,
            $user->id,
            'client_created',
            Client::class,
            $client->id,
            null,
            $client->toArray()
        );

        return response()->json($client, 201);
    }

    public function storeProduct(Request $request, AuditLogService $auditLogService): JsonResponse
    {
        $user = $request->user();
        $orgId = $request->attributes->get('active_organization_id');
        $role = $request->attributes->get('active_role');

        if ($role === 'auditor') {
            return response()->json(['message' => 'Auditor role is read-only.'], 403);
        }

        $validated = $request->validate([
            'name'             => 'required|string|max:255',
            'short_name'       => 'nullable|string|max:50',
            'hsn_code'         => 'nullable|string|max:20',
            'unit'             => 'required|string|max:20',
            'default_gst_rate' => 'required|numeric|min:0|max:100',
            'base_price'       => 'required|numeric|min:0',
        ]);

        $shortName = $validated['short_name'] ?? Str::slug($validated['name'], '_');

        $product = Product::create([
            'organization_id'  => $orgId,
            'name'             => $validated['name'],
            'short_name'       => $shortName,
            'hsn_code'         => $validated['hsn_code'] ?? null,
            'unit'             => $validated['unit'],
            'default_gst_rate' => $validated['default_gst_rate'],
            'base_price'       => $validated['base_price'],
        ]);

        $auditLogService->log(
            $orgId,
            $user->id,
            'product_created',
            Product::class,
            $product->id,
            null,
            $product->toArray()
        );

        return response()->json($product, 201);
    }

    // ----------------------------------------------------------------------
    // CLIENT LIFECYCLE ENDPOINTS
    // ----------------------------------------------------------------------

    public function getClientUsage(int $id, Request $request, MasterLifecycleService $lifecycleService): JsonResponse
    {
        $orgId = $request->attributes->get('active_organization_id');
        $usage = $lifecycleService->checkClientUsage($orgId, $id);
        return response()->json($usage);
    }

    public function archiveClient(int $id, Request $request, MasterLifecycleService $lifecycleService): JsonResponse
    {
        $role = $request->attributes->get('active_role');
        if ($role !== 'admin') {
            return response()->json(['message' => 'Unauthorized. Only administrators can archive clients.'], 403);
        }

        $orgId = $request->attributes->get('active_organization_id');
        $userId = $request->user()->id;
        $reason = $request->input('reason');

        $client = $lifecycleService->archiveClient($orgId, $id, $userId, $reason);
        return response()->json($client);
    }

    public function restoreClient(int $id, Request $request, MasterLifecycleService $lifecycleService): JsonResponse
    {
        $role = $request->attributes->get('active_role');
        if ($role !== 'admin') {
            return response()->json(['message' => 'Unauthorized. Only administrators can restore clients.'], 403);
        }

        $orgId = $request->attributes->get('active_organization_id');
        $userId = $request->user()->id;

        $client = $lifecycleService->restoreClient($orgId, $id, $userId);
        return response()->json($client);
    }

    public function destroyClient(int $id, Request $request, MasterLifecycleService $lifecycleService): JsonResponse
    {
        $role = $request->attributes->get('active_role');
        if ($role !== 'admin') {
            return response()->json(['message' => 'Unauthorized. Only administrators can permanently delete clients.'], 403);
        }

        $orgId = $request->attributes->get('active_organization_id');
        $userId = $request->user()->id;

        try {
            $lifecycleService->deleteClient($orgId, $id, $userId);
            return response()->json(['message' => 'Client permanently deleted successfully.']);
        } catch (Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    // ----------------------------------------------------------------------
    // PRODUCT LIFECYCLE ENDPOINTS
    // ----------------------------------------------------------------------

    public function getProductUsage(int $id, Request $request, MasterLifecycleService $lifecycleService): JsonResponse
    {
        $orgId = $request->attributes->get('active_organization_id');
        $usage = $lifecycleService->checkProductUsage($orgId, $id);
        return response()->json($usage);
    }

    public function archiveProduct(int $id, Request $request, MasterLifecycleService $lifecycleService): JsonResponse
    {
        $role = $request->attributes->get('active_role');
        if ($role !== 'admin') {
            return response()->json(['message' => 'Unauthorized. Only administrators can archive products.'], 403);
        }

        $orgId = $request->attributes->get('active_organization_id');
        $userId = $request->user()->id;
        $reason = $request->input('reason');

        $product = $lifecycleService->archiveProduct($orgId, $id, $userId, $reason);
        return response()->json($product);
    }

    public function restoreProduct(int $id, Request $request, MasterLifecycleService $lifecycleService): JsonResponse
    {
        $role = $request->attributes->get('active_role');
        if ($role !== 'admin') {
            return response()->json(['message' => 'Unauthorized. Only administrators can restore products.'], 403);
        }

        $orgId = $request->attributes->get('active_organization_id');
        $userId = $request->user()->id;

        $product = $lifecycleService->restoreProduct($orgId, $id, $userId);
        return response()->json($product);
    }

    public function destroyProduct(int $id, Request $request, MasterLifecycleService $lifecycleService): JsonResponse
    {
        $role = $request->attributes->get('active_role');
        if ($role !== 'admin') {
            return response()->json(['message' => 'Unauthorized. Only administrators can permanently delete products.'], 403);
        }

        $orgId = $request->attributes->get('active_organization_id');
        $userId = $request->user()->id;

        try {
            $lifecycleService->deleteProduct($orgId, $id, $userId);
            return response()->json(['message' => 'Product permanently deleted successfully.']);
        } catch (Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    // ----------------------------------------------------------------------
    // PRODUCT PRICE COMPARISON ENDPOINT
    // ----------------------------------------------------------------------

    public function compareProductPrices(int $id, Request $request, ProductPriceComparisonService $comparisonService): JsonResponse
    {
        $orgId = $request->attributes->get('active_organization_id');

        $clientIds = [];
        if ($request->has('client_ids')) {
            $rawClientIds = $request->input('client_ids');
            if (is_array($rawClientIds)) {
                $clientIds = array_map('intval', $rawClientIds);
            } elseif (is_string($rawClientIds)) {
                $clientIds = array_map('intval', array_filter(explode(',', $rawClientIds)));
            }
        }

        $startDate = $request->query('start_date');
        $endDate = $request->query('end_date');
        $financialYear = $request->query('financial_year');

        $result = $comparisonService->comparePrices(
            $orgId,
            $id,
            $clientIds,
            $startDate,
            $endDate,
            $financialYear
        );

        return response()->json($result);
    }

    public function globalSearch(Request $request): JsonResponse
    {
        $orgId = (int) $request->attributes->get('active_organization_id');
        $q = trim((string) $request->query('query'));

        if (strlen($q) < 2) {
            return response()->json(['clients' => [], 'invoices' => [], 'products' => [], 'payments' => []]);
        }

        $clients = Client::where('organization_id', $orgId)
            ->where('is_archived', false)
            ->where(function ($query) use ($q) {
                $query->where('name', 'like', "%{$q}%")
                      ->orWhere('company_name', 'like', "%{$q}%")
                      ->orWhere('gst_number', 'like', "%{$q}%");
            })
            ->limit(5)->get();

        $invoices = \App\Models\Invoice::where('organization_id', $orgId)
            ->where('invoice_number', 'like', "%{$q}%")
            ->with('client')
            ->limit(5)->get();

        $products = Product::where('organization_id', $orgId)
            ->where('is_archived', false)
            ->where(function ($query) use ($q) {
                $query->where('name', 'like', "%{$q}%")
                      ->orWhere('hsn_code', 'like', "%{$q}%");
            })
            ->limit(5)->get();

        $payments = \App\Models\Payment::where('organization_id', $orgId)
            ->where('transaction_reference', 'like', "%{$q}%")
            ->with('client')
            ->limit(5)->get();

        return response()->json([
            'clients'  => $clients,
            'invoices' => $invoices,
            'products' => $products,
            'payments' => $payments,
        ]);
    }
}