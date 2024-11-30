import './globals.css'

export default function RootLayout({ children, keywords, robots }) {
  return (
    <html lang="en">
      <head>
        <meta name="keywords" content={keywords} />
      </head>
      <body suppressHydrationWarning={true} style={{ overflowX: 'hidden' }}>{children}</body>
    </html>
  )
}
