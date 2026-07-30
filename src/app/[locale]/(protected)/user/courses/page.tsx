import { redirect } from 'next/navigation';

export default function LegacyUserCoursesRedirect({
    params: { locale },
}: {
    params: { locale: string };
}) {
    redirect(`/${locale}/student/courses`);
}
