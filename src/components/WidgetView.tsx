import React, { useState, useEffect } from 'react';
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Profile, Scene } from '../types';
import { BADGES } from '../lib/badgeUtils';
import { ExternalLink, Smile, Award } from 'lucide-react';

interface WidgetViewProps {
  uid: string | null;
}

export default function WidgetView({ uid }: WidgetViewProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }

    const fetchWidgetData = async () => {
      try {
        // 1. Fetch Profile
        const profileRef = doc(db, 'profiles', uid);
        const profileSnap = await getDoc(profileRef);
        if (profileSnap.exists()) {
          setProfile({ uid, ...profileSnap.data() } as Profile);
        }

        // 2. Fetch Latest Scenes for this user
        const q = query(
          collection(db, 'scenes'),
          where('authorId', '==', uid),
          orderBy('createdAt', 'desc'),
          limit(2)
        );
        const sceneSnap = await getDocs(q);
        const sceneList: Scene[] = [];
        sceneSnap.forEach(d => {
          sceneList.push({ id: d.id, ...d.data() } as Scene);
        });
        setScenes(sceneList);
      } catch (err) {
        console.error("Widget data fetching failed:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchWidgetData();
  }, [uid]);

  if (loading) {
    return (
      <div className="min-h-screen bg-orange-50/20 flex flex-col items-center justify-center p-6 text-orange-400 font-bold text-xs">
        <div className="w-6 h-6 border-2 border-orange-400 border-t-transparent rounded-full animate-spin mb-2"></div>
        <span>地味情報ロード中...</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-orange-50/20 flex flex-col items-center justify-center p-6 text-center select-none text-orange-600">
        <Smile className="w-10 h-10 mb-2 opacity-40 text-orange-400" />
        <h3 className="font-extrabold text-sm mb-1">ユーザーが見つかりません</h3>
        <p className="text-[10px] text-orange-400/80 leading-relaxed">
          ウィジェットを貼るユーザーIDが正しいか確認してください。
        </p>
      </div>
    );
  }

  // Equipped badges list
  const equippedBadgesList = (profile.equippedBadges || [])
    .map(badgeId => BADGES.find(b => b.id === badgeId))
    .filter((b): b is NonNullable<typeof b> => b !== undefined);

  const mainUrl = `${window.location.origin}/?from_widget=${uid}`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50/40 to-white flex flex-col p-4 select-none font-sans justify-between text-left">
      {/* Profile Header */}
      <div className="bg-white border border-orange-100 rounded-[28px] p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-3.5">
          <img 
            src={profile.photoURL || `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${profile.uid}`} 
            alt="" 
            className="w-12 h-12 rounded-full border border-orange-100 bg-orange-50/30 object-cover shrink-0"
            referrerPolicy="no-referrer"
          />
          <div className="min-w-0">
            <h4 className="text-sm font-black text-orange-950 truncate flex items-center gap-1">
              <span>{profile.displayName}</span>
              {profile.selectedTitle && (
                <span className="text-[9px] bg-orange-100 border border-orange-200/50 text-orange-700 px-1.5 py-0.5 rounded font-extrabold shrink-0 truncate">
                  {profile.selectedTitle}
                </span>
              )}
            </h4>
            <p className="text-[10px] text-orange-700/70 truncate mt-0.5 whitespace-pre-wrap">
              {profile.bio || "地味っちでゆったり生活中。"}
            </p>
          </div>
        </div>

        {/* Equipped Badges inside Widget */}
        {equippedBadgesList.length > 0 && (
          <div className="flex flex-wrap gap-1 bg-orange-50/30 p-2 rounded-2xl border border-orange-100/40 items-center">
            <span className="text-[8px] font-black text-orange-400 uppercase tracking-widest mr-1">装備中</span>
            <div className="flex gap-1 flex-wrap">
              {equippedBadgesList.map((badge) => (
                <span 
                  key={badge.id}
                  title={badge.name}
                  className="w-5 h-5 rounded-full border border-orange-100/50 bg-white flex items-center justify-center text-xs shadow-sm shadow-orange-900/5 cursor-default select-none relative group"
                >
                  <span>{badge.emoji}</span>
                  <div className="absolute hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 mb-1.5 bg-zinc-800 text-white text-[8px] px-1.5 py-0.5 rounded-md pointer-events-none whitespace-nowrap z-50">
                    {badge.name}
                  </div>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Latest Scenes list */}
      <div className="flex-1 my-3 overflow-y-auto min-h-0 space-y-2">
        <h5 className="text-[9px] font-black text-orange-400 uppercase tracking-widest px-1">最近の地味な日常</h5>
        {scenes.length > 0 ? (
          scenes.map(scene => (
            <div 
              key={scene.id}
              className="bg-orange-50/20 border border-orange-100/30 rounded-2xl p-3 hover:bg-orange-50/40 transition-colors"
            >
              <p className="text-[11px] font-bold text-orange-950 line-clamp-2 leading-relaxed whitespace-pre-wrap">
                {scene.title}
              </p>
              <div className="flex items-center justify-between mt-2 pt-1 border-t border-orange-100/20 text-[9px] font-black text-orange-400">
                <span className="font-mono">👍 {scene.upvotes} 共感</span>
                <span>{scene.createdAt ? new Date(scene.createdAt.toMillis()).toLocaleDateString() : ''}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="py-6 text-center text-[10px] text-orange-300 font-bold bg-stone-50/50 rounded-2xl border border-stone-100">
            まだ地味な日常を投稿していません ☕️
          </div>
        )}
      </div>

      {/* Footer Branding / Conversion Link */}
      <a 
        href={mainUrl} 
        target="_blank" 
        rel="noopener noreferrer"
        className="block bg-orange-500 hover:bg-orange-600 text-white text-center py-2.5 rounded-2xl text-[10px] font-black tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-md shadow-orange-500/10"
      >
        <span className="inline-flex items-center gap-1 justify-center w-full">
          <span>地味っちで共感する</span>
          <Smile className="w-3.5 h-3.5" />
          <ExternalLink className="w-3 h-3" />
        </span>
      </a>
    </div>
  );
}
