import React, { useState, useEffect } from 'react';
import { X, ChevronDown, Check } from 'lucide-react';
import { NodeData } from '../../types';
import { t } from '../../i18n';

interface CreateAssetModalProps {
    isOpen: boolean;
    onClose: () => void;
    nodeToSnapshot: NodeData | null;
    onSave: (name: string, category: string) => Promise<void>;
}

const CATEGORIES: Array<{ value: string; labelKey: string }> = [
    { value: 'Character', labelKey: 'categoryCharacter' },
    { value: 'Scene', labelKey: 'categoryScene' },
    { value: 'Item', labelKey: 'categoryItem' },
    { value: 'Style', labelKey: 'categoryStyle' },
    { value: 'Sound Effect', labelKey: 'categorySoundEffect' },
    { value: 'Others', labelKey: 'categoryOthers' }
];

export const CreateAssetModal: React.FC<CreateAssetModalProps> = ({
    isOpen,
    onClose,
    nodeToSnapshot,
    onSave
}) => {
    const [name, setName] = useState('My Assets');
    const [category, setCategory] = useState(CATEGORIES[0].value);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

    // Reset state when opening
    useEffect(() => {
        if (isOpen) {
            setStatus('idle');
            setName('My Assets');
            setCategory(CATEGORIES[0].value);
        }
    }, [isOpen]);

    if (!isOpen || !nodeToSnapshot) return null;

    const handleSubmit = async () => {
        if (!name.trim()) return;

        setStatus('saving');
        try {
            await onSave(name, category);
            setStatus('success');
            setTimeout(() => {
                onClose();
            }, 1000);
        } catch (e) {
            setStatus('error');
            setTimeout(() => setStatus('idle'), 2000);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#121212] border border-neutral-800 rounded-2xl w-[600px] shadow-2xl overflow-hidden flex flex-col">

                {/* Header */}
                <div className="px-6 pt-6 pb-2">
                    <div className="flex items-center gap-6 border-b border-neutral-700 pb-2">
                        <button className="text-white font-medium border-b-2 border-white pb-2 -mb-2.5">{t('createAsset')}</button>
                        <button className="text-neutral-500 font-medium pb-2 hover:text-neutral-300 transition-colors">{t('addToExisting')}</button>
                    </div>
                </div>

                <div className="p-6 flex gap-6">
                    {/* Left: Cover Image */}
                    <div className="w-1/2 flex flex-col gap-2">
                        <label className="text-sm font-medium text-neutral-200">{t('coverLabel')} <span className="text-red-400">*</span></label>
                        <div className="aspect-[3/4] rounded-lg overflow-hidden border border-neutral-800 bg-neutral-900 relative group">
                            <img
                                src={nodeToSnapshot.resultUrl || ''}
                                alt="Cover"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'https://placehold.co/400x600/1a1a1a/FFF?text=Error';
                                }}
                            />
                        </div>
                    </div>

                    {/* Right: Form */}
                    <div className="w-1/2 flex flex-col gap-6">

                        {/* Name Input */}
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-neutral-200">{t('nameLabel')} <span className="text-red-400">*</span></label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-[#1a1a1a] border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                placeholder={t('assetNamePlaceholder')}
                            />
                        </div>

                        {/* Category Dropdown */}
                        <div className="flex flex-col gap-2 relative">
                            <label className="text-sm font-medium text-neutral-200">{t('categoryLabel')} <span className="text-red-400">*</span></label>
                            <button
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className="w-full bg-[#1a1a1a] border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none flex items-center justify-between hover:bg-[#252525] transition-colors"
                            >
                                <span>{t(CATEGORIES.find(c => c.value === category)?.labelKey || 'categoryOthers')}</span>
                                <ChevronDown size={16} className="text-neutral-400" />
                            </button>

                            {isDropdownOpen && (
                                <div className="absolute top-[70px] left-0 right-0 bg-[#1a1a1a] border border-neutral-700 rounded-lg shadow-xl z-10 py-1">
                                    {CATEGORIES.map(cat => (
                                        <button
                                            key={cat.value}
                                            onClick={() => {
                                                setCategory(cat.value);
                                                setIsDropdownOpen(false);
                                            }}
                                            className="w-full px-3 py-2 text-left hover:bg-[#252525] flex items-center justify-between group"
                                        >
                                            <span className="text-neutral-300 group-hover:text-white">{t(cat.labelKey)}</span>
                                            {category === cat.value && <Check size={14} className="text-white" />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-neutral-800 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-neutral-400 hover:text-white transition-colors"
                    >
                        {t('cancel')}
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={status === 'saving' || status === 'success'}
                        className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all duration-200 ${status === 'success' ? 'bg-green-600 text-white' :
                                status === 'error' ? 'bg-red-600 text-white' :
                                    status === 'saving' ? 'bg-neutral-700 text-neutral-300' :
                                        'bg-[#2a9d8f] hover:bg-[#21867a] text-white'
                            }`}
                    >
                        {status === 'saving' && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                        {status === 'success' && <Check size={16} />}
                        {status === 'idle' && t('create')}
                        {status === 'saving' && t('saving')}
                        {status === 'success' && t('saved')}
                        {status === 'error' && t('failed')}
                    </button>
                </div>

            </div>
        </div>
    );
};
