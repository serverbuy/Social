import type { ProfileClip } from "@/lib/media";

export type Privacy = "public" | "friends" | "server" | "private";
export type DmPrivacy = "everyone" | "friends" | "nobody";

export type Profile = {
  userId: string;
  username: string;
  displayName: string;
  bio: string;
  avatarKey: string;
  bannerKey: string;
  sceneTags: string[];
  songName: string;
  songData: string;
  songCover: string;
  songLink: string;
  gameName: string;
  widgets: string;
  deco: string;
  statusText: string;
  themeId: string;
  lang: string;
  bannerPreset: string;
  clips: ProfileClip[];
  privacy: Privacy;
  dmPrivacy: DmPrivacy;
  badge: string;
  activityPublic: boolean;
  verified: boolean;
  isSeed: boolean;
  isMod: boolean;
  hallAccess: boolean;
  createdAt: string;
  lastSeen: string;
  friendsCount: number;
  serversCount: number;
  famousRank: number | null;
  richestRank: number | null;
  duoRank: number | null;
};

export type RankRow = {
  userId: string;
  username: string;
  displayName: string;
  bio: string;
  avatarKey: string;
  sceneTags: string[];
  verified: boolean;
  badge: string;
  rank: number;
  score: number;
  prevScore: number;
  trend: number;
  lastDonationCents: number | null;
  lastDonationAt: string | null;
  topDonorUsername: string | null;
  lastOvertake: string | null;
};

export type DuoRow = {
  id: number;
  name: string;
  bio: string;
  a: Pick<Profile, "userId" | "username" | "displayName" | "avatarKey" | "verified">;
  b: Pick<Profile, "userId" | "username" | "displayName" | "avatarKey" | "verified">;
  rank: number;
  score: number;
  prevScore: number;
  trend: number;
};

export type LiveEvent = {
  id: number;
  kind: string;
  body: string;
  href: string;
  createdAt: string;
};

export type ThreadCard = {
  id: number;
  board: string;
  title: string;
  authorUsername: string;
  authorDisplay: string;
  authorAvatar: string;
  authorBadge: string;
  pinned: boolean;
  hallOnly: boolean;
  replies: number;
  createdAt: string;
};

export type PostRow = {
  id: number;
  authorId: string;
  authorUsername: string;
  authorDisplay: string;
  authorAvatar: string;
  authorBadge: string;
  body: string;
  createdAt: string;
};

export type ChatRow = {
  id: number;
  channelType: string;
  channelId: string;
  authorId: string;
  authorUsername: string;
  authorDisplay: string;
  authorAvatar: string;
  authorBadge: string;
  body: string;
  createdAt: string;
  editedAt: string | null;
  replyTo: number | null;
  reactions: { emoji: string; count: number; mine: boolean }[];
  authorRole: string;
};

export type FriendRow = {
  userId: string;
  username: string;
  displayName: string;
  avatarKey: string;
  status: "pending" | "accepted" | "declined" | "blocked";
  incoming: boolean;
  lastSeen: string;
  online: boolean;
  lastBody: string;
  lastAt: string;
  unread: boolean;
};

export type GroupRow = {
  id: number;
  name: string;
  ownerId: string;
  memberCount: number;
  role: string;
};

export type ServerRow = {
  id: number;
  name: string;
  slug: string;
  description: string;
  visibility: "public" | "invite" | "private";
  ownerId: string;
  memberCount: number;
  joined: boolean;
  role: string | null;
  inviteCode: string;
};

export type ChannelRow = {
  id: number;
  name: string;
  kind: string;
  position: number;
};

export type ServerMember = {
  userId: string;
  username: string;
  displayName: string;
  avatarKey: string;
  role: string;
};

export type HallItem = {
  id: number;
  title: string;
  body: string;
  tag: string;
  posterUsername: string;
  posterDisplay: string;
  createdAt: string;
};

export type ConnectionRow = {
  userId: string;
  username: string;
  displayName: string;
  avatarKey: string;
  status: string;
  outgoing: boolean;
};

export type NominationRow = {
  id: number;
  world: string;
  targetUsername: string;
  secondUsername: string | null;
  nominatorUsername: string;
  status: string;
  createdAt: string;
};

export type MeState = {
  signedIn: boolean;
  profile: Profile | null;
};
