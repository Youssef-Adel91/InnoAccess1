'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { User, Mail, Phone, MapPin, FileText, Save } from 'lucide-react';

export default function ProfilePage() {
    const { data: session, status } = useSession();
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        location: '',
        bio: '',
        website: '',
    });

    if (status === 'loading') {
        return (
            <main id="main-content" className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading profile...</p>
                </div>
            </main>
        );
    }

    if (status === 'unauthenticated') {
        redirect('/auth/signin');
    }

    const handleSave = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/user/profile', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (data.success) {
                alert('Profile updated successfully!');
                setIsEditing(false);
            } else {
                alert(data.error?.message || 'Failed to update profile');
            }
        } catch (error) {
            console.error('Update error:', error);
            alert('An error occurred while updating profile');
        } finally {
            setLoading(false);
        }
    };

    return (
        <main id="main-content" className="min-h-screen bg-gray-50 py-8">
            <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
                    <p className="mt-2 text-gray-600">Manage your personal information and settings</p>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                    {/* Profile Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center">
                            <div className="h-20 w-20 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold">
                                {session?.user?.name?.charAt(0).toUpperCase()}
                            </div>
                            <div className="ml-4">
                                <h2 className="text-xl font-semibold text-gray-900">{session?.user?.name}</h2>
                                <p className="text-sm text-gray-600 capitalize">{session?.user?.role}</p>
                                <p className="text-sm text-gray-500">{session?.user?.email}</p>
                            </div>
                        </div>
                        <Button
                            variant={isEditing ? 'secondary' : 'primary'}
                            onClick={() => setIsEditing(!isEditing)}
                        >
                            {isEditing ? 'Cancel' : 'Edit Profile'}
                        </Button>
                    </div>

                    {/* Profile Form */}
                    <div className="space-y-6">
                        {/* Name */}
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                                <User className="inline h-4 w-4 mr-2" aria-hidden="true" />
                                Full Name
                            </label>
                            <input
                                type="text"
                                id="name"
                                value={isEditing ? formData.name : session?.user?.name || ''}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                disabled={!isEditing}
                                className="w-full rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                            />
                        </div>

                        {/* Email (Read-only) */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                                <Mail className="inline h-4 w-4 mr-2" aria-hidden="true" />
                                Email Address
                            </label>
                            <input
                                type="email"
                                id="email"
                                value={session?.user?.email || ''}
                                disabled
                                className="w-full rounded-md border border-gray-300 px-4 py-2 bg-gray-50 text-gray-500 cursor-not-allowed"
                            />
                            <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
                        </div>

                        {/* Phone */}
                        <div>
                            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                                <Phone className="inline h-4 w-4 mr-2" aria-hidden="true" />
                                Phone Number
                            </label>
                            <input
                                type="tel"
                                id="phone"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                disabled={!isEditing}
                                placeholder="+20 123 456 7890"
                                className="w-full rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                            />
                        </div>

                        {/* Location */}
                        <div>
                            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                                <MapPin className="inline h-4 w-4 mr-2" aria-hidden="true" />
                                Location
                            </label>
                            <input
                                type="text"
                                id="location"
                                value={formData.location}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                disabled={!isEditing}
                                placeholder="Cairo, Egypt"
                                className="w-full rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                            />
                        </div>

                        {/* Bio */}
                        <div>
                            <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-2">
                                <FileText className="inline h-4 w-4 mr-2" aria-hidden="true" />
                                Bio
                            </label>
                            <textarea
                                id="bio"
                                value={formData.bio}
                                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                disabled={!isEditing}
                                rows={4}
                                placeholder="Tell us about yourself..."
                                className="w-full rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                            />
                        </div>

                        {/* Website */}
                        <div>
                            <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-2">
                                Website / Portfolio
                            </label>
                            <input
                                type="url"
                                id="website"
                                value={formData.website}
                                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                                disabled={!isEditing}
                                placeholder="https://yourportfolio.com"
                                className="w-full rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                            />
                        </div>

                        {/* Save Button */}
                        {isEditing && (
                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                                <Button
                                    variant="secondary"
                                    onClick={() => setIsEditing(false)}
                                    disabled={loading}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="primary"
                                    onClick={handleSave}
                                    disabled={loading}
                                    isLoading={loading}
                                >
                                    <Save className="h-4 w-4 mr-2" aria-hidden="true" />
                                    Save Changes
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Account Information */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h3>
                    <dl className="space-y-3">
                        <div>
                            <dt className="text-sm font-medium text-gray-500">Account Type</dt>
                            <dd className="mt-1 text-sm text-gray-900 capitalize">{session?.user?.role}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-gray-500">Account Status</dt>
                            <dd className="mt-1">
                                {session?.user?.role === 'company' ? (
                                    session?.user?.isApproved ? (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            Approved
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                            Pending Approval
                                        </span>
                                    )
                                ) : (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                        Active
                                    </span>
                                )}
                            </dd>
                        </div>
                    </dl>
                </div>
            </div>
        </main>
    );
}
