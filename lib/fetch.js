/*
Legal Disclaimer:
- This project is for educational and personal learning purposes.
- All third-party content belongs to its respective owners.
- This project does not host or claim ownership of external content.
- The developer is not responsible for misuse.
- Third-party services are used under their own terms and policies.
*/

const raw_api_url = process.env.NEXT_PUBLIC_API_URL;
if (!raw_api_url) {
	throw new Error("Missing NEXT_PUBLIC_API_URL environment variable");
}

const api_url = raw_api_url.endsWith("/") ? raw_api_url : `${raw_api_url}/`;

export const getSongsByQuery = async (e) => {
	try {
		return await fetch(`${api_url}search/songs?query=` + e);
	} catch (e) {
		console.log(e);
	}
};

export const getSongsByQueryPaged = async (
	query,
	{ page = 1, limit = 20 } = {},
) => {
	try {
		const params = new URLSearchParams();
		params.set("query", query);
		if (page != null) params.set("page", String(page));
		if (limit != null) params.set("limit", String(limit));
		return await fetch(`${api_url}search/songs?${params.toString()}`);
	} catch (e) {
		console.log(e);
	}
};

export const getSongsById = async (e) => {
	try {
		return await fetch(`${api_url}songs/` + e);
	} catch (e) {
		console.log(e);
	}
};

export const getSongsSuggestions = async (e) => {
	try {
		return await fetch(`${api_url}songs/${e}/suggestions`);
	} catch (e) {
		console.log(e);
	}
};

export const searchAlbumByQuery = async (e) => {
	try {
		return await fetch(`${api_url}search/albums?query=` + e);
	} catch (e) {
		console.log(e);
	}
};

export const searchAlbumByQueryPaged = async (
	query,
	{ page = 1, limit = 20 } = {},
) => {
	try {
		const params = new URLSearchParams();
		params.set("query", query);
		if (page != null) params.set("page", String(page));
		if (limit != null) params.set("limit", String(limit));
		return await fetch(`${api_url}search/albums?${params.toString()}`);
	} catch (e) {
		console.log(e);
	}
};

export const getAlbumById = async (e) => {
	try {
		return await fetch(`${api_url}albums?id=` + e);
	} catch (e) {
		console.log(e);
	}
};
