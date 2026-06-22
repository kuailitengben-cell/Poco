import React, { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  doc, 
  getDoc,
  updateDoc, 
  arrayUnion, 
  arrayRemove,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  ArrowLeft, 
  Plus, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  TrendingUp, 
  MessageSquare, 
  ThumbsUp,
  Pin,
  Flame,
  User,
  Clock,
  Sparkles
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useLanguage } from '../lib/LanguageContext';

interface Kaiwai {
  id: string;
  name: string;
  description: string;
  creatorId: string;
  creatorName: string;
  createdAt: any;
  status: 'pending' | 'approved' | 'rejected';
}

interface Scene {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  authorId: string;
  authorName: string;
  authorPhoto: string;
  createdAt: any;
  upvotes: number;
  category?: string;
  hashtags?: string[];
  kaiwaiTags?: string[];
  observationTags?: string[];
  views?: number;
  commentCount?: number;
  kairanAmount?: number;
}

interface KaiwaiViewProps {
  user: any;
  profile: any;
  onBack: () => void;
  onOpenScene: (scene: any) => void;
  onOpenProfile: (uid: string) => void;
  isAdmin?: boolean;
}

export default function KaiwaiView({ 
  user, 
  profile, 
  onBack, 
  onOpenScene, 
  onOpenProfile,
  isAdmin = false
}: KaiwaiViewProps) {
  const { t } = useLanguage();
  const [subView, setSubView] = useState<'list' | 'create' | 'detail'>('list');
  const [kaiwais, setKaiwais] = useState<Kaiwai[]>([]);
  const [selectedKaiwai, setSelectedKaiwai] = useState<Kaiwai | null>(null);
  
  // Creation Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [confirmedChecks, setConfirmedChecks] = useState({
    nameLocked: false,
    descLocked: false,
    deleteFormRequired: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [userPostsCount, setUserPostsCount] = useState<number | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  
  // Detail page feed state
  const [feedTab, setFeedTab] = useState<'latest' | 'jimi' | 'kairan'>('latest');
  const [feedScenes, setFeedScenes] = useState<Scene[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);

  // Load Approved Kaiwais & Seed Default ones if empty
  const fetchKaiwais = async () => {
    try {
      const q = query(collection(db, 'kaiwais'), where('status', '==', 'approved'));
      const snap = await getDocs(q);
      const list: Kaiwai[] = [];
      snap.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() } as Kaiwai);
      });

      if (list.length === 0) {
        // Seed initial Kaiwais for simulation and prompt compliance (学校, 深夜, 冷蔵庫, 買い物)
        const defaults = [
          {
            name: '学校',
            description: '学校生活の中で発生する地味な現象（チャイム瞬間の猛ダッシュ、プリントを後ろに回す時の無言、筆箱に潜む謎のネジなど）を観測する場所。',
            creatorId: 'admin_root',
            creatorName: '運営',
            status: 'approved' as const,
            createdAt: new Date()
          },
          {
            name: '深夜',
            description: '特に何もないのに深夜2時にスマホを1時間巡回する、冷気が恋しくなって意味なく冷蔵庫をパトロールする等の、丑三つ時の地味な生態観測所。',
            creatorId: 'admin_root',
            creatorName: '運営',
            status: 'approved' as const,
            createdAt: new Date()
          },
          {
            name: '冷蔵庫',
            description: '開けた瞬間に何を取りに来たか完全に失念する、奥から3ヶ月前の未開封のプリンが古代地層から発掘されるなど、冷蔵庫と人類の静かなる記録。',
            creatorId: 'admin_root',
            creatorName: '運営',
            status: 'approved' as const,
            createdAt: new Date()
          },
          {
            name: '買い物',
            description: '買う予定の無かった変な形のお惣菜をカゴに入れる、セロハンレジ袋の口がカサカサして全く開かないなど、買い出しに潜むミステリアスな挙動。',
            creatorId: 'admin_root',
            creatorName: '運営',
            status: 'approved' as const,
            createdAt: new Date()
          }
        ];

        for (const item of defaults) {
          const docRef = await addDoc(collection(db, 'kaiwais'), {
            ...item,
            createdAt: serverTimestamp()
          });
          list.push({ id: docRef.id, ...item, createdAt: new Date() } as Kaiwai);
        }
      }

      setKaiwais(list);
    } catch (err) {
      console.error("Failed to load kaiwais:", err);
    }
  };

  useEffect(() => {
    fetchKaiwais();
  }, []);

  // Fetch current user posts count
  useEffect(() => {
    if (!user) return;
    const fetchCount = async () => {
      try {
        const q = query(collection(db, 'scenes'), where('authorId', '==', user.uid));
        const snap = await getDocs(q);
        setUserPostsCount(snap.size);
      } catch (err) {
        console.error("Failed to get post count:", err);
        setUserPostsCount(0);
      }
    };
    fetchCount();
  }, [user]);

  // Load Feed Scenes for selected Kaiwai
  useEffect(() => {
    if (!selectedKaiwai) return;
    setFeedLoading(true);

    const loadKaiwaiFeed = async () => {
      try {
        // Safe, robust client-side filtering to bypass Firestore index limits
        const scenesQuery = query(collection(db, 'scenes'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(scenesQuery);
        const scenes: Scene[] = [];

        snap.forEach(d => {
          const data = d.data();
          const kTags = data.observationTags || data.kaiwaiTags || [];
          const hashs = data.hashtags || [];
          
          // Match by user chosen observation tags or regular hashtags mapping to Kaiwai name
          const normalizedKaiwaiName = selectedKaiwai.name.toLowerCase();
          const hasTag = kTags.some((tag: string) => tag.toLowerCase() === normalizedKaiwaiName) ||
                         hashs.some((tag: string) => tag.toLowerCase() === normalizedKaiwaiName);

          if (hasTag) {
            scenes.push({ id: d.id, ...data } as Scene);
          }
        });

        // Apply sorting based on tab
        if (feedTab === 'jimi') {
          // Sort by upvotes ascending (Most humble first)
          scenes.sort((a, b) => (a.upvotes || 0) - (b.upvotes || 0));
        } else if (feedTab === 'kairan') {
          // Filter out kairanAmount > 0 and sort by createdAt desc
          const filtered = scenes.filter(s => (s.kairanAmount || 0) > 0);
          filtered.sort((a, b) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
            return dateB - dateA;
          });
          setFeedScenes(filtered);
          setFeedLoading(false);
          return;
        } else {
          // Latest: Sort by createdAt desc
          scenes.sort((a, b) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
            return dateB - dateA;
          });
        }

        setFeedScenes(scenes);
      } catch (e) {
        console.error("Error loading Kaiwai feed:", e);
      } finally {
        setFeedLoading(false);
      }
    };

    loadKaiwaiFeed();
  }, [selectedKaiwai, feedTab]);

  // Handle follow toggle
  const handleFollowToggle = async (kaiwai: Kaiwai) => {
    if (!user) return;
    try {
      const userDocRef = doc(db, 'profiles', user.uid);
      const currentFollows = profile?.followedKaiwais || [];
      const isFollowing = currentFollows.includes(kaiwai.name);

      if (isFollowing) {
        await updateDoc(userDocRef, {
          followedKaiwais: arrayRemove(kaiwai.name)
        });
      } else {
        await updateDoc(userDocRef, {
          followedKaiwais: arrayUnion(kaiwai.name)
        });
      }
    } catch (e) {
      console.error("Failed to toggle follow:", e);
    }
  };

  // Check if current user is an admin
  const isActualAdmin = isAdmin || profile?.isAdmin === true;

  // Handle submit Kaiwai application
  const handleApplyKaiwai = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isSubmitting) return;

    if (!name.trim()) return;
    if (name.length > 30) return;
    if (description.length > 300) return;

    // Checks are only mandatory for non-admin users
    if (!isActualAdmin && (!confirmedChecks.nameLocked || !confirmedChecks.descLocked || !confirmedChecks.deleteFormRequired)) {
      alert("確認事項のチェック項目をすべて確認してください。");
      return;
    }

    setIsSubmitting(true);
    try {
      const trimmedName = name.trim();
      const trimmedDesc = description.trim();
      const creatorName = profile?.displayName || user.displayName || '名無しさん';

      if (isActualAdmin) {
        // Create approved kaiwai immediately in the main 'kaiwais' collection for instant reflection
        await addDoc(collection(db, 'kaiwais'), {
          name: trimmedName,
          description: trimmedDesc,
          creatorId: user.uid,
          creatorName: `${creatorName} [管理者]`,
          status: 'approved',
          createdAt: serverTimestamp()
        });

        // Also add to 'kaiwai_requests' as an approved record
        await addDoc(collection(db, 'kaiwai_requests'), {
          name: trimmedName,
          description: trimmedDesc,
          creatorId: user.uid,
          creatorName: `${creatorName} [管理者]`,
          creatorPostsCount: userPostsCount || 0,
          status: 'approved',
          createdAt: serverTimestamp()
        });
      } else {
        // Standard user request
        await addDoc(collection(db, 'kaiwai_requests'), {
          name: trimmedName,
          description: trimmedDesc,
          creatorId: user.uid,
          creatorName: creatorName,
          creatorPostsCount: userPostsCount || 0,
          status: 'pending',
          createdAt: serverTimestamp()
        });
      }

      setSubmitSuccess(true);
      setName('');
      setDescription('');
      setConfirmedChecks({
        nameLocked: false,
        descLocked: false,
        deleteFormRequired: false
      });
      fetchKaiwais();
    } catch (err) {
      console.error("Failed to submit/create kaiwai:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredKaiwais = kaiwais.filter(k => 
    k.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    k.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 font-sans">
      
      {/* 1. Header / Navigation */}
      <div className="flex items-center gap-3 mb-8">
        <button 
          onClick={() => {
            if (subView === 'detail') {
              setSubView('list');
              setSelectedKaiwai(null);
            } else if (subView === 'create') {
              setSubView('list');
              setSubmitSuccess(false);
            } else {
              onBack();
            }
          }}
          className="p-2 sm:p-2.5 rounded-2xl bg-orange-50 hover:bg-orange-100 transition active:scale-95 text-orange-950 flex items-center justify-center cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-orange-950 flex items-center gap-2">
            <span>🪐</span>
            <span>{subView === 'list' ? '現象界隈' : subView === 'create' ? '界隈の申請' : `${selectedKaiwai?.name}界隈`}</span>
          </h1>
          <p className="text-[11px] text-orange-500 font-bold block">
            {subView === 'list' && '人類の地味な現象を集める観測所'}
            {subView === 'create' && '新たな地味現象のカテゴリを管理者に提案する'}
            {subView === 'detail' && 'この現象を観測・共有する住人たちの空間'}
          </p>
        </div>
      </div>

      {/* 2. SUB VIEW: LIST OF KAIWAIS */}
      {subView === 'list' && (
        <div className="space-y-6">
          
          {/* Concept Banner */}
          <div className="bg-[#fcf8f2] border border-orange-100 p-5 rounded-[24px] text-left">
            <h3 className="text-sm font-bold text-orange-900 mb-1 flex items-center gap-1.5 leading-none">
              <span className="text-base">📢</span>
              <span>地味っちは「人をフォローするSNS」ではありません</span>
            </h3>
            <p className="text-xs text-orange-800/80 leading-relaxed">
              ここは「現象を観測するSNS」です。気になる「界隈（現象）」をフォローして、日々の何気ないやらかしや、みんなの「あるある」を静かに観測しましょう。数字による人気競争は存在しません。
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <input 
                type="text"
                placeholder="界隈名や説明から検索..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-orange-50 border border-orange-100 rounded-2xl pl-11 pr-4 py-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all text-orange-950 font-medium"
              />
              <Search className="w-4 h-4 text-orange-400 absolute left-4 top-1/2 -translate-y-1/2" />
            </div>

            <button 
              onClick={() => setSubView('create')}
              className="bg-orange-950 hover:bg-orange-900 border border-transparent text-white px-5 py-3 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm pointer-events-auto cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>界隈を新規申請</span>
            </button>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredKaiwais.map((kaiwai) => {
              const isFollowed = profile?.followedKaiwais?.includes(kaiwai.name);
              return (
                <div 
                  key={kaiwai.id}
                  onClick={() => {
                    setSelectedKaiwai(kaiwai);
                    setSubView('detail');
                  }}
                  className="bg-white border border-orange-100 rounded-[28px] p-5 hover:shadow-md transition text-left cursor-pointer flex flex-col justify-between group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold px-3 py-1 bg-orange-50 border border-orange-100 text-orange-800 rounded-full">
                        📌 {kaiwai.name}界隈
                      </span>
                      {isFollowed && (
                        <span className="text-[10px] font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg">
                          観測中 🪐
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-orange-950/80 leading-relaxed font-sans line-clamp-3">
                      {kaiwai.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-orange-50/50 mt-4 text-[11px] text-orange-400">
                    <span className="flex items-center gap-1 font-semibold">
                      <User className="w-3.5 h-3.5" />
                      提案: {kaiwai.creatorName}
                    </span>
                    <span className="text-orange-900 font-bold group-hover:underline flex items-center gap-0.5 cursor-pointer">
                      中に入る →
                    </span>
                  </div>
                </div>
              );
            })}

            {filteredKaiwais.length === 0 && (
              <div className="col-span-1 md:col-span-2 text-center py-12 text-orange-400 font-medium text-xs">
                該当する現象界隈が見つかりませんでした。
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. SUB VIEW: CREATE APPLICATION */}
      {subView === 'create' && (
        <div className="max-w-xl mx-auto">
          {!isActualAdmin && userPostsCount !== null && userPostsCount < 50 ? (
            /* Creation Block Rule Check */
            <div className="bg-orange-50/80 border border-dashed border-orange-200 rounded-[28px] p-6 text-center space-y-4">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto text-orange-700">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <h3 className="text-sm font-black text-orange-900">
                界隈作成の申請条件を満たしていません
              </h3>
              <p className="text-xs text-orange-850/80 leading-relaxed max-w-sm mx-auto">
                「界隈を作成するには50件以上の観測投稿が必要です」
                <br />
                これは、Jimicchiが本当に共感される地味な現象を観測できるようにするための品質保全基準です。日常のやらかしを投稿してみましょう。
              </p>
              
              <div className="bg-white border border-orange-100 p-4 rounded-2xl max-w-xs mx-auto text-left space-y-1">
                <div className="flex justify-between text-[11px] font-bold text-orange-600">
                  <span>あなたの投稿実績</span>
                  <span>{userPostsCount} / 50 件</span>
                </div>
                <div className="w-full bg-orange-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-orange-800 h-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (userPostsCount / 50) * 100)}%` }}
                  />
                </div>
              </div>

              <button 
                onClick={() => setSubView('list')}
                className="bg-orange-950 text-white text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-orange-900 transition"
              >
                界隈一覧へ戻る
              </button>
            </div>
          ) : submitSuccess ? (
            /* Success Screen */
            <div className="bg-amber-50/50 border border-amber-250 rounded-[28px] p-8 text-center space-y-4">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto text-amber-700">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-black text-orange-950">
                {isActualAdmin ? '界隈を即時新規登録しました！' : '界隈の申請を送信しました'}
              </h3>
              <p className="text-xs text-orange-850/80 leading-relaxed max-w-md mx-auto">
                {isActualAdmin 
                  ? '管理者権限により、新しい現象界隈がシステム全体へ追加されました。これにより、すべての住人が投稿にこの観測タグを選択し、観測することが可能になりました。' 
                  : '申請いただいた界隈は、運営者による承認をお待ちください。承認または却下された場合は、運営よりお知らせメッセージ（通知）でお知らせします。'
                }
              </p>
              
              <button 
                onClick={() => {
                  setSubmitSuccess(false);
                  setSubView('list');
                }}
                className="bg-orange-950 text-white text-xs font-bold px-5 py-3 rounded-xl hover:bg-orange-900 transition"
              >
                界隈一覧へ戻る
              </button>
            </div>
          ) : (
            /* Application input screen */
            <form onSubmit={handleApplyKaiwai} className="bg-white border border-orange-100 p-6 rounded-[28px] space-y-5 text-left shadow-sm">
              <h3 className="text-sm font-black text-orange-900 border-b pb-2 flex items-center gap-1.5">
                <span>🛸</span>
                <span>{isActualAdmin ? '【管理者専用】新しい現象界隈の直接追加 (即時反映)' : '新しい界隈作成の申請'}</span>
              </h3>

              {isActualAdmin && (
                <div className="bg-amber-50 border border-amber-150 p-4 rounded-2xl text-xs text-amber-900 leading-relaxed">
                  👑 <strong>管理者専用バイパス発動中:</strong> 50件の投稿制限と下部の承認確認チェックボックスの確認が免除され、このフォームから界隈を追加すると即座に「現象界隈」一覧および投稿時の「観測タグ」選択欄へ反映されます。
                </div>
              )}

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-extrabold text-orange-800 ml-1 uppercase-tracking">界隈名 (最大30文字)</label>
                  <span className="text-[10px] text-orange-400 font-bold">{name.length}/30</span>
                </div>
                <input 
                  type="text"
                  placeholder="例: パック牛乳開封ミス"
                  maxLength={30}
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-orange-50/50 border border-orange-100 rounded-xl px-4 py-3 text-xs focus:ring-2 focus:ring-orange-500 font-bold text-orange-950"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-extrabold text-orange-800 ml-1 uppercase-tracking">説明 (最大300文字)</label>
                  <span className="text-[10px] text-orange-400 font-bold">{description.length}/300</span>
                </div>
                <textarea 
                  placeholder="この界隈が観観・収集する地味な現象について詳しく説明してください。(例: 紙パックの牛乳やジュースを開ける際、口がボロボボになって綺麗に開かなかった時のあるあるを寄せ合う場所)"
                  maxLength={300}
                  rows={4}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full bg-orange-50/50 border border-orange-100 rounded-xl px-4 py-3 text-xs focus:ring-2 focus:ring-orange-500 font-medium text-orange-950 leading-relaxed"
                  required
                />
              </div>

              {/* Confirmations checklist */}
              <div className={`${isActualAdmin ? 'opacity-50' : ''} bg-[#fcf8f2] border border-orange-100 p-4 rounded-xl space-y-2.5`}>
                <h4 className="text-[10px] font-black text-orange-850 tracking-wider uppercase">⚠️ 新開申請に伴う確認事項 {isActualAdmin && '(管理者につき確認任意)'}</h4>
                
                <div className="space-y-2 text-xs text-orange-950/80">
                  <label className="flex items-start gap-2 cursor-pointer select-none">
                    <input 
                      type="checkbox"
                      checked={isActualAdmin ? true : confirmedChecks.nameLocked}
                      disabled={isActualAdmin}
                      onChange={e => setConfirmedChecks(prev => ({ ...prev, nameLocked: e.target.checked }))}
                      className="mt-0.5 rounded border-orange-200 text-orange-600 focus:ring-orange-500"
                    />
                    <span>承認後は、システム保全、タグ連結のため、<strong>界隈名の変更はできません</strong>。</span>
                  </label>

                  <label className="flex items-start gap-2 cursor-pointer select-none">
                    <input 
                      type="checkbox"
                      checked={isActualAdmin ? true : confirmedChecks.descLocked}
                      disabled={isActualAdmin}
                      onChange={e => setConfirmedChecks(prev => ({ ...prev, descLocked: e.target.checked }))}
                      className="mt-0.5 rounded border-orange-200 text-orange-600 focus:ring-orange-500"
                    />
                    <span>承認後は、ユーザー混乱防止のため、<strong>説明文の変更はできません</strong>。</span>
                  </label>

                  <label className="flex items-start gap-2 cursor-pointer select-none">
                    <input 
                      type="checkbox"
                      checked={isActualAdmin ? true : confirmedChecks.deleteFormRequired}
                      disabled={isActualAdmin}
                      onChange={e => setConfirmedChecks(prev => ({ ...prev, deleteFormRequired: e.target.checked }))}
                      className="mt-0.5 rounded border-orange-200 text-orange-600 focus:ring-orange-500"
                    />
                    <span>一度作成された界隈の<strong>削除は、運営へ直接削除申請が必要</strong>となります。</span>
                  </label>
                </div>
              </div>

              <button 
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-orange-950 text-white hover:bg-orange-900 py-3 rounded-2xl font-black transition disabled:opacity-50 flex justify-center items-center gap-1 text-sm shadow-sm cursor-pointer"
              >
                {isSubmitting 
                  ? '処理中...' 
                  : isActualAdmin 
                    ? '界隈を即時新規登録・反映する 👑' 
                    : '界隈申請を運営に送信する 🛸'
                }
              </button>
            </form>
          )}
        </div>
      )}

      {/* 4. SUB VIEW: DETAIL PAGE FOR APPROVED KAIWAI */}
      {subView === 'detail' && selectedKaiwai && (
        <div className="space-y-6">
          
          {/* Main Board for Selected Kaiwai */}
          <div className="bg-[#fcf8f2] border border-orange-100 rounded-[28px] p-6 text-left relative overflow-hidden shadow-sm">
            
            {/* Visual background details */}
            <div className="absolute right-3 top-3 opacity-10 select-none animate-pulse-subtle">
              <span className="text-7xl">🪐</span>
            </div>

            <div className="space-y-3">
              <span className="text-[10px] font-black tracking-widest text-orange-500 uppercase">
                🏷️ 現象観測所
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-orange-950 flex items-center gap-2">
                {selectedKaiwai.name}界隈
              </h2>
              <p className="text-xs text-orange-900/80 leading-relaxed font-sans max-w-2xl bg-white/40 p-4 rounded-2xl border border-orange-100/30">
                {selectedKaiwai.description}
              </p>
            </div>

            {/* Actions: Follow / Unfollow */}
            <div className="flex flex-wrap items-center gap-3 mt-6 pt-5 border-t border-orange-100">
              {(() => {
                const isFollowed = profile?.followedKaiwais?.includes(selectedKaiwai.name);
                return (
                  <button 
                    onClick={() => handleFollowToggle(selectedKaiwai)}
                    className={cn(
                      "px-5 py-2.5 rounded-full text-xs font-extrabold transition-all duration-300 transform active:scale-95 flex items-center gap-1.5 cursor-pointer",
                      isFollowed 
                        ? "bg-amber-100 text-amber-900 border border-amber-200 hover:bg-amber-200" 
                        : "bg-orange-900 text-white hover:bg-orange-850 shadow-md"
                    )}
                  >
                    <span>🪐</span>
                    <span>{isFollowed ? '観測中 (フォロー中)' : 'この現象を観測する (フォロー)'}</span>
                  </button>
                );
              })()}

              <span className="text-[10px] text-orange-400 font-bold bg-[#f3ebd9] px-2.5 py-1 rounded-full">
                💡 提案者: {selectedKaiwai.creatorName}
              </span>
            </div>
          </div>

          {/* Tab Selection */}
          <div className="flex border-b border-orange-100/55">
            <button 
              onClick={() => setFeedTab('latest')}
              className={cn(
                "flex-1 py-3 text-xs font-bold text-center border-b-2 transition cursor-pointer",
                feedTab === 'latest' ? "border-orange-900 text-orange-950 font-black" : "border-transparent text-orange-400 hover:text-orange-950"
              )}
            >
              👑 新着
            </button>
            <button 
              onClick={() => setFeedTab('jimi')}
              className={cn(
                "flex-1 py-3 text-xs font-bold text-center border-b-2 transition cursor-pointer",
                feedTab === 'jimi' ? "border-orange-900 text-orange-950 font-black" : "border-transparent text-orange-400 hover:text-orange-950"
              )}
            >
              ☕ 地味順
            </button>
            <button 
              onClick={() => setFeedTab('kairan')}
              className={cn(
                "flex-1 py-3 text-xs font-bold text-center border-b-2 transition cursor-pointer",
                feedTab === 'kairan' ? "border-orange-900 text-orange-950 font-black" : "border-transparent text-orange-400 hover:text-orange-950"
              )}
            >
              📌 回覧板
            </button>
          </div>

          {/* Custom Feeds List */}
          {feedLoading ? (
            <div className="text-center py-12 text-xs font-bold text-orange-400 animate-pulse">
              観測所からデータを読み込み中... 🔍
            </div>
          ) : feedScenes.length === 0 ? (
            <div className="text-center py-16 bg-[#fcf8f2]/30 border border-dashed border-orange-100 rounded-[28px]">
              <p className="text-xs text-orange-400 font-bold mb-2">まだこの界隈の観測投稿はありません</p>
              <p className="text-[10px] text-orange-400/80 leading-normal max-w-xs mx-auto">
                「シーン投稿」画面から、この界隈の「観測タグ」を選択して第一号の観測記録を投稿しましょう！
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {feedScenes.map((scene) => (
                <div 
                  key={scene.id}
                  onClick={() => onOpenScene(scene)}
                  className="bg-white border border-orange-100 p-5 rounded-[28px] hover:shadow-sm transition text-left cursor-pointer space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenProfile(scene.authorId);
                      }}
                      className="flex items-center gap-2 cursor-pointer group"
                    >
                      <img 
                        src={scene.authorPhoto} 
                        alt={scene.authorName}
                        referrerPolicy="no-referrer"
                        className="w-6 h-6 rounded-lg object-cover bg-orange-50 border border-orange-150"
                      />
                      <span className="text-xs font-extrabold text-orange-900 group-hover:underline">
                        {scene.authorName}
                      </span>
                    </div>
                    {scene.kairanAmount !== undefined && scene.kairanAmount > 0 && (
                      <span className="text-[10px] font-black text-red-700 bg-red-50 border border-red-100 px-2.5 py-0.5 rounded-full animate-bounce-subtle flex items-center gap-0.5">
                        📌 回覧中
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-sm font-black text-orange-950 leading-snug">
                      {scene.title}
                    </h4>
                    <p className="text-xs text-orange-900/80 leading-relaxed font-sans line-clamp-3">
                      {scene.content}
                    </p>
                  </div>

                  {scene.imageUrl && (
                    <div className="w-full h-36 rounded-2xl overflow-hidden border border-orange-50 bg-orange-50/20">
                      <img 
                        src={scene.imageUrl} 
                        alt={scene.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-1.5 pt-2">
                    {/* Explicit Kaiwai Tags */}
                    {(scene.observationTags || scene.kaiwaiTags || []).map((kt, i) => (
                      <span key={i} className="text-[10px] font-black bg-orange-50 text-orange-850 px-2 py-0.5 rounded-md border border-orange-100/50">
                        🪐 {kt}界隈
                      </span>
                    ))}
                    {(scene.hashtags || []).map((ht, i) => (
                      <span key={i} className="text-[10px] font-medium text-orange-400">
                        #{ht}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-orange-400 font-semibold border-t border-orange-50/50 pt-3 mt-1">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {scene.createdAt?.toDate ? scene.createdAt.toDate().toLocaleDateString('ja-JP') : new Date(scene.createdAt).toLocaleDateString('ja-JP')}
                    </span>

                    <span className="flex items-center gap-3">
                      <span className="flex items-center gap-1 text-orange-700 font-bold bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100/40">
                        <ThumbsUp className="w-3 h-3" />
                        {scene.upvotes || 0} 共感
                      </span>
                      {scene.commentCount !== undefined && scene.commentCount > 0 && (
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3.5 h-3.5" />
                          {scene.commentCount} コメント
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
