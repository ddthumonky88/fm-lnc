/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        fm: {
          blue: '#1d70b8',
          darkBlue: '#1e3a8a',
          lightBlue: '#e2f0fd',
          borderBlue: '#cbe4fa',
          green: '#10b981',
        },
      },
    },
  },
  plugins: [],
};
