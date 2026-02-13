import { MobileLayout } from "@/components/layout/MobileLayout";
import { Card } from "@/components/ui/card";

export default function NotAvailable({ title }: { title: string }) {
  return (
    <MobileLayout>
      <div className="min-h-screen pb-24 p-6">
        <Card className="p-6" data-testid="card-notavailable" dir="auto">
          <div className="text-xl font-display font-bold" data-testid="text-notavailable-title">{title}</div>
          <div className="mt-2 text-sm text-muted-foreground" data-testid="text-notavailable-desc">
            This module is included in the UI upgrade. If you don’t see it yet, refresh the app.
          </div>
        </Card>
      </div>
    </MobileLayout>
  );
}
