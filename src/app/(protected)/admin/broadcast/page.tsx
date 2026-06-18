'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Mail, Send, Loader2, CheckCircle } from 'lucide-react';

export default function BroadcastPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<{ successCount: number; totalUsers: number } | null>(null);

    // Redirect if not admin
    if (status === 'loading') {
        return <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>;
    }

    if (!session || session.user.role !== 'admin') {
        router.push('/');
        return null;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!subject.trim() || !message.trim()) {
            setError('Please fill in both subject and message');
            return;
        }

        if (!confirm(`Are you sure you want to send this email to ALL users? This action cannot be undone.`)) {
            return;
        }

        setSending(true);
        setError(null);
        setSuccess(false);

        try {
            const response = await fetch('/api/admin/broadcast', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subject,
                    htmlContent: message.replace(/\n/g, '<br>'), // Basic newline to br conversion
                }),
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error?.message || 'Failed to send broadcast');
            }

            setSuccess(true);
            setResult({
                successCount: data.data.successCount,
                totalUsers: data.data.totalUsers,
            });
            setSubject('');
            setMessage('');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSending(false);
        }
    };

    return (
        <main className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <Link href="/admin" className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-6">
                    <ArrowLeft className="h-5 w-5 mr-2" />
                    Back to Admin Dashboard
                </Link>

                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <div className="flex items-center space-x-4 mb-6">
                        <div className="p-3 bg-blue-100 rounded-lg">
                            <Mail className="h-8 w-8 text-blue-600" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Broadcast Email</h1>
                            <p className="text-gray-600">Send an email to all registered users</p>
                        </div>
                    </div>

                    {/* Success Message */}
                    {success && result && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                            <div className="flex items-center">
                                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                                <div>
                                    <p className="text-green-800 font-medium">Broadcast Sent Successfully!</p>
                                    <p className="text-green-700 text-sm">
                                        Sent to {result.successCount} out of {result.totalUsers} users
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                            <p className="text-red-800">{error}</p>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Subject */}
                        <div>
                            <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                                Email Subject *
                            </label>
                            <input
                                id="subject"
                                type="text"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                placeholder="e.g., Important Update from InnoAccess"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                disabled={sending}
                                required
                            />
                        </div>

                        {/* Message */}
                        <div>
                            <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                                Message Body *
                            </label>
                            <textarea
                                id="message"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Write your message here... You can use basic HTML tags like <strong>, <em>, <br>, etc."
                                rows={10}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                                disabled={sending}
                                required
                            />
                            <p className="text-sm text-gray-500 mt-2">
                                💡 Tip: You can use basic HTML tags for formatting. Each user will receive a personalized greeting.
                            </p>
                        </div>

                        {/* Submit Button */}
                        <div className="flex items-center justify-between pt-4 border-t">
                            <button
                                type="button"
                                onClick={() => {
                                    setSubject('');
                                    setMessage('');
                                    setError(null);
                                    setSuccess(false);
                                }}
                                className="px-6 py-2 text-gray-700 hover:text-gray-900"
                                disabled={sending}
                            >
                                Clear
                            </button>
                            <button
                                type="submit"
                                disabled={sending}
                                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {sending ? (
                                    <>
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        <span>Sending...</span>
                                    </>
                                ) : (
                                    <>
                                        <Send className="h-5 w-5" />
                                        <span>Send to All Users</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Warning Notice */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-yellow-800 text-sm">
                        ⚠️ <strong>Important:</strong> This will send an email to every registered user in the database. Please double-check your message before sending.
                    </p>
                </div>
            </div>
        </main>
    );
}
