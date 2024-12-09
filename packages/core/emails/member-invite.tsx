import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Tailwind,
} from "@react-email/components";
import * as React from "react";

export interface MemberInviteProps {
  invitedByEmail: string;
  workspaceName: string;
  inviteLink: string;
}

export const MemberInvite = ({
  workspaceName,
  invitedByEmail,
  inviteLink,
}: MemberInviteProps) => {
  const previewText = `You've been invited to join ${workspaceName} on Optra`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="bg-white my-auto mx-auto font-sans px-2">
          <Container className="border border-solid border-[#eaeaea] rounded my-[40px] mx-auto p-[20px] max-w-[465px]">
            <Heading className="text-black text-[24px] font-normal text-left p-0 my-[30px] mx-0">
              You've been invited to join <strong>{workspaceName}</strong> on{" "}
              <strong>Optra</strong>
            </Heading>
            <Text className="text-black text-[14px] leading-[24px]">
              Hello,
            </Text>
            <Text className="text-black text-[14px] leading-[24px]">
              <Link
                href={`mailto:${invitedByEmail}`}
                className="text-blue-600 no-underline"
              >
                {invitedByEmail}
              </Link>{" "}
              has invited you to the <strong>{workspaceName}</strong> team on{" "}
              <strong>Optra</strong>.
            </Text>
            <Section className="text-center mb-[32px]">
              <Button
                className="bg-[#000000] rounded text-white text-[12px] font-semibold no-underline text-center px-5 py-3"
                href={inviteLink}
              >
                Accept Invite
              </Button>
            </Section>
            <Text className="text-black text-[14px] leading-[24px]">
              or copy and paste this URL into your browser:{" "}
              <Link href={inviteLink} className="text-blue-600 no-underline">
                {inviteLink}
              </Link>
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

MemberInvite.PreviewProps = {
  invitedByEmail: "alan.turing@example.com",
  workspaceName: "Enigma",
  inviteLink: "https://phractal.xyz/invites/1234567890/accept",
} as MemberInviteProps;

export default MemberInvite;
