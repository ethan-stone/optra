import { redirect } from "next/navigation";

type ApiPageProps = {
  params: { apiId: string };
};

export default async function ApiPage(props: ApiPageProps) {
  return redirect(`/dashboard/apis/${props.params.apiId}/overview`);
}
