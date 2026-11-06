import React from 'react';
import { RouteStep } from '../../types';
import { useNavigation } from '../../context/NavigationContext';
import { getManeuverConfig } from '../../utils/maneuverMapping';

interface TurnStepCardProps {
  step: RouteStep;
  index: number;
  isActive: boolean;
}

export const TurnStepCard: React.FC<TurnStepCardProps> = ({ step, index, isActive }) => {
  const { focusStep } = useNavigation();
  const config = getManeuverConfig(step.action || step.maneuver);
  const IconComponent = config.icon;

  return (
    <div
      onClick={() => focusStep(index)}
      className={`group relative p-3 rounded-2xl cursor-pointer transition-all border flex items-start gap-3 select-none ${
        isActive
          ? 'bg-teal-50/80 dark:bg-teal-950/40 border-brand-teal ring-2 ring-brand-teal/30 shadow-md'
          : 'bg-white/60 dark:bg-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200/70 dark:border-slate-700/60 shadow-xs'
      }`}
    >
      {/* Maneuver Icon Badge */}
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-transform group-hover:scale-105 ${config.bgLightClass} ${config.bgDarkClass} ${config.borderClass}`}
      >
        <IconComponent
          size={18}
          color={config.colorHex}
          style={{
            transform: config.rotationDegrees ? `rotate(${config.rotationDegrees}deg)` : undefined,
          }}
        />
      </div>

      {/* Instruction Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1 mb-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Step {step.step_number || index + 1}
          </span>
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            {Math.round(step.distance_meters)}m
          </span>
        </div>

        <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 leading-snug group-hover:text-brand-indigo dark:group-hover:text-brand-teal transition-colors">
          {step.instruction}
        </p>

        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400 dark:text-slate-500">
          <span>~{step.duration_seconds}s</span>
          {step.location_name && (
            <>
              <span>•</span>
              <span className="text-brand-teal dark:text-teal-300 font-medium truncate">
                Near {step.location_name}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TurnStepCard;
