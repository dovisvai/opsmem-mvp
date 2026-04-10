/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Prevent MIME-type sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // Disallow embedding in iframes
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // Legacy XSS protection for older browsers
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          // Force HTTPS for 1 year
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          // S7: Referrer policy — share origin only on same-site, omit for cross-origin
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // S7: Disable unused browser APIs
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          // S5: CSP — removed unsafe-eval, added explicit connect-src for APIs
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Next.js requires unsafe-inline for styles; no eval needed in production
              "script-src 'self' 'unsafe-inline' https://js.stripe.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "frame-src 'self' https://js.stripe.com https://checkout.stripe.com",
              // Allow Supabase, Stripe, and OpenAI API calls
              "connect-src 'self' https://*.supabase.co https://api.stripe.com https://api.openai.com",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
