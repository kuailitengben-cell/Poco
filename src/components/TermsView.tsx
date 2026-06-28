import React, { useEffect, useState } from 'react';
import { 
  ArrowLeft, 
  BookOpen, 
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
  AlertCircle,
  Sparkle
} from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { OperationType, TermsPrivacySection } from '../types';

interface TermsViewProps {
  onBack: () => void;
  isAdmin?: boolean;
}

const defaultSections: TermsPrivacySection[] = [
  {
    id: "sec1",
    title: "第1条（適用）",
    paragraphs: [
      "本規約は、本サービスの利用に関する一切の関係に適用されます。",
      "運営者は、本サービスに関する個別のルールやガイドラインを定めることができ、それらは本規約の一部を構成するものとします。"
    ]
  },
  {
    id: "sec2",
    title: "第2条（サービス内容）",
    paragraphs: [
      "本サービスは、利用者同士が「地味に共感できること」を投稿・閲覧・共有するためのSNSサービスです。",
      "本サービスには以下の機能が含まれる場合があります。",
      "・投稿機能",
      "・コメント機能",
      "・共感機能",
      "・ランキング機能",
      "・バッジ機能",
      "・二つ名機能",
      "・ガチャ機能",
      "・ログインボーナス機能",
      "・プロフィール機能",
      "・その他運営者が提供する機能",
      "運営者は、事前の通知なく機能を変更、追加、削除できるものとします。"
    ]
  },
  {
    id: "sec3",
    title: "第3条（アカウント）",
    paragraphs: [
      "利用者は正確な情報を登録するものとします。",
      "利用者はアカウントを自己の責任で管理しなければなりません。",
      "アカウントの貸与、譲渡、売買を禁止します。"
    ]
  },
  {
    id: "sec4",
    title: "第4条（投稿コンテンツ）",
    paragraphs: [
      "利用者は、自らが投稿したコンテンツについて必要な権利を有していることを保証するものとします。",
      "利用者は投稿内容について責任を負うものとします。",
      "運営者は投稿内容の正確性、完全性、有用性を保証しません。"
    ]
  },
  {
    id: "sec5",
    title: "第5条（禁止事項）",
    paragraphs: [
      "利用者は以下の行為を行ってはなりません。",
      "・法令に違反する行為",
      "・犯罪行為に関連する行為",
      "・誹謗中傷",
      "・嫌がらせ",
      "・個人情報の投稿",
      "・なりすまし",
      "・スパム行為",
      "・不正アクセス",
      "・サービス運営の妨害",
      "・自動ツールによる大量投稿",
      "・ランキングの不正操作",
      "・ガチャや報酬の不正取得",
      "・バグの悪用",
      "・他者の権利侵害",
      "・公序良俗に反する内容",
      "・運営が不適切と判断する行為"
    ]
  },
  {
    id: "sec6",
    title: "第6条（コメントおよびコミュニケーション）",
    paragraphs: [
      "利用者は他者を尊重しなければなりません。",
      "運営者は不適切なコメントを削除できるものとします。"
    ]
  },
  {
    id: "sec7",
    title: "第7条（ランキング）",
    paragraphs: [
      "ランキングは本サービス独自の基準で集計されます。",
      "運営者は集計方法を公開する義務を負いません。",
      "不正なランキング操作が確認された場合、運営者は記録の削除やアカウント停止を行うことができます。"
    ]
  },
  {
    id: "sec8",
    title: "第8条（バッジ・二つ名）",
    paragraphs: [
      "バッジおよび二つ名は本サービス内の演出要素です。",
      "運営者は取得条件、名称、デザインを変更できるものとします。",
      "利用者は取得したバッジや二つ名について財産権を有しません。"
    ]
  },
  {
    id: "sec9",
    title: "第9条（ガチャ機能）",
    paragraphs: [
      "ガチャはゲーム性を目的とした機能です。",
      "排出内容、排出率、報酬内容は運営者の判断により変更される場合があります。",
      "不具合による誤配布が発生した場合、運営者は対象アイテムの回収または修正を行うことがあります。"
    ]
  },
  {
    id: "sec10",
    title: "第10条（ログインボーナス）",
    paragraphs: [
      "ログインボーナスは予告なく内容が変更される場合があります。",
      "未受取報酬の補償は原則行いません。"
    ]
  },
  {
    id: "sec11",
    title: "第11条（知的財産権）",
    paragraphs: [
      "本サービスに関するプログラム、デザイン、ロゴ、名称その他の知的財産権は運営者または権利者に帰属します。",
      "利用者は運営者の許可なくこれらを利用してはなりません。"
    ]
  },
  {
    id: "sec12",
    title: "第12条（サービスの停止）",
    paragraphs: [
      "運営者は以下の場合、事前通知なくサービスを停止できるものとします。",
      "・保守点検",
      "・システム障害",
      "・災害",
      "・通信障害",
      "・その他運営上必要な場合"
    ]
  },
  {
    id: "sec13",
    title: "第13条（利用停止）",
    paragraphs: [
      "利用者が本規約に違反した場合、運営者は事前通知なく以下を行うことができます。",
      "・投稿削除",
      "・コメント削除",
      "・アカウント停止",
      "・アカウント削除"
    ]
  },
  {
    id: "sec14",
    title: "第14条（免責事項）",
    paragraphs: [
      "本サービスは現状有姿で提供されます。",
      "運営者は本サービスの継続性、安全性、正確性を保証しません。",
      "利用者間のトラブルについて、運営者は故意または重大な過失がある場合を除き責任を負いません。"
    ]
  },
  {
    id: "sec15",
    title: "第15条（サービス変更・終了）",
    paragraphs: [
      "運営者は本サービスの内容変更または終了を行うことができます。",
      "サービス終了によって利用者に損害が生じた場合でも、運営者は責任を負わないものとします。"
    ]
  },
  {
    id: "sec16",
    title: "第16条（規約変更）",
    paragraphs: [
      "運営者は必要に応じて本規約を変更できるものとします。",
      "変更後に利用を継続した場合、利用者は変更内容に同意したものとみなされます。"
    ]
  },
  {
    id: "sec17",
    title: "第17条（準拠法）",
    paragraphs: [
      "本規約は日本法に準拠します。",
      "本サービスに関する紛争は、運営者所在地を管轄する裁判所を第一審の専属的合意管轄裁判所とします。"
    ]
  }
];

