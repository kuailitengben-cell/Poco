import React, { useEffect, useState } from 'react';
import { 
  ArrowLeft, 
  Shield, 
  ChevronRight, 
  CornerDownRight, 
  Edit2, 
  Save, 
  X, 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  RotateCcw, 
  Check, 
  AlertCircle 
} from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { TermsPrivacySection } from '../types';

interface PrivacyViewProps {
  onBack: () => void;
  isAdmin?: boolean;
}

const defaultSections: TermsPrivacySection[] = [
  {
    id: "art1",
    title: "第1条（取得する情報）",
    paragraphs: [
      "本サービスは、以下の情報を取得する場合があります。",
      "【1. Googleログインにより取得する情報】",
      "利用者がGoogleアカウントでログインした場合、以下の情報を取得することがあります。",
      "・Googleアカウント識別子（UID）",
      "・メールアドレス",
      "・表示名",
      "・プロフィール画像",
      "取得する情報は、Googleが提供する認証機能の仕様に基づきます。",
      "【2. 利用者がサービス内で作成する情報】",
      "・投稿内容",
      "・コメント内容",
      "・プロフィール情報",
      "・バッジ取得状況",
      "・二つ名取得状況",
      "・ガチャ利用履歴",
      "・ログインボーナス受取履歴",
      "・共感履歴",
      "・ランキング関連データ",
      "【3. 自動的に取得される情報】",
      "本サービスは以下の情報を自動的に取得する場合があります。",
      "・IPアドレス",
      "・利用日時",
      "・アクセスログ",
      "・利用端末情報",
      "・ブラウザ情報",
      "・Cookie等の識別情報",
      "・エラー情報",
      "・通信記録"
    ]
  },
  {
    id: "art2",
    title: "第2条（利用目的）",
    paragraphs: [
      "取得した情報は以下の目的で利用します。",
      "・ログイン認証",
      "・アカウント管理",
      "・本サービスの提供",
      "・投稿機能の提供",
      "・コメント機能の提供",
      "・共感機能の提供",
      "・ランキング集計",
      "・バッジ機能の提供",
      "・二つ名機能の提供",
      "・ガチャ機能の提供",
      "・ログインボーナス機能の提供",
      "・不正利用の防止",
      "・不具合調査",
      "・セキュリティ向上",
      "・利用状況分析",
      "・サービス改善",
      "・お問い合わせ対応",
      "・利用規約違反への対応"
    ]
  },
  {
    id: "art3",
    title: "第3条（投稿内容の公開）",
    paragraphs: [
      "利用者が投稿した内容、コメント、プロフィール情報等は、本サービス内で他の利用者から閲覧される場合があります。",
      "利用者は公開されることを理解した上で投稿を行うものとします。",
      "個人情報や公開を望まない情報の投稿には十分注意してください。"
    ]
  },
  {
    id: "art4",
    title: "第4条（第三者提供）",
    paragraphs: [
      "本サービスは、以下の場合を除き、利用者の個人情報を第三者へ提供しません。",
      "・利用者本人の同意がある場合",
      "・法令に基づく場合",
      "・裁判所、警察その他公的機関から適法な要請を受けた場合",
      "・人の生命、身体または財産の保護のために必要な場合"
    ]
  },
  {
    id: "art5",
    title: "第5条（外部サービスおよびプラットフォームの利用）",
    paragraphs: [
      "本サービスは、認証・データベース・ホスティング等の基盤としてGoogle Cloud Platform（GCP）に準拠した以下の高度な外部サービスを利用しています。",
      "・Google Authentication（簡単ログイン）",
      "・Firebase Authentication（アカウント管理と認証の暗号保持）",
      "・Cloud Firestore（リアルタイムかつセキュアなテキスト/投稿DB）",
      "・Firebase Storage（プロフィール画像等の隔離保存）",
      "・Google Cloud Run（スケーラブルかつセキュアなコンテナサーバー稼働）",
      "・Google Cloud Platform（通信・データベース等の堅牢なセキュリティ環境全体）",
      "・Google Analytics（利用動向分析を行う場合）",
      "これらのサービスでは、各事業者のプライバシーポリシーに基づき情報の収集、暗号化等の保護管理措置が取り扱われます。"
    ]
  },
  {
    id: "art6",
    title: "第6条（Cookie等の利用）",
    paragraphs: [
      "本サービスは、サービス提供および利便性向上のためにCookieその他類似技術を利用する場合があります。",
      "利用者はブラウザ設定によりCookieを無効化できる場合がありますが、一部機能が利用できなくなることがあります。"
    ]
  },
  {
    id: "art7",
    title: "第7条（データの保管・セキュリティ）",
    paragraphs: [
      "本サービスは、取得した情報を適切な方法で管理し、不正アクセス、漏えい、改ざん等の防止に努めます。",
      "ただし、インターネット通信およびクラウドサービスの性質上、完全な安全性を保証するものではありません。"
    ]
  },
  {
    id: "art8",
    title: "第8条（未成年者の利用）",
    paragraphs: [
      "未成年者は、保護者の同意を得た上で本サービスを利用してください。"
    ]
  },
  {
    id: "art9",
    title: "第9条（アカウント削除およびデータ削除）",
    paragraphs: [
      "利用者がアカウント削除を行った場合、運営者は合理的な期間内に関連情報の削除または匿名化を行う場合があります。",
      "ただし、以下の情報は一定期間保存される場合があります。",
      "・法令上保存が必要な情報",
      "・不正利用防止のために必要な情報",
      "・障害調査のために必要な情報"
    ]
  },
  {
    id: "art10",
    title: "第10条（プライバシーポリシーの変更）",
    paragraphs: [
      "運営者は必要に応じて本ポリシーを変更できるものとします。",
      "重要な変更を行う場合は、本サービス内または運営者が適切と判断する方法で告知します。",
      "変更後に本サービスを利用した場合、利用者は変更内容に同意したものとみなされます。"
    ]
  },
  {
    id: "art11",
    title: "第11条（お問い合わせ）",
    paragraphs: [
      "本ポリシーに関するお問い合わせは、本サービス内のお問い合わせ窓口または運営者が指定する連絡先（kuailitengben@gmail.com）までお願いします。"
    ]
  },
  {
    id: "art12",
    title: "第12条（運営者プロフィール）",
    paragraphs: [
      "サービス名：地味っち",
      "運営者：Poco",
      "連絡先：kuailitengben@gmail.com"
    ]
  }
];

