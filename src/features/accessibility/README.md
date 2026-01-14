# Accessibility Feature Module

This module contains utilities, hooks, and types for ensuring WCAG 2.1 AAA compliance throughout the InnoAccess platform.

## Purpose

InnoAccess is designed to be **accessibility-first**, with complete compatibility for:
- Screen readers (NVDA, VoiceOver, JAWS)
- Keyboard-only navigation
- High contrast modes
- Voice commands

## Structure

```
accessibility/
├── hooks/          # React hooks for accessibility features
│   ├── useScreenReader.ts
│   ├── useFocusTrap.ts
│   └── useKeyboardNav.ts
├── utils/          # Accessibility utility functions
│   ├── aria.ts     # ARIA label helpers
│   └── focus.ts    # Focus management utilities
└── types/          # TypeScript types for accessibility
```

## Best Practices

1. **Always use semantic HTML** - Use `<button>`, `<nav>`, `<main>`, not `<div>` with click handlers
2. **Provide ARIA labels** - Every interactive element needs `aria-label` or `aria-labelledby`
3. **Manage focus** - Ensure focus order is logical and visible
4. **Test with keyboard only** - All features must be accessible via Tab, Enter, Escape, Arrow keys
5. **Add skip links** - "Skip to content" links at the top of each page

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Best Practices](https://www.w3.org/WAI/ARIA/apg/)
- [Next.js Accessibility](https://nextjs.org/docs/accessibility)
