import React, { useMemo } from 'react';
import { Layers } from 'lucide-react';
import { useNavigation } from '../../context/NavigationContext';
import { getCategoryIconComponent } from '../../utils/iconMapping';

export const CategoryChips: React.FC = () => {
  const { categories, locations, selectedCategoryId, setSelectedCategoryId } = useNavigation();

  // Compute live location count per category
  const categoryCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    for (const loc of locations) {
      counts[loc.category_id] = (counts[loc.category_id] || 0) + 1;
    }
    return counts;
  }, [locations]);

  return (
    <div className="w-full overflow-x-auto no-scrollbar py-2 px-1 select-none flex items-center gap-2">
      {/* "All" Filter Chip */}
      <button
        onClick={() => setSelectedCategoryId(null)}
        className={`touch-target px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all flex items-center gap-2 backdrop-blur-md shadow-sm active:scale-95 ${
          selectedCategoryId === null
            ? 'bg-brand-indigo text-white shadow-brand-indigo/30 shadow-md ring-2 ring-brand-indigo/30'
            : 'bg-white/85 dark:bg-slate-800/85 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-700'
        }`}
      >
        <Layers size={14} />
        <span>All</span>
        <span
          className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
            selectedCategoryId === null
              ? 'bg-white/20 text-white'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
          }`}
        >
          {locations.length}
        </span>
      </button>

      {/* Specific Category Chips */}
      {categories.map((cat) => {
        const isSelected = selectedCategoryId === cat.id;
        const IconComponent = getCategoryIconComponent(cat.icon);
        const count = categoryCounts[cat.id] ?? cat.location_count ?? 0;

        return (
          <button
            key={cat.id}
            onClick={() => {
              if (isSelected) {
                setSelectedCategoryId(null);
              } else {
                setSelectedCategoryId(cat.id);
              }
            }}
            className={`touch-target px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all flex items-center gap-2 backdrop-blur-md shadow-sm active:scale-95 ${
              isSelected
                ? 'text-white shadow-md ring-2'
                : 'bg-white/85 dark:bg-slate-800/85 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
            style={{
              backgroundColor: isSelected ? cat.color : undefined,
              borderColor: isSelected ? cat.color : undefined,
            }}
          >
            <IconComponent size={14} />
            <span>{cat.name}</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                isSelected
                  ? 'bg-white/25 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default React.memo(CategoryChips);
