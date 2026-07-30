import { redirect } from 'next/navigation';

export default function LegacyUserApplicationsRedirect({
    params: { locale },
}: {
    params: { locale: string };
}) {
    redirect(`/${locale}/student/applications`);
}
