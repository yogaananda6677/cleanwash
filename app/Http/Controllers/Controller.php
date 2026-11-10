<?php

namespace App\Http\Controllers;

use Closure;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

abstract class Controller
{
    use AuthorizesRequests;

    /**
     * Run a state-mutating action and convert domain ValidationException into flash + error bag for Inertia/web requests.
     */
    protected function executeWithFlashRedirect(
        Request $request,
        Closure $action,
        string $fallbackRoute,
        string $successMessage
    ): RedirectResponse {
        try {
            $action();
        } catch (ValidationException $exception) {
            if ($request->expectsJson()) {
                throw $exception;
            }

            $firstMessage = collect($exception->errors())->flatten()->first() ?? $exception->getMessage();

            return redirect()
                ->back(fallback: route($fallbackRoute))
                ->with('error', $firstMessage)
                ->withErrors($exception->errors());
        }

        return redirect()
            ->route($fallbackRoute)
            ->with('success', $successMessage);
    }
}
