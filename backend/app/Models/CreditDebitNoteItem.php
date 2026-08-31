<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CreditDebitNoteItem extends Model
{
    use HasFactory;

    protected $table = 'credit_debit_note_items';

    protected $guarded = ['id'];

    public function note(): BelongsTo
    {
        return $this->belongsTo(CreditDebitNote::class, 'note_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
