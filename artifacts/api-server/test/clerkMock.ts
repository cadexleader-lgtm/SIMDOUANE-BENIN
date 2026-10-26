/**
 * Stand-in for @clerk/express in tests. The caller identity comes from the
 * `x-test-user` header; what Clerk "knows" about each account (email,
 * verification, outage) is set per test through `clerkUsers`.
 */
type FakeClerkUser = { email?: string; verified?: boolean; fail?: boolean; noEmail?: boolean };

export const clerkUsers = new Map<string, FakeClerkUser>();

const clerkMock = {
  clerkMiddleware: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  getAuth: (req: { headers: Record<string, string | undefined> }) => ({
    userId: req.headers["x-test-user"] ?? null,
  }),
  createClerkClient: () => ({
    users: {
      getUser: async (id: string) => {
        const u = clerkUsers.get(id) ?? {};
        if (u.fail) throw new Error("Clerk unavailable (test)");
        return {
          id,
          primaryEmailAddressId: "email_1",
          emailAddresses: u.noEmail
            ? []
            : [
                {
                  id: "email_1",
                  emailAddress: u.email ?? `${id}@test.local`,
                  verification: { status: u.verified === false ? "unverified" : "verified" },
                },
              ],
          firstName: id,
          lastName: null,
          username: null,
        };
      },
    },
  }),
};

export default clerkMock;
