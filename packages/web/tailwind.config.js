/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6366F1',
          light: '#818CF8',
          lighter: '#A5B4FC',
        },
        bg: {
          base: '#0F0B1E',
          surface: '#1A1530',
          deep: '#12101F',
        },
        text: {
          primary: '#F8FAFC',
          secondary: '#CBD5E1',
          muted: '#94A3B8',
        },
        functional: {
          blue: '#3B82F6',
          green: '#10B981',
          amber: '#F59E0B',
          red: '#EF4444',
        },
      },
      fontFamily: {
        sans: ['Poppins', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        heading: ['28px', { fontWeight: '600' }],
        subheading: ['18px', { fontWeight: '500' }],
        body: ['14px', { fontWeight: '400' }],
      },
      backgroundImage: {
        'glow-radial':
          'radial-gradient(circle at 50% 0%, rgba(99,102,241,0.15), transparent 60%)',
        'gradient-neural':
          'linear-gradient(135deg, #1A1530 0%, #0F0B1E 50%, #12101F 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease',
        'slide-up': 'slideUp 0.3s ease',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(99,102,241,0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(99,102,241,0.6)' },
        },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
