'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Bell, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { timeAgo } from '@/lib/utils';

interface Notification {
    _id: string;
    type: string;
    title: string;
    message: string;
    link?: string;
    isRead: boolean;
    createdAt: string;
}

export default function NotificationsPage() {
    const { data: session, status } = useSession();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (status === 'unauthenticated') {
            redirect('/auth/signin');
        }

        if (status === 'authenticated') {
            fetchNotifications();
        }
    }, [status]);

    const fetchNotifications = async () => {
        try {
            const response = await fetch('/api/notifications');
            const data = await response.json();

            if (data.success) {
                setNotifications(data.data.notifications);
                setUnreadCount(data.data.unreadCount);
            }
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (id: string) => {
        try {
            const response = await fetch(`/api/notifications/${id}/read`, {
                method: 'PATCH',
            });

            if (response.ok) {
                setNotifications((prev) =>
                    prev.map((notif) =>
                        notif._id === id ? { ...notif, isRead: true } : notif
                    )
                );
                setUnreadCount((prev) => Math.max(0, prev - 1));
            }
        } catch (error) {
            console.error('Failed to mark as read:', error);
        }
    };

    if (loading) {
        return (
            <main id="main-content" className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading notifications...</p>
                </div>
            </main>
        );
    }

    return (
        <main id="main-content" className="min-h-screen bg-gray-50 py-8">
            <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
                    {unreadCount > 0 && (
                        <p className="mt-2 text-gray-600">
                            You have {unreadCount} unread notification{unreadCount !== 1 ? '&apos;s&apos;' : ''}
                        </p>
                    )}
                </div>

                {notifications.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                        <Bell className="mx-auto h-12 w-12 text-gray-400" aria-hidden="true" />
                        <h3 className="mt-4 text-lg font-medium text-gray-900">No notifications</h3>
                        <p className="mt-2 text-gray-600">You&apos;re all caught up!</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {notifications.map((notification) => (
                            <article
                                key={notification._id}
                                className={`bg-white rounded-lg shadow-sm border p-6 transition-all ${notification.isRead
                                    ? 'border-gray-200'
                                    : 'border-blue-300 bg-blue-50'
                                    }`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center">
                                            {!notification.isRead && (
                                                <span className="inline-block h-2 w-2 rounded-full bg-blue-600 mr-3" aria-label="Unread" />
                                            )}
                                            <h3 className="text-lg font-semibold text-gray-900">
                                                {notification.title}
                                            </h3>
                                        </div>
                                        <p className="mt-2 text-gray-700">{notification.message}</p>
                                        <div className="mt-3 flex items-center gap-4">
                                            <time className="text-sm text-gray-500">
                                                {timeAgo(notification.createdAt)}
                                            </time>
                                            {notification.link && (
                                                <Link
                                                    href={notification.link}
                                                    className="text-sm font-medium text-blue-600 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
                                                >
                                                    View →
                                                </Link>
                                            )}
                                        </div>
                                    </div>

                                    {!notification.isRead && (
                                        <button
                                            onClick={() => markAsRead(notification._id)}
                                            className="ml-4 flex items-center text-sm text-gray-600 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded px-2 py-1"
                                            aria-label="Mark as read"
                                        >
                                            <CheckCircle className="h-5 w-5 mr-1" aria-hidden="true" />
                                            Mark read
                                        </button>
                                    )}
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
