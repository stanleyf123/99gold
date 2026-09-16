export type MemberRole = "member" | "admin";

export type PublicMember = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  role: MemberRole;
};
