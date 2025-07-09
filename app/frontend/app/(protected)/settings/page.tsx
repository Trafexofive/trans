"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/app/contexts/AuthContext";

export default function SettingsPage() {
    const { user, accessToken, refreshUserData } = useAuth();
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

    const [name, setName] = useState("");
    const [avatar, setAvatar] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (user) {
            setName(user.name);
            setAvatar(user.avatar);
        }
    }, [user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");
        setIsLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/api/users/me`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${accessToken}`,
                },
                body: JSON.stringify({ name, avatar }),
            });

            const data = await response.json();
            if (!data.success) {
                throw new Error(data.result || "Failed to update profile.");
            }

            setSuccess("Profile updated successfully!");
            // Refresh the user data in the context to reflect changes globally
            await refreshUserData();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="page-container">
            <div className="settings-container">
                <div className="chat-area-gradient w-full">
                    <div className="chat-area solid-effect">
                        <div className="settings-header">
                            <h2 className="settings-title">Profile Settings</h2>
                        </div>
                        <div className="settings-content">
                            <form
                                onSubmit={handleSubmit}
                                className="settings-section"
                            >
                                <div className="form-group">
                                    <label
                                        htmlFor="name"
                                        className="form-label"
                                    >
                                        Display Name
                                    </label>
                                    <div className="input-gradient">
                                        <input
                                            id="name"
                                            type="text"
                                            value={name}
                                            onChange={(e) =>
                                                setName(e.target.value)}
                                            className="form-input"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label
                                        htmlFor="avatar"
                                        className="form-label"
                                    >
                                        Avatar URL
                                    </label>
                                    <div className="input-gradient">
                                        <input
                                            id="avatar"
                                            type="text"
                                            value={avatar}
                                            onChange={(e) =>
                                                setAvatar(e.target.value)}
                                            className="form-input"
                                            placeholder="https://example.com/avatar.png"
                                        />
                                    </div>
                                </div>

                                {error && (
                                    <p className="text-red-500 text-sm mb-4">
                                        {error}
                                    </p>
                                )}
                                {success && (
                                    <p className="text-green-500 text-sm mb-4">
                                        {success}
                                    </p>
                                )}

                                <div className="button-gradient mt-4">
                                    <button
                                        type="submit"
                                        className="btn btn-primary w-full"
                                        disabled={isLoading}
                                    >
                                        {isLoading
                                            ? "Saving..."
                                            : "Save Changes"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
