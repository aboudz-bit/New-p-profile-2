import { MobileLayout } from "@/components/layout/MobileLayout";
import { MOCK_INVOICES } from "@/lib/mockData";
import { Card } from "@/components/ui/card";
import { FileText, Download, Eye } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";

export default function Documents() {
  return (
    <MobileLayout>
      <div className="p-6 space-y-6 pb-24">
        <h1 className="text-2xl font-display font-bold">Documents</h1>

        <div className="space-y-4">
          {MOCK_INVOICES.map(invoice => (
            <Card key={invoice.id} className="p-4 flex items-center justify-between group hover:shadow-md transition-all">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 text-primary rounded-lg flex items-center justify-center shrink-0">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">{invoice.merchant}</h3>
                  <div className="text-xs text-muted-foreground flex gap-2 mt-1">
                    <span>{format(invoice.date, 'MMM d, yyyy')}</span>
                    <span>•</span>
                    <span>{invoice.currency} {invoice.total.toFixed(2)}</span>
                  </div>
                  <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 mt-1 inline-block">
                    {invoice.itemsCount} products linked
                  </span>
                </div>
              </div>
              
              <Button variant="ghost" size="icon" className="text-slate-400 group-hover:text-primary">
                <Eye className="w-5 h-5" />
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </MobileLayout>
  );
}
