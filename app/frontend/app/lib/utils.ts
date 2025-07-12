import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * The single source of truth for resolving user avatar URLs.
 * Handles null values, full external URLs (from OAuth), and relative backend paths.
 * @param avatarPath The avatar path from the user object.
 * @returns A complete, valid URL for the avatar image.
 */
export const getAvatarSrc = (avatarPath: string | null | undefined): string => {
    // If the path is null, undefined, or an empty string, return a reliable external placeholder.
    if (!avatarPath) {
        return `https://via.placeholder.com/100/2A2E37/FFFFFF?text=U`;
    }
    // If the path is already a full URL (e.g., from Google's OAuth), use it directly.
    if (avatarPath.startsWith("http")) {
        return avatarPath;
    }
    // Otherwise, prepend the backend API base URL.
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
    return `${API_BASE_URL}${avatarPath}`;
};
