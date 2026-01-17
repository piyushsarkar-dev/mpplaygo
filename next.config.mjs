/*
Legal Disclaimer:
- This project is for educational and personal learning purposes.
- All third-party content belongs to its respective owners.
- This project does not host or claim ownership of external content.
- The developer is not responsible for misuse.
- Third-party services are used under their own terms and policies.
*/

/** @type {import('next').NextConfig} */
const nextConfig = {
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "lh3.googleusercontent.com",
			},
			{
				protocol: "https",
				hostname: "avatars.githubusercontent.com",
			},
			{
				protocol: "https",
				hostname: "api.dicebear.com",
			},
			{
				protocol: "https",
				hostname: "saavn.cdn.sg.ln.is",
			},
			{
				protocol: "https",
				hostname: "c.saavncdn.com",
			},
			{
				protocol: "https",
				hostname: "az-avatar.vercel.app",
			},
		],
	},
};

export default nextConfig;
