"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Settings, UserCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { getAvatarSrc } from "@/lib/utils";

export default function ProfileMenu() {
    const { user, logout } = useAuth();
    const router = useRouter();

    if (!user) return null;

    const handleLogout = () => {
        logout();
        router.push("/login");
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    className="relative h-10 w-10 rounded-full"
                >
                    <img
                        className="h-10 w-10 rounded-full object-cover"
                        src={getAvatarSrc(user.avatar)}
                        alt={user.name}
                    />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">
                            {user.name}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                            {user.email}
                        </p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    onClick={() => router.push(`/profile/${user.id}`)}
                >
                    <UserCircle className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/settings")}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-destructive focus:text-destructive focus:bg-destructive/10"
                >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
