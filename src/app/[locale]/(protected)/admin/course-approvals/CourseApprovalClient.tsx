'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

interface Course {
    _id: string;
    title: string;
    trainerName: string;
    createdAt: string;
}

export default function CourseApprovalClient({ courses }: { courses: Course[] }) {
    const t = useTranslations('AdminCourseApprovals');
    const router = useRouter();

    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [paymentType, setPaymentType] = useState<'COMMISSION' | 'CASH'>('COMMISSION');
    const [commissionRate, setCommissionRate] = useState<number>(25);
    const [durationMonths, setDurationMonths] = useState<number>(12);
    const [isLifetime, setIsLifetime] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleApprove = async () => {
        if (!selectedCourse) return;

        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch(`/api/admin/courses/${selectedCourse._id}/approve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    paymentType,
                    commissionRate: paymentType === 'COMMISSION' ? commissionRate / 100 : 0,
                    durationMonths: paymentType === 'COMMISSION' ? (isLifetime ? null : durationMonths) : undefined,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Failed to approve course');
            }

            setSelectedCourse(null);
            router.refresh(); // Refresh the page to remove the approved course from the list
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('courseTitle')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('trainer')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('submittedAt')}</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {courses.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                                    {t('noCoursesPending')}
                                </td>
                            </tr>
                        )}
                        {courses.map((course) => (
                            <tr key={course._id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{course.title}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{course.trainerName}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(course.createdAt).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button
                                        onClick={() => setSelectedCourse(course)}
                                        className="text-blue-600 hover:text-blue-900 font-semibold"
                                    >
                                        {t('reviewAndApprove')}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Approval Modal */}
            {selectedCourse && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
                        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setSelectedCourse(null)} />

                        <div className="relative inline-block w-full max-w-md p-6 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
                            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                                {t('approveCourse')}: {selectedCourse.title}
                            </h3>

                            {error && <div className="mb-4 text-sm text-red-600">{error}</div>}

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('contractType')}</label>
                                    <select
                                        value={paymentType}
                                        onChange={(e) => setPaymentType(e.target.value as 'COMMISSION' | 'CASH')}
                                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    >
                                        <option value="COMMISSION">{t('commission')}</option>
                                        <option value="CASH">{t('cashNoCommission')}</option>
                                    </select>
                                </div>

                                {paymentType === 'COMMISSION' && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('commissionRate')} (%)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={commissionRate}
                                                onChange={(e) => setCommissionRate(Number(e.target.value))}
                                                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                            />
                                        </div>
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="block text-sm font-medium text-gray-700">{t('durationMonths')}</label>
                                            <div className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    id="lifetime-checkbox"
                                                    checked={isLifetime}
                                                    onChange={(e) => setIsLifetime(e.target.checked)}
                                                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                                                />
                                                <label htmlFor="lifetime-checkbox" className="ms-2 text-sm font-medium text-gray-700">Lifetime Contract</label>
                                            </div>
                                        </div>
                                        <input
                                            type="number"
                                            min="1"
                                            value={durationMonths}
                                            onChange={(e) => setDurationMonths(Number(e.target.value))}
                                            disabled={isLifetime}
                                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:opacity-50 disabled:bg-gray-100"
                                        />
                                    </>
                                )}
                            </div>

                            <div className="mt-6 flex justify-end space-x-3 rtl:space-x-reverse">
                                <button
                                    onClick={() => setSelectedCourse(null)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                                    disabled={isLoading}
                                >
                                    {t('cancel')}
                                </button>
                                <button
                                    onClick={handleApprove}
                                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                                    disabled={isLoading}
                                >
                                    {isLoading ? t('approving') : t('approve')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
