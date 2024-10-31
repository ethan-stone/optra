import { domain } from "./domain";

export const email = new sst.aws.Email("Email", {
  sender: "phractal.xyz",
  dns: domain,
});
