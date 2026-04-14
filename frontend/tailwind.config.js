/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#4B2FA3',
          dark:    '#1E0A4E',
        },
        blue:       '#1E6FD9',
        purple:     '#7A4FD6',
        green:      '#35C56A',
        background: '#F4F6F8',
        error:      '#EF4444',
        purpleNavbar:  '#1E0A4E',
        bluePrimary:   '#1E6FD9',
        blueLight:     '#2C8BE6',
        purpleMedium:  '#7A4FD6',
        purpleDeep:    '#4B2FA3',
        greenAccent:   '#35C56A',
        neutralBg:     '#F4F6F8',
        gray700:       '#3D4A5C',
        gray500:       '#7A8799',
        redError:      '#EF4444',
        amber:         '#F59E0B',
      },
      borderRadius: {
        lg: '12px',
      },
      maxWidth: {
        canvas: '1536px',
      },
      fontFamily: {
        heading: ['"Plus Jakarta Sans"', 'sans-serif'],
        body:    ['"DM Sans"', 'sans-serif'],
        sans:    ['"DM Sans"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
