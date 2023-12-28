import { StackContext, Function, Config } from "sst/constructs";
import * as iam from "aws-cdk-lib/aws-iam";

export function SchedulerStack({ stack }: StackContext) {
  const DRIZZLE_DATABASE_URL = new Config.Secret(stack, "DRIZZLE_DATABASE_URL");

  const optraApiUser = iam.User.fromUserArn(
    stack,
    "OptraApiUser",
    "arn:aws:iam::475216627762:user/optra-api-user"
  );

  optraApiUser.addToPrincipalPolicy(
    new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ["scheduler:CreateSchedule", "iam:PassRole"],
      resources: ["*"],
    })
  );

  const handleSecretExpiredSchedule = new Function(
    stack,
    "HandleSecretExpiredSchedule",
    {
      bind: [DRIZZLE_DATABASE_URL],
      handler: "packages/lambdas/src/handle-secret-expired-schedule.handler",
    }
  );

  const schedulerRole = new iam.Role(stack, "SchedulerRole", {
    assumedBy: new iam.ServicePrincipal("scheduler.amazonaws.com"),
    inlinePolicies: {
      SchedulerPolicy: new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["lambda:InvokeFunction"],
            resources: [handleSecretExpiredSchedule.functionArn],
          }),
        ],
      }),
    },
  });

  stack.addOutputs({
    HandleSecretExpiredScheduleArn: handleSecretExpiredSchedule.functionArn,
    SchedulerRoleArn: schedulerRole.roleArn,
  });
}
