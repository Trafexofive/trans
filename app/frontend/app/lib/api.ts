interface FetchApiOptions extends RequestInit {
    token?: string | null;
}

export async function fetchApi(url: string, options: FetchApiOptions = {}) {
    const { token, body, ...fetchOptions } = options;

    const headers = new Headers(fetchOptions.headers || {});

    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    }

    if (body && !(body instanceof FormData)) {
        if (!headers.has("Content-Type")) {
            headers.set("Content-Type", "application/json");
        }
    }

    try {
        const response = await fetch(url, { ...fetchOptions, headers, body });

        if (response.status === 204) {
            return { success: true, result: "Operation successful." };
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.result || `API error: ${response.statusText}`);
        }

        return data;
    } catch (error: any) {
        throw new Error(error.message || "An unknown API error occurred.");
    }
}
