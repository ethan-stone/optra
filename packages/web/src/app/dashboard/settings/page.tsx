import { redirect } from "next/navigation";

export default async function Settings() {
  return redirect(`/dashboard/settings/root-clients`);
}
