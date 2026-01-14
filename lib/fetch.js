const api_url = process.env.NEXT_PUBLIC_API_URL;
if(!api_url){
    throw new Error('Missing NEXT_PUBLIC_API_URL environment variable');
};

export const getSongsByQuery = async (e) => {
    try {
        return await fetch(`${api_url}search/songs?query=` + e);
    }
    catch (e) {
        console.log(e);
    }
};

export const getSongsByQueryPaged = async (query, { page = 1, limit = 20 } = {}) => {
    try {
        const params = new URLSearchParams();
        params.set('query', query);
        if (page != null) params.set('page', String(page));
        if (limit != null) params.set('limit', String(limit));
        return await fetch(`${api_url}search/songs?${params.toString()}`);
    }
    catch (e) {
        console.log(e);
    }
};

export const getSongsById = async (e) => {
    try {
        return await fetch(`${api_url}songs/` + e);
    }
    catch (e) {
        console.log(e);
    }
};

export const getSongsSuggestions = async (e) => {
    try {
        return await fetch(`${api_url}songs/${e}/suggestions`);
    }
    catch (e) {
        console.log(e);
    }
};

export const searchAlbumByQuery = async (e) => {
    try {
        return await fetch(`${api_url}search/albums?query=` + e);
    }
    catch (e) {
        console.log(e);
    }
};

export const searchAlbumByQueryPaged = async (query, { page = 1, limit = 20 } = {}) => {
    try {
        const params = new URLSearchParams();
        params.set('query', query);
        if (page != null) params.set('page', String(page));
        if (limit != null) params.set('limit', String(limit));
        return await fetch(`${api_url}search/albums?${params.toString()}`);
    }
    catch (e) {
        console.log(e);
    }
};

export const getAlbumById = async (e) => {
    try {
        return await fetch(`${api_url}albums?id=` + e);
    }
    catch (e) {
        console.log(e);
    }
};