import Link from 'next/link';
import { Facebook, Twitter, Linkedin, Github } from 'lucide-react';

export function Footer() {
    const navigation = {
        platform: [
            { name: 'Find Jobs', href: '/jobs' },
            { name: 'Browse Courses', href: '/courses' },
            { name: 'Post a Job', href: '/company/jobs/new' },
            { name: 'Teach on InnoAccess', href: '/trainer/apply' },
        ],
        company: [
            { name: 'About Us', href: '/about' },
            { name: 'Contact', href: '/contact' },
        ],
        legal: [] as { name: string; href: string }[],
    };

    const social = [
        { name: 'Facebook', href: '#', icon: Facebook },
        { name: 'Twitter', href: '#', icon: Twitter },
        { name: 'LinkedIn', href: '#', icon: Linkedin },
        { name: 'GitHub', href: '#', icon: Github },
    ];

    return (
        <footer className="bg-gray-950 text-gray-400" aria-labelledby="footer-heading">
            <h2 id="footer-heading" className="sr-only">Footer</h2>
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10 sm:gap-8">
                    {/* Brand */}
                    <div className="sm:col-span-2 md:col-span-1">
                        <Link href="/" className="inline-flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded" aria-label="InnoAccess Home">
                            <span className="text-xl font-extrabold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Inno</span>
                            <span className="text-xl font-extrabold text-white">Access</span>
                        </Link>
                        <p className="mt-3 text-sm text-gray-400 leading-relaxed max-w-xs">
                            Egypt&apos;s first fully accessible job board and learning platform, designed for visually impaired individuals.
                        </p>
                    </div>

                    {/* Platform Links */}
                    <div>
                        <h3 className="text-white text-sm font-semibold tracking-wider uppercase mb-4">Platform</h3>
                        <ul className="space-y-3">
                            {navigation.platform.map((item) => (
                                <li key={item.name}>
                                    <Link
                                        href={item.href}
                                        className="text-sm text-gray-400 hover:text-white transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded"
                                    >
                                        {item.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Company Links */}
                    <div>
                        <h3 className="text-white text-sm font-semibold tracking-wider uppercase mb-4">Company</h3>
                        <ul className="space-y-3">
                            {navigation.company.map((item) => (
                                <li key={item.name}>
                                    <Link
                                        href={item.href}
                                        className="text-sm text-gray-400 hover:text-white transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded"
                                    >
                                        {item.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Legal Links - Only show if there are items */}
                    {navigation.legal.length > 0 && (
                        <div>
                            <h3 className="text-white text-sm font-semibold tracking-wider uppercase mb-4">Legal</h3>
                            <ul className="space-y-3">
                                {navigation.legal.map((item) => (
                                    <li key={item.name}>
                                        <Link
                                            href={item.href}
                                            className="text-sm text-gray-400 hover:text-white transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded"
                                        >
                                            {item.name}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                {/* Social Media & Copyright */}
                <div className="mt-12 pt-8 border-t border-gray-800">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                        <p className="text-sm text-gray-500 order-2 sm:order-1">
                            © {new Date().getFullYear()} InnoAccess. All rights reserved.
                        </p>
                        <div className="flex items-center gap-2 order-1 sm:order-2">
                            {social.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                                        aria-label={`Follow us on ${item.name}`}
                                    >
                                        <Icon className="h-5 w-5" aria-hidden="true" />
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