export default function PrivacyView({ onBack, isAdmin }: PrivacyViewProps) {
  const [activeAnchor, setActiveAnchor] = useState<string>('');
  const [sections, setSections] = useState<TermsPrivacySection[]>(defaultSections);
  const [updatedAt, setUpdatedAt] = useState<string>('2026年6月3日');
  const [loading, setLoading] = useState<boolean>(true);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);

  // Editing backups
  const [editedSections, setEditedSections] = useState<TermsPrivacySection[]>([]);
  const [editedUpdatedAt, setEditedUpdatedAt] = useState<string>('');
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);

  // Status message
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.title = "プライバシーポリシー | 地味っち (Jimicchi)";

    async function loadPrivacy() {
      try {
        const docRef = doc(db, "legal_documents", "privacy");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.termsPrivacySections) {
            setSections(data.termsPrivacySections);
          }
          if (data.updatedAt) {
            setUpdatedAt(data.updatedAt);
          }
        }
      } catch (err) {
        console.warn("Using local pre-configured fallback for privacy policy:", err);
      } finally {
        setLoading(false);
      }
    }
    loadPrivacy();
  }, []);

  const handleAnchorClick = (id: string) => {
    setActiveAnchor(id);
    const element = document.getElementById(id);
    if (element) {
      const headerOffset = 90;
      const elementPosition = element.getBoundingClientRect().top + window.scrollY;
      const offsetPosition = elementPosition - headerOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  // Start Edit Mode
  const startEditing = () => {
    setEditedSections(JSON.parse(JSON.stringify(sections)));
    setEditedUpdatedAt(updatedAt);
    setIsEditMode(true);
    setEditingSectionId(null);
  };

  // Cancel edit
  const cancelEditing = () => {
    setIsEditMode(false);
    setEditingSectionId(null);
  };

  // Add new section
  const addNewSection = () => {
    const newId = `art_${Date.now()}`;
    const newSec: TermsPrivacySection = {
      id: newId,
      title: "新規ポリシー条項",
      paragraphs: ["新規内容を記述してください。"]
    };
    setEditedSections([...editedSections, newSec]);
    setEditingSectionId(newId);
  };

  // Edit individual section's title
  const handleTitleChange = (index: number, val: string) => {
    const next = [...editedSections];
    next[index].title = val;
    setEditedSections(next);
  };

  // Paragraph change
  const handleParagraphChange = (secIndex: number, pIndex: number, val: string) => {
    const next = [...editedSections];
    next[secIndex].paragraphs[pIndex] = val;
    setEditedSections(next);
  };

  // Add paragraph
  const addParagraphToSection = (secIndex: number) => {
    const next = [...editedSections];
    next[secIndex].paragraphs.push('');
    setEditedSections(next);
  };

  // Remove paragraph
  const removeParagraphFromSection = (secIndex: number, pIndex: number) => {
    const next = [...editedSections];
    next[secIndex].paragraphs.splice(pIndex, 1);
    setEditedSections(next);
  };

  // Move section
  const moveSection = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === editedSections.length - 1) return;

    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const next = [...editedSections];
    const temp = next[index];
    next[index] = next[targetIdx];
    next[targetIdx] = temp;
    setEditedSections(next);
  };

  // Delete section
  const deleteSection = (index: number) => {
    const next = [...editedSections];
    next.splice(index, 1);
    setEditedSections(next);
    setEditingSectionId(null);
  };

  // Reset to static code defaults
  const resetToDefaults = () => {
    if (window.confirm("プライバシーポリシーを初期状態に戻しますか？（未保存の編集は失われます）")) {
      setEditedSections(JSON.parse(JSON.stringify(defaultSections)));
      setEditedUpdatedAt('2026年6月3日');
      setEditingSectionId(null);
      showToast("デフォルトの設定に差し戻しました。保存を押すと確定します。");
    }
  };

  // Save back to DB
  const savePrivacy = async () => {
    try {
      const docRef = doc(db, "legal_documents", "privacy");
      await setDoc(docRef, {
        docType: "privacy",
        updatedAt: editedUpdatedAt,
        termsPrivacySections: editedSections
      });
      setSections(editedSections);
      setUpdatedAt(editedUpdatedAt);
      setIsEditMode(false);
      setEditingSectionId(null);
      showToast("プライバシーポリシーが安全に更新されました！");
    } catch (error) {
      console.error("Firestore Save Error:", error);
      showToast("保存に失敗しました。権限と通信状況を確認してください。", "error");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <div className="animate-spin text-4xl">🔒</div>
        <p className="text-xs text-orange-900/60 font-bold">データを読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl mx-auto px-1 sm:px-0 relative mb-8">
      {/* Toast Notification Banner */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-lg border text-xs font-bold font-sans animate-bounce transition-all ${
          toast.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {toast.type === 'success' ? <Check className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Back Button Group */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-orange-100">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="group flex items-center gap-1.5 px-3 py-1.5 text-xs text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-xl transition cursor-pointer font-bold"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>タイムラインに戻る</span>
          </button>

          {isAdmin && !isEditMode && (
            <button
              onClick={startEditing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition cursor-pointer font-bold"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>管理者：ポリシーを編集</span>
            </button>
          )}
        </div>

        <span className="text-[11px] text-orange-500 font-mono font-bold select-none">
          最終更新日：{isEditMode ? editedUpdatedAt : updatedAt}
        </span>
      </div>

      {/* Header Visual */}
      <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-[32px] p-6 sm:p-8 text-white shadow-lg shadow-orange-500/10 select-none">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="bg-white/15 backdrop-blur-md px-3 py-1 rounded-full text-[10px] tracking-wider uppercase font-extrabold inline-flex items-center gap-1">
              <Shield className="w-3 h-3" />
              Privacy Policy
            </div>
            <h2 className="text-2xl sm:text-3xl font-black font-display tracking-tight">
              地味っち プライバシーポリシー
            </h2>
          </div>
          <span className="text-4xl filter drop-shadow">🔒</span>
        </div>
        <p className="text-xs text-white/85 max-w-xl mt-4 font-bold leading-relaxed">
          地味っちは、利用者のプライバシーを尊重し、個人情報および利用情報の適切な保護に努めます。
        </p>
      </div>

      {isEditMode ? (
        /* ==================== EDIT MODE UI ==================== */
        <div className="space-y-6 bg-orange-50/20 p-4 sm:p-6 rounded-[32px] border-2 border-dashed border-orange-200">
          <div className="flex items-center justify-between border-b border-orange-100 pb-3">
            <div>
              <h3 className="text-sm font-black text-orange-950">プライバシーポリシー編集</h3>
              <p className="text-[10px] text-orange-400 font-bold">Googleログイン等、利用情報取扱いのポリシーを追加・編集・削除できます。</p>
            </div>
            <button
              onClick={resetToDefaults}
              className="p-1 px-3 py-1.5 rounded-xl bg-orange-100 hover:bg-orange-200 text-orange-900 border text-xs font-bold transition flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              リセット
            </button>
          </div>

          {/* Last Updated Input */}
          <div className="flex flex-col space-y-1">
            <label className="text-[10px] font-black uppercase text-orange-950">最終更新日表示</label>
            <input
              type="text"
              value={editedUpdatedAt}
              onChange={(e) => setEditedUpdatedAt(e.target.value)}
              placeholder="例: 2026年6月3日"
              className="bg-white text-xs text-orange-950 font-bold p-3 rounded-2xl border border-orange-150 outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>

          <h4 className="text-xs font-black text-orange-950 mt-4">編集中の条項一覧</h4>

          {/* Collapsible Sections List */}
          <div className="space-y-3">
            {editedSections.map((sec, secIndex) => {
              const isEditingThis = editingSectionId === sec.id;
              return (
                <div 
                  key={sec.id}
                  className={`bg-white border ${
                    isEditingThis ? 'border-orange-400 ring-2 ring-orange-200' : 'border-orange-105'
                  } rounded-2xl p-4 transition-all`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {isEditingThis ? (
                        <input
                          type="text"
                          value={sec.title}
                          onChange={(e) => handleTitleChange(secIndex, e.target.value)}
                          placeholder="第X条（ポリシータイトル）"
                          className="w-full bg-orange-50/55 text-xs font-black text-orange-950 p-2 rounded-xl outline-none border border-orange-200 focus:border-orange-400"
                        />
                      ) : (
                        <span className="text-xs font-black text-orange-950 block truncate">
                          {sec.title || "(無題のポリシー条項)"}
                        </span>
                      )}
                    </div>

                    {/* Controls Row */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => moveSection(secIndex, 'up')}
                        disabled={secIndex === 0}
                        className="p-1.5 hover:bg-orange-50 disabled:opacity-30 text-orange-600 rounded-lg transition"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveSection(secIndex, 'down')}
                        disabled={secIndex === editedSections.length - 1}
                        className="p-1.5 hover:bg-orange-50 disabled:opacity-30 text-orange-600 rounded-lg transition"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingSectionId(isEditingThis ? null : sec.id)}
                        className={`p-1.5 px-2.5 rounded-xl text-[10px] font-black transition ${
                          isEditingThis ? 'bg-orange-500 text-white' : 'bg-orange-50 hover:bg-orange-100 text-orange-700'
                        }`}
                      >
                        {isEditingThis ? '閉じる' : '編集する'}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteSection(secIndex)}
                        className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Paragraphs detail within section if expanded */}
                  {isEditingThis && (
                    <div className="mt-4 pt-3 border-t border-orange-100 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-orange-400">各段落の編集</span>
                        <button
                          type="button"
                          onClick={() => addParagraphToSection(secIndex)}
                          className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-extrabold bg-orange-100 hover:bg-orange-200 text-orange-900 rounded-lg transition"
                        >
                          <Plus className="w-3 h-3" /> 段落を追加
                        </button>
                      </div>

                      <div className="space-y-2">
                        {sec.paragraphs.map((p, pIndex) => (
                          <div key={pIndex} className="flex gap-2 items-start">
                            <span className="text-[10px] text-orange-300 font-black select-none mt-3">#{pIndex+1}</span>
                            <textarea
                              rows={2}
                              value={p}
                              onChange={(e) => handleParagraphChange(secIndex, pIndex, e.target.value)}
                              placeholder="段落文章、または「【見出し】」、「・項目」を入力してください"
                              className="flex-1 bg-orange-50/10 p-2.5 rounded-xl text-xs font-medium border border-orange-100 focus:border-orange-300 focus:outline-none focus:ring-1 focus:ring-orange-200 text-orange-950 leading-relaxed"
                            />
                            <button
                              type="button"
                              onClick={() => removeParagraphFromSection(secIndex, pIndex)}
                              className="p-1.5 hover:bg-red-50 text-red-400 hover:text-red-600 rounded-lg mt-2 transition shrink-0"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                        {sec.paragraphs.length === 0 && (
                          <p className="text-[10px] text-gray-400 italic py-2">段落がありません。</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {editedSections.length === 0 && (
              <p className="text-center text-xs text-orange-900/50 py-8">条項がすべて削除されました。</p>
            )}
          </div>

          {/* Add Section Action */}
          <button
            onClick={addNewSection}
            className="w-full flex items-center justify-center gap-1.5 p-3 rounded-2xl bg-orange-50 hover:bg-orange-100 border border-orange-200 border-dashed text-orange-950 text-xs font-black transition cursor-pointer"
          >
            <Plus className="w-4 h-4 text-orange-500" />
            <span>新しいポリシー条項を追加</span>
          </button>

          {/* Save Action Group */}
          <div className="flex gap-3 pt-4 border-t border-orange-100">
            <button
              onClick={savePrivacy}
              className="flex-1 flex items-center justify-center gap-1.5 p-3 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 hover:opacity-95 text-white text-xs font-black shadow-lg shadow-orange-500/10 transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>変更を保存して公開</span>
            </button>
            <button
              onClick={cancelEditing}
              className="flex-1 flex items-center justify-center gap-1.5 p-3 rounded-2xl bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-black border border-gray-200 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>キャンセル</span>
            </button>
          </div>
        </div>
      ) : (
        /* ==================== VIEW MODE UI ==================== */
        <>
          {/* Table of Contents Box */}
          <div className="bg-white border-2 border-orange-100 rounded-[32px] p-5 sm:p-6 shadow-sm">
            <h4 className="text-xs font-black text-orange-950 mb-4 flex items-center gap-1.5 select-none font-display">
              <span>📌</span> 目次
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {sections.map((sec) => (
                <button
                  key={sec.id}
                  onClick={() => handleAnchorClick(sec.id)}
                  className={`flex items-center gap-1.5 text-left p-2 rounded-xl transition duration-150 cursor-pointer ${
                    activeAnchor === sec.id
                      ? 'bg-orange-500 text-white font-extrabold shadow-sm'
                      : 'hover:bg-orange-50/50 text-orange-850 font-bold'
                  }`}
                >
                  <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{sec.title}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Main Core Content cards */}
          <div className="space-y-5">
            {sections.map((sec) => (
              <div
                key={sec.id}
                id={sec.id}
                className="group relative bg-[#FDFCFB] border border-orange-100 hover:border-orange-200 rounded-[32px] p-6 sm:p-8 transition-all hover:shadow-md"
              >
                <div className="absolute top-6 right-6 text-orange-200 group-hover:scale-115 transition duration-200 pointer-events-none select-none text-base">
                  🔒
                </div>
                <h3 className="text-sm font-black text-orange-950 border-b border-orange-50 pb-3 mb-4 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-400" />
                  {sec.title}
                </h3>
                <div className="space-y-3 text-xs text-orange-900/85 font-medium leading-relaxed">
                  {sec.paragraphs.map((p, pIndex) => {
                    const isHeading = p.startsWith('【') && p.endsWith('】');
                    const isListItem = p.startsWith('・');
                    
                    if (isHeading) {
                      return (
                        <h4 
                          key={pIndex} 
                          className="text-xs font-black text-orange-950 mt-4 mb-2 flex items-center gap-1 bg-orange-50/40 px-3 py-1.5 rounded-xl border border-orange-100/30 w-fit"
                        >
                          {p.replace(/【|】/g, '')}
                        </h4>
                      );
                    }

                    return (
                      <p 
                        key={pIndex} 
                        className={
                          isListItem 
                            ? 'pl-4 flex items-start gap-1 pb-1 font-bold text-orange-950' 
                            : ''
                        }
                      >
                        {isListItem && <CornerDownRight className="w-3.5 h-3.5 mt-0.5 text-orange-400 shrink-0" />}
                        <span>{isListItem ? p.substring(1) : p}</span>
                      </p>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Security emphasis notification */}
          <div className="bg-gradient-to-r from-orange-50 to-orange-100/50 border-2 border-orange-100 rounded-[32px] p-6 text-center select-none shadow-sm flex flex-col items-center justify-center space-y-2">
            <span className="text-2xl">🔒</span>
            <h5 className="text-xs font-extrabold text-orange-950">
              強固なプラットフォームセキュリティ
            </h5>
            <p className="text-[11px] text-orange-850 font-bold max-w-lg leading-relaxed">
              地味っちの基盤データベース(Firestore)は暗号化ルールにより強固に保護され、アクセス権も制限されています。Googleログイン情報についても安全にトークン認証され、第三者にパスワードを開示することはありません。
            </p>
          </div>
        </>
      )}
    </div>
  );
}
