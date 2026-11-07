import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { RequestDetail } from "@/components/procurement/RequestDetail";
import config from "@/config";
import { getRequestForBuyer } from "@/lib/procurement/request-actions";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: `Procurement Request | ${config.title}`,
};

export const dynamic = "force-dynamic";

export default async function ProcurementRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/sign-in?callbackUrl=/procurement/requests");
  }
  if (session.user.role !== "employer") {
    redirect("/");
  }

  const { id } = await params;
  const request = await getRequestForBuyer(session.user.id, id);
  if (!request) {
    notFound();
  }

  return (
    <main className="min-h-[60vh] bg-background py-12">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl">
          <RequestDetail initialRequest={request} />
        </div>
      </div>
    </main>
  );
}
