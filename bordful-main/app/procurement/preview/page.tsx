import { redirect } from "next/navigation";

// Retire the fictional preview URL through the normal authenticated entry point.
export default function RetiredWorkspacePreview() {
  redirect("/procurement/organizations");
}
