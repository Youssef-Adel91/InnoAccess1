import type { Metadata } from 'next';

export const metadata: Metadata = {
    title:       'Affiliate Dashboard — InnoAccess',
    description: 'Track your affiliate commissions, monitor your wallet balance, and request payouts.',
    robots:      { index: false, follow: false }, // private volunteer area
};

export default function VolunteerAffiliateLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
