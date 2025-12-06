/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  // Safelist для динамических классов из тем
  safelist: [
    // Фоны
    { pattern: /^bg-(stone|slate|amber|orange|white|red|emerald|cyan|blue|indigo|violet|rose|pink|teal|sky)-(50|100|200|300|400|500|600|700|800|900|950)/ },
    { pattern: /^bg-gradient-to-(r|l|t|b|br|bl|tr|tl)$/ },
    { pattern: /^from-(stone|slate|amber|orange|white|cyan|blue|indigo|emerald|teal|sky|red|terra|steppe|meadow)-(50|100|200|300|400|500|600|700|800|900|950)/ },
    { pattern: /^via-(stone|slate|amber|orange|white|cyan|blue|indigo|emerald|teal|sky|red)-(50|100|200|300|400|500|600|700|800|900|950)/ },
    { pattern: /^to-(stone|slate|amber|orange|white|cyan|blue|indigo|emerald|teal|sky|red|terra|steppe)-(50|100|200|300|400|500|600|700|800|900|950)/ },
    // Текст
    { pattern: /^text-(stone|slate|amber|orange|white|cyan|blue|indigo|emerald|red|terra|steppe|meadow)-(50|100|200|300|400|500|600|700|800|900|950)/ },
    // Границы
    { pattern: /^border-(stone|slate|amber|orange|cyan|blue|emerald|red|terra)-(50|100|200|300|400|500|600|700|800|900|950)/ },
    // Кольца
    { pattern: /^ring-(stone|slate|amber|orange|cyan|blue|emerald|red)-(50|100|200|300|400|500|600|700|800|900|950)/ },
    { pattern: /^ring-offset-(stone|slate|white)-(50|100|200|300|400|500|600|700|800|900|950)/ },
    // Заливка
    { pattern: /^fill-(stone|slate|amber|orange|cyan|blue|emerald|transparent)-(50|100|200|300|400|500|600|700|800|900|950)/ },
    // Тени
    { pattern: /^shadow-(stone|slate|amber|orange|cyan|blue|emerald)-(50|100|200|300|400|500|600|700|800|900|950)/ },
    // Hover состояния
    { pattern: /^hover:(bg|text|border|from|to|via)-(stone|slate|amber|orange|white|cyan|blue|emerald)-(50|100|200|300|400|500|600|700|800|900|950)/ },
    // Специальные классы
    'bg-white',
    'text-white',
    'text-black',
    'border-transparent',
    'fill-transparent',
    'fill-current',
    'backdrop-blur-sm',
    'backdrop-blur',
  ],
  theme: {
    extend: {
      colors: {
        // Тёплая степная палитра
        steppe: {
          50: '#fefdf8',
          100: '#fdf9e7',
          200: '#faf0c4',
          300: '#f5e298',
          400: '#efd06a',
          500: '#e6b93d',
          600: '#d69d2b',
          700: '#b27b24',
          800: '#8f6125',
          900: '#755023',
          950: '#432a10',
        },
        // Терракотовый
        terra: {
          50: '#fdf6f3',
          100: '#fceae3',
          200: '#fad8cb',
          300: '#f5bca6',
          400: '#ee9476',
          500: '#e4704e',
          600: '#d05534',
          700: '#ae4429',
          800: '#903b27',
          900: '#783526',
          950: '#411810',
        },
        // Глубокий зелёный (степь)
        meadow: {
          50: '#f4f9f4',
          100: '#e5f2e6',
          200: '#cce5cf',
          300: '#a3d0a9',
          400: '#72b47c',
          500: '#4f9759',
          600: '#3d7a46',
          700: '#33613a',
          800: '#2c4f32',
          900: '#26412b',
          950: '#112316',
        },
        sun: '#FACC15',
        gold: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      animation: {
        'pulse-once': 'pulse 0.5s ease-in-out 1',
        'bounce-soft': 'bounce 1s ease-in-out infinite',
        'spin-slow': 'spin 3s linear infinite',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
        'float': 'float 3s ease-in-out infinite',
        'shake': 'shake 0.5s ease-in-out',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-5px)' },
          '75%': { transform: 'translateX(5px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      boxShadow: {
        'inner-lg': 'inset 0 2px 4px 0 rgb(0 0 0 / 0.1)',
        'glow': '0 0 20px rgba(230, 185, 61, 0.4)',
        'glow-sun': '0 0 20px rgba(250, 204, 21, 0.5)',
        'glow-terra': '0 0 20px rgba(228, 112, 78, 0.3)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
