import { fileURLToPath, URL } from "node:url";
import plugin from "@vitejs/plugin-react";
import child_process from "child_process";
import fs from "fs";
import path from "path";
import { env } from "process";
import { defineConfig } from "vite";

const baseFolder =
	env.APPDATA !== undefined && env.APPDATA !== ""
		? `${env.APPDATA}/ASP.NET/https`
		: `${env.HOME}/.aspnet/https`;

const certificateName = "ReactFormAutoGenerate.client";
const certFilePath = path.join(baseFolder, `${certificateName}.pem`);
const keyFilePath = path.join(baseFolder, `${certificateName}.key`);

if (!fs.existsSync(baseFolder)) {
	fs.mkdirSync(baseFolder, { recursive: true });
}

if (!fs.existsSync(certFilePath) || !fs.existsSync(keyFilePath)) {
	if (
		0 !==
		child_process.spawnSync(
			"dotnet",
			[
				"dev-certs",
				"https",
				"--export-path",
				certFilePath,
				"--format",
				"Pem",
				"--no-password",
			],
			{ stdio: "inherit" },
		).status
	) {
		throw new Error("Could not create certificate.");
	}
}

// Manually run server port is 44318 (HTTPS)
const target = "https://localhost:44318";

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [plugin()],
	resolve: {
		alias: {
			"@": fileURLToPath(new URL("./src", import.meta.url)),
		},
	},
	server: {
		proxy: {
			"/weatherforecast": {
				target,
				secure: false,
			},
			"/api": {
				target,
				secure: false,
			},
			"/graphql": {
				target,
				secure: false,
				changeOrigin: true,
			},
		},
		port: 5173,
		https: {
			key: fs.readFileSync(keyFilePath),
			cert: fs.readFileSync(certFilePath),
		},
	},
});
