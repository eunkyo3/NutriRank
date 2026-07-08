import type { Config } from 'tailwindcss'

export default {
  // lib/** holds the grade-badge color classes (lib/display.ts); without it
  // Tailwind never generates bg-green/lime/yellow/orange-* and the A~D badges
  // render with no background (invisible). app/error.tsx happens to use
  // bg-red-600, which is why only the E badge showed before.
  content: ['./app/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  // Belt-and-suspenders: the grade colors are chosen dynamically per grade, so
  // safelist them explicitly in case the class strings ever move behind a helper.
  safelist: [
    'bg-green-600',
    'bg-lime-600',
    'bg-yellow-500',
    'bg-orange-500',
    'bg-red-600',
    'text-white',
    'text-black',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config
