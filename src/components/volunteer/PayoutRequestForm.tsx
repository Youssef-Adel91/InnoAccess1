'use client';

import { useState } from 'react';
import { Banknote, Smartphone, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface PayoutRequestFormProps {
    availableBalance: number;
    /** Called on successful submission so the parent can refresh wallet data */
    onSuccess: () => void;
    /** Whether a payout is already pending (disables the form) */
    hasPendingPayout: boolean;
    /** The API endpoint to hit. Defaults to /api/volunteer/payout */
    apiEndpoint?: string;
}

type PayoutMethod = 'vodafone_cash' | 'instapay';

const MIN_AMOUNT = process.env.NEXT_PUBLIC_MIN_PAYOUT_AMOUNT 
    ? parseInt(process.env.NEXT_PUBLIC_MIN_PAYOUT_AMOUNT, 10) 
    : 50;

function formatEGP(n: number) {
    return new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(n);
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function PayoutRequestForm({
    availableBalance,
    onSuccess,
    hasPendingPayout,
    apiEndpoint = '/api/volunteer/payout',
}: PayoutRequestFormProps) {
    const [amount,        setAmount]        = useState<string>('');
    const [method,        setMethod]        = useState<PayoutMethod>('vodafone_cash');
    const [accountNumber, setAccountNumber] = useState<string>('');
    const [isLoading,     setIsLoading]     = useState(false);
    const [error,         setError]         = useState<string | null>(null);
    const [success,       setSuccess]       = useState(false);

    const numericAmount = parseFloat(amount);
    const isAmountValid =
        !isNaN(numericAmount) &&
        numericAmount >= MIN_AMOUNT &&
        numericAmount <= availableBalance;

    const canSubmit =
        isAmountValid &&
        accountNumber.trim().length >= 6 &&
        !isLoading &&
        !hasPendingPayout &&
        availableBalance >= MIN_AMOUNT;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!canSubmit) return;

        setIsLoading(true);
        try {
            const res = await fetch(apiEndpoint, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({
                    amount:        numericAmount,
                    method,
                    accountNumber: accountNumber.trim(),
                }),
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.error?.message || 'Failed to submit withdrawal request');
            }

            setSuccess(true);
            onSuccess();

        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // ── Success state ─────────────────────────────────────────────────────────
    if (success) {
        return (
            <div
                className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center"
                role="alert"
                aria-live="polite"
            >
                <div className="mx-auto h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                    <CheckCircle className="h-9 w-9 text-emerald-600" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-bold text-emerald-900 mb-2">Withdrawal Request Submitted!</h3>
                <p className="text-sm text-emerald-700">
                    Your request for <strong>{formatEGP(numericAmount)}</strong> has been submitted.
                    The admin will review and process it shortly.
                </p>
            </div>
        );
    }

    // ── Locked state (already has a pending payout) ───────────────────────────
    if (hasPendingPayout) {
        return (
            <div
                className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex items-start gap-4"
                role="status"
            >
                <AlertCircle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                    <p className="font-semibold text-amber-900">Payout Request Pending</p>
                    <p className="text-sm text-amber-700 mt-1">
                        You already have a withdrawal request being processed by the admin.
                        You can submit a new one once the current request is completed.
                    </p>
                </div>
            </div>
        );
    }

    // ── No balance state ──────────────────────────────────────────────────────
    if (availableBalance < MIN_AMOUNT) {
        return (
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 flex items-start gap-4" role="status">
                <Banknote className="h-6 w-6 text-gray-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                    <p className="font-semibold text-gray-700">No Available Balance</p>
                    <p className="text-sm text-gray-500 mt-1">
                        You need at least {formatEGP(MIN_AMOUNT)} in your available balance to request a withdrawal.
                        Keep sharing your links to earn more commissions!
                    </p>
                </div>
            </div>
        );
    }

    // ── Main form ─────────────────────────────────────────────────────────────
    return (
        <form onSubmit={handleSubmit} noValidate aria-labelledby="payout-form-heading">
            <h3 id="payout-form-heading" className="text-lg font-semibold text-gray-900 mb-5">
                Request Withdrawal
            </h3>

            <div className="space-y-5">
                {/* Error alert */}
                {error && (
                    <div
                        className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3"
                        role="alert"
                        aria-live="assertive"
                    >
                        <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                )}

                {/* Amount */}
                <div>
                    <label htmlFor="payout-amount" className="block text-sm font-medium text-gray-700 mb-1.5">
                        Amount (EGP)
                        <span className="ml-2 text-xs text-gray-500 font-normal">
                            Available: {formatEGP(availableBalance)}
                        </span>
                    </label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium pointer-events-none">
                            EGP
                        </span>
                        <input
                            id="payout-amount"
                            type="number"
                            min={MIN_AMOUNT}
                            max={availableBalance}
                            step="1"
                            required
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            aria-describedby="payout-amount-hint"
                            className="w-full pl-12 pr-4 py-2.5 border border-gray-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                            placeholder="0"
                        />
                    </div>
                    <p id="payout-amount-hint" className="mt-1 text-xs text-gray-500">
                        Minimum: {formatEGP(MIN_AMOUNT)} · Maximum: {formatEGP(availableBalance)}
                    </p>
                    {/* Quick fill buttons */}
                    <div className="mt-2 flex gap-2">
                        {[0.25, 0.5, 1].map((fraction) => {
                            const val = Math.floor(availableBalance * fraction);
                            if (val < MIN_AMOUNT) return null;
                            return (
                                <button
                                    key={fraction}
                                    type="button"
                                    onClick={() => setAmount(val.toString())}
                                    className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                >
                                    {fraction === 1 ? 'Max' : `${fraction * 100}%`}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Payment Method */}
                <fieldset>
                    <legend className="block text-sm font-medium text-gray-700 mb-2">
                        Payment Method
                    </legend>
                    <div className="grid grid-cols-2 gap-3">
                        {([
                            { value: 'vodafone_cash', label: 'Vodafone Cash', icon: '📱' },
                            { value: 'instapay',      label: 'InstaPay',      icon: '⚡' },
                        ] as { value: PayoutMethod; label: string; icon: string }[]).map((opt) => (
                            <label
                                key={opt.value}
                                className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                    method === opt.value
                                        ? 'border-blue-500 bg-blue-50'
                                        : 'border-gray-200 bg-white hover:border-gray-300'
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="payout-method"
                                    value={opt.value}
                                    checked={method === opt.value}
                                    onChange={() => setMethod(opt.value)}
                                    className="sr-only"
                                />
                                <span className="text-2xl" aria-hidden="true">{opt.icon}</span>
                                <span className={`text-sm font-medium ${method === opt.value ? 'text-blue-700' : 'text-gray-700'}`}>
                                    {opt.label}
                                </span>
                                {method === opt.value && (
                                    <Smartphone className="h-4 w-4 text-blue-600 ml-auto" aria-hidden="true" />
                                )}
                            </label>
                        ))}
                    </div>
                </fieldset>

                {/* Account Number */}
                <div>
                    <label htmlFor="payout-account" className="block text-sm font-medium text-gray-700 mb-1.5">
                        {method === 'vodafone_cash' ? 'Vodafone Cash Phone Number' : 'InstaPay ID or Phone Number'}
                    </label>
                    <input
                        id="payout-account"
                        type="text"
                        required
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        aria-describedby="payout-account-hint"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                        placeholder={method === 'vodafone_cash' ? '010XXXXXXXX' : 'Your InstaPay ID'}
                        maxLength={30}
                    />
                    <p id="payout-account-hint" className="mt-1 text-xs text-gray-500">
                        This number is used only for this payout request and is not stored permanently.
                    </p>
                </div>

                {/* Submit */}
                <button
                    type="submit"
                    disabled={!canSubmit}
                    aria-describedby={canSubmit ? undefined : 'submit-hint'}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-all duration-200"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                            Submitting…
                        </>
                    ) : (
                        <>
                            <Banknote className="h-5 w-5" aria-hidden="true" />
                            Request {isAmountValid ? formatEGP(numericAmount) : ''} Withdrawal
                        </>
                    )}
                </button>
                {!canSubmit && !isLoading && (
                    <p id="submit-hint" className="text-xs text-gray-500 text-center">
                        Enter a valid amount and account number to continue.
                    </p>
                )}
            </div>
        </form>
    );
}
