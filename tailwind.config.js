module.exports = {
    safelist: [
        {
            pattern: /bg-(red|blue|yellow|green|purple|gray|pink|indigo)-(50|100|200|300|400|500|600|700|800|900)/,
        }
    ],
    content: [
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            backgroundImage: {
                'kreado-button': 'linear-gradient(to right, #0052D4, #4364F7, #6FB1FC)',
                'kreado-title': 'linear-gradient(to right, #2E3192, #1BFFFF)',
                'kreado-bg': 'linear-gradient(to right, #E0EAFC, #CFDEF3)',
            }
        }
    },
    plugins: [],
}