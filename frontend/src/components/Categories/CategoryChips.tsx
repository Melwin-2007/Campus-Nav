import React, { useMemo, useState } from 'react';
import { Layers, Building2, ChevronRight, Sparkles } from 'lucide-react';
import { useNavigation } from '../../context/NavigationContext';
import { getCategoryIconComponent } from '../../utils/iconMapping';
import { Location } from '../../types';

export const CategoryChips: React.FC = () => {
  const {
    categories,
    locations,
    selectedCategoryId,
    setSelectedCategoryId,
    setSelectedLocation,
    selectedLocation,
  } = useNavigation();

  const [selectedFloor, setSelectedFloor] = useState<string | null>(null);

  // Compute live location count per category
  const categoryCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    for (const loc of locations) {
      counts[loc.category_id] = (counts[loc.category_id] || 0) + 1;
    }
    return counts;
  }, [locations]);

  // Sort and filter active categories (Departments first, followed by other categories with count > 0)
  const visibleCategories = useMemo(() => {
    const active = categories.filter((cat) => (categoryCounts[cat.id] || 0) > 0);
    return active.sort((a, b) => {
      // Prioritize Departments (ID 2 or slug 'departments') to the very top
      if (a.id === 2 || a.slug === 'departments') return -1;
      if (b.id === 2 || b.slug === 'departments') return 1;
      // Prioritize Laboratories (ID 3) and Administration (ID 4) next
      if (a.id === 3 && b.id !== 2) return -1;
      if (b.id === 3 && a.id !== 2) return 1;
      if (a.id === 4 && b.id !== 2 && b.id !== 3) return -1;
      if (b.id === 4 && a.id !== 2 && a.id !== 3) return 1;
      return (categoryCounts[b.id] || 0) - (categoryCounts[a.id] || 0);
    });
  }, [categories, categoryCounts]);

  // Department locations (Category 2 + Laboratories Category 3)
  const departmentLocations = useMemo(() => {
    return locations.filter((loc) => loc.category_id === 2 || loc.category_id === 3);
  }, [locations]);

  // Handle clicking a specific department floor pill
  const handleSelectDept = (loc: Location) => {
    setSelectedLocation(loc);
  };

  const isDepartmentsActive = selectedCategoryId === 2;

  return (
    <div className="w-full flex flex-col gap-1.5 py-1 select-none">
      {/* Primary Category Filter Bar */}
      <div className="w-full overflow-x-auto no-scrollbar py-1 px-0.5 flex items-center gap-2">
        {/* "All Places" Filter Chip */}
        <button
          onClick={() => {
            setSelectedCategoryId(null);
            setSelectedFloor(null);
          }}
          className={`touch-target px-3.5 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all flex items-center gap-2 backdrop-blur-md shadow-sm active:scale-95 ${
            selectedCategoryId === null
              ? 'bg-brand-indigo text-white shadow-brand-indigo/30 shadow-md ring-2 ring-brand-indigo/30'
              : 'bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
        >
          <Layers size={14} />
          <span>All Places</span>
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

        {/* Categories Chips */}
        {visibleCategories.map((cat) => {
          const isSelected = selectedCategoryId === cat.id;
          const isDept = cat.id === 2 || cat.slug === 'departments';
          const IconComponent = isDept ? Building2 : getCategoryIconComponent(cat.icon);
          const count = categoryCounts[cat.id] ?? 0;

          return (
            <button
              key={cat.id}
              onClick={() => {
                if (isSelected) {
                  setSelectedCategoryId(null);
                  setSelectedFloor(null);
                } else {
                  setSelectedCategoryId(cat.id);
                  setSelectedFloor(null);
                }
              }}
              className={`touch-target px-3.5 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all flex items-center gap-2 backdrop-blur-md shadow-sm active:scale-95 ${
                isSelected
                  ? 'text-white shadow-md ring-2'
                  : isDept
                  ? 'bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/40 dark:to-indigo-950/40 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800 font-bold hover:shadow'
                  : 'bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
              style={{
                backgroundColor: isSelected ? cat.color : undefined,
                borderColor: isSelected ? cat.color : undefined,
              }}
            >
              <IconComponent size={14} className={isDept && !isSelected ? 'text-purple-600 dark:text-purple-400' : ''} />
              <span>{cat.name}</span>
              {isDept && !isSelected && <Sparkles size={11} className="text-amber-500 animate-pulse" />}
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  isSelected
                    ? 'bg-white/25 text-white'
                    : isDept
                    ? 'bg-purple-200/80 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Dedicated Departments Quick Directory & Floor Strip when Departments is active or filtered */}
      {isDepartmentsActive && (
        <div className="w-full flex flex-col gap-1.5 p-2 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/60 animate-fadeIn">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 flex items-center gap-1">
              <Building2 size={12} />
              Department Floor Directory
            </span>
            <span className="text-[10px] text-purple-500 dark:text-purple-400">
              Select floor to jump
            </span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {departmentLocations.map((dept) => {
              const isLocSelected = selectedLocation?.id === dept.id;
              // Extract floor tag from facilities or name
              const floorTag = dept.facilities?.find((f) => f.includes('Floor')) || 'Dept';

              return (
                <button
                  key={dept.id}
                  onClick={() => handleSelectDept(dept)}
                  className={`touch-target px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 transition-all flex items-center gap-1.5 border ${
                    isLocSelected
                      ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-purple-200 dark:border-purple-900/60 hover:bg-purple-100/60 dark:hover:bg-purple-900/40'
                  }`}
                  title={`${dept.name} (${floorTag})`}
                >
                  <span className="font-bold text-[10px] px-1 py-0.2 rounded bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
                    {floorTag}
                  </span>
                  <span className="truncate max-w-[130px]">
                    {dept.name.split('(')[0].trim().replace('Department', 'Dept')}
                  </span>
                  <ChevronRight size={11} className="opacity-60" />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(CategoryChips);
