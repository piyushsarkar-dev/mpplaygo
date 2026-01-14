import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";

function parseArgs(argv) {
	const args = {};
	for (let i = 2; i < argv.length; i++) {
		const token = argv[i];
		if (!token.startsWith("--")) continue;
		const key = token.slice(2);
		const next = argv[i + 1];
		if (next && !next.startsWith("--")) {
			args[key] = next;
			i++;
		} else {
			args[key] = true;
		}
	}
	return args;
}

function resolveFromRoot(relOrAbs) {
	return path.isAbsolute(relOrAbs)
		? relOrAbs
		: path.join(process.cwd(), relOrAbs);
}

function ensureExists(filePath) {
	if (!fs.existsSync(filePath)) {
		throw new Error(`File not found: ${filePath}`);
	}
}

function readJson(filePath) {
	return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function parseSizes(sizes) {
	if (typeof sizes !== "string") return null;
	const match = sizes.match(/^(\d+)x(\d+)$/);
	if (!match) return null;
	return { width: Number(match[1]), height: Number(match[2]) };
}

function extToFormat(targetPath) {
	const ext = path.extname(targetPath).toLowerCase();
	if (ext === ".png") return "png";
	if (ext === ".jpg" || ext === ".jpeg") return "jpeg";
	if (ext === ".webp") return "webp";
	return null;
}

async function writeResized({ sourcePath, targetPath, width, height, fit }) {
	const format = extToFormat(targetPath);
	if (!format) throw new Error(`Unsupported output format: ${targetPath}`);

	fs.mkdirSync(path.dirname(targetPath), { recursive: true });

	const transparent = { r: 0, g: 0, b: 0, alpha: 0 };
	const black = { r: 0, g: 0, b: 0 };

	let pipeline = sharp(sourcePath).resize(width, height, {
		fit,
		background: format === "jpeg" ? black : transparent,
	});

	if (format === "png") pipeline = pipeline.png({ compressionLevel: 9 });
	if (format === "jpeg") pipeline = pipeline.jpeg({ quality: 92 });
	if (format === "webp") pipeline = pipeline.webp({ quality: 92 });

	// sharp can't read+write the same file path via toFile
	if (path.resolve(sourcePath) === path.resolve(targetPath)) {
		const out = await pipeline.toBuffer();
		fs.writeFileSync(targetPath, out);
		return;
	}

	await pipeline.toFile(targetPath);
}

async function getImageSize(filePath) {
	const meta = await sharp(filePath).metadata();
	return { width: meta.width, height: meta.height };
}

async function main() {
	const args = parseArgs(process.argv);
	const source = args.source || "public/favi-icon.png";
	const fitArg = typeof args.fit === "string" ? String(args.fit) : null;
	const fitMode = fitArg === "cover" || fitArg === "contain" ? fitArg : "auto";
	const verifyOnly = Boolean(args.verify);

	const sourcePath = resolveFromRoot(source);
	ensureExists(sourcePath);

	const manifestPath = resolveFromRoot("public/manifest.json");
	ensureExists(manifestPath);

	const manifest = readJson(manifestPath);
	if (!Array.isArray(manifest.icons)) {
		throw new Error("manifest.json is missing icons[]");
	}

	let generated = 0;
	let verified = 0;
	let mismatched = 0;

	const chooseFit = (width, height) => {
		if (fitMode !== "auto") return fitMode;
		return width === height ? "cover" : "contain";
	};

	for (const icon of manifest.icons) {
		if (!icon || typeof icon.src !== "string") continue;
		const size = parseSizes(icon.sizes);
		if (!size) continue;

		const targetPath = resolveFromRoot(path.join("public", icon.src));
		if (!verifyOnly) {
			await writeResized({
				sourcePath,
				targetPath,
				width: size.width,
				height: size.height,
				fit: chooseFit(size.width, size.height),
			});
			generated++;
		}

		if (fs.existsSync(targetPath)) {
			const actual = await getImageSize(targetPath);
			verified++;
			if (actual.width !== size.width || actual.height !== size.height) {
				mismatched++;
				console.warn(
					`Size mismatch: ${path.relative(
						process.cwd(),
						targetPath
					)} expected ${size.width}x${size.height} got ${
						actual.width
					}x${actual.height}`
				);
			}
		} else {
			mismatched++;
			console.warn(
				`Missing file: ${path.relative(process.cwd(), targetPath)}`
			);
		}
	}

	// Dedicated browser + iOS icons for correct tab/home-screen sizing
	const favicon512 = resolveFromRoot("public/favi-icon.png");
	const favicon32 = resolveFromRoot("public/favicon-32.png");
	const favicon16 = resolveFromRoot("public/favicon-16.png");
	const appleTouch = resolveFromRoot("public/apple-touch-icon.png");

	if (!verifyOnly) {
		await writeResized({
			sourcePath,
			targetPath: favicon512,
			width: 512,
			height: 512,
			fit: chooseFit(512, 512),
		});
		await writeResized({
			sourcePath,
			targetPath: favicon32,
			width: 32,
			height: 32,
			fit: "cover",
		});
		await writeResized({
			sourcePath,
			targetPath: favicon16,
			width: 16,
			height: 16,
			fit: "cover",
		});
		await writeResized({
			sourcePath,
			targetPath: appleTouch,
			width: 180,
			height: 180,
			fit: "cover",
		});
		generated += 4;
	}

	const favSize = fs.existsSync(favicon512) ? await getImageSize(favicon512) : null;
	if (favSize && (favSize.width !== 512 || favSize.height !== 512)) {
		console.warn(
			`Favicon size is ${favSize.width}x${favSize.height} (recommended 512x512): public/favi-icon.png`
		);
	}

	if (verifyOnly) {
		console.log(
			`Verify done. Checked ${verified} manifest icons. Issues: ${mismatched}.`
		);
	} else {
		console.log(
			`Generation done. Wrote ${generated} files from ${source} (fit=${fitMode}).`
		);
	}
	if (mismatched > 0) process.exit(2);
}

main().catch((err) => {
	console.error(err?.stack || String(err));
	process.exit(1);
});
