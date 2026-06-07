import { Timestamp } from "firebase/firestore";

export interface Scene {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  authorId: string;
  authorName: string;
  authorPhoto: string;
  createdAt: Timestamp;
  upvotes: number;
  category?: string;
  hashtags?: string[];
  confidence?: number; // 予想共感度(0~100)
  views?: number;      // 閲覧数
  commentCount?: number;  // コメント数
  profileVisits?: number; // プロフィールアクセス数
  isAnonymousPost?: boolean;
}

export interface Follow {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: Timestamp;
}

export interface Chat {
  id: string;
  participants: string[];
  lastMessage?: string;
  updatedAt: Timestamp;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  createdAt: Timestamp;
  read: boolean;
}

export interface Comment {
  id: string;
  sceneId: string;
  authorId: string;
  authorName: string;
  authorPhoto: string;
  content: string;
  createdAt: Timestamp;
}

export interface Profile {
  uid: string;
  displayName: string;
  photoURL: string;
  bio: string;
  updatedAt: Timestamp;
  lastActiveAt?: Timestamp;
  isBanned?: boolean;
  isAnonymous?: boolean;
  lastReadAnnouncementId?: string;
  selectedTitle?: string; // 選択中の称号
  equippedBadges?: string[]; // 装備中のバッジIDの配列（最大5個）

  // 2つ名とバッジの解放基準用統計データ
  postsCount?: number;             // 投稿数
  deletedPostsCount?: number;       // 削除された投稿数
  loginStreak?: number;            // ログイン連続日数
  lastLoginDate?: string;          // 最終ログイン日 (YYYY-MM-DD)
  totalLoginDays?: number;         // 累積継続・ログイン日数
  viewsCount?: number;             // 閲覧した総回数
  upvotesReceived?: number;        // 獲得した総共感(upvotes)数
  maxUpvotesOnSinglePost?: number; // 1つの投稿あたり獲得した最大共感数
  midnightPostsCount?: number;     // 深夜帯(23時~4時)に投稿した回数
  commentRate?: number;            // 投稿へのコメント率 (コメント数 / 閲覧数 * 100 または自己申告)
  weekdayDaytimePostsCount?: number; // 平日昼の投稿数
  midnightActiveStreak?: number;   // 深夜3日連続度
  commentsBlockedCount?: number;   // コメント停止・ブロックされた回数
  gachaWon?: boolean;              // ガチャでおみくじ等に当選したフラグ
  returnedAfter30Days?: boolean;   // 30日以上経過した後に再び復帰したか
  opsSecret?: boolean;             // 運営秘密コード
  myCommentsCount?: number;        // 自分で投稿したコメント数
  isTopPercentile?: boolean;       // 全体の上位1%
  registeredAt?: Timestamp;         // 登録日
  midnightViewsCount?: number;     // 2時以降に閲覧した回数
  hasSeenTutorial?: boolean;       // 初回チュートリアルの閲覧履歴フラグ
  region?: string;                 // 地域設定 (e.g. 'Queensland')
  hasCrossedOcean?: boolean;       // 海を越えたフラグ
  isFirstOverseasUser?: boolean;   // 初の海外ユーザー
  language?: string;               // 言語設定
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  createdAt: Timestamp;
  authorId: string;
}

export interface Report {
  id: string;
  reporterId: string;
  targetId: string;
  targetType: 'scene' | 'profile' | 'comment';
  reason: string;
  createdAt: Timestamp;
}

export interface AdminMessage {
  id: string;
  recipientId: string;
  senderId: string;
  content: string;
  createdAt: Timestamp;
  read: boolean;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export interface PlazaSubmission {
  id: string;
  userId: string;
  userName: string;
  userPhoto: string;
  type: 'haiku' | 'dajare';
  content: string;
  date: string; // YYYY-MM-DD
  createdAt: Timestamp;
  votesCount?: number;
}

export interface PlazaVote {
  id: string;
  userId: string;
  submissionId: string;
  date: string;
  type: 'haiku' | 'dajare';
  matchIndex: number;
}

export interface PlazaBook {
  id: string;
  title: string;
  description: string;
  content: string;
  authorId: string;
  authorName: string;
  authorPhoto: string;
  createdAt: Timestamp;
  likesCount: number;
  empathiesCount: number;
  likedBy: string[];
  empathizedBy: string[];
}

export interface PlazaSurvey {
  id: string;
  question: string;
  authorId: string;
  authorName: string;
  authorPhoto?: string;
  yesVotes: number;
  noVotes: number;
  createdAt: Timestamp;
}

export interface PlazaSurveyVote {
  id: string;
  userId: string;
  surveyId: string;
  choice: 'yes' | 'no';
  createdAt: Timestamp;
}

export interface TermsPrivacySection {
  id: string;
  title: string;
  paragraphs: string[];
}

export interface GuidelineRule {
  num: number;
  title: string;
  content: string;
  bullets?: string[];
}

export interface GuidelinesData {
  intro: string;
  rules: GuidelineRule[];
  okExamples: string[];
  ngExamples: string[];
  closingHeadline: string;
  closingBody: string;
}

export interface LegalDocument {
  id: string; // "terms", "privacy", "guidelines"
  docType: 'terms' | 'privacy' | 'guidelines';
  updatedAt: string;
  termsPrivacySections?: TermsPrivacySection[];
  guidelinesData?: GuidelinesData;
}


