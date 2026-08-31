<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CreditDebitNote;
use App\Services\CreditDebitNoteService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;

class CreditDebitNoteController extends Controller
{
    public function __construct(
        protected CreditDebitNoteService $noteService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $orgId = (int) $request->attributes->get('active_organization_id');
        $type = $request->query('note_type');

        $query = CreditDebitNote::where('organization_id', $orgId)
            ->with(['client', 'invoice', 'items.product', 'creator']);

        if ($type) {
            $query->where('note_type', $type);
        }

        if ($clientId = $request->query('client_id')) {
            $query->where('client_id', $clientId);
        }

        $notes = $query->orderBy('id', 'desc')->paginate(20);
        return response()->json($notes);
    }

    public function store(Request $request): JsonResponse
    {
        $role = $request->attributes->get('active_role');
        if ($role === 'auditor') {
            return response()->json(['message' => 'Auditors are not permitted to issue Credit or Debit Notes.'], 403);
        }

        $validated = $request->validate([
            'invoice_id'         => 'required|integer',
            'note_type'          => 'required|string|in:credit_note,debit_note',
            'reason'             => 'required|string|max:1000',
            'date'               => 'nullable|date_format:Y-m-d',
            'items'              => 'required|array|min:1',
            'items.*.product_id' => 'required|integer',
            'items.*.quantity'   => 'required|numeric|gt:0',
            'items.*.rate'       => 'required|numeric|gte:0',
            'items.*.gst_rate'   => 'nullable|numeric|gte:0',
        ]);

        $orgId = (int) $request->attributes->get('active_organization_id');
        $userId = $request->user()->id;

        try {
            $note = $this->noteService->createNote(
                $orgId,
                $userId,
                $validated['invoice_id'],
                $validated['note_type'],
                $validated['reason'],
                $validated['items'],
                $validated['date'] ?? null
            );

            return response()->json($note, 201);
        } catch (InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function show(int $id, Request $request): JsonResponse
    {
        $orgId = (int) $request->attributes->get('active_organization_id');
        $note = CreditDebitNote::where('organization_id', $orgId)
            ->with(['client', 'invoice', 'items.product', 'creator'])
            ->find($id);

        if (!$note) {
            return response()->json(['message' => 'Credit / Debit Note not found.'], 404);
        }

        return response()->json($note);
    }
}
