import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SessionProvider } from "@/components/providers/SessionProvider";

export const metadata: Metadata = {
    title: "InnoAccess - Accessible Job Portal & LMS",
    description: "An accessible job board and learning management system designed for visually impaired individuals",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body suppressHydrationWarning>
                <SessionProvider>
                    <a href="#main-content" className="skip-link">
                        Skip to main content
                    </a>
                    <Header />
                    {children}
                    <Footer />
                </SessionProvider>
            </body>
        </html>
    );
}
