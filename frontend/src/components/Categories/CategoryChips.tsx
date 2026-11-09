import React, { useMemo, useState } from 'react';
import {
  Layers,
  Building2,
  FlaskConical,
  Landmark,
  ChevronDown,
  ChevronUp,
  MapPin,
  Sparkles,
} from 'lucide-react';
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

  const [showMoreFilters, setShowMoreFilters] = useState<boolean>(false);
  const [selectedFloor, setSelectedFloor] = useState<string>('ALL');

  // Compute live location count per category
  const categoryCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    for (const loc of locations) {
      counts[loc.category_id] = (counts[loc.category_id] || 0) + 1;
    }
    return counts;
  }, [locations]);

  // Primary categories: Departments (2), Laboratories (3), Administration (4)
  const deptCategory = useMemo(
    () => categories.find((c) => c.id === 2 || c.slug === 'departments'),
    [categories]
  );
  const labCategory = useMemo(
    () => categories.find((c) => c.id === 3 || c.slug === 'laboratories'),
    [categories]
  );
  const adminCategory = useMemo(
    () => categories.find((c) => c.id === 4 || c.slug === 'administration'),
    [categories]
  );

  // Secondary categories (amenities with count > 0)
  const secondaryCategories = useMemo(() => {
    return categories.filter((c) => {
      const isPrimary = c.id === 2 || c.id === 3 || c.id === 4;
      const count = categoryCounts[c.id] || 0;
      return !isPrimary && count > 0;
    });
  }, [categories, categoryCounts]);

  // All active categories for mobile horizontal scroll
  const allActiveCategories = useMemo(() => {
    return categories
      .filter((c) => (categoryCounts[c.id] || 0) > 0)
      .sort((a, b) => {
        if (a.id === 2) return -1;
        if (b.id === 2) return 1;
        if (a.id === 3 && b.id !== 2) return -1;
        if (b.id === 3 && a.id !== 2) return 1;
        if (a.id === 4 && b.id !== 2 && b.id !== 3) return -1;
        if (b.id === 4 && a.id !== 2 && a.id !== 3) return 1;
        return (categoryCounts[b.id] || 0) - (categoryCounts[a.id] || 0);
      });
  }, [categories, categoryCounts]);

  // All Academic Departments & Laboratories for the dedicated directory, ordered hierarchically by floor
  const departmentLocations = useMemo(() => {
    const floorRank: Record<string, number> = {
      'Ground Floor': 0,
      '1st Floor': 1,
      '2nd Floor': 2,
      '3rd Floor': 3,
      '4th Floor': 4,
    };

    return locations
      .filter((loc) => loc.category_id === 2 || loc.category_id === 3)
      .sort((a, b) => {
        const floorA = a.facilities.find((f) => f.includes('Floor')) || '';
        const floorB = b.facilities.find((f) => f.includes('Floor')) || '';
        const rankA = floorRank[floorA] ?? 99;
        const rankB = floorRank[floorB] ?? 99;
        if (rankA !== rankB) return rankA - rankB;
        return a.name.localeCompare(b.name);
      });
  }, [locations]);

  // Filtered by selected floor pill
  const filteredDepartmentLocations = useMemo(() => {
    if (selectedFloor === 'ALL') return departmentLocations;
    return departmentLocations.filter((loc) =>
      loc.facilities.some((f) => f.toLowerCase().includes(selectedFloor.toLowerCase()))
    );
  }, [departmentLocations, selectedFloor]);

  const isDepartmentsSelected = selectedCategoryId === 2;

  return (
    <div className="w-full select-none">
      {/* ========================================================
          1. MOBILE VIEW (<768px): Sleek Horizontal Scroll Pill Bar
          Keeps the mobile map view spacious, clean, and unobscured.
         ======================================================== */}
      <div className="md:hidden w-full overflow-x-auto no-scrollbar scroll-smooth py-1 px-0.5 flex items-center gap-1.5">
        {/* All Places Pill */}
        <button
          type="button"
          onClick={() => setSelectedCategoryId(null)}
          className={`touch-target px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 backdrop-blur-md shadow-sm active:scale-95 ${
            selectedCategoryId === null
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md ring-2 ring-slate-900/30 dark:ring-white/30'
              : 'bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80'
          }`}
        >
          <Layers size={13} />
          <span>All</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              selectedCategoryId === null
                ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            {locations.length}
          </span>
        </button>

        {/* Mobile Horizontal Category Pills */}
        {allActiveCategories.map((cat) => {
          const isSelected = selectedCategoryId === cat.id;
          const isDept = cat.id === 2 || cat.slug === 'departments';
          const IconComponent = isDept ? Building2 : getCategoryIconComponent(cat.icon);
          const count = categoryCounts[cat.id] ?? 0;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategoryId(isSelected ? null : cat.id)}
              className={`touch-target px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 backdrop-blur-md shadow-sm active:scale-95 ${
                isSelected
                  ? 'text-white shadow-md ring-2'
                  : isDept
                  ? 'bg-purple-100/90 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-800 font-bold'
                  : 'bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80'
              }`}
              style={{
                backgroundColor: isSelected ? cat.color : undefined,
                borderColor: isSelected ? cat.color : undefined,
              }}
            >
              <IconComponent size={13} className={isDept && !isSelected ? 'text-purple-600 dark:text-purple-400' : ''} />
              <span>{cat.name.replace('Department', 'Dept')}</span>
              {isDept && !isSelected && <Sparkles size={10} className="text-amber-500" />}
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  isSelected
                    ? 'bg-white/25 text-white'
                    : isDept
                    ? 'bg-purple-200/80 dark:bg-purple-900/80 text-purple-900 dark:text-purple-200'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ========================================================
          2. DESKTOP VIEW (>=768px): Full Structured Grid in Sidebar
          Rich cards, clean spacing, and detailed directory.
         ======================================================== */}
      <div className="hidden md:flex flex-col gap-2 pt-1">
        {/* 4 Primary Structured Filter Cards (2x2 Grid) */}
        <div className="grid grid-cols-2 gap-2 w-full">
          {/* 1. All Places Tab */}
          <button
            type="button"
            onClick={() => setSelectedCategoryId(null)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-between border ${
              selectedCategoryId === null
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-sm'
                : 'bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Layers size={14} className="shrink-0" />
              <span className="truncate">All Places</span>
            </div>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold shrink-0 ${
                selectedCategoryId === null
                  ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              {locations.length}
            </span>
          </button>

          {/* 2. Departments Tab */}
          <button
            type="button"
            onClick={() => setSelectedCategoryId(isDepartmentsSelected ? null : 2)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-between border ${
              isDepartmentsSelected
                ? 'bg-purple-600 text-white border-purple-600 shadow-sm ring-2 ring-purple-400/30'
                : 'bg-purple-50/90 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/80 hover:bg-purple-100 dark:hover:bg-purple-900/60'
            }`}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <Building2 size={14} className="shrink-0" />
              <span className="truncate">Departments</span>
              {!isDepartmentsSelected && <Sparkles size={11} className="text-amber-500 shrink-0" />}
            </div>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold shrink-0 ${
                isDepartmentsSelected
                  ? 'bg-white/25 text-white'
                  : 'bg-purple-200/80 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
              }`}
            >
              {categoryCounts[2] ?? deptCategory?.location_count ?? 4}
            </span>
          </button>

          {/* 3. Laboratories Tab */}
          <button
            type="button"
            onClick={() => setSelectedCategoryId(selectedCategoryId === 3 ? null : 3)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-between border ${
              selectedCategoryId === 3
                ? 'bg-cyan-600 text-white border-cyan-600 shadow-sm ring-2 ring-cyan-400/30'
                : 'bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <FlaskConical size={14} className="text-cyan-600 dark:text-cyan-400 shrink-0" />
              <span className="truncate">Laboratories</span>
            </div>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold shrink-0 ${
                selectedCategoryId === 3
                  ? 'bg-white/25 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              {categoryCounts[3] ?? labCategory?.location_count ?? 1}
            </span>
          </button>

          {/* 4. Administration Tab */}
          <button
            type="button"
            onClick={() => setSelectedCategoryId(selectedCategoryId === 4 ? null : 4)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-between border ${
              selectedCategoryId === 4
                ? 'bg-slate-600 text-white border-slate-600 shadow-sm ring-2 ring-slate-400/30'
                : 'bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Landmark size={14} className="text-slate-500 shrink-0" />
              <span className="truncate">Administration</span>
            </div>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold shrink-0 ${
                selectedCategoryId === 4
                  ? 'bg-white/25 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              {categoryCounts[4] ?? adminCategory?.location_count ?? 2}
            </span>
          </button>
        </div>

        {/* Secondary / Campus Facilities Row */}
        <div className="w-full flex flex-col gap-1.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Campus Facilities
            </span>
            {secondaryCategories.length > 2 && (
              <button
                type="button"
                onClick={() => setShowMoreFilters(!showMoreFilters)}
                className="text-[10px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center gap-0.5"
              >
                <span>{showMoreFilters ? 'Show less' : `+${secondaryCategories.length} more`}</span>
                {showMoreFilters ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              </button>
            )}
          </div>

          {/* Clean Wrap Layout for Secondary Categories */}
          <div className="flex flex-wrap gap-1.5">
            {secondaryCategories.slice(0, showMoreFilters ? undefined : 3).map((cat) => {
              const isSelected = selectedCategoryId === cat.id;
              const IconComponent = getCategoryIconComponent(cat.icon);
              const count = categoryCounts[cat.id] ?? 0;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategoryId(isSelected ? null : cat.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 border ${
                    isSelected
                      ? 'text-white border-transparent shadow-sm'
                      : 'bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                  style={{
                    backgroundColor: isSelected ? cat.color : undefined,
                  }}
                >
                  <IconComponent size={12} />
                  <span>{cat.name}</span>
                  <span
                    className={`px-1 py-0.1 rounded text-[10px] font-bold ${
                      isSelected ? 'bg-white/25 text-white' : 'text-slate-400'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dedicated Department Floor Directory (Desktop Only) */}
        {isDepartmentsSelected && (
          <div className="w-full flex flex-col gap-2 p-3 rounded-2xl bg-purple-50/90 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/70 shadow-sm animate-fadeIn">
            {/* Directory Header with count badge */}
            <div className="flex items-center justify-between shrink-0">
              <span className="text-xs font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                <Building2 size={13} className="text-purple-600 dark:text-purple-400" />
                <span>Department Floor Directory</span>
              </span>
              <span className="text-[10px] text-purple-700 dark:text-purple-300 font-semibold bg-purple-200/70 dark:bg-purple-900/70 px-2 py-0.5 rounded-full">
                {filteredDepartmentLocations.length} Places • Scroll
              </span>
            </div>

            {/* Quick Floor Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 shrink-0">
              {[
                { id: 'ALL', label: 'All Floors' },
                { id: 'Ground Floor', label: 'Ground' },
                { id: '1st Floor', label: '1st Floor' },
                { id: '2nd Floor', label: '2nd Floor' },
                { id: '4th Floor', label: '4th Floor' },
              ].map((item) => {
                const isActive = selectedFloor === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedFloor(item.id)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-all shrink-0 ${
                      isActive
                        ? 'bg-purple-600 text-white shadow-sm ring-1 ring-purple-400'
                        : 'bg-white/90 dark:bg-slate-800/80 text-purple-700 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800/60 hover:bg-purple-100/60'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            {/* Scrollable Department Floor Cards List with Custom Purple Scrollbar */}
            <div className="flex flex-col gap-1.5 max-h-[240px] lg:max-h-[290px] xl:max-h-[340px] overflow-y-auto overscroll-contain pr-1 custom-scrollbar -webkit-overflow-scrolling-touch">
              {filteredDepartmentLocations.map((loc) => {
                const floorTag = loc.facilities.find((f) => f.includes('Floor')) || 'Dept';
                const isLocActive = selectedLocation?.id === loc.id;
                const buildingLabel =
                  loc.entrance_node_id === 4 ? 'Department Section' : 'Administrative Block';

                return (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => setSelectedLocation(loc)}
                    className={`w-full p-2.5 rounded-xl text-left transition-all flex items-center justify-between border shrink-0 ${
                      isLocActive
                        ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border-purple-100 dark:border-purple-900/60 hover:bg-purple-100/60 dark:hover:bg-purple-900/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${
                          isLocActive
                            ? 'bg-white/25 text-white'
                            : 'bg-purple-100 dark:bg-purple-900/80 text-purple-800 dark:text-purple-200'
                        }`}
                      >
                        {floorTag}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate leading-tight">
                          {loc.name.split('(')[0].trim()}
                        </p>
                        <p
                          className={`text-[10px] truncate mt-0.5 ${
                            isLocActive ? 'text-white/80' : 'text-slate-400'
                          }`}
                        >
                          {buildingLabel}
                        </p>
                      </div>
                    </div>

                    <MapPin
                      size={14}
                      className={`shrink-0 ml-2 ${isLocActive ? 'text-white' : 'text-purple-400'}`}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(CategoryChips);
