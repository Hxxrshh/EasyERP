<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $orgId = $request->attributes->get('active_organization_id');

        $logs = AuditLog::with('user:id,name,email')
            ->where('organization_id', $orgId)
            ->latest('id')
            ->paginate(30);

        return response()->json($logs);
    }
}
