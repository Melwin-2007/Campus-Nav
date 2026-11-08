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

  // Height mappings for snap states (docked directly above the bottom nav bar)
  const snapHeights: Record<BottomSheetSnap, string> = {
    peek: '72px',
    half: '54vh',
    full: 'calc(100vh - 8.5rem)',
  };

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const { offset, velocity } = info;

    if (offset.y < -40 || velocity.y < -250) {
      // Swiped UP
      if (bottomSheetSnap === 'peek') setBottomSheetSnap('half');
      else if (bottomSheetSnap === 'half') setBottomSheetSnap('full');
    } else if (offset.y > 40 || velocity.y > 250) {
      // Swiped DOWN
      if (bottomSheetSnap === 'full') setBottomSheetSnap('half');
      else if (bottomSheetSnap === 'half') setBottomSheetSnap('peek');
    }
  };

  return (
    <div
      ref={constraintsRef}
      className="md:hidden fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px))] z-40 pointer-events-none flex flex-col justify-end"
    >
      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.12}
        onDragEnd={handleDragEnd}
        animate={{ height: snapHeights[bottomSheetSnap] }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="pointer-events-auto w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800/80 rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.12)] flex flex-col overflow-hidden"
      >
        {/* Touch Drag Handle Bar */}
        <div
          onClick={() => {
            if (bottomSheetSnap === 'peek') setBottomSheetSnap('half');
            else if (bottomSheetSnap === 'half') setBottomSheetSnap('peek');
            else setBottomSheetSnap('half');
          }}
          className="w-full pt-2.5 pb-1.5 cursor-grab active:cursor-grabbing flex flex-col items-center justify-center shrink-0 select-none touch-none"
        >
          <div className="w-10 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 transition-colors" />
        </div>

        {/* Scrollable Sheet Content with native momentum touch scrolling */}
        <div className="w-full flex-1 overflow-y-auto no-scrollbar pb-4 px-1 -webkit-overflow-scrolling-touch">
          {children}
        </div>
      </motion.div>
    </div>
  );
};

export default DraggableBottomSheet;
