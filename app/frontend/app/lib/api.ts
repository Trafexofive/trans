interface FetchApiOptions extends RequestInit {
    token?: string | null;
}

export async function fetchApi(url: string, options: FetchApiOptions = {}) {
    const { token, ...fetchOptions } = options;

    const headers = new Headers(fetchOptions.headers || {});
    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    }
    if (
        !headers.has("Content-Type") && !(fetchOptions.body instanceof FormData)
    ) {
        headers.set("Content-Type", "application/json");
    }

    try {
        const response = await fetch(url, { ...fetchOptions, headers });
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.result || `API error: ${response.statusText}`);
        }

        return data;
    } catch (error: any) {
        // Re-throw the error to be handled by the calling component's catch block
        throw new Error(error.message || "An unknown API error occurred.");
    }
}
