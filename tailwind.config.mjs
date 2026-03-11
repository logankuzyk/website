/** @type {import('tailwindcss').Config} */
const config = {
  theme: {
    extend: {
      typography: () => ({
        DEFAULT: {
          css: [
            {
              '--tw-prose-body': 'var(--text)',
              '--tw-prose-headings': 'var(--text)',
              h1: {
                fontFamily: 'var(--font-serif)',
                fontWeight: 'normal',
                marginBottom: '0.25em',
              },
            },
          ],
        },
        base: {
          css: [
            {
              h1: {
                fontFamily: 'var(--font-serif)',
                fontSize: '2rem',
              },
              h2: {
                fontFamily: 'var(--font-serif)',
                fontSize: '1.25rem',
                fontWeight: 600,
              },
            },
          ],
        },
        md: {
          css: [
            {
              h1: {
                fontFamily: 'var(--font-serif)',
                fontSize: '3rem',
              },
              h2: {
                fontFamily: 'var(--font-serif)',
                fontSize: '1.5rem',
              },
            },
          ],
        },
      }),
    },
  },
}

export default config
