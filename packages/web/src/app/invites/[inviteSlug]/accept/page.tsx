import { getUser } from "@/server/auth/utils";
import { redirect } from "next/navigation";

type InvitePageProps = {
  params: {
    inviteSlug: string;
  };
};

export default async function InvitePage(props: InvitePageProps) {
  const user = await getUser();

  if (!user) {
    const redirectTo = `/invites/${props.params.inviteSlug}`;

    return redirect(`/sign-up?redirectTo=${redirectTo}`);
  }

  return <div>Invite page {props.params.inviteSlug}</div>;
}
