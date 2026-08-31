<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use App\Services\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrganizationController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $orgId = (int) $request->attributes->get('active_organization_id');
        $org = Organization::findOrFail($orgId);
        $user = $request->user();

        $userOrgs = $user ? $user->organizations()->select('organizations.id', 'organizations.name', 'organizations.gst_number', 'organizations.state')->get() : [];

        $orgData = $org->toArray();
        $orgData['address'] = $org->billing_address ?? $org->address ?? '';

        return response()->json([
            'organization'       => $orgData,
            'user_organizations' => $userOrgs,
        ]);
    }

    public function update(Request $request, AuditLogService $auditService): JsonResponse
    {
        $role = $request->attributes->get('active_role');
        if ($role !== 'admin') {
            return response()->json(['message' => 'Only Organization Administrators can update organization settings.'], 403);
        }

        $orgId = (int) $request->attributes->get('active_organization_id');
        $org = Organization::findOrFail($orgId);

        $validated = $request->validate([
            'name'            => 'required|string|max:255',
            'address'         => 'nullable|string|max:500',
            'gst_number'      => 'nullable|string|max:20',
            'state'           => 'required|string|max:100',
            'bank_name'       => 'nullable|string|max:255',
            'bank_account_no' => 'nullable|string|max:100',
            'bank_ifsc'       => 'nullable|string|max:20',
            'upi_id'          => 'nullable|string|max:100',
        ]);

        $beforeData = $org->toArray();

        $updateData = [
            'name'            => $validated['name'],
            'billing_address' => $validated['address'] ?? '',
            'state'           => $validated['state'],
            'gst_number'      => $validated['gst_number'] ?? '',
            'bank_name'       => $validated['bank_name'] ?? '',
            'bank_account_no' => $validated['bank_account_no'] ?? '',
            'bank_ifsc'       => $validated['bank_ifsc'] ?? '',
            'upi_id'          => $validated['upi_id'] ?? '',
        ];

        $org->update($updateData);

        $auditService->log(
            $orgId,
            $request->user()?->id,
            'organization_settings_updated',
            $org,
            $org->id,
            $beforeData,
            $org->fresh()->toArray()
        );

        $resOrg = $org->fresh()->toArray();
        $resOrg['address'] = $resOrg['billing_address'] ?? '';

        return response()->json([
            'message'      => 'Organization settings updated successfully.',
            'organization' => $resOrg,
        ]);
    }

    public function store(Request $request, AuditLogService $auditService): JsonResponse
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $validated = $request->validate([
            'name'            => 'required|string|max:255',
            'address'         => 'nullable|string|max:500',
            'gst_number'      => 'nullable|string|max:20',
            'state'           => 'required|string|max:100',
            'bank_name'       => 'nullable|string|max:255',
            'bank_account_no' => 'nullable|string|max:100',
            'bank_ifsc'       => 'nullable|string|max:20',
            'upi_id'          => 'nullable|string|max:100',
        ]);

        $org = Organization::create([
            'name'                     => $validated['name'],
            'billing_address'          => $validated['address'] ?? '',
            'gst_number'               => $validated['gst_number'] ?? '',
            'state'                    => $validated['state'],
            'bank_name'                => $validated['bank_name'] ?? '',
            'bank_account_no'          => $validated['bank_account_no'] ?? '',
            'bank_ifsc'                => $validated['bank_ifsc'] ?? '',
            'upi_id'                   => $validated['upi_id'] ?? '',
            'default_template'         => 'gst_classic',
            'brand_color'              => '#1e3a8a',
            'default_gst_template'     => 'gst_classic',
            'default_non_gst_template' => 'non_gst_classic',
        ]);

        // Attach current user as Admin
        $user->organizations()->attach($org->id, ['role' => 'admin']);

        $auditService->log(
            $org->id,
            $user->id,
            'organization_created',
            $org,
            $org->id,
            null,
            $org->toArray()
        );

        $resOrg = $org->toArray();
        $resOrg['address'] = $resOrg['billing_address'] ?? '';

        return response()->json([
            'message'      => 'New organization created successfully.',
            'organization' => $resOrg,
        ], 201);
    }

    public function getUsage(Request $request, \App\Services\MasterLifecycleService $lifecycleService): JsonResponse
    {
        $orgId = (int) $request->attributes->get('active_organization_id');
        $usage = $lifecycleService->checkOrganizationUsage($orgId);
        return response()->json($usage);
    }

    public function archive(Request $request, \App\Services\MasterLifecycleService $lifecycleService): JsonResponse
    {
        $role = $request->attributes->get('active_role');
        if ($role !== 'admin') {
            return response()->json(['message' => 'Unauthorized. Only Organization Administrators can archive an organization.'], 403);
        }

        $orgId = (int) $request->attributes->get('active_organization_id');
        $userId = $request->user()->id;
        $reason = $request->input('reason');

        $org = $lifecycleService->archiveOrganization($orgId, $userId, $reason);
        return response()->json($org);
    }

    public function restore(Request $request, \App\Services\MasterLifecycleService $lifecycleService): JsonResponse
    {
        $role = $request->attributes->get('active_role');
        if ($role !== 'admin') {
            return response()->json(['message' => 'Unauthorized. Only Organization Administrators can restore an organization.'], 403);
        }

        $orgId = (int) $request->attributes->get('active_organization_id');
        $userId = $request->user()->id;

        $org = $lifecycleService->restoreOrganization($orgId, $userId);
        return response()->json($org);
    }

    public function destroy(Request $request, \App\Services\MasterLifecycleService $lifecycleService): JsonResponse
    {
        $role = $request->attributes->get('active_role');
        if ($role !== 'admin') {
            return response()->json(['message' => 'Unauthorized. Only Organization Administrators can permanently delete an organization.'], 403);
        }

        $orgId = (int) $request->attributes->get('active_organization_id');
        $userId = $request->user()->id;
        $org = Organization::findOrFail($orgId);

        $confirmName = $request->input('confirm_name');
        if (trim($confirmName) !== trim($org->name)) {
            return response()->json(['message' => 'Organization name confirmation mismatch.'], 422);
        }

        try {
            $lifecycleService->deleteOrganization($orgId, $userId);
            return response()->json(['message' => 'Organization permanently deleted successfully.']);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }
}
