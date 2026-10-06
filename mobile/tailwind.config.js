/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#DC2626',
        'primary-light': '#EF4444',
        'primary-dark': '#991B1B',
        success: '#10B981',
        'success-light': '#D1FAE5',
        warning: '#F59E0B',
        'warning-light': '#FEF3C7',
        error: '#DC2626',
        'error-light': '#FEE2E2',
        info: '#3B82F6',
        'info-light': '#DBEAFE',
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '12px',
        base: '16px',
        lg: '20px',
        xl: '24px',
        '2xl': '32px',
        '3xl': '40px',
        '4xl': '48px',
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
      fontSize: {
        xs: '12px',
        sm: '14px',
        base: '16px',
        lg: '18px',
        xl: '20px',
        '2xl': '24px',
        '3xl': '30px',
        '4xl': '36px',
      },
    },
  },
  plugins: [],
};
