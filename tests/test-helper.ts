import 'dotenv/config';
import Module from 'module';

// Polyfill server-only, next/cache, and @clerk/nextjs/server for standalone test runner execution
let mockAuthUserId: string | null = null;

export function setMockAuthUser(userId: string | null) {
  mockAuthUserId = userId;
}

export function getMockAuthUser(): string | null {
  return mockAuthUserId;
}

// @ts-expect-error Module._load internal Node signature
const originalLoad = Module._load;

// @ts-expect-error Module._load internal Node signature
Module._load = function (request: string, ...args: unknown[]) {
  if (request === 'server-only') {
    return {};
  }
  if (request === 'next/cache') {
    return {
      revalidatePath: () => {},
      revalidateTag: () => {},
      unstable_cache: (fn: unknown) => fn,
    };
  }
  if (request === '@clerk/nextjs/server') {
    return {
      auth: async () => ({
        userId: mockAuthUserId,
        sessionId: mockAuthUserId ? `sess_${mockAuthUserId}` : null,
      }),
      currentUser: async () => {
        if (!mockAuthUserId) return null;
        return {
          id: mockAuthUserId,
          emailAddresses: [{ emailAddress: `${mockAuthUserId}@crackrr.test` }],
        };
      },
      clerkClient: async () => ({
        users: {
          getUser: async (id: string) => ({
            id,
            emailAddresses: [{ emailAddress: `${id}@crackrr.test` }],
          }),
          deleteUser: async () => {},
        },
      }),
    };
  }
  return originalLoad.apply(this, [request, ...args]);
};

export const polyfilled = true;