export default function TermsView({ onBack, isAdmin }: TermsViewProps) {
  const [activeAnchor, setActiveAnchor] = useState<string>('');
  const [sections, setSections] = useState<TermsPrivacySection[]>(defaultSections);
  const [updatedAt, setUpdatedAt] = useState<string>('2026年6月3日');
  const [loading, setLoading] = useState<boolean>(true);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  
  // Backups of editing states
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
    document.title = "利用規約 | 地味っち (Jimicchi)";
    
    async function loadTerms() {
      try {
        const docRef = doc(db, "legal_documents", "terms");
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
        console.warn("Using local pre-configured fallback for terms:", err);
      } finally {
        setLoading(false);
      }
    }
    loadTerms();
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

  // Cancel Edit Mode
  const cancelEditing = () => {
    setIsEditMode(false);
    setEditingSectionId(null);
  };

  // Reset to default preset
  const resetToDefaults = () => {
    if (window.confirm("利用規約をデフォルトの状態に戻しますか？（未保存の編集はすべて失われます）")) {
      setEditedSections(JSON.parse(JSON.stringify(defaultSections)));
      setEditedUpdatedAt('2026年6月3日');
      setEditingSectionId(null);
      showToast("デフォルトの設定に差し戻しました。保存を押すと確定します。");
    }
  };

  // Handle section title change
  const handleTitleChange = (idx: number, val: string) => {
    const next = [...editedSections];
    next[idx].title = val;
    setEditedSections(next);
  };

  // Move section rank rank
  const moveSection = (idx: number, direction: 'up' | 'down') => {
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === editedSections.length - 1) return;

    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    const next = [...editedSections];
    const temp = next[idx];
    next[idx] = next[targetIdx];
    next[targetIdx] = temp;
    setEditedSections(next);
  };

  // Delete section card
  const deleteSection = (idx: number) => {
    const next = [...editedSections];
    next.splice(idx, 1);
    setEditedSections(next);
    setEditingSectionId(null);
  };

  // Add paragraph helper
  const addParagraphToSection = (idx: number) => {
    const next = [...editedSections];
    next[idx].paragraphs.push('');
    setEditedSections(next);
  };

  // Handle particular paragraph content change
  const handleParagraphChange = (secIdx: number, pIdx: number, val: string) => {
    const next = [...editedSections];
    next[secIdx].paragraphs[pIdx] = val;
    setEditedSections(next);
  };

  // Remove matching paragraph from section
  const removeParagraphFromSection = (secIdx: number, pIdx: number) => {
    const next = [...editedSections];
    next[secIdx].paragraphs.splice(pIdx, 1);
    setEditedSections(next);
  };

  // Create new section
  const addNewSection = () => {
    const newSec: TermsPrivacySection = {
      id: `sec_${Date.now()}`,
      title: "新規追加条項",
      paragraphs: ["段落文章を入力してください。"]
    };
    setEditedSections([...editedSections, newSec]);
    setEditingSectionId(newSec.id);
  };

  // Save changes to Firebase Firestore
  const saveTerms = async () => {
    try {
      const docRef = doc(db, "legal_documents", "terms");
      await setDoc(docRef, {
        docType: "terms",
        updatedAt: editedUpdatedAt,
        termsPrivacySections: editedSections
      });
      setSections(editedSections);
      setUpdatedAt(editedUpdatedAt);
      setIsEditMode(false);
      setEditingSectionId(null);
      showToast("利用規約が完璧に保存・公開されました！");
    } catch (error) {
      console.error("Firestore Save Error:", error);
      showToast("データの保存に失敗しました。", "error");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <div className="p-3 bg-orange-50 rounded-2xl border border-orange-100/50 text-orange-500 animate-pulse shadow-sm">
          <Sparkle className="w-8 h-8 stroke-[1.5]" />
        </div>
        <p className="text-xs text-orange-900/60 font-bold">データを読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl mx-auto px-1 sm:px-0 relative">
      {/* Toast Banner */}
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

      {/* Back to Home & Edit Mode Button Group */}
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
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-105 rounded-xl transition cursor-pointer font-bold"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>管理者：規約を編集</span>
            </button>
          )}
        </div>

        <span className="text-[11px] text-orange-500 font-mono font-bold select-none">
          最終更新日：{isEditMode ? editedUpdatedAt : updatedAt}
        </span>
      </div>

      {/* Header Visual */}
      <div className="bg-gradient-to-br from-orange-500 to-amber-600 rounded-[32px] p-6 sm:p-8 text-white shadow-lg shadow-orange-500/10 select-none">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="bg-white/15 backdrop-blur-md px-3 py-1 rounded-full text-[10px] tracking-wider uppercase font-extrabold inline-flex items-center gap-1">
              <BookOpen className="w-3 h-3" />
              Terms of Service
            </div>
            <h2 className="text-2xl sm:text-3xl font-black font-display tracking-tight">
              地味っち 利用規約
            </h2>
          </div>
          <div className="p-3.5 bg-white/15 backdrop-blur-sm rounded-2xl border border-white/20 text-white shadow-inner shrink-0 self-center">
            <Sparkle className="w-7 h-7 stroke-[2]" />
          </div>
        </div>
        <p className="text-xs text-white/85 max-w-xl mt-4 font-bold leading-relaxed">
          本利用規約は、本サービス「地味っち」の利用条件を定めるものです。利用者は、本サービスを利用することにより、本規約に同意したものとみなされます。
        </p>
      </div>

      {isEditMode ? (
        /* ==================== EDIT MODE UI ==================== */
        <div className="space-y-6 bg-orange-50/20 p-4 sm:p-6 rounded-[32px] border-2 border-dashed border-orange-200">
          <div className="flex items-center justify-between border-b border-orange-100 pb-3">
            <div>
              <h3 className="text-sm font-black text-orange-950">利用規約編集パネル</h3>
              <p className="text-[10px] text-orange-400 font-bold">管理者権限で規約条項を追加・編集・削除できます。</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={resetToDefaults}
                title="デフォルトの文面にリセット"
                className="p-1 px-3 py-1.5 rounded-xl bg-orange-100 hover:bg-orange-200 text-orange-900 border text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                リセット
              </button>
            </div>
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
                           placeholder="第X条（条文タイトル）"
                           className="w-full bg-orange-50/55 text-xs font-black text-orange-950 p-2 rounded-xl outline-none border border-orange-200 focus:border-orange-400"
                        />
                      ) : (
                        <span className="text-xs font-black text-orange-950 block truncate">
                          {sec.title || "(無題の条項)"}
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
                            <span className="text-[10px] text-orange-300 font-black mt-3 select-none">#{pIndex+1}</span>
                            <textarea
                              rows={2}
                              value={p}
                              onChange={(e) => handleParagraphChange(secIndex, pIndex, e.target.value)}
                              placeholder="段落文章を入力してください"
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
                          <p className="text-[10px] text-gray-400 italic py-2">段落がありません。段落を追加してください。</p>
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
            <span>新しい規約条項を追加</span>
          </button>

          {/* Save Action Group */}
          <div className="flex gap-3 pt-4 border-t border-orange-100">
            <button
              onClick={saveTerms}
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
                      : 'hover:bg-orange-50/50 text-orange-800 font-bold'
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
                <div className="absolute top-6 right-6 text-orange-200 group-hover:scale-110 transition duration-200 pointer-events-none select-none">
                  <Sparkle className="w-5 h-5 stroke-[1.5]" />
                </div>
                <h3 className="text-sm font-black text-orange-950 border-b border-orange-50 pb-3 mb-4 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-400" />
                  {sec.title}
                </h3>
                <div className="space-y-2.5 text-xs text-orange-900/85 font-medium leading-relaxed">
                  {sec.paragraphs.map((p, pIndex) => (
                    <p 
                      key={pIndex} 
                      className={
                        p.startsWith('・') 
                          ? 'pl-4 flex items-start gap-1 pb-1 font-bold text-orange-950' 
                          : ''
                      }
                    >
                      {p.startsWith('・') && <CornerDownRight className="w-3.5 h-3.5 mt-0.5 text-orange-400 shrink-0" />}
                      <span>{p.startsWith('・') ? p.substring(1) : p}</span>
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer-like note inside card */}
          <div className="bg-orange-50/30 border border-orange-100/50 rounded-[32px] p-6 text-center select-none">
            <p className="text-xs text-orange-800 font-bold leading-relaxed">
              ご利用にあたって不明点・疑問点などがある場合は、お気軽にお問い合わせください。<br />
              地味っちをみんなで楽しく安全なサービスに育てていきましょう。🤝
            </p>
          </div>
        </>
      )}
    </div>
  );
}
