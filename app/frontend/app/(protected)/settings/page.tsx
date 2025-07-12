"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/Card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Edit, Loader2 } from "lucide-react";

export default function SettingsPage() {
    const { user, accessToken, refreshUserData, logout } = useAuth();
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

    const [name, setName] = useState("");
    const [isUpdating, setIsUpdating] = useState(false);
    const [updateError, setUpdateError] = useState("");
    const [updateSuccess, setUpdateSuccess] = useState("");

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [deletePassword, setDeletePassword] = useState("");
    const [deleteError, setDeleteError] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    useEffect(() => {
        if (user) {
            setName(user.name);
        }
    }, [user]);

    const handleProfileSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsUpdating(true);
        setUpdateError("");
        setUpdateSuccess("");
        try {
            const res = await fetch(`${API_BASE_URL}/api/users/me`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${accessToken}`,
                },
                body: JSON.stringify({ name }),
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.result);
            setUpdateSuccess("Display name updated successfully!");
            await refreshUserData();
        } catch (err: any) {
            setUpdateError(err.message);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleFileChange = async (
        event: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const file = event.target.files?.[0];
        if (!file || !accessToken) return;

        setIsUpdating(true);
        setUpdateError("");
        setUpdateSuccess("");
        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch(`${API_BASE_URL}/api/users/me/avatar`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${accessToken}` },
                body: formData,
            });
            const data = await res.json();
            if (!data.success) {
                throw new Error(data.result || "Avatar upload failed.");
            }
            setUpdateSuccess("Avatar updated successfully!");
            await refreshUserData();
        } catch (err: any) {
            setUpdateError(err.message);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDeleteSubmit = async () => {
        setIsDeleting(true);
        setDeleteError("");
        try {
            if (!accessToken) throw new Error("Authentication error.");
            const res = await fetch(`${API_BASE_URL}/api/users/me`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${accessToken}`,
                },
                body: JSON.stringify({ password: deletePassword }),
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.result);
            alert("Account deleted successfully.");
            setIsDeleteDialogOpen(false);
            logout();
        } catch (err: any) {
            setDeleteError(err.message);
        } finally {
            setIsDeleting(false);
        }
    };

    const getAvatarSrc = () => {
        if (!user?.avatar) return "/avatars/default.png";
        if (user.avatar.startsWith("http")) return user.avatar;
        return `${API_BASE_URL}${user.avatar}`;
    };

    return (
        <div className="container mx-auto max-w-2xl py-8 space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">Profile Settings</CardTitle>
                    <CardDescription>
                        Update your display name and avatar.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center gap-6">
                        <div
                            className="relative group cursor-pointer"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <img
                                src={getAvatarSrc()}
                                alt="User Avatar"
                                className="w-24 h-24 rounded-full object-cover border-2 border-primary"
                            />
                            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                {isUpdating
                                    ? (
                                        <Loader2 className="h-8 w-8 text-white animate-spin" />
                                    )
                                    : <Edit className="h-8 w-8 text-white" />}
                            </div>
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                            accept="image/png, image/jpeg"
                        />
                        <p className="text-sm text-muted-foreground">
                            Click your avatar to upload a new one (PNG, JPG).
                        </p>
                    </div>
                    <form onSubmit={handleProfileSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label
                                htmlFor="name"
                                className="text-sm font-medium"
                            >
                                Display Name
                            </label>
                            <Input
                                id="name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>
                        {updateError && (
                            <p className="text-sm font-medium text-destructive">
                                {updateError}
                            </p>
                        )}
                        {updateSuccess && (
                            <p className="text-sm font-medium text-green-500">
                                {updateSuccess}
                            </p>
                        )}
                        <Button
                            type="submit"
                            disabled={isUpdating}
                            className="w-full"
                        >
                            {isUpdating && !isDeleting
                                ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...
                                    </>
                                )
                                : "Save Name"}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <Card className="border-destructive">
                <CardHeader>
                    <CardTitle className="text-destructive">
                        Danger Zone
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        Permanently delete your account and all associated data.
                    </p>
                </CardContent>
                <CardFooter>
                    <Dialog
                        open={isDeleteDialogOpen}
                        onOpenChange={setIsDeleteDialogOpen}
                    >
                        <DialogTrigger asChild>
                            <Button variant="destructive">
                                Delete My Account
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>
                                    Are you absolutely sure?
                                </DialogTitle>
                                <DialogDescription>
                                    This action cannot be undone. To confirm,
                                    please type your password.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-2 py-4">
                                <Input
                                    id="delete-confirm"
                                    type="password"
                                    value={deletePassword}
                                    onChange={(e) =>
                                        setDeletePassword(e.target.value)}
                                    placeholder="Enter your password..."
                                />
                                {deleteError && (
                                    <p className="text-sm text-destructive">
                                        {deleteError}
                                    </p>
                                )}
                            </div>
                            <DialogFooter>
                                <Button
                                    variant="destructive"
                                    onClick={handleDeleteSubmit}
                                    disabled={isDeleting}
                                >
                                    {isDeleting
                                        ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        )
                                        : null}
                                    I understand, delete my account
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </CardFooter>
            </Card>
        </div>
    );
}
