'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    CheckCircle, XCircle, Clock, GraduationCap, User,
    ChevronRight, Loader2, AlertTriangle, X,
} from 'lucide-react';

interface Course {
    _id: string;
    title: string;
    trainerName: string;
    createdAt: string;
}

type PaymentType = 'COMMISSION' | 'CASH';
type ModalMode = 'approve' | 'reject' | null;

export default function CourseApprovalClient({ courses: initialCourses }: { courses: Course[] }) {
    const router = useRouter();

    // ── Local list state (optimistic removal after action) ───────────────────
    const [courses, setCourses] = useState<Course[]>(initialCourses);

    // ── Modal state ──────────────────────────────────────────────────────────
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [modalMode, setModalMode] = useState<ModalMode>(null);

    // ── Contract form state ──────────────────────────────────────────────────
    const [paymentType, setPaymentType] = useState<PaymentType>('COMMISSION');
    const [commissionRate, setCommissionRate] = useState<number>(20);
    const [durationMonths, setDurationMonths] = useState<number>(12);
    const [isLifetime, setIsLifetime] = useState<boolean>(false);
    const [rejectReason, setRejectReason] = useState<string>('');

    // ── Async state ──────────────────────────────────────────────────────────
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successId, setSuccessId] = useState<string | null>(null);

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    const openModal = (course: Course, mode: ModalMode) => {
        setSelectedCourse(course);
        setModalMode(mode);
        setError(null);
        setSuccessId(null);
        // Reset form to defaults when opening a new review
        setPaymentType('COMMISSION');
        setCommissionRate(20);
        setDurationMonths(12);
        setIsLifetime(false);
        setRejectReason('');
    };

    const closeModal = () => {
        if (isLoading) return;
        setSelectedCourse(null);
        setModalMode(null);
        setError(null);
    };

    /** Remove a course from the local list and refresh RSC data in background */
    const removeAndRefresh = (courseId: string) => {
        setCourses((prev) => prev.filter((c) => c._id !== courseId));
        setSuccessId(courseId);
        setTimeout(() => router.refresh(), 800);
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Actions
    // ─────────────────────────────────────────────────────────────────────────

    const handleApprove = async () => {
        if (!selectedCourse) return;
        setIsLoading(true);
        setError(null);

        try {
            const body: Record<string, unknown> = { paymentType };

            if (paymentType === 'COMMISSION') {
                body.commissionRate = commissionRate / 100; // API expects 0–1
                // Lifetime contract → send null so the API skips duration validation
                body.durationMonths = isLifetime ? null : durationMonths;
            }

            const res = await fetch(`/api/admin/courses/${selectedCourse._id}/approve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to approve course');

            removeAndRefresh(selectedCourse._id);
            closeModal();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleReject = async () => {
        if (!selectedCourse) return;
        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch(`/api/admin/courses/${selectedCourse._id}/reject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: rejectReason }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to reject course');

            removeAndRefresh(selectedCourse._id);
            closeModal();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────────────────────────────────────

    if (courses.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center">
                <CheckCircle className="h-16 w-16 text-emerald-400 mb-4" aria-hidden="true" />
                <h2 className="text-xl font-semibold text-gray-800">All Clear!</h2>
                <p className="mt-2 text-gray-500 max-w-sm">
                    No courses pending approval. All clear!
                </p>
            </div>
        );
    }

    return (
        <>
            {/* ── Course List ───────────────────────────────────────────── */}
            <div className="space-y-4">
                {courses.map((course) => (
                    <div
                        key={course._id}
                        className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all duration-300 ${
                            successId === course._id
                                ? 'opacity-0 scale-95 pointer-events-none'
                                : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                        }`}
                    >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5">
                            {/* Course info */}
                            <div className="flex items-start gap-4 min-w-0">
                                <div className="shrink-0 flex h-11 w-11 items-center justify-center rounded-full bg-amber-100">
                                    <Clock className="h-5 w-5 text-amber-600" aria-hidden="true" />
                                </div>
                                <div className="min-w-0">
                                    <p className="font-semibold text-gray-900 truncate" title={course.title}>
                                        {course.title}
                                    </p>
                                    <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-500">
                                        <span className="flex items-center gap-1">
                                            <User className="h-3.5 w-3.5" aria-hidden="true" />
                                            {course.trainerName}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
                                            Submitted {new Date(course.createdAt).toLocaleDateString('en-US', {
                                                day: 'numeric', month: 'short', year: 'numeric',
                                            })}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                                {/* Reject */}
                                <button
                                    onClick={() => openModal(course, 'reject')}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 hover:border-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 transition-colors"
                                    aria-label={`Reject course: ${course.title}`}
                                >
                                    <XCircle className="h-4 w-4" aria-hidden="true" />
                                    Reject
                                </button>

                                {/* Review & Approve */}
                                <button
                                    onClick={() => openModal(course, 'approve')}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 transition-colors"
                                    aria-label={`Review and approve course: ${course.title}`}
                                >
                                    <CheckCircle className="h-4 w-4" aria-hidden="true" />
                                    Review &amp; Approve
                                    <ChevronRight className="h-4 w-4 opacity-70" aria-hidden="true" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Approval / Reject Modal ───────────────────────────────── */}
            {selectedCourse && modalMode && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="modal-title"
                >
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
                        onClick={closeModal}
                        aria-hidden="true"
                    />

                    {/* Panel */}
                    <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
                        {/* Header */}
                        <div className={`px-6 py-5 border-b border-gray-100 flex items-center justify-between ${
                            modalMode === 'approve' ? 'bg-emerald-50' : 'bg-red-50'
                        }`}>
                            <div className="flex items-center gap-3">
                                {modalMode === 'approve'
                                    ? <CheckCircle className="h-5 w-5 text-emerald-600" aria-hidden="true" />
                                    : <XCircle    className="h-5 w-5 text-red-600"     aria-hidden="true" />
                                }
                                <h3 id="modal-title" className="text-base font-semibold text-gray-900 truncate max-w-[280px]">
                                    {modalMode === 'approve' ? 'Review & Approve' : 'Reject Course'}: {selectedCourse.title}
                                </h3>
                            </div>
                            <button
                                onClick={closeModal}
                                disabled={isLoading}
                                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 disabled:opacity-50"
                                aria-label="Close modal"
                            >
                                <X className="h-5 w-5" aria-hidden="true" />
                            </button>
                        </div>

                        <div className="px-6 py-5 space-y-5">
                            {/* ── Error banner ── */}
                            {error && (
                                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                                    {error}
                                </div>
                            )}

                            {/* ── APPROVE: Contract Setup ── */}
                            {modalMode === 'approve' && (
                                <div className="space-y-4">
                                    {/* Payment type */}
                                    <div>
                                        <label htmlFor="payment-type" className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Contract Type
                                        </label>
                                        <select
                                            id="payment-type"
                                            value={paymentType}
                                            onChange={(e) => setPaymentType(e.target.value as PaymentType)}
                                            className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                        >
                                            <option value="COMMISSION">Commission (platform takes a %)</option>
                                            <option value="CASH">Cash / No Commission</option>
                                        </select>
                                    </div>

                                    {/* Commission-specific fields */}
                                    {paymentType === 'COMMISSION' && (
                                        <>
                                            {/* Commission Rate */}
                                            <div>
                                                <label htmlFor="commission-rate" className="block text-sm font-semibold text-gray-700 mb-1.5">
                                                    Commission Rate (%)
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        id="commission-rate"
                                                        type="number"
                                                        min={1}
                                                        max={100}
                                                        value={commissionRate}
                                                        onChange={(e) => setCommissionRate(Math.min(100, Math.max(1, Number(e.target.value))))}
                                                        className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 pr-10 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                                    />
                                                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">%</span>
                                                </div>
                                            </div>

                                            {/* Duration */}
                                            <div>
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <label htmlFor="duration-months" className="text-sm font-semibold text-gray-700">
                                                        Duration (months)
                                                    </label>
                                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                                        <input
                                                            type="checkbox"
                                                            id="lifetime-checkbox"
                                                            checked={isLifetime}
                                                            onChange={(e) => setIsLifetime(e.target.checked)}
                                                            className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                                        />
                                                        <span className="text-sm text-gray-600 font-medium">Lifetime</span>
                                                    </label>
                                                </div>
                                                <input
                                                    id="duration-months"
                                                    type="number"
                                                    min={1}
                                                    value={durationMonths}
                                                    onChange={(e) => setDurationMonths(Math.max(1, Number(e.target.value)))}
                                                    disabled={isLifetime}
                                                    className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
                                                />
                                                {isLifetime && (
                                                    <p className="mt-1.5 text-xs text-emerald-700 font-medium">
                                                        ✓ Contract will never expire
                                                    </p>
                                                )}
                                            </div>

                                            {/* Live summary */}
                                            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 space-y-0.5">
                                                <p className="font-semibold">Contract Summary</p>
                                                <p>Platform takes <strong>{commissionRate}%</strong> of each sale</p>
                                                <p>Duration: <strong>{isLifetime ? 'Lifetime (no expiry)' : `${durationMonths} months`}</strong></p>
                                            </div>
                                        </>
                                    )}

                                    {paymentType === 'CASH' && (
                                        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                                            <p className="font-semibold">Cash Contract</p>
                                            <p className="mt-0.5 text-blue-700">No commission — trainer receives 100% of sales. Flat fee was paid separately.</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── REJECT: Reason ── */}
                            {modalMode === 'reject' && (
                                <div>
                                    <label htmlFor="reject-reason" className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        Rejection Reason <span className="text-gray-400 font-normal">(optional)</span>
                                    </label>
                                    <textarea
                                        id="reject-reason"
                                        rows={4}
                                        value={rejectReason}
                                        onChange={(e) => setRejectReason(e.target.value)}
                                        placeholder="Explain why the course is being rejected so the trainer can improve it..."
                                        className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                                    />
                                    <p className="mt-1.5 text-xs text-gray-500">
                                        This reason will be stored on the course record.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                            <button
                                onClick={closeModal}
                                disabled={isLoading}
                                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 disabled:opacity-50 transition-colors"
                            >
                                Cancel
                            </button>

                            {modalMode === 'approve' && (
                                <button
                                    onClick={handleApprove}
                                    disabled={isLoading}
                                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                                >
                                    {isLoading
                                        ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Approving…</>
                                        : <><CheckCircle className="h-4 w-4" aria-hidden="true" /> Approve &amp; Publish</>
                                    }
                                </button>
                            )}

                            {modalMode === 'reject' && (
                                <button
                                    onClick={handleReject}
                                    disabled={isLoading}
                                    className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                                >
                                    {isLoading
                                        ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Rejecting…</>
                                        : <><XCircle className="h-4 w-4" aria-hidden="true" /> Confirm Rejection</>
                                    }
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
