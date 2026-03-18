/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './screens/**/*.{js,jsx,ts,tsx}',
    './hooks/**/*.{js,jsx,ts,tsx}',
    './lib/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {},
  },
  // Disable CSS transform utilities to avoid triggering reanimated's
  // buggy Fabric CSS transform processor (SIGABRT in TransformOp).
  corePlugins: {
    transform: false,
    translate: false,
    rotate: false,
    scale: false,
    skew: false,
    transformOrigin: false,
  },
  plugins: [],
};
