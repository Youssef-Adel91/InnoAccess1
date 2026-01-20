'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Upload, FileText, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface CVUploadDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (cvUrl: string, coverLetter?: string) => Promise<void>;
}

export default function CVUploadDialog({ isOpen, onClose, onSubmit }: CVUploadDialogProps) {
    const [cvFile, setCvFile] = useState<File | null>(null);
    const [cvUrl, setCvUrl] = useState('');
    const [coverLetter, setCoverLetter] = useState('');
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Focus management refs
    const dialogRef = useRef<HTMLDivElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const firstFocusableRef = useRef<HTMLInputElement>(null);
    const lastFocusableRef = useRef<HTMLButtonElement>(null);

    // Trap focus within dialog
    useEffect(() => {
        if (!isOpen) return;

        // Focus first element when dialog opens
        const timer = setTimeout(() => {
            firstFocusableRef.current?.focus();
        }, 100);

        // Handle Escape key
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !uploading && !submitting) {
                onClose();
            }
        };

        // Trap Tab key
        const handleTab = (e: KeyboardEvent) => {
            if (e.key !== 'Tab') return;

            const focusableElements = dialogRef.current?.querySelectorAll(
                'button:not([disabled]), input:not([disabled]), textarea:not([disabled])'
            );

            if (!focusableElements || focusableElements.length === 0) return;

            const first = focusableElements[0] as HTMLElement;
            const last = focusableElements[focusableElements.length - 1] as HTMLElement;

            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        };

        document.addEventListener('keydown', handleEscape);
        document.addEventListener('keydown', handleTab);

        return () => {
            clearTimeout(timer);
            document.removeEventListener('keydown', handleEscape);
            document.removeEventListener('keydown', handleTab);
        };
    }, [isOpen, onClose, uploading, submitting]);

    // Prevent page closure during upload
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (uploading || submitting) {
                e.preventDefault();
                e.returnValue = ''; // Shows browser warning
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [uploading, submitting]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (!validTypes.includes(file.type)) {
            setUploadError('Please upload a PDF or Word document');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            setUploadError('File size must be less than 5MB');
            return;
        }

        setCvFile(file);
        setUploadError('');

        setCvUrl(''); // Clear previous URL if any

        setUploading(true);
        try {
            // Upload to Vercel Blob - THE CORRECT SOLUTION
            const formData = new FormData();
            formData.append('cv', file);

            console.log('📤 Starting Vercel Blob upload...');
            console.log('🔍 File:', file.name, file.type, file.size);

            // Import and call server action
            const { uploadCVToBlob } = await import('@/app/actions/uploadCV');
            const uniqueId = `user_${Date.now()}`;

            console.log('🚀 Calling uploadCVToBlob with ID:', uniqueId);
            const result = await uploadCVToBlob(formData, uniqueId);

            console.log('📥 Upload result:', result);

            if (result.error) {
                console.error('❌ Upload error:', result.error);
                setUploadError(result.error);
                setCvFile(null);
                return;
            }

            if (!result.url) {
                console.error('❌ No URL in result');
                setUploadError('Upload succeeded but no URL returned');
                setCvFile(null);
                return;
            }

            console.log('✅ Upload successful! URL:', result.url);
            setCvUrl(result.url);
        } catch (error: any) {
            console.error('💥 Upload exception:', error);
            console.error('Stack:', error.stack);
            setUploadError(error.message || 'Failed to upload CV');
            setCvFile(null);
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!cvUrl && !cvFile) {
            setUploadError('Please upload your CV');
            return;
        }

        setSubmitting(true);
        try {
            await onSubmit(cvUrl || `local-file-${cvFile?.name}`, coverLetter);
            // Reset form
            setCvFile(null);
            setCvUrl('');
            setCoverLetter('');
        } catch (error) {
            console.error('Submit error:', error);
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black bg-opacity-50 z-40"
                onClick={() => !uploading && !submitting && onClose()}
                aria-hidden="true"
            />

            {/* Dialog */}
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="dialog-title"
                aria-describedby="dialog-description"
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
                <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-200">
                        <h2 id="dialog-title" className="text-xl font-semibold text-gray-900">
                            Submit Application
                        </h2>
                        <button
                            ref={closeButtonRef}
                            onClick={onClose}
                            disabled={uploading || submitting}
                            className="text-gray-400 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
                            aria-label="Close dialog"
                        >
                            <X className="h-6 w-6" aria-hidden="true" />
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        <p id="dialog-description" className="text-sm text-gray-600">
                            Upload your CV and optionally include a cover letter to apply for this position.
                        </p>

                        {/* CV Upload */}
                        <div>
                            <label htmlFor="cv-upload" className="block text-sm font-medium text-gray-700 mb-2">
                                Resume/CV * (PDF or Word, max 5MB)
                            </label>
                            <input
                                ref={firstFocusableRef}
                                id="cv-upload"
                                type="file"
                                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                onChange={handleFileChange}
                                disabled={uploading || submitting}
                                className="block w-full text-sm text-gray-500 
                                    file:mr-4 file:py-2 file:px-4 
                                    file:rounded-md file:border-0 
                                    file:text-sm file:font-semibold 
                                    file:bg-blue-50 file:text-blue-700 
                                    hover:file:bg-blue-100
                                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600
                                    disabled:opacity-50 disabled:cursor-not-allowed"
                                aria-required="true"
                                aria-invalid={!!uploadError}
                                aria-describedby={uploadError ? 'cv-error' : 'cv-help'}
                            />
                            <p id="cv-help" className="mt-1 text-xs text-gray-500">
                                Upload your resume in PDF or Word format
                            </p>
                            {uploadError && (
                                <p id="cv-error" className="mt-1 text-sm text-red-600" role="alert">
                                    {uploadError}
                                </p>
                            )}

                            {/* Upload Status */}
                            {uploading && (
                                <div className="mt-3 flex items-center text-blue-600">
                                    <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full mr-2" aria-hidden="true" />
                                    <span className="text-sm">Uploading CV...</span>
                                </div>
                            )}

                            {cvFile && !uploading && (
                                <div className="mt-3 flex items-center text-green-600">
                                    <CheckCircle className="h-4 w-4 mr-2" aria-hidden="true" />
                                    <span className="text-sm flex items-center">
                                        <FileText className="h-4 w-4 mr-1" aria-hidden="true" />
                                        {cvFile.name}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Cover Letter */}
                        <div>
                            <label htmlFor="cover-letter" className="block text-sm font-medium text-gray-700 mb-2">
                                Cover Letter (Optional)
                            </label>
                            <textarea
                                id="cover-letter"
                                rows={6}
                                value={coverLetter}
                                onChange={(e) => setCoverLetter(e.target.value)}
                                disabled={uploading || submitting}
                                maxLength={2000}
                                className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm 
                                    focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500
                                    disabled:opacity-50 disabled:cursor-not-allowed"
                                placeholder="Tell us why you're interested in this position..."
                                aria-describedby="cover-letter-help"
                            />
                            <p id="cover-letter-help" className="mt-1 text-xs text-gray-500">
                                {coverLetter.length}/2000 characters
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={onClose}
                                disabled={uploading || submitting}
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                variant="primary"
                                disabled={!cvUrl && !cvFile || uploading || submitting}
                                isLoading={submitting}
                                className="flex-1"
                            >
                                {submitting ? 'Submitting...' : 'Submit Application'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}
