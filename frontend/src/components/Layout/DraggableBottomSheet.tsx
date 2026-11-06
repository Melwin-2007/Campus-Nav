import React, { useRef } from 'react';
import { motion, PanInfo } from 'framer-motion';
import { useNavigation } from '../../context/NavigationContext';
import { BottomSheetSnap } from '../../types';

interface DraggableBottomSheetProps {
  children: React.ReactNode;
}

export const DraggableBottomSheet: React.FC<DraggableBottomSheetProps> = ({ children }) => {
  const { bottomSheetSnap, setBottomSheetSnap } = useNavigation();
  const constraintsRef = useRef<HTMLDivElement>(null);

  // Height mappings for snap states
  const snapHeights: Record<BottomSheetSnap, string> = {
    peek: '84px',
    half: '52vh',
    full: '90vh',
  };

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const { offset, velocity } = info;

    if (offset.y < -60 || velocity.y < -400) {
      // Swiped UP
      if (bottomSheetSnap === 'peek') setBottomSheetSnap('half');
      else if (bottomSheetSnap === 'half') setBottomSheetSnap('full');
    } else if (offset.y > 60 || velocity.y > 400) {
      // Swiped DOWN
      if (bottomSheetSnap === 'full') setBottomSheetSnap('half');
      else if (bottomSheetSnap === 'half') setBottomSheetSnap('peek');
    }
  };

  return (
    <div
      ref={constraintsRef}
      className="md:hidden fixed inset-x-0 bottom-0 z-40 pointer-events-none flex flex-col justify-end"
    >
      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.15}
        onDragEnd={handleDragEnd}
        animate={{ height: snapHeights[bottomSheetSnap] }}
        transition={{ type: 'spring', damping: 30, stiffness: 350 }}
        className="pointer-events-auto w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800/80 rounded-t-3xl shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Drag Handle Bar */}
        <div
          onClick={() => {
            if (bottomSheetSnap === 'peek') setBottomSheetSnap('half');
            else if (bottomSheetSnap === 'half') setBottomSheetSnap('full');
            else setBottomSheetSnap('half');
          }}
          className="w-full pt-3 pb-2 cursor-grab active:cursor-grabbing flex flex-col items-center justify-center shrink-0 select-none"
        >
          <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 transition-colors" />
        </div>

        {/* Scrollable Sheet Content */}
        <div className="w-full flex-1 overflow-y-auto no-scrollbar pb-6 px-1">
          {children}
        </div>
      </motion.div>
    </div>
  );
};

export default DraggableBottomSheet;
