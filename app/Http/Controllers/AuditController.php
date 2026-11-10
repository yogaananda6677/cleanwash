<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Services\AuditLogService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AuditController extends Controller
{
    public function __construct(
        private readonly AuditLogService $auditLogService
    ) {}

    public function index(Request $request): Response
    {
        $this->authorize('audit.viewAny');

        $availableActions = $this->auditLogService->getAvailableActions();

        $search = trim((string) $request->query('search', ''));
        $rawAction = strtoupper(trim((string) $request->query('action', '')));
        $action = in_array($rawAction, $availableActions, true) ? $rawAction : '';
        $rawRole = strtoupper(trim((string) $request->query('actor_role', '')));
        $actorRole = in_array($rawRole, UserRole::values(), true) ? $rawRole : '';

        $filters = [
            'search' => $search,
            'action' => $action,
            'actor_role' => $actorRole,
        ];

        return Inertia::render('Audit/Index', [
            'logs' => $this->auditLogService->paginateLogs($filters),
            'filters' => $filters,
            'availableActions' => $availableActions,
            'piutangSummary' => $this->auditLogService->getPiutangSummary(),
        ]);
    }
}
