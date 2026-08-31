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
        $role = $request->attributes->get('active_role');
        if (!in_array($role, ['admin', 'auditor'])) {
            return response()->json(['message' => 'Access denied. Audit logs are restricted to Administrator and Auditor roles.'], 403);
        }

        $orgId = $request->attributes->get('active_organization_id');

        $logs = AuditLog::with('user:id,name,email')
            ->where('organization_id', $orgId)
            ->latest('id')
            ->paginate(30);

        // Sanitize sensitive credential fields from audit log payloads
        $logs->getCollection()->transform(function ($log) {
            $sensitiveKeys = ['password', 'token', 'secret', 'api_key'];
            if (is_array($log->before_state)) {
                $log->before_state = array_diff_key($log->before_state, array_flip($sensitiveKeys));
            }
            if (is_array($log->after_state)) {
                $log->after_state = array_diff_key($log->after_state, array_flip($sensitiveKeys));
            }
            return $log;
        });

        return response()->json($logs);
    }
}
