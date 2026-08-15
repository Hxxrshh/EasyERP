<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureOrganizationAccess
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        // Priority 1: Header 'X-Organization-Id'
        // Priority 2: Request payload or query string
        // Priority 3: First organization assigned to user
        $orgId = $request->header('X-Organization-Id')
            ?? $request->input('organization_id')
            ?? $request->query('organization_id');

        if ($orgId === null) {
            $firstOrg = $user->organizations()->first();
            if (!$firstOrg) {
                return response()->json(['message' => 'User does not belong to any organization.'], 403);
            }
            $orgId = $firstOrg->id;
        } else {
            $orgId = (int) $orgId;
        }

        if (!$user->hasOrganizationAccess($orgId)) {
            return response()->json(['message' => 'Unauthorized access to this organization.'], 403);
        }

        $role = $user->getRoleInOrganization($orgId);

        // Bind active organization ID and role to request
        $request->attributes->set('active_organization_id', $orgId);
        $request->attributes->set('active_role', $role);

        return $next($request);
    }
}
