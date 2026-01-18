'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { CheckCircle, XCircle, Eye, Loader2, DollarSign } from 'lucide-react';
import { approveManualPayment, rejectManualPayment } from '@/app/actions/payment';

interface Order {
    _id: string;
    userId: {
        _id: string;
        name: string;
        email: string;
    };
    courseId: {
        _id: string;
        title: string;
    };
    amount: number;
    currency: string;
    status: string;
    receiptUrl?: string;
    manualTransferNumber?: string;
    createdAt: string;
}

export default function AdminOrdersPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);

    useEffect(() => {
        if (status === 'loading') return;
        if (!session || session.user.role !== 'admin') {
            router.push('/');
            return;
        }
        fetchOrders();
    }, [session, status]);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/admin/orders');
            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error?.message || 'Failed to fetch orders');
            }

            setOrders(result.data?.orders || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (orderId: string) => {
        if (!confirm('Are you sure you want to approve this payment? The student will be enrolled immediately.')) {
            return;
        }

        setProcessingId(orderId);
        setError(null);

        try {
            const result = await approveManualPayment(orderId);

            if (!result.success) {
                throw new Error(result.error?.message || 'Failed to approve payment');
            }

            await fetchOrders(); // Refresh list
        } catch (err: any) {
            setError(err.message);
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (orderId: string) => {
        const reason = prompt('Enter rejection reason:');
        if (!reason) return;

        setProcessingId(orderId);
        setError(null);

        try {
            const result = await rejectManualPayment(orderId, reason);

            if (!result.success) {
                throw new Error(result.error?.message || 'Failed to reject payment');
            }

            await fetchOrders(); // Refresh list
        } catch (err: any) {
            setError(err.message);
        } finally {
            setProcessingId(null);
        }
    };

    if (status === 'loading' || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading orders...</p>
                </div>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Manual Payment Orders</h1>
                    <p className="mt-2 text-gray-600">Review and approve pending manual payments</p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                        <p className="text-red-800">{error}</p>
                    </div>
                )}

                {/* Orders List */}
                {orders.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-md p-12 text-center">
                        <DollarSign className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Pending Orders</h3>
                        <p className="text-gray-600">All manual payments have been reviewed</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg shadow-md overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Student
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Course
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Amount
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Phone
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Date
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Receipt
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {orders.map((order) => (
                                    <tr key={order._id}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">
                                                    {order.userId.name}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {order.userId.email}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900 max-w-xs truncate">
                                                {order.courseId.title}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-semibold text-gray-900">
                                                {(order.amount / 100).toFixed(2)} {order.currency}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                {order.manualTransferNumber || '-'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-500">
                                                {new Date(order.createdAt).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {order.receiptUrl ? (
                                                <button
                                                    onClick={() => setSelectedReceipt(order.receiptUrl!)}
                                                    className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                                                >
                                                    <Eye className="h-4 w-4 mr-1" />
                                                    View
                                                </button>
                                            ) : (
                                                <span className="text-sm text-gray-400">No receipt</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                            <button
                                                onClick={() => handleApprove(order._id)}
                                                disabled={processingId === order._id}
                                                className="inline-flex items-center px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                                            >
                                                {processingId === order._id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <CheckCircle className="h-4 w-4 mr-1" />
                                                )}
                                                Approve
                                            </button>
                                            <button
                                                onClick={() => handleReject(order._id)}
                                                disabled={processingId === order._id}
                                                className="inline-flex items-center px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                                            >
                                                <XCircle className="h-4 w-4 mr-1" />
                                                Reject
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Receipt Modal */}
                {selectedReceipt && (
                    <div
                        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                        onClick={() => setSelectedReceipt(null)}
                    >
                        <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
                            <div className="p-4 border-b flex items-center justify-between">
                                <h3 className="text-lg font-semibold">Receipt Screenshot</h3>
                                <button
                                    onClick={() => setSelectedReceipt(null)}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    ✕
                                </button>
                            </div>
                            <div className="p-4">
                                <img
                                    src={selectedReceipt}
                                    alt="Receipt"
                                    className="w-full h-auto"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
