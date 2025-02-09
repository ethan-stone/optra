import { useUser as useClerkUser, useOrganization } from "@clerk/nextjs";

export type User = {
  id: string;
  email: string;
  activeOrganizationId: string | null;
  role: "admin" | "developer" | "viewer";
};

export function useUser() {
  const { user, isLoaded } = useClerkUser();
  const { organization } = useOrganization();

  const email = user?.primaryEmailAddress?.emailAddress;

  return {
    isLoaded,
    user:
      user && email
        ? {
            id: user.id,
            email,
            activeOrganizationId: organization?.id ?? null,
            role: "admin",
          }
        : null,
  };
}
