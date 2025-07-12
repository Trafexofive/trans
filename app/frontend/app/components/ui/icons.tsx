import { Loader2, Swords } from "lucide-react";

export const Icons = {
    Logo: () => <Swords className="h-6 w-6 text-primary" />,
    Spinner: ({ className }: { className?: string }) => (
        <Loader2 className={className || "h-4 w-4 animate-spin"} />
    ),
};
