<?php

namespace App\Services;

use App\Models\AuditLog;

class AuditLogService
{
    /**
     * Record an audit log entry inside the active database transaction.
     */
    public function log(
        int $organizationId,
        ?int $userId,
        string $action,
        mixed $auditable,
        mixed $auditableId = null,
        ?array $beforeData = null,
        ?array $afterData = null
    ): AuditLog {
        $auditableType = is_object($auditable) ? class_basename($auditable) : (string) $auditable;
        $id = is_object($auditable) ? ($auditable->id ?? $auditableId) : (int) $auditableId;

        return AuditLog::create([
            'organization_id' => $organizationId,
            'user_id'         => $userId,
            'action'          => $action,
            'auditable_type'  => $auditableType,
            'auditable_id'    => $id,
            'before_data'     => $beforeData,
            'after_data'      => $afterData,
            'created_at'      => now(),
        ]);
    }
}
