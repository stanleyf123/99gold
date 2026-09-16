export type LinkConflict = "disabled" | "provider_taken" | "email_taken";

export type LinkDecision =
  | { action: "login"; userId: string }
  | { action: "create" }
  | { action: "link"; userId: string }
  | { action: "conflict"; reason: LinkConflict };

export type LinkedUserRef = {
  userId: string;
  disabled: boolean;
};

/**
 * Decide whether an OAuth profile should log into an existing user,
 * attach to the current session, or create a new member.
 */
export function decideAccountLink(input: {
  currentUser: LinkedUserRef | null;
  accountByProvider: LinkedUserRef | null;
  userByEmail: LinkedUserRef | null;
}): LinkDecision {
  const { currentUser, accountByProvider, userByEmail } = input;

  if (accountByProvider) {
    if (accountByProvider.disabled) return { action: "conflict", reason: "disabled" };
    if (currentUser && currentUser.userId !== accountByProvider.userId) {
      return { action: "conflict", reason: "provider_taken" };
    }
    return { action: "login", userId: accountByProvider.userId };
  }

  if (currentUser) {
    if (currentUser.disabled) return { action: "conflict", reason: "disabled" };
    if (userByEmail && userByEmail.userId !== currentUser.userId) {
      return { action: "conflict", reason: "email_taken" };
    }
    return { action: "link", userId: currentUser.userId };
  }

  if (userByEmail) {
    if (userByEmail.disabled) return { action: "conflict", reason: "disabled" };
    return { action: "link", userId: userByEmail.userId };
  }

  return { action: "create" };
}
