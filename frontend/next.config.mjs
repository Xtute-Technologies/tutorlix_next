/** @type {import('next').NextConfig} */
const nextConfig = {
    eslint: {
        // ✅ CI mein lint hum manually run kar rahe hain (eslint .)
        // isliye build ke time Next ko lint ke liye block mat karne do
        ignoreDuringBuilds: true,
    },
};

export default nextConfig;
