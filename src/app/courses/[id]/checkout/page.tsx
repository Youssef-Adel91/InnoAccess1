'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { ArrowLeft, CreditCard, Smartphone, CheckCircle, Loader2 } from 'lucide-react';
import { submitManualPayment, initPaymobPayment } from '@/app/actions/payment';
import { checkEnrollment } from '@/app/actions/enrollment';
import { INSTAPAY_PHONE_NUMBER } from '@/lib/payment-constants';

interface Course {
    _id: string;
    title: string;
    description: string;
    price: number;
    isFree: boolean;
    thumbnail?: string;
}

type PaymentTab = 'paymob' | 'manual';

export default function CheckoutPage() {
    const params = useParams();
    const router = useRouter();
    const { data: session, status } = useSession();

    // In Next.js 15, params may be a Promise
    const [courseId, setCourseId] = useState<string>('');

    const [course, setCourse] = useState<Course | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<PaymentTab>('manual');
    const [isEnrolled, setIsEnrolled] = useState(false);

    // Manual payment state
    const [receipt, setReceipt] = useState<File | null>(null);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    // Paymob state
    const [paymentType, setPaymentType] = useState<'CARD' | 'WALLET'>('CARD');
    const [walletPhone, setWalletPhone] = useState('');

    // Payment verification modal state
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
    const [verifying, setVerifying] = useState(false);

    // Get courseId from params
    useEffect(() => {
        const getId = async () => {
            const id = typeof params.id === 'string' ? params.id : await params.id;
            setCourseId(id as string);
        };
        getId();
    }, [params]);

    useEffect(() => {
        if (status === 'loading' || !courseId) return;
        if (!session) {
            router.push('/auth/signin');
            return;
        }
        fetchCourse();
        checkEnrollmentStatus();
    }, [session, status, courseId]);

    const fetchCourse = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/courses/${courseId}`);
            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error?.message || 'Failed to fetch course');
            }

            const courseData = result.data?.course;

            // Redirect if free course
            if (courseData.isFree) {
                router.push(`/courses/${courseId}`);
                return;
            }

            setCourse(courseData);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const checkEnrollmentStatus = async () => {
        try {
            const result = await checkEnrollment(courseId);
            if (result.success && result.data?.isEnrolled) {
                setIsEnrolled(true);
                router.push(`/courses/${courseId}/watch`);
            }
        } catch (err) {
            console.error('Failed to check enrollment:', err);
        }
    };

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!receipt) {
            setError('Please upload a receipt screenshot');
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('receipt', receipt);
            formData.append('phoneNumber', phoneNumber);

            const result = await submitManualPayment(courseId, formData);

            if (!result.success) {
                throw new Error(result.error?.message || 'Failed to submit payment');
            }

            setSubmitted(true);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handlePaymobPayment = async () => {
        setSubmitting(true);
        setError(null);

        try {
            if (paymentType === 'WALLET' && !walletPhone) {
                throw new Error('Please enter your phone number for wallet payment');
            }

            const result = await initPaymobPayment(
                courseId,
                paymentType,
                paymentType === 'WALLET' ? walletPhone : undefined
            );

            if (!result.success) {
                throw new Error(result.error?.message || 'Failed to initialize payment');
            }

            // Store order ID for verification
            setCurrentOrderId(result.data?.orderId || null);

            // Open payment in new tab
            window.open(result.data?.paymentUrl || '', '_blank');

            // Show verification modal
            setShowPaymentModal(true);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleVerifyPayment = async () => {
        if (!currentOrderId) {
            setError('No order ID found');
            return;
        }

        setVerifying(true);
        setError(null);

        try {
            const { verifyPaymentStatus } = await import('@/app/actions/payment');
            const result = await verifyPaymentStatus(currentOrderId);

            if (!result.success) {
                throw new Error(result.error?.message || 'Payment not confirmed yet');
            }

            // Payment verified! Redirect to course
            router.push(`/courses/${courseId}/watch`);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setVerifying(false);
        }
    };

    if (status === 'loading' || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading checkout...</p>
                </div>
            </div>
        );
    }

    if (!session || error || !course) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Unable to load checkout</h2>
                    <p className="text-gray-600 mb-6">{error || 'Please try again later.'}</p>
                    <Link href="/courses" className="text-blue-600 hover:underline">
                        Back to Courses
                    </Link>
                </div>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="max-w-md w-full mx-4">
                    <div className="bg-white rounded-lg shadow-lg p-8 text-center">
                        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Submitted!</h2>
                        <p className="text-gray-600 mb-6">
                            Your payment is under review. You will be enrolled once approved by our team.
                        </p>
                        <Link href="/courses">
                            <button className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                                Browse More Courses
                            </button>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <Link href={`/courses/${courseId}`} className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-6">
                    <ArrowLeft className="h-5 w-5 mr-2" />
                    Back to Course
                </Link>

                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <div className="flex items-start space-x-4">
                        {course.thumbnail && (
                            <img
                                src={course.thumbnail}
                                alt={course.title}
                                className="w-24 h-24 object-cover rounded-lg"
                            />
                        )}
                        <div className="flex-1">
                            <h1 className="text-2xl font-bold text-gray-900 mb-2">{course.title}</h1>
                            <p className="text-3xl font-bold text-blue-600">
                                {(course.price / 100).toFixed(2)} EGP
                            </p>
                        </div>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                        <p className="text-red-800">{error}</p>
                    </div>
                )}

                {/* Payment Method Tabs */}
                <div className="border-b border-gray-200 mb-8">
                    <nav className="-mb-px flex space-x-8">
                        {/* Paymob Tab - Disabled */}
                        <button
                            type="button"
                            disabled
                            className="relative border-b-2 border-transparent py-4 px-1 text-center font-medium text-sm opacity-40 cursor-not-allowed"
                        >
                            <CreditCard className="inline-block w-5 h-5 mr-2" />
                            Paymob (Card / Wallet)
                            <span className="absolute -top-1 -right-2 bg-gray-500 text-white text-[10px] px-2 py-0.5 rounded-full shadow-sm">
                                Coming Soon
                            </span>
                        </button>

                        {/* Manual Payment Tab - Active */}
                        <button
                            type="button"
                            onClick={() => setActiveTab('manual')}
                                <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Select Payment Method
                            </label>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setPaymentType('CARD')}
                                    className={`p-4 border-2 rounded-lg transition-colors ${paymentType === 'CARD'
                                        ? 'border-blue-600 bg-blue-50'
                                        : 'border-gray-300 hover:border-gray-400'
                                        }`}
                                >
                                    <CreditCard className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                                    <p className="font-medium">Credit Card</p>
                                </button>
                                <button
                                    onClick={() => setPaymentType('WALLET')}
                                    className={`p-4 border-2 rounded-lg transition-colors ${paymentType === 'WALLET'
                                        ? 'border-blue-600 bg-blue-50'
                                        : 'border-gray-300 hover:border-gray-400'
                                        }`}
                                >
                                    <Smartphone className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                                    <p className="font-medium">Mobile Wallet</p>
                                </button>
                            </div>
                        </div>

                        {/* Wallet Phone Input */}
                        {paymentType === 'WALLET' && (
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Phone Number
                                </label>
                                <input
                                    type="tel"
                                    value={walletPhone}
                                    onChange={(e) => setWalletPhone(e.target.value)}
                                    placeholder="01XXXXXXXXX"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        )}

                        <button
                            onClick={handlePaymobPayment}
                            disabled={submitting}
                            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="h-5 w-5 inline-block mr-2 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                `Pay ${(course.price / 100).toFixed(2)} EGP`
                            )}
                        </button>
                </div>
                ) : (
                <form onSubmit={handleManualSubmit}>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Manual Transfer</h3>

                    {/* Instructions */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                        <h4 className="font-semibold text-blue-900 mb-2">Payment Instructions:</h4>
                        <ol className="list-decimal list-inside space-y-1 text-blue-800 text-sm">
                            <li>Transfer <strong>{(course.price / 100).toFixed(2)} EGP</strong> to:</li>
                            <li className="ml-6">
                                Phone: <strong className="font-mono text-lg">{INSTAPAY_PHONE_NUMBER}</strong>
                            </li>
                            <li className="ml-6">Method: InstaPay / Vodafone Cash</li>
                            <li>Take a screenshot of the transfer confirmation</li>
                            <li>Upload the screenshot below and submit</li>
                        </ol>
                    </div>

                    {/* Phone Number */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Your Phone Number (Optional)
                        </label>
                        <input
                            type="tel"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            placeholder="01XXXXXXXXX"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    {/* File Upload */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Receipt Screenshot *
                        </label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setReceipt(e.target.files?.[0] || null)}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        {receipt && (
                            <p className="mt-2 text-sm text-green-600">
                                ✓ {receipt.name} selected
                            </p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={submitting || !receipt}
                        className="w-full px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="h-5 w-5 inline-block mr-2 animate-spin" />
                                Submitting...
                            </>
                        ) : (
                            'Submit for Review'
                        )}
                    </button>
                </form>
                        )}
            </div>
        </div>

                {/* Payment Verification Modal */ }
    {
        showPaymentModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">Payment in Progress</h3>

                    <div className="mb-6">
                        <div className="flex items-center justify-center mb-4">
                            <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
                        </div>
                        <p className="text-center text-gray-600 mb-2">
                            Payment page opened in a new tab
                        </p>
                        <p className="text-center text-sm text-gray-500">
                            Complete your payment in the new tab, then click the button below
                        </p>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                            <p className="text-sm text-red-800">{error}</p>
                        </div>
                    )}

                    <div className="space-y-3">
                        <button
                            onClick={handleVerifyPayment}
                            disabled={verifying}
                            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                            {verifying ? (
                                <>
                                    <Loader2 className="h-5 w-5 inline-block mr-2 animate-spin" />
                                    Verifying Payment...
                                </>
                            ) : (
                                'I have completed payment ✓'
                            )}
                        </button>

                        <button
                            onClick={() => {
                                setShowPaymentModal(false);
                                setError(null);
                            }}
                            className="w-full px-6 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        )
    }
            </div >
        </main >
    );
}
