<?php

namespace App\Services;

use App\Models\Client;
use App\Models\ClientDocumentTemplate;
use App\Models\Organization;
use InvalidArgumentException;

class TemplateWarehouseService
{
    /**
     * Get authoritative metadata catalog for all available template warehouse items.
     */
    public function getWarehouseCatalog(): array
    {
        return [
            // GST / Tax Invoice Templates
            [
                'key'                     => 'gst_classic',
                'name'                    => 'GST Classic',
                'category'                => 'GST',
                'version'                 => 'v1',
                'supported_tax_modes'     => ['taxable'],
                'supported_document_types' => ['invoice'],
                'description'             => 'Traditional Indian accounting format. Dense, highly printable, familiar to accountants.',
                'badge_color'             => 'blue',
                'is_active'               => true,
            ],
            [
                'key'                     => 'gst_modern',
                'name'                    => 'GST Modern',
                'category'                => 'GST',
                'version'                 => 'v1',
                'supported_tax_modes'     => ['taxable'],
                'supported_document_types' => ['invoice'],
                'description'             => 'Clean visual hierarchy, modern typography & spacing, optimized for digital & print delivery.',
                'badge_color'             => 'sky',
                'is_active'               => true,
            ],
            [
                'key'                     => 'gst_detailed',
                'name'                    => 'GST Detailed',
                'category'                => 'GST',
                'version'                 => 'v1',
                'supported_tax_modes'     => ['taxable'],
                'supported_document_types' => ['invoice'],
                'description'             => 'Comprehensive accounting view with explicit per-item CGST/SGST/IGST breakdown tables.',
                'badge_color'             => 'teal',
                'is_active'               => true,
            ],
            [
                'key'                     => 'gst_corporate',
                'name'                    => 'GST Corporate',
                'category'                => 'GST',
                'version'                 => 'v1',
                'supported_tax_modes'     => ['taxable'],
                'supported_document_types' => ['invoice'],
                'description'             => 'Corporate layout with legal declaration, bank remittance details, Udyam & terms.',
                'badge_color'             => 'indigo',
                'is_active'               => true,
            ],
            [
                'key'                     => 'gst_minimal',
                'name'                    => 'GST Minimal',
                'category'                => 'GST',
                'version'                 => 'v1',
                'supported_tax_modes'     => ['taxable'],
                'supported_document_types' => ['invoice'],
                'description'             => 'Minimalist clean line GST invoice with high whitespace and clear totals.',
                'badge_color'             => 'slate',
                'is_active'               => true,
            ],
            [
                'key'                     => 'gst_industrial',
                'name'                    => 'GST Industrial',
                'category'                => 'GST',
                'version'                 => 'v1',
                'supported_tax_modes'     => ['taxable'],
                'supported_document_types' => ['invoice'],
                'description'             => 'Heavy-duty industrial format for packaging, manufacturing & GIDC units.',
                'badge_color'             => 'cyan',
                'is_active'               => true,
            ],

            // Non-GST / Commercial Bill Templates
            [
                'key'                     => 'non_gst_classic',
                'name'                    => 'Commercial Classic',
                'category'                => 'Non-GST',
                'version'                 => 'v1',
                'supported_tax_modes'     => ['non_taxable'],
                'supported_document_types' => ['invoice'],
                'description'             => 'Traditional commercial bill layout without GST tax presentation.',
                'badge_color'             => 'amber',
                'is_active'               => true,
            ],
            [
                'key'                     => 'non_gst_modern',
                'name'                    => 'Commercial Modern',
                'category'                => 'Non-GST',
                'version'                 => 'v1',
                'supported_tax_modes'     => ['non_taxable'],
                'supported_document_types' => ['invoice'],
                'description'             => 'Modern commercial invoice for non-taxable sales.',
                'badge_color'             => 'orange',
                'is_active'               => true,
            ],
            [
                'key'                     => 'non_gst_simple',
                'name'                    => 'Simple Bill',
                'category'                => 'Non-GST',
                'version'                 => 'v1',
                'supported_tax_modes'     => ['non_taxable'],
                'supported_document_types' => ['invoice'],
                'description'             => 'Simple clean commercial receipt / bill for quick cash sales.',
                'badge_color'             => 'emerald',
                'is_active'               => true,
            ],
            [
                'key'                     => 'non_gst_industrial',
                'name'                    => 'Industrial Non-GST',
                'category'                => 'Non-GST',
                'version'                 => 'v1',
                'supported_tax_modes'     => ['non_taxable'],
                'supported_document_types' => ['invoice'],
                'description'             => 'Industrial non-taxable delivery & commercial bill layout.',
                'badge_color'             => 'amber',
                'is_active'               => true,
            ],

            // Quotes / Estimates Templates
            [
                'key'                     => 'quote_modern',
                'name'                    => 'Modern Quote',
                'category'                => 'Quote',
                'version'                 => 'v1',
                'supported_tax_modes'     => ['taxable', 'non_taxable'],
                'supported_document_types' => ['quote'],
                'description'             => 'Clean professional estimate / quotation format.',
                'badge_color'             => 'purple',
                'is_active'               => true,
            ],
            [
                'key'                     => 'quote_professional',
                'name'                    => 'Professional Quote',
                'category'                => 'Quote',
                'version'                 => 'v1',
                'supported_tax_modes'     => ['taxable', 'non_taxable'],
                'supported_document_types' => ['quote'],
                'description'             => 'Corporate estimate with validity period, payment terms & conditions.',
                'badge_color'             => 'violet',
                'is_active'               => true,
            ],

            // Proforma Templates
            [
                'key'                     => 'proforma_corporate',
                'name'                    => 'Corporate Proforma',
                'category'                => 'Proforma',
                'version'                 => 'v1',
                'supported_tax_modes'     => ['taxable', 'non_taxable'],
                'supported_document_types' => ['proforma'],
                'description'             => 'Proforma invoice for advance banking payments & Letter of Credit.',
                'badge_color'             => 'blue',
                'is_active'               => true,
            ],
            [
                'key'                     => 'proforma_modern',
                'name'                    => 'Modern Proforma',
                'category'                => 'Proforma',
                'version'                 => 'v1',
                'supported_tax_modes'     => ['taxable', 'non_taxable'],
                'supported_document_types' => ['proforma'],
                'description'             => 'Clean modern proforma invoice format.',
                'badge_color'             => 'sky',
                'is_active'               => true,
            ],

            // Delivery Challan Templates
            [
                'key'                     => 'challan_warehouse',
                'name'                    => 'Warehouse Challan',
                'category'                => 'Challan',
                'version'                 => 'v1',
                'supported_tax_modes'     => ['taxable', 'non_taxable'],
                'supported_document_types' => ['challan'],
                'description'             => 'Dispatch & transport delivery challan format for goods movement.',
                'badge_color'             => 'stone',
                'is_active'               => true,
            ],
            [
                'key'                     => 'challan_industrial',
                'name'                    => 'Industrial Challan',
                'category'                => 'Challan',
                'version'                 => 'v1',
                'supported_tax_modes'     => ['taxable', 'non_taxable'],
                'supported_document_types' => ['challan'],
                'description'             => 'GIDC goods outward delivery note with vehicle & transport details.',
                'badge_color'             => 'zinc',
                'is_active'               => true,
            ],
        ];
    }

