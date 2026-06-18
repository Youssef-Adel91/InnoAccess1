'use client';

import { ExternalLink, User2, Globe, Linkedin, CheckCircle, Clock, XCircle } from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface TrainerCardData {
    _id:            string;
    userId:         string;
    name:           string;
    email:          string;
    avatar?:        string | null;
    specialization: string;
    bio:            string;
    cvUrl:          string;
    linkedInUrl?:   string;
    websiteUrl?:    string;
    status:         'pending' | 'approved' | 'rejected';
    memberSince?:   string;
    createdAt:      string;
}

interface TrainerCardProps {
    trainer: TrainerCardData;
}

// ─── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
    approved: {
        label: 'Approved',
        icon:  CheckCircle,
        cls:   'text-emerald-700 bg-emerald-50 border-emerald-200',
    },
    pending: {
        label: 'Pending',
        icon:  Clock,
        cls:   'text-amber-700 bg-amber-50 border-amber-200',
    },
    rejected: {
        label: 'Rejected',
        icon:  XCircle,
        cls:   'text-red-700 bg-red-50 border-red-200',
    },
} as const;

// ─── Component ─────────────────────────────────────────────────────────────────

export default function TrainerCard({ trainer }: TrainerCardProps) {
    const cfg  = STATUS_CONFIG[trainer.status];
    const Icon = cfg.icon;

    const initials = trainer.name
        .split(' ')
        .slice(0, 2)
        .map((n) => n[0]?.toUpperCase() ?? '')
        .join('');

    return (
        <article
            className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col overflow-hidden"
            aria-label={`Trainer card for ${trainer.name}`}
        >
            {/* ── Top accent bar (status colour) ──────────────────────────── */}
            <div className={`h-1.5 w-full ${
                trainer.status === 'approved' ? 'bg-emerald-400' :
                trainer.status === 'pending'  ? 'bg-amber-400'   : 'bg-red-400'
            }`} aria-hidden="true" />

            <div className="p-5 flex flex-col flex-1 gap-4">
                {/* ── Header: Avatar + Name + Status ──────────────────────── */}
                <div className="flex items-start gap-3">
                    {/* Avatar */}
                    {trainer.avatar ? (
                        <img
                            src={trainer.avatar}
                            alt={`${trainer.name}'s avatar`}
                            className="h-12 w-12 rounded-full object-cover flex-shrink-0 ring-2 ring-white shadow"
                        />
                    ) : (
                        <div
                            className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 ring-2 ring-white shadow"
                            aria-hidden="true"
                        >
                            {initials ? (
                                <span className="text-white text-sm font-bold">{initials}</span>
                            ) : (
                                <User2 className="h-6 w-6 text-white" />
                            )}
                        </div>
                    )}

                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate text-sm">{trainer.name}</h3>
                        <p className="text-xs text-gray-500 truncate">{trainer.email}</p>
                    </div>

                    {/* Status badge */}
                    <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border flex-shrink-0 ${cfg.cls}`}
                        aria-label={`Status: ${cfg.label}`}
                    >
                        <Icon className="h-3 w-3" aria-hidden="true" />
                        {cfg.label}
                    </span>
                </div>

                {/* ── Specialization badge ─────────────────────────────────── */}
                <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                        {trainer.specialization}
                    </span>
                </div>

                {/* ── Bio (truncated) ──────────────────────────────────────── */}
                <p className="text-xs text-gray-600 line-clamp-3 flex-1 leading-relaxed">
                    {trainer.bio}
                </p>

                {/* ── Social links ─────────────────────────────────────────── */}
                {(trainer.linkedInUrl || trainer.websiteUrl) && (
                    <div className="flex items-center gap-2">
                        {trainer.linkedInUrl && (
                            <a
                                href={trainer.linkedInUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`${trainer.name}'s LinkedIn profile`}
                                className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 transition-colors"
                            >
                                <Linkedin className="h-3.5 w-3.5" aria-hidden="true" />
                                LinkedIn
                            </a>
                        )}
                        {trainer.linkedInUrl && trainer.websiteUrl && (
                            <span className="text-gray-300" aria-hidden="true">·</span>
                        )}
                        {trainer.websiteUrl && (
                            <a
                                href={trainer.websiteUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`${trainer.name}'s website`}
                                className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 transition-colors"
                            >
                                <Globe className="h-3.5 w-3.5" aria-hidden="true" />
                                Website
                            </a>
                        )}
                    </div>
                )}

                {/* ── Joined date ──────────────────────────────────────────── */}
                {trainer.memberSince && (
                    <p className="text-xs text-gray-400">
                        Applied:{' '}
                        {new Date(trainer.createdAt).toLocaleDateString('en-EG', {
                            day: 'numeric', month: 'short', year: 'numeric',
                        })}
                    </p>
                )}

                {/* ── Open CV button ───────────────────────────────────────── */}
                <a
                    href={trainer.cvUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Open ${trainer.name}'s CV (opens in new tab)`}
                    className="mt-auto flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 transition-colors duration-200"
                >
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    Open CV
                </a>
            </div>
        </article>
    );
}
