package com.wordmind.app.ui

import kotlinx.coroutines.CancellationException

/**
 * Leaving a Compose screen cancels its coroutine scope. That is normal
 * lifecycle behavior and must not be surfaced as a user-facing error.
 */
internal fun Throwable.rethrowIfCancellation() {
    if (this is CancellationException) throw this
}
