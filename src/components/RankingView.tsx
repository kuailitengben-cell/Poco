import React, { useState, useMemo } from 'react';
import { Scene, Profile } from '../types';
import { cn } from '../lib/utils';
import { Trophy, ArrowLeft, Heart, MessageSquare, Eye, User, Calendar, Flame, AlertCircle } from 'lucide-react';
import { getRangesForPeriod } from '../utils/rankingDates';

interface RankingViewProps {
  allScenes: Scene[];
  onUpvote: (id: string) => void;
  onClick: (scene: Scene) => void;
  onProfileClick: (uid: string, sceneId?: string) => void;
  isUpvoted: (id: string) => boolean;
  isAdmin: boolean;
  onDelete: (id: string) => void;
  profiles: Record<string, Profile>;
  onCopy: (scene: Scene) => void;
  onBack: () => void;
  userId?: string;
}

export const RankingView: React.FC<RankingViewProps> = ({ 
  allScenes, 
  onClick, 
  onProfileClick, 
  profiles, 
  onBack,
  userId
}) => {
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [statusType, setStatusType] = useState<'provisional' | 'finalized'>('provisional');

  const now = new Date();

  // Score Formula:
  // (Upvotes * 10) + (CommentCount * 15) + (ProfileVisits * 20) + (Views * 1)
  const getSceneScore = (scene: Scene) => {
    const upvotes = scene.upvotes || 0;
    const commentCount = scene.commentCount || 0;
    const profileVisits = scene.profileVisits || 0;
    const views = scene.views || 0;
    return upvotes * 10 + commentCount * 15 + profileVisits * 20 + views * 1;
  };

  const currentRanges = useMemo(() => {
    return getRangesForPeriod(period, now);
  }, [period]);

  const targetRange = useMemo(() => {
    return statusType === 'provisional' ? currentRanges.provisional : currentRanges.finalized;
  }, [currentRanges, statusType]);

  const rankedScenes = useMemo(() => {
    return allScenes.map(scene => ({
      ...scene,
      _score: getSceneScore(scene)
    })).filter(scene => {
      if (!scene.createdAt) return false;
      const createdAtDate = scene.createdAt.toDate ? scene.createdAt.toDate() : new Date(scene.createdAt);
      return createdAtDate >= targetRange.start && createdAtDate <= targetRange.end;
    }).sort((a, b) => b._score - a._score);
  }, [allScenes, targetRange]);

  // Find logged in user's posts and their rankings in the ongoing 'provisional' period
  const userProvisionalRanks = useMemo(() => {
    if (!userId) return [];
    const provisionalRange = currentRanges.provisional;
    const sortedProvisional = allScenes.map(scene => ({
      ...scene,
      _score: getSceneScore(scene)
    })).filter(scene => {
      if (!scene.createdAt) return false;
      const createdAtDate = scene.createdAt.toDate ? scene.createdAt.toDate() : new Date(scene.createdAt);
      return createdAtDate >= provisionalRange.start && createdAtDate <= provisionalRange.end;
    }).sort((a, b) => b._score - a._score);

    return sortedProvisional.map((scene, idx) => ({
      scene,
      rank: idx + 1
    })).filter(item => item.scene.authorId === userId);
  }, [allScenes, userId, currentRanges]);

  const getDeadlineText = () => {
    if (period === 'daily') {
      return '本日 23:59:59 に本日分が確定され、公式ランキングの公表＆報酬受け取りが可能になります。';
    } else if (period === 'weekly') {
      return '今週土曜日の 23:59:59 に今週分が確定され、公式ランキングの公表＆報酬受け取りが可能になります。';
    } else {
      return '今月最終日の 23:59:59 に今月分が確定され、公式ランキングの公表＆報酬受け取りが可能になります。';
    }
  };

  const getFinalizedLabel = () => {
    if (period === 'daily') {
      return '昨日の23:59:59に確定して公表された最終ランキング結果です。';
    } else if (period === 'weekly') {
      return '先週土曜日（先週分）の23:59:59に確定して公表された最終ランキング結果です。';
    } else {
      return '先月の最終日に確定して公表された最終ランキング結果です。';
    }
  };

  return (
    <div id="ranking-view-root" className="space-y-6">
      <div className="flex items-center justify-between">
        <button 
          id="btn-ranking-back" 
          onClick={onBack} 
          className="flex items-center gap-2 text-orange-600 hover:text-orange-950 transition-colors bg-transparent border-0 cursor-pointer font-black text-xs uppercase tracking-wider"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>フィードに戻る</span>
        </button>
        <span className="text-[10px] font-black text-amber-600 bg-amber-50 border border-amber-200/50 px-3 py-1 rounded-full flex items-center gap-1 shadow-sm uppercase tracking-widest">
          👑 精密な共感度算出
        </span>
      </div>

      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-[40px] p-6 sm:p-10 border-2 border-orange-100/55 shadow-xl shadow-orange-900/5">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-orange-950 flex items-center justify-center gap-2">
            🏆 地味共感ランキング
          </h2>
          <p className="text-xs text-orange-700/60 mt-2 max-w-md mx-auto leading-relaxed">
            共感数（10点）、コメント（15点）、プロフアクセス（20点）、累積表示（1点）を統合した「地味シンクロ度」の総合順位です。
          </p>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex flex-col items-center gap-4 mb-8">
          <div className="bg-white/90 border border-orange-100 p-1 rounded-2xl flex gap-1 shadow-sm">
            {[
              { id: 'daily', name: '日間' },
              { id: 'weekly', name: '週間' },
              { id: 'monthly', name: '月間' }
            ].map((tab) => {
              const active = period === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`btn-tab-${tab.id}`}
                  onClick={() => setPeriod(tab.id as any)}
                  className={cn(
                    "px-6 py-2 rounded-xl text-xs font-extrabold transition-all duration-150 cursor-pointer border-0",
                    active ? "bg-orange-500 text-white shadow-sm" : "text-orange-400 hover:bg-orange-50 hover:text-orange-950"
                  )}
                >
                  {tab.name}
                </button>
              );
            })}
          </div>

          {/* Status View: Provisional vs Finalized Toggle */}
          <div className="bg-orange-100/50 p-1 rounded-xl flex gap-1 border border-orange-200/55 max-w-sm w-full mx-auto">
            <button
              onClick={() => setStatusType('provisional')}
              className={cn(
                "flex-1 py-1.5 px-3 rounded-lg text-[11px] font-black transition duration-150 cursor-pointer border-0",
                statusType === 'provisional' 
                  ? "bg-white text-orange-950 shadow-sm" 
                  : "text-orange-700/60 hover:text-orange-950 bg-transparent"
              )}
            >
              ⏱️ 途中経過（常時更新）
            </button>
            <button
              onClick={() => setStatusType('finalized')}
              className={cn(
                "flex-1 py-1.5 px-3 rounded-lg text-[11px] font-black transition duration-150 cursor-pointer border-0",
                statusType === 'finalized' 
                  ? "bg-white text-orange-950 shadow-sm" 
                  : "text-orange-700/60 hover:text-orange-950 bg-transparent"
              )}
            >
              📅 確定結果公表
            </button>
          </div>
        </div>

        {/* Dynamic Context Header Notification */}
        <div className={cn(
          "mb-6 p-4 rounded-3xl border text-xs font-bold font-sans text-left leading-relaxed",
          statusType === 'provisional'
            ? "bg-amber-50/75 border-amber-100/70 text-amber-900 flex gap-2"
            : "bg-emerald-50/75 border-emerald-100 text-emerald-950 flex gap-2"
        )}>
          <Calendar className={cn("w-4.5 h-4.5 shrink-0 mt-0.5", statusType === 'provisional' ? "text-amber-500" : "text-emerald-300")} />
          <div>
            <p className="font-extrabold">{statusType === 'provisional' ? '⏳ リアルタイム途中経過集計中' : '🏆 確定済みのオフィシャル公表結果'}</p>
            <p className="opacity-85 mt-1 font-semibold">
              {statusType === 'provisional' ? getDeadlineText() : getFinalizedLabel()}
            </p>
          </div>
        </div>

        {/* Your Standings Check Card (今何位だよってやつ常時更新) */}
        {userId && (
          <div className="bg-white/80 border border-orange-200/30 rounded-[28px] p-5 mb-8 text-left shadow-sm">
            <h3 className="text-xs font-black text-orange-950 flex items-center gap-1.5 mb-3 uppercase tracking-wider">
              <Flame className="w-4 h-4 text-orange-600 animate-pulse" />
              <span>あなたの現在の途中経過（リアルタイム常時更新）</span>
            </h3>
            {userProvisionalRanks.length > 0 ? (
              <div className="grid grid-cols-1 gap-2.5">
                {userProvisionalRanks.map(({ scene, rank }) => (
                  <div key={scene.id} className="flex justify-between items-center bg-orange-50/20 border border-orange-100/50 p-3.5 rounded-2xl shadow-inner">
                    <div className="truncate pr-4">
                      <p className="text-xs font-black text-orange-950 truncate select-all">{scene.title}</p>
                      <p className="text-[10px] text-orange-550 font-bold mt-1">
                        現在のシンクロ度: <span className="font-extrabold text-amber-700">{scene._score} 点</span>
                      </p>
                    </div>
                    <span className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-xs rounded-xl shadow-md shrink-0 select-none">
                      暫定第 {rank} 位
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex gap-2.5 p-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] text-slate-500 font-bold leading-relaxed">
                <AlertCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <p>
                  現在の {period === 'daily' ? '日間' : period === 'weekly' ? '週間' : '月間'} 途中経過期間に投稿されたあなたのシーンはまだありません。
                  シーンを投稿してランキング上位を目指しましょう！
                </p>
              </div>
            )}
          </div>
        )}

        {/* Ranked Items */}
        {rankedScenes.length === 0 ? (
          <div className="py-20 text-center bg-white/50 border-2 border-dashed border-orange-100 rounded-3xl">
            <Trophy className="w-8 h-8 text-orange-200 mx-auto mb-3 animate-pulse" />
            <p className="text-sm font-bold text-orange-400">表示対象のランキングデータはありません。</p>
            <p className="text-[11px] text-orange-300 mt-1 font-semibold">最初の共感投稿をしてみましょう！</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5">
            {rankedScenes.map((scene, idx) => {
              const isTop3 = idx < 3;
              const medalColor = idx === 0 
                ? 'bg-gradient-to-br from-yellow-300 to-amber-400 text-yellow-950 border-yellow-100 font-extrabold shadow-sm' 
                : idx === 1 
                  ? 'bg-gradient-to-br from-slate-200 to-slate-350 text-slate-900 border-slate-100 shadow-sm' 
                  : 'bg-gradient-to-br from-amber-600 to-amber-700 text-amber-50 border-amber-500 shadow-sm';
              
              const authorProfile = profiles[scene.authorId];

              return (
                <div key={scene.id} className="relative group/rank hover:scale-[1.01] transition-all duration-305">
                  {/* Rank Badge */}
                  <div className={cn(
                    "absolute -left-3 -top-3 z-10 w-9 h-9 rounded-full flex items-center justify-center font-black text-sm border-2 shadow-md",
                    isTop3 ? medalColor : 'bg-white text-orange-950 border-orange-100'
                  )}>
                    {idx + 1}
                  </div>

                  <div className="bg-white rounded-[32px] border-2 border-orange-100/50 p-6 shadow-sm hover:shadow-md transition-all">
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-4 pl-4">
                      <div className="space-y-1 text-left">
                        <h4 
                          className="text-lg font-black text-orange-950 cursor-pointer hover:text-orange-500 transition-colors"
                          onClick={() => onClick(scene)}
                        >
                          {scene.title}
                        </h4>
                        
                        {/* Profile Link in list */}
                        <div className="flex items-center gap-1.5 mt-1 text-xs text-orange-450 font-bold">
                          <span>投稿主:</span>
                          <button
                            onClick={() => onProfileClick(scene.authorId, scene.id)}
                            className="bg-transparent border-none p-0 inline-flex items-center gap-1 text-orange-600 hover:text-orange-950 transition-colors font-extrabold underline cursor-pointer"
                          >
                            <User className="w-3.5 h-3.5" />
                            {authorProfile?.displayName || scene.authorName}
                          </button>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200/50 rounded-xl text-xs font-black text-amber-600 shadow-sm">
                          🔥 {scene._score} シンクロ度
                        </span>
                      </div>
                    </div>

                    {/* Stats details pill row */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[10px] font-black text-orange-500 pl-4">
                      <div className="bg-orange-50/50 rounded-xl py-2 border border-orange-100/30 flex items-center justify-center gap-1">
                        <Heart className="w-3 h-3 text-red-500" />
                        <span>共感数: {scene.upvotes || 0}</span>
                      </div>
                      <div className="bg-orange-50/50 rounded-xl py-2 border border-orange-100/30 flex items-center justify-center gap-1">
                        <MessageSquare className="w-3 h-3 text-blue-500" />
                        <span>コメント: {scene.commentCount || 0}</span>
                      </div>
                      <div className="bg-orange-50/50 rounded-xl py-2 border border-orange-100/30 flex items-center justify-center gap-1">
                        <Eye className="w-3 h-3 text-green-500" />
                        <span>閲覧数: {scene.views || 0}</span>
                      </div>
                      <div className="bg-orange-50/50 rounded-xl py-2 border border-orange-100/30 flex items-center justify-center gap-1">
                        <User className="w-3 h-3 text-purple-500" />
                        <span>訪問数: {scene.profileVisits || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
