'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
    Plus, FileText, Trash2, Star, StarOff, Clock,
    Briefcase, GraduationCap, Wrench
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MAX_RESUMES_PER_USER } from '@/models/Resume';
import { useTranslations } from 'next-intl';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ResumeListItem {
    _id:                string;
    title:              string;
    direction:          'ltr' | 'rtl';
    isDefault:          boolean;
    templateId:         string;
    pdfUrl?:            string;
    isPdfStale:         boolean;
    experienceCount:    number;
    educationCount:     number;
    skillCount:         number;
    languageCount:      number;
    certificationCount: number;
    createdAt:          string;
    updatedAt:          string;
}

interface ListMeta {
    count:      number;
    maxAllowed: number;
    canCreate:  boolean;
}

// ─── New Resume Modal ─────────────────────────────────────────────────────────

interface NewResumeModalProps {
    onClose:  () => void;
    onCreate: (title: string, direction: 'ltr' | 'rtl') => Promise<void>;
    isCreating: boolean;
}

function NewResumeModal({ onClose, onCreate, isCreating }: NewResumeModalProps) {
    const [title,     setTitle]     = useState('');
    const [direction, setDirection] = useState<'ltr' | 'rtl'>('ltr');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onCreate(title.trim() || 'My Resume', direction);
    };

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                <h2 id="modal-title" className="text-xl font-bold text-gray-900 mb-5">
                    Create New Resume
                </h2>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label htmlFor="resume-title" className="block text-sm font-semibold text-gray-700 mb-1">
                            Resume Title
                        </label>
                        <input
                            id="resume-title"
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder='e.g. "Software Engineer CV" or "Frontend Developer"'
                            maxLength={100}
                            autoFocus
                            className="block w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            aria-describedby="title-hint"
                        />
                        <p id="title-hint" className="mt-1 text-xs text-gray-400">
                            This is private — only you see it. Helps you tell your resumes apart.
                        </p>
                    </div>

                    <div>
                        <p className="text-sm font-semibold text-gray-700 mb-2">Resume Language</p>
                        <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Resume language direction">
                            {(['ltr', 'rtl'] as const).map((dir) => (
                                <label
                                    key={dir}
                                    className={cn(
                                        'flex flex-col items-center gap-1 p-4 rounded-xl border-2 cursor-pointer transition-colors',
                                        direction === dir
                                            ? 'border-blue-600 bg-blue-50 text-blue-700'
                                            : 'border-gray-200 hover:border-gray-300 text-gray-600'
                                    )}
                                >
                                    <input
                                        type="radio"
                                        name="direction"
                                        value={dir}
                                        checked={direction === dir}
                                        onChange={() => setDirection(dir)}
                                        className="sr-only"
                                    />
                                    <span className="text-2xl" aria-hidden="true">
                                        {dir === 'ltr' ? '🇬🇧' : '🇪🇬'}
                                    </span>
                                    <span className="text-sm font-medium">
                                        {dir === 'ltr' ? 'English (LTR)' : 'العربية (RTL)'}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold text-sm hover:border-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isCreating}
                            aria-busy={isCreating}
                            className="flex-1 px-4 py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 transition-colors"
                        >
                            {isCreating ? 'Creating…' : 'Create Resume'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Resume card ──────────────────────────────────────────────────────────────

interface ResumeCardProps {
    resume:       ResumeListItem;
    onDelete:     (id: string, title: string) => void;
    onSetDefault: (id: string) => void;
}

function ResumeCard({ resume, onDelete, onSetDefault }: ResumeCardProps) {
    const updatedAgo = formatRelativeTime(resume.updatedAt);

    return (
        <article
            aria-label={`Resume: ${resume.title}${resume.isDefault ? ' (default)' : ''}`}
            className={cn(
                'bg-white rounded-2xl border-2 shadow-sm p-6 transition-shadow hover:shadow-md',
                resume.isDefault ? 'border-blue-400' : 'border-gray-200'
            )}
        >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                    <h2 className="text-base font-bold text-gray-900 truncate">{resume.title}</h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                        {resume.direction === 'rtl' ? 'Arabic (RTL)' : 'English (LTR)'} · Classic template
                    </p>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                    {/* Set as default */}
                    <button
                        type="button"
                        onClick={() => onSetDefault(resume._id)}
                        disabled={resume.isDefault}
                        aria-label={resume.isDefault ? 'This is your default resume' : `Set "${resume.title}" as default resume`}
                        aria-pressed={resume.isDefault}
                        className={cn(
                            'p-2 rounded-lg transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500',
                            resume.isDefault
                                ? 'text-yellow-500 bg-yellow-50 cursor-default'
                                : 'text-gray-300 hover:text-yellow-400 hover:bg-yellow-50'
                        )}
                    >
                        {resume.isDefault
                            ? <Star className="h-4 w-4 fill-current" aria-hidden="true" />
                            : <StarOff className="h-4 w-4" aria-hidden="true" />
                        }
                    </button>

                    {/* Delete */}
                    <button
                        type="button"
                        onClick={() => onDelete(resume._id, resume.title)}
                        aria-label={`Delete resume: ${resume.title}`}
                        className={cn(
                            'p-2 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500',
                            'min-h-[40px] min-w-[40px] flex items-center justify-center',
                        )}
                    >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div
                className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400 mb-4"
                aria-label="Resume content summary"
            >
                <span className="flex items-center gap-1">
                    <Briefcase className="h-3 w-3" aria-hidden="true" />
                    {resume.experienceCount} experience{resume.experienceCount !== 1 ? 's' : ''}
                </span>
                <span className="flex items-center gap-1">
                    <GraduationCap className="h-3 w-3" aria-hidden="true" />
                    {resume.educationCount} education
                </span>
                <span className="flex items-center gap-1">
                    <Wrench className="h-3 w-3" aria-hidden="true" />
                    {resume.skillCount} skills
                </span>
            </div>

            {/* Updated time + PDF stale warning */}
            <div className="flex items-center gap-2 text-xs text-gray-400 mb-5">
                <Clock className="h-3 w-3" aria-hidden="true" />
                <span>Edited {updatedAgo}</span>
                {resume.isPdfStale && resume.pdfUrl && (
                    <span className="text-amber-500 font-medium">(PDF needs regeneration)</span>
                )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
                <Link
                    href={`/resume/${resume._id}/edit`}
                    className={cn(
                        'flex-1 text-center px-4 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm',
                        'hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600',
                        'transition-colors'
                    )}
                    aria-label={`Edit resume: ${resume.title}`}
                >
                    Edit
                </Link>

                {resume.pdfUrl && (
                    <a
                        href={resume.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Download PDF for resume: ${resume.title} (opens in new tab)`}
                        className={cn(
                            'flex items-center gap-1.5 px-4 py-2.5 rounded-xl border-2 border-gray-200',
                            'text-gray-600 font-semibold text-sm hover:border-gray-300 hover:bg-gray-50',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400',
                            'transition-colors'
                        )}
                    >
                        <FileText className="h-4 w-4" aria-hidden="true" />
                        PDF
                    </a>
                )}
            </div>
        </article>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MyResumesPage() {
    const { status } = useSession();
    const router     = useRouter();

    const [resumes,     setResumes]     = useState<ResumeListItem[]>([]);
    const [meta,        setMeta]        = useState<ListMeta | null>(null);
    const [isLoading,   setIsLoading]   = useState(true);
    const [error,       setError]       = useState<string | null>(null);
    const [showModal,   setShowModal]   = useState(false);
    const [isCreating,  setIsCreating]  = useState(false);
    const [liveMessage, setLiveMessage] = useState('');

    // ── Auth guard ─────────────────────────────────────────────────────────────
    useEffect(() => {
        if (status === 'unauthenticated') router.push('/auth/signin');
    }, [status, router]);

    // ── Fetch resumes ──────────────────────────────────────────────────────────
    const fetchResumes = useCallback(async () => {
        try {
            const res  = await fetch('/api/resumes', { cache: 'no-store' });
            const json = await res.json();
            if (!json.success) throw new Error(json.error?.message);
            setResumes(json.data.resumes);
            setMeta(json.data.meta);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load resumes');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { fetchResumes(); }, [fetchResumes]);

    // ── Create ─────────────────────────────────────────────────────────────────
    const handleCreate = async (title: string, direction: 'ltr' | 'rtl') => {
        setIsCreating(true);
        try {
            const res  = await fetch('/api/resumes', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ title, direction }),
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error?.message);

            setShowModal(false);
            const newId = json.data.resume._id;
            router.push(`/resume/${newId}/edit`);
        } catch (err) {
            setLiveMessage(err instanceof Error ? err.message : 'Failed to create resume');
        } finally {
            setIsCreating(false);
        }
    };

    // ── Delete ─────────────────────────────────────────────────────────────────
    const handleDelete = async (id: string, title: string) => {
        if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;

        try {
            const res  = await fetch(`/api/resumes/${id}`, { method: 'DELETE' });
            const json = await res.json();
            if (!json.success) throw new Error(json.error?.message);

            setLiveMessage(`Resume "${title}" deleted.`);
            fetchResumes();
        } catch (err) {
            setLiveMessage(`Failed to delete: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
    };

    // ── Set default ────────────────────────────────────────────────────────────
    const handleSetDefault = async (id: string) => {
        try {
            const res  = await fetch(`/api/resumes/${id}/default`, { method: 'PATCH' });
            const json = await res.json();
            if (!json.success) throw new Error(json.error?.message);

            const title = resumes.find((r) => r._id === id)?.title ?? 'Resume';
            setLiveMessage(`"${title}" is now your default resume.`);
            fetchResumes();
        } catch (err) {
            setLiveMessage(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
    };

    return (
        <main id="main-content" className="min-h-screen bg-gray-50 py-8">
            {/* SR live region for action feedback */}
            <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
                {liveMessage}
            </div>

            <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="flex items-start justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">My Resumes</h1>
                        <p className="text-sm text-gray-500 mt-1">
                            {meta ? `${meta.count} of ${meta.maxAllowed} resumes used` : ''}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => setShowModal(true)}
                        disabled={!meta?.canCreate}
                        aria-label={
                            !meta?.canCreate
                                ? `Resume limit reached (${MAX_RESUMES_PER_USER} maximum)`
                                : 'Create a new resume'
                        }
                        className={cn(
                            'flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm text-white',
                            'bg-blue-600 hover:bg-blue-700 transition-colors',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2',
                            'disabled:opacity-50 disabled:cursor-not-allowed',
                        )}
                    >
                        <Plus className="h-4 w-4" aria-hidden="true" />
                        New Resume
                    </button>
                </div>

                {/* Content */}
                {isLoading ? (
                    <div className="flex justify-center py-16">
                        <div
                            className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full"
                            role="status"
                            aria-label="Loading your resumes…"
                        />
                    </div>
                ) : error ? (
                    <div role="alert" className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
                        <p className="text-red-600 font-medium">{error}</p>
                    </div>
                ) : resumes.length === 0 ? (
                    <div className="text-center py-20 rounded-2xl border-2 border-dashed border-gray-200 bg-white">
                        <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" aria-hidden="true" />
                        <h2 className="text-lg font-semibold text-gray-700 mb-2">No resumes yet</h2>
                        <p className="text-sm text-gray-400 mb-6">
                            Create your first accessible resume and export it as a tagged PDF.
                        </p>
                        <button
                            type="button"
                            onClick={() => setShowModal(true)}
                            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 transition-colors"
                        >
                            Create My First Resume
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {resumes.map((resume) => (
                            <ResumeCard
                                key={resume._id}
                                resume={resume}
                                onDelete={handleDelete}
                                onSetDefault={handleSetDefault}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* New Resume Modal */}
            {showModal && (
                <NewResumeModal
                    onClose={()       => setShowModal(false)}
                    onCreate={handleCreate}
                    isCreating={isCreating}
                />
            )}
        </main>
    );
}

function formatRelativeTime(isoString: string): string {
    const diff    = Date.now() - new Date(isoString).getTime();
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60)   return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
}
