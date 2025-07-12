import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
}

export const StatCard = ({ title, value, icon }: StatCardProps) => (
    <Card className="bg-card/50 backdrop-blur-sm transition-all hover:border-primary/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
                {title}
            </CardTitle>
            {icon}
        </CardHeader>
        <CardContent>
            <div className="text-3xl font-bold">{value}</div>
        </CardContent>
    </Card>
);
