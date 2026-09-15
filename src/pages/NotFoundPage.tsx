import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  useDocumentTitle("Page Not Found");
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="404"
        title="Page not found"
        description="The page you are looking for does not exist."
      />
      <Button asChild variant="outline">
        <Link to="/">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Dashboard
        </Link>
      </Button>
    </div>
  );
}