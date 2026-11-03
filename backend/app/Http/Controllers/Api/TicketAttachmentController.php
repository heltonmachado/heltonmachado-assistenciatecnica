<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Ticket;
use App\Models\TicketAttachment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

class TicketAttachmentController extends Controller
{
    public function index(Ticket $ticket): JsonResponse
    {
        return response()->json(['data' => $ticket->attachments()->latest('id')->get([
            'id', 'ticket_id', 'user_id', 'original_name', 'mime_type', 'size', 'created_at',
        ])]);
    }

    public function store(Request $request, Ticket $ticket): JsonResponse
    {
        $attributes = $request->validate([
            'files' => ['required', 'array', 'min:1', 'max:5'],
            'files.*' => ['required', 'file', 'mimes:jpg,jpeg,png,webp,pdf', 'max:10240'],
        ]);

        $attachments = [];
        foreach ($attributes['files'] as $file) {
            $path = $file->store("tickets/{$ticket->id}", 'local');
            if ($path === false) {
                throw new RuntimeException('Não foi possível armazenar um dos anexos.');
            }

            try {
                $attachments[] = $ticket->attachments()->create([
                    'user_id' => $request->user()->id,
                    'disk' => 'local',
                    'path' => $path,
                    'original_name' => basename(str_replace('\\', '/', $file->getClientOriginalName())),
                    'mime_type' => $file->getMimeType() ?: 'application/octet-stream',
                    'size' => $file->getSize(),
                ]);
            } catch (Throwable $exception) {
                Storage::disk('local')->delete($path);
                throw $exception;
            }
        }

        return response()->json(['data' => $attachments], 201);
    }

    public function download(Ticket $ticket, TicketAttachment $attachment): StreamedResponse
    {
        abort_unless($attachment->ticket_id === $ticket->id, 404);
        abort_unless(Storage::disk($attachment->disk)->exists($attachment->path), 404, 'Anexo não encontrado.');

        return Storage::disk($attachment->disk)->download($attachment->path, basename($attachment->original_name));
    }

    public function destroy(Ticket $ticket, TicketAttachment $attachment): JsonResponse
    {
        abort_unless($attachment->ticket_id === $ticket->id, 404);
        if (Storage::disk($attachment->disk)->exists($attachment->path)
            && ! Storage::disk($attachment->disk)->delete($attachment->path)) {
            throw new RuntimeException("Não foi possível remover o anexo {$attachment->id}.");
        }
        $attachment->delete();

        return response()->json(['message' => 'Anexo removido.']);
    }
}
