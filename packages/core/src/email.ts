import { SendEmailCommand, SESClient } from "@aws-sdk/client-ses";
import { MemberInviteProps, MemberInvite } from "../emails/member-invite";
import { render } from "@react-email/components";

type SendEmailParams = {
  to: string[];
  subject: string;
  body: string;
};

export interface EmailService {
  sendEmail: (params: SendEmailParams) => Promise<void>;
}

export class SESEmailService implements EmailService {
  private sesClient: SESClient;

  constructor(
    private region: string,
    private accessKeyId: string,
    private secretAccessKey: string
  ) {
    this.sesClient = new SESClient({
      region: this.region,
      credentials: {
        accessKeyId: this.accessKeyId,
        secretAccessKey: this.secretAccessKey,
      },
    });
  }

  public async sendEmail(params: SendEmailParams) {
    const { to, subject, body } = params;

    const command = new SendEmailCommand({
      Source: "noreply@phractal.xyz",
      Destination: {
        ToAddresses: to,
      },
      Message: {
        Subject: {
          Charset: "UTF-8",
          Data: subject,
        },
        Body: {
          Html: {
            Charset: "UTF-8",
            Data: body,
          },
        },
      },
    });

    await this.sesClient.send(command);
  }
}

export async function renderMemberInviteEmail(params: MemberInviteProps) {
  return await render(MemberInvite(params));
}
