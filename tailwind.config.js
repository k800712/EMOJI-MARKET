/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./utils/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#f9fafb', /* gray-50 */
          card: '#ffffff', /* white */
          border: '#e5e7eb', /* gray-200 */
          primary: '#007AFF', /* apple-blue */
          secondary: '#6366f1', /* indigo-500 */
          accent: '#ec4899', /* pink-500 */
        }
      },
      fontFamily: {
        sans: ['Pretendard', '-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"Helvetica Neue"', 'Arial', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