    /**
     * Find metadata for a specific template key.
     */
    public function getTemplateMeta(string $key): ?array
    {
        foreach ($this->getWarehouseCatalog() as $t) {
            if ($t['key'] === $key) {
                return $t;
            }
        }
        return null;
    }

    /**
     * Validate tax_mode and document_type compatibility for a template key.
     */
    public function validateCompatibility(string $key, string $docType, string $taxMode): bool
    {
        $meta = $this->getTemplateMeta($key);
        if (!$meta) {
            return false;
        }

        if (!in_array($taxMode, $meta['supported_tax_modes'])) {
            return false;
        }

        if (!in_array($docType, $meta['supported_document_types']) && !in_array('invoice', $meta['supported_document_types'])) {
            return false;
        }

        return true;
    }

    /**
     * Resolve effective template using 5-tier deterministic hierarchy:
     * 1. Client + Document Type + Tax Mode (client_document_templates)
     * 2. Client + Document Type (client_document_templates fallback)
     * 3. Client legacy preference (clients.preferred_template)
     * 4. Organization default for tax mode / doc type
     * 5. System default fallback
     */
    public function resolveTemplate(Organization $org, ?Client $client, string $docType = 'invoice', string $taxMode = 'taxable'): array
    {
        if ($client) {
            // Tier 1: Client + Document Type + Tax Mode match
            $pref1 = ClientDocumentTemplate::where('organization_id', $org->id)
                ->where('client_id', $client->id)
                ->where('document_type', $docType)
                ->where('tax_mode', $taxMode)
                ->first();

            if ($pref1 && $this->validateCompatibility($pref1->template_key, $docType, $taxMode)) {
                return [
                    'template_key'     => $pref1->template_key,
                    'template_version' => $pref1->template_version ?: 'v1',
                    'reason'           => 'client_document_preference',
                    'source_label'     => "Configured for {$client->name} · " . ucfirst($taxMode),
                ];
            }

            // Tier 2: Client + Document Type match (any tax mode)
            $pref2 = ClientDocumentTemplate::where('organization_id', $org->id)
                ->where('client_id', $client->id)
                ->where('document_type', $docType)
                ->first();

            if ($pref2 && $this->validateCompatibility($pref2->template_key, $docType, $taxMode)) {
                return [
                    'template_key'     => $pref2->template_key,
                    'template_version' => $pref2->template_version ?: 'v1',
                    'reason'           => 'client_document_preference',
                    'source_label'     => "Configured for {$client->name}",
                ];
            }

            // Tier 3: Client legacy preferred_template
            if (!empty($client->preferred_template) && $this->validateCompatibility($client->preferred_template, $docType, $taxMode)) {
                return [
                    'template_key'     => $client->preferred_template,
                    'template_version' => 'v1',
                    'reason'           => 'client_legacy_preference',
                    'source_label'     => "Configured for {$client->name}",
                ];
            }
        }

        // Tier 4: Organization Defaults
        if ($docType === 'quote') {
            $key = 'quote_modern';
        } elseif ($docType === 'proforma') {
            $key = 'proforma_corporate';
        } elseif ($docType === 'challan') {
            $key = 'challan_warehouse';
        } elseif ($taxMode === 'non_taxable') {
            $key = $org->default_non_gst_template ?: 'non_gst_classic';
        } else {
            $key = $org->default_gst_template ?: 'gst_classic';
        }

        if ($this->validateCompatibility($key, $docType, $taxMode)) {
            return [
                'template_key'     => $key,
                'template_version' => 'v1',
                'reason'           => 'organization_default',
                'source_label'     => 'Organization default',
            ];
        }

        // Tier 5: System Fallback
        $fallbackKey = match ($docType) {
            'quote'    => 'quote_modern',
            'proforma' => 'proforma_corporate',
            'challan'  => 'challan_warehouse',
            default    => ($taxMode === 'non_taxable' ? 'non_gst_classic' : 'gst_classic'),
        };

        return [
            'template_key'     => $fallbackKey,
            'template_version' => 'v1',
            'reason'           => 'system_fallback',
            'source_label'     => 'System fallback',
        ];
    }
}
