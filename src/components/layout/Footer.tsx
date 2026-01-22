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
            // { name: 'Accessibility', href: '/accessibility' }, // TODO: Create page
            { name: 'Contact', href: '/contact' },
            // { name: 'Blog', href: '/blog' }, // TODO: Create page
        ],
        legal: [
            // { name: 'Privacy Policy', href: '/privacy' }, // TODO: Create page
            // { name: 'Terms of Service', href: '/terms' }, // TODO: Create page
            // { name: 'Cookie Policy', href: '/cookies' }, // TODO: Create page
        ],
    };

    const social = [
        { name: 'Facebook', href: '#', icon: Facebook },
        { name: 'Twitter', href: '#', icon: Twitter },
        { name: 'LinkedIn', href: '#', icon: Linkedin },
        { name: 'GitHub', href: '#', icon: Github },
    ];

    return (
        <footer className="bg-gray-900 text-gray-300" aria-labelledby="footer-heading">
            <h2 id="footer-heading" className="sr-only">
                Footer
            </h2>
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* Brand */}
                    <div>
                        <h3 className="text-white text-lg font-bold mb-4">
                            <span className="text-blue-400">Inno</span>Access
                        </h3>
                        <p className="text-sm text-gray-400">
                            An accessible job board and learning platform designed for visually impaired individuals.
                        </p>
                    </div>

                    {/* Platform Links */}
                    <div>
                        <h3 className="text-white text-sm font-semibold mb-4">Platform</h3>
                        <ul className="space-y-2">
                            {navigation.platform.map((item) => (
                                <li key={item.name}>
                                    <Link
                                        href={item.href}
                                        className="text-sm hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded"
                                    >
                                        {item.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Company Links */}
                    <div>
                        <h3 className="text-white text-sm font-semibold mb-4">Company</h3>
                        <ul className="space-y-2">
                            {navigation.company.map((item) => (
                                <li key={item.name}>
                                    <Link
                                        href={item.href}
                                        className="text-sm hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded"
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
                            <h3 className="text-white text-sm font-semibold mb-4">Legal</h3>
                            <ul className="space-y-2">
                                {navigation.legal.map((item) => (
                                    <li key={item.name}>
                                        <Link
                                            href={item.href}
                                            className="text-sm hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded"
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
                <div className="mt-8 pt-8 border-t border-gray-800">
                    <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
                        <p className="text-sm text-gray-400">
                            © {new Date().getFullYear()} InnoAccess. All rights reserved.
                        </p>
                        <div className="flex space-x-6">
                            {social.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        className="text-gray-400 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded"
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
