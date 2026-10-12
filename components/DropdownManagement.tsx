import React, { useState, useContext, useMemo } from 'react';
import { AppContext } from '../App';
import Modal from './Modal';
import { DropdownCategory } from '../types';

export const DropdownManagement: React.FC = () => {
  const context = useContext(AppContext);
  if (!context) return null;

  const {
    dropdownConfig,
    addDropdownCategory,
    updateDropdownCategory,
    deleteDropdownCategory,
    addDropdownItem,
    updateDropdownItem,
    deleteDropdownItem,
    resetDropdownConfigToDefault
  } = context;

  // Active Tab: 'partnerships' | 'initiatives'
  const [activeTab, setActiveTab] = useState<'partnerships' | 'initiatives'>('partnerships');

  // Search filter
  const [searchTerm, setSearchTerm] = useState('');

  // Accordion state: set of expanded category IDs
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  // Modals state
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('');
  const [newCategoryInitialItems, setNewCategoryInitialItems] = useState('');

  const [editingCategory, setEditingCategory] = useState<DropdownCategory | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editCategoryIcon, setEditCategoryIcon] = useState('');

  const [deleteConfirmCategory, setDeleteConfirmCategory] = useState<DropdownCategory | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // In-line editing sub-item state
  const [editingItemInfo, setEditingItemInfo] = useState<{ categoryId: string; index: number; text: string } | null>(null);

  // Quick new item per category state
  const [quickNewItem, setQuickNewItem] = useState<{ [categoryId: string]: string }>({});

  // Active category list based on active tab
  const currentCategories = useMemo(() => {
    return activeTab === 'partnerships'
      ? (dropdownConfig?.partnershipsCategories || [])
      : (dropdownConfig?.initiativesCategories || []);
  }, [activeTab, dropdownConfig]);

  // Filtered categories based on search
  const filteredCategories = useMemo(() => {
    if (!searchTerm.trim()) return currentCategories;
    const term = searchTerm.toLowerCase().trim();
    return currentCategories.filter((cat) => {
      const matchName = cat.name.toLowerCase().includes(term);
      const matchItems = cat.items.some((item) => item.toLowerCase().includes(term));
      return matchName || matchItems;
    });
  }, [currentCategories, searchTerm]);

  // Total counts
  const totalCategoriesCount = currentCategories.length;
  const totalItemsCount = useMemo(() => {
    return currentCategories.reduce((acc, cat) => acc + cat.items.length, 0);
  }, [currentCategories]);

  // Toggle Category Expansion
  const toggleCategory = (id: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const isCategoryExpanded = (id: string) => {
    // If user searched and there's a match in sub-items, auto-expand to show search results
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      const cat = currentCategories.find((c) => c.id === id);
      if (cat && cat.items.some((item) => item.toLowerCase().includes(term))) {
        return expandedCategories[id] !== false;
      }
    }
    // Default is collapsed (false)
    return !!expandedCategories[id];
  };

  const expandAll = () => {
    const newState: Record<string, boolean> = {};
    currentCategories.forEach((cat) => {
      newState[cat.id] = true;
    });
    setExpandedCategories(newState);
  };

  const collapseAll = () => {
    const newState: Record<string, boolean> = {};
    currentCategories.forEach((cat) => {
      newState[cat.id] = false;
    });
    setExpandedCategories(newState);
  };

  // Add Category Handler
  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    const initialItems = newCategoryInitialItems
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    addDropdownCategory(
      activeTab,
      newCategoryName.trim(),
      initialItems,
      newCategoryIcon.trim() || (activeTab === 'partnerships' ? '🏛️' : '🏷️')
    );

    setNewCategoryName('');
    setNewCategoryIcon('');
    setNewCategoryInitialItems('');
    setIsAddCategoryModalOpen(false);
  };

  // Edit Category Handler
  const handleSaveEditCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editCategoryName.trim()) return;

    updateDropdownCategory(activeTab, editingCategory.id, editCategoryName.trim());
    setEditingCategory(null);
  };

  // Quick Add Item Handler
  const handleQuickAddItem = (categoryId: string) => {
    const itemText = quickNewItem[categoryId]?.trim();
    if (!itemText) return;

    addDropdownItem(activeTab, categoryId, itemText);
    setQuickNewItem((prev) => ({ ...prev, [categoryId]: '' }));
  };

  // Save edited sub-item
  const handleSaveEditedItem = () => {
    if (!editingItemInfo || !editingItemInfo.text.trim()) {
      setEditingItemInfo(null);
      return;
    }
    updateDropdownItem(activeTab, editingItemInfo.categoryId, editingItemInfo.index, editingItemInfo.text.trim());
    setEditingItemInfo(null);
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in pb-12">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white rounded-2xl p-4 sm:p-6 shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="text-2xl sm:text-3xl">📑</span>
              <h2 className="text-lg sm:text-2xl font-black tracking-tight">إدارة وتعديل القوائم المنسدلة</h2>
            </div>
            <p className="text-xs sm:text-sm text-blue-200 font-medium">
              تخصيص القوائم الرئيسية والفرعية التابعة لاستمارات إدخال الشراكات والمبادرات
            </p>
          </div>

          {/* Quick Stats Badges */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/20 text-center flex-1 sm:flex-none">
              <span className="block text-[10px] sm:text-xs text-blue-200 font-bold">القوائم الرئيسية</span>
              <span className="text-base sm:text-xl font-black text-white">{totalCategoriesCount}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/20 text-center flex-1 sm:flex-none">
              <span className="block text-[10px] sm:text-xs text-blue-200 font-bold">إجمالي البنود الفرعية</span>
              <span className="text-base sm:text-xl font-black text-white">{totalItemsCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Two Tabs Switcher: Partnerships & Initiatives */}
      <div className="bg-white dark:bg-gray-800 p-1.5 sm:p-2 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Tab Buttons */}
        <div className="grid grid-cols-2 w-full sm:w-auto gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('partnerships')}
            className={`flex items-center justify-center gap-2 px-4 sm:px-6 py-3 rounded-xl font-black text-xs sm:text-sm transition-all ${
              activeTab === 'partnerships'
                ? 'bg-blue-700 text-white shadow-md'
                : 'bg-gray-100 dark:bg-gray-700/60 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <span className="text-base sm:text-lg">🤝</span>
            <span>قوائم الشراكات</span>
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                activeTab === 'partnerships'
                  ? 'bg-blue-900 text-blue-100'
                  : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
              }`}
            >
              {dropdownConfig?.partnershipsCategories?.length || 0}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('initiatives')}
            className={`flex items-center justify-center gap-2 px-4 sm:px-6 py-3 rounded-xl font-black text-xs sm:text-sm transition-all ${
              activeTab === 'initiatives'
                ? 'bg-blue-700 text-white shadow-md'
                : 'bg-gray-100 dark:bg-gray-700/60 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <span className="text-base sm:text-lg">🚀</span>
            <span>قوائم المبادرات</span>
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                activeTab === 'initiatives'
                  ? 'bg-blue-900 text-blue-100'
                  : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
              }`}
            >
              {dropdownConfig?.initiativesCategories?.length || 0}
            </span>
          </button>
        </div>

        {/* Global Action Controls */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={() => setIsAddCategoryModalOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 sm:px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-sm transition active:scale-95"
            title="إضافة قائمة رئيسية جديدة"
          >
            <span>➕</span>
            <span>إضافة قائمة رئيسية</span>
          </button>

          <button
            type="button"
            onClick={expandAll}
            className="p-2 sm:px-3 sm:py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl font-bold text-xs transition"
            title="توسيع جميع القوائم"
          >
            <span className="hidden sm:inline ml-1">توسيع الكل</span>
            <span>🔽</span>
          </button>

          <button
            type="button"
            onClick={collapseAll}
            className="p-2 sm:px-3 sm:py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl font-bold text-xs transition"
            title="طي جميع القوائم"
          >
            <span className="hidden sm:inline ml-1">طي الكل</span>
            <span>🔼</span>
          </button>

          <button
            type="button"
            onClick={() => setIsResetConfirmOpen(true)}
            className="p-2 sm:px-3 sm:py-2.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 rounded-xl font-bold text-xs transition"
            title="استعادة القوائم الافتراضية للنظام"
          >
            <span className="hidden sm:inline ml-1">استعادة الافتراضي</span>
            <span>🔄</span>
          </button>
        </div>
      </div>

      {/* Search Filter Bar */}
      <div className="relative">
        <span className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-gray-400 text-base">
          🔍
        </span>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={`بحث في قوائم وبنود ${activeTab === 'partnerships' ? 'الشراكات' : 'المبادرات'}...`}
          className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 pr-10 pl-10 py-3 rounded-2xl border-2 border-gray-200 dark:border-gray-700 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 text-xs sm:text-sm font-bold shadow-sm transition"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 font-bold"
          >
            ✕
          </button>
        )}
      </div>

      {/* Categories Accordion List */}
      <div className="space-y-3.5 sm:space-y-4">
        {filteredCategories.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center border-2 border-dashed border-gray-200 dark:border-gray-700">
            <div className="text-4xl mb-3">🔍</div>
            <h3 className="text-base sm:text-lg font-bold text-gray-700 dark:text-gray-200 mb-1">
              لا توجد قوائم تطابق بحثك
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              يمكنك مسح نص البحث أو الضغط على زر &quot;إضافة قائمة رئيسية&quot; لإنشاء قائمة جديدة.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setIsAddCategoryModalOpen(true);
              }}
              className="bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm hover:bg-blue-800 transition"
            >
              ➕ إضافة قائمة رئيسية جديدة
            </button>
          </div>
        ) : (
          filteredCategories.map((category, catIndex) => {
            const isExpanded = isCategoryExpanded(category.id);
            return (
              <div
                key={category.id}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-200"
              >
                {/* Category Header (Accordion Bar) */}
                <div
                  className={`p-3.5 sm:p-4 flex items-center justify-between gap-2.5 transition-colors cursor-pointer select-none ${
                    isExpanded
                      ? 'bg-blue-50/80 dark:bg-slate-900/80 border-b border-blue-200 dark:border-gray-700'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-750'
                  }`}
                  onClick={() => toggleCategory(category.id)}
                >
                  {/* Left: Category Title & Count */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span className="text-xl sm:text-2xl flex-shrink-0">{category.icon || '🏷️'}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm sm:text-base font-black text-gray-900 dark:text-gray-100 truncate">
                          {category.name}
                        </h3>
                        <span className="bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 font-extrabold text-[11px] px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                          {category.items.length} {category.items.length === 1 ? 'بند' : 'بنود فرعية'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Quick Category Action Buttons */}
                  <div
                    className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Edit Category Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCategory(category);
                        setEditCategoryName(category.name);
                        setEditCategoryIcon(category.icon || '');
                      }}
                      className="p-1.5 sm:px-2.5 sm:py-1.5 text-blue-700 hover:bg-blue-100 dark:text-blue-300 dark:hover:bg-blue-950/60 rounded-xl font-bold text-xs transition"
                      title="تعديل اسم القائمة"
                    >
                      <span className="hidden sm:inline ml-1">تعديل</span>
                      <span>✏️</span>
                    </button>

                    {/* Delete Category Button */}
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmCategory(category)}
                      className="p-1.5 sm:px-2.5 sm:py-1.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40 rounded-xl font-bold text-xs transition"
                      title="حذف القائمة بالكامل"
                    >
                      <span className="hidden sm:inline ml-1">حذف</span>
                      <span>🗑️</span>
                    </button>

                    {/* Collapse / Expand Indicator */}
                    <button
                      type="button"
                      onClick={() => toggleCategory(category.id)}
                      className="p-1.5 sm:p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-xl transition"
                    >
                      <svg
                        className={`w-5 h-5 transition-transform duration-200 ${
                          isExpanded ? 'rotate-180' : 'rotate-0'
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Sub-Items List (Visible when expanded) */}
                {isExpanded && (
                  <div className="p-3 sm:p-5 space-y-4 animate-fade-in bg-white dark:bg-gray-800">
                    {category.items.length === 0 ? (
                      <div className="text-center py-4 text-gray-400 text-xs font-semibold">
                        لا توجد بنود فرعية في هذه القائمة حالياً. استخدم الخانة بالأسفل لإضافة بند فرعي.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-2.5">
                        {category.items.map((item, itemIdx) => {
                          const isEditingThis =
                            editingItemInfo?.categoryId === category.id && editingItemInfo?.index === itemIdx;

                          return (
                            <div
                              key={`${category.id}_item_${itemIdx}`}
                              className="group flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-gray-50 dark:bg-gray-750/70 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 transition shadow-xs"
                            >
                              {isEditingThis ? (
                                <div className="flex items-center gap-1.5 w-full">
                                  <input
                                    type="text"
                                    autoFocus
                                    value={editingItemInfo.text}
                                    onChange={(e) =>
                                      setEditingItemInfo({
                                        ...editingItemInfo,
                                        text: e.target.value
                                      })
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSaveEditedItem();
                                      if (e.key === 'Escape') setEditingItemInfo(null);
                                    }}
                                    className="flex-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-bold text-xs sm:text-sm px-2.5 py-1.5 rounded-lg border-2 border-blue-500 focus:outline-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={handleSaveEditedItem}
                                    className="px-2.5 py-1.5 bg-emerald-600 text-white rounded-lg font-bold text-xs hover:bg-emerald-700 transition"
                                  >
                                    حفظ ✓
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingItemInfo(null)}
                                    className="px-2 py-1.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-bold text-xs transition"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-center gap-2 min-w-0 flex-1 pr-1">
                                    <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 text-[10px] font-black flex items-center justify-center flex-shrink-0">
                                      {itemIdx + 1}
                                    </span>
                                    <span className="text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-100 break-words line-clamp-2">
                                      {item}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setEditingItemInfo({
                                          categoryId: category.id,
                                          index: itemIdx,
                                          text: item
                                        })
                                      }
                                      className="p-1 sm:p-1.5 text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-950/60 rounded-lg transition"
                                      title="تعديل هذا البند"
                                    >
                                      ✏️
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (window.confirm(`هل أنت متأكد من حذف البند: "${item}"؟`)) {
                                          deleteDropdownItem(activeTab, category.id, itemIdx);
                                        }
                                      }}
                                      className="p-1 sm:p-1.5 text-red-500 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-950/60 rounded-lg transition"
                                      title="حذف هذا البند"
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Quick Add Sub-Item Input at bottom of category */}
                    <div className="pt-2 border-t border-gray-100 dark:border-gray-700/80">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={quickNewItem[category.id] || ''}
                          onChange={(e) =>
                            setQuickNewItem((prev) => ({
                              ...prev,
                              [category.id]: e.target.value
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleQuickAddItem(category.id);
                            }
                          }}
                          placeholder={`+ إضافة بند فرعي جديد إلى "${category.name}"...`}
                          className="flex-1 bg-gray-50 dark:bg-gray-900/60 text-gray-900 dark:text-gray-100 text-xs sm:text-sm font-bold px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 focus:border-blue-600 focus:bg-white dark:focus:bg-gray-800 transition shadow-inner"
                        />
                        <button
                          type="button"
                          disabled={!quickNewItem[category.id]?.trim()}
                          onClick={() => handleQuickAddItem(category.id)}
                          className="px-4 py-2.5 bg-blue-700 hover:bg-blue-800 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-xl font-black text-xs sm:text-sm shadow-sm transition active:scale-95 disabled:cursor-not-allowed whitespace-nowrap"
                        >
                          إضافة ➕
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Add New Main Category */}
      {isAddCategoryModalOpen && (
        <Modal
          title={`إضافة قائمة رئيسية جديدة في (${activeTab === 'partnerships' ? 'الشراكات' : 'المبادرات'})`}
          onClose={() => setIsAddCategoryModalOpen(false)}
        >
          <form onSubmit={handleCreateCategory} className="space-y-4 text-right">
            <div>
              <label className="block text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">
                اسم القائمة الرئيسية: <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                autoFocus
                required
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="مثال: قطاع المؤسسات الأهلية، صحة البيئة..."
                className="input-style text-sm sm:text-base font-bold min-h-[46px] rounded-xl border-2"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">
                الرمز التعبيري / الأيقونة (اختياري):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  maxLength={4}
                  value={newCategoryIcon}
                  onChange={(e) => setNewCategoryIcon(e.target.value)}
                  placeholder={activeTab === 'partnerships' ? '🏛️' : '🏷️'}
                  className="w-20 text-center text-xl p-2 rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 font-bold"
                />
                <div className="flex flex-wrap gap-1.5">
                  {['🏛️', '🤝', '🏢', '🎓', '🌐', '🚀', '🩺', '✨', '🎯', '🏷️'].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setNewCategoryIcon(emoji)}
                      className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-blue-100 dark:hover:bg-blue-900 text-lg flex items-center justify-center transition"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">
                البنود الفرعية الأولية (اختياري - كل بند في سطر):
              </label>
              <textarea
                rows={4}
                value={newCategoryInitialItems}
                onChange={(e) => setNewCategoryInitialItems(e.target.value)}
                placeholder="اكتب البنود الفرعية هنا، كل بند في سطر مستقل..."
                className="input-style text-xs sm:text-sm font-bold rounded-xl border-2 resize-y"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t dark:border-gray-700">
              <button
                type="button"
                onClick={() => setIsAddCategoryModalOpen(false)}
                className="px-4 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl font-bold text-xs sm:text-sm hover:bg-gray-300 transition"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs sm:text-sm shadow-md transition active:scale-95"
              >
                حفظ وإنشاء القائمة 💾
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Edit Category Name */}
      {editingCategory && (
        <Modal
          title={`تعديل القائمة الرئيسية: "${editingCategory.name}"`}
          onClose={() => setEditingCategory(null)}
        >
          <form onSubmit={handleSaveEditCategory} className="space-y-4 text-right">
            <div>
              <label className="block text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">
                اسم القائمة: <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                autoFocus
                required
                value={editCategoryName}
                onChange={(e) => setEditCategoryName(e.target.value)}
                className="input-style text-sm sm:text-base font-bold min-h-[46px] rounded-xl border-2"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t dark:border-gray-700">
              <button
                type="button"
                onClick={() => setEditingCategory(null)}
                className="px-4 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl font-bold text-xs sm:text-sm hover:bg-gray-300 transition"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-black text-xs sm:text-sm shadow-md transition active:scale-95"
              >
                حفظ التعديل 💾
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Delete Category Confirmation */}
      {deleteConfirmCategory && (
        <Modal
          title="تأكيد حذف القائمة الرئيسية"
          onClose={() => setDeleteConfirmCategory(null)}
        >
          <div className="space-y-4 text-right">
            <div className="p-4 bg-red-50 dark:bg-red-950/40 rounded-2xl border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 space-y-2">
              <div className="flex items-center gap-2 font-black text-sm sm:text-base">
                <span>⚠️</span>
                <span>تحذير: هذا الإجراء سيحذف القائمة وجميع بنودها الفرعية</span>
              </div>
              <p className="text-xs">
                أنت على وشك حذف القائمة: <strong>&quot;{deleteConfirmCategory.name}&quot;</strong> والتي تحتوي على{' '}
                <strong>{deleteConfirmCategory.items.length} بنود فرعية</strong>.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmCategory(null)}
                className="px-4 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl font-bold text-xs sm:text-sm hover:bg-gray-300 transition"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteDropdownCategory(activeTab, deleteConfirmCategory.id);
                  setDeleteConfirmCategory(null);
                }}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black text-xs sm:text-sm shadow-md transition active:scale-95"
              >
                نعم، احذف القائمة نهائياً 🗑️
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Reset to System Defaults Confirmation */}
      {isResetConfirmOpen && (
        <Modal
          title="استعادة القوائم الافتراضية للنظام"
          onClose={() => setIsResetConfirmOpen(false)}
        >
          <div className="space-y-4 text-right">
            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 space-y-2">
              <div className="flex items-center gap-2 font-black text-sm sm:text-base">
                <span>🔄</span>
                <span>هل أنت متأكد من رغبتك باستعادة القوائم الافتراضية؟</span>
              </div>
              <p className="text-xs">
                سيتم إعادة ضبط جميع قوائم الشراكات والمبادرات والبنود الفرعية إلى القوائم الأصلية المعتمدة لبرنامج الإجادة المؤسسية.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3">
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                className="px-4 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl font-bold text-xs sm:text-sm hover:bg-gray-300 transition"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  resetDropdownConfigToDefault();
                  setIsResetConfirmOpen(false);
                }}
                className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-black text-xs sm:text-sm shadow-md transition active:scale-95"
              >
                استعادة الافتراضي الآن 🔄
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default DropdownManagement;
