'use client';

import { useState, useCallback } from 'react';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

export interface UploadState {
    /** Current progress percentage (0–100). Only meaningful when status === 'uploading'. */
    progress: number;
    /** Current phase of the upload lifecycle. */
    status: UploadStatus;
    /** The public URL returned by the server after a successful upload. */
    uploadedUrl: string | null;
    /** Error message if status === 'error'. */
    errorMessage: string | null;
}

export interface UseFileUploadReturn extends UploadState {
    /**
     * Initiates the file upload using XHR (required for progress tracking).
     *
     * @param file     - The File object to upload.
     * @param endpoint - The API endpoint URL (e.g. '/api/blob/upload?filename=…').
     * @param headers  - Optional additional request headers.
     * @returns        - Resolves with the public URL on success, rejects on failure.
     */
    upload: (file: File, endpoint: string, headers?: Record<string, string>) => Promise<string>;
    /** Resets all state back to 'idle' so the component can re-use the hook. */
    reset: () => void;
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

/**
 * useFileUpload
 *
 * A React hook that uploads a file via XMLHttpRequest, providing real-time
 * progress tracking via XHR's native `upload.onprogress` event.
 *
 * Why XHR instead of fetch()?
 *   The Fetch API does not expose upload progress. XHR's XMLHttpRequestUpload
 *   interface fires `progress` events that allow us to compute percentage.
 *
 * Accessibility contract:
 *   The returned `progress` and `status` values are intended to be wired into
 *   a `role="progressbar"` element and an `aria-live="polite"` region in the
 *   consuming component (see UploadProgressBar.tsx).
 */
export function useFileUpload(): UseFileUploadReturn {
    const [state, setState] = useState<UploadState>({
        progress:     0,
        status:       'idle',
        uploadedUrl:  null,
        errorMessage: null,
    });

    const reset = useCallback(() => {
        setState({ progress: 0, status: 'idle', uploadedUrl: null, errorMessage: null });
    }, []);

    const upload = useCallback(
        (file: File, endpoint: string, headers: Record<string, string> = {}): Promise<string> => {
            return new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();

                // ── Progress tracking ────────────────────────────────────────
                xhr.upload.addEventListener('progress', (event: ProgressEvent) => {
                    if (event.lengthComputable) {
                        const pct = Math.round((event.loaded / event.total) * 100);
                        setState(prev => ({ ...prev, status: 'uploading', progress: pct }));
                    }
                });

                // ── Success ──────────────────────────────────────────────────
                xhr.addEventListener('load', () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        try {
                            const data = JSON.parse(xhr.responseText) as { url?: string };
                            if (!data.url) {
                                throw new Error('Server response missing "url" field.');
                            }
                            setState({
                                progress:     100,
                                status:       'success',
                                uploadedUrl:  data.url,
                                errorMessage: null,
                            });
                            resolve(data.url);
                        } catch (parseError) {
                            const msg = 'Upload succeeded but server response was invalid.';
                            setState({ progress: 0, status: 'error', uploadedUrl: null, errorMessage: msg });
                            reject(new Error(msg));
                        }
                    } else {
                        let msg = `Upload failed (HTTP ${xhr.status}).`;
                        try {
                            const errData = JSON.parse(xhr.responseText) as { error?: string };
                            if (errData.error) msg = errData.error;
                        } catch { /* ignore parse error on error responses */ }
                        setState({ progress: 0, status: 'error', uploadedUrl: null, errorMessage: msg });
                        reject(new Error(msg));
                    }
                });

                // ── Network error ────────────────────────────────────────────
                xhr.addEventListener('error', () => {
                    const msg = 'Network error. Please check your connection and try again.';
                    setState({ progress: 0, status: 'error', uploadedUrl: null, errorMessage: msg });
                    reject(new Error(msg));
                });

                // ── Abort ────────────────────────────────────────────────────
                xhr.addEventListener('abort', () => {
                    setState({ progress: 0, status: 'idle', uploadedUrl: null, errorMessage: null });
                    reject(new Error('Upload cancelled.'));
                });

                // ── Open connection and send ──────────────────────────────────
                xhr.open('POST', endpoint);

                // Set Content-Type so the server knows what it's receiving
                xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

                // Apply any extra headers (e.g. auth tokens if needed)
                Object.entries(headers).forEach(([key, value]) => {
                    xhr.setRequestHeader(key, value);
                });

                // Signal upload has started
                setState({ progress: 0, status: 'uploading', uploadedUrl: null, errorMessage: null });

                xhr.send(file);
            });
        },
        []
    );

    return {
        ...state,
        upload,
        reset,
    };
}
