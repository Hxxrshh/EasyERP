<?php

namespace App\Services;

use App\Models\Client;
use App\Models\Organization;

class TemplateService
{
    public function __construct(
        protected TemplateWarehouseService $warehouseService
    ) {}

    /**
     * Get all available invoice/document templates metadata catalog.
     */
    public function getAvailableTemplates(): array
    {
        return $this->warehouseService->getWarehouseCatalog();
    }

    /**
     * Resolve effective template using TemplateWarehouseService.
     */
    public function resolveEffectiveTemplate(Organization $organization, ?Client $client, string $taxMode = 'taxable', string $docType = 'invoice'): array
    {
        return $this->warehouseService->resolveTemplate($organization, $client, $docType, $taxMode);
    }
}
