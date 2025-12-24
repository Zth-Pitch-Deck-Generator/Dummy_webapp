// src/components/interactive-qa/QASidebar.tsx
import React from 'react';
import { SectionState } from './types';
import { cn } from '@/lib/utils';
import { CheckCircle2, Circle, Lock } from 'lucide-react';

interface QASidebarProps {
  sections: SectionState[];
  currentSectionIndex: number;
  onJump: (index: number) => void;
}

export const QASidebar: React.FC<QASidebarProps> = ({ 
  sections, 
  currentSectionIndex, 
  onJump 
}) => {
  return (
    <div className="w-64 flex-shrink-0 border-r border-gray-200 bg-gray-50/50 h-[calc(100vh-4rem)] sticky top-16 overflow-y-auto py-6 pl-4 pr-2">
      <div className="relative">
        {/* Vertical Tracing Line */}
        <div className="absolute left-3.5 top-2 bottom-2 w-0.5 bg-gray-200" />
        
        {/* Dynamic Progress Line */}
        <div 
          className="absolute left-3.5 top-2 w-0.5 bg-blue-600 transition-all duration-500 ease-in-out"
          style={{ height: `${(currentSectionIndex / (sections.length - 1)) * 100}%` }}
        />

        <div className="space-y-6 relative">
          {sections.map((section, idx) => {
            const isCompleted = section.status === 'completed';
            const isActive = section.status === 'active';
            const isPending = section.status === 'pending';

            return (
              <div 
                key={section.id}
                className={cn(
                  "group flex items-center gap-3 relative transition-all duration-200",
                  (isCompleted || isActive) ? "cursor-pointer" : "cursor-not-allowed opacity-60"
                )}
                onClick={() => !isPending && onJump(idx)}
              >
                {/* Icon Marker */}
                <div className={cn(
                  "relative z-10 w-7 h-7 rounded-full flex items-center justify-center border-2 transition-colors duration-300",
                  isCompleted ? "bg-blue-600 border-blue-600 text-white" :
                  isActive ? "bg-white border-blue-600" :
                  "bg-gray-100 border-gray-300 text-gray-400"
                )}>
                  {isCompleted && <CheckCircle2 className="w-4 h-4" />}
                  {isActive && <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />}
                  {isPending && <Lock className="w-3 h-3" />}
                </div>

                {/* Label */}
                <div className="flex flex-col">
                  <span className={cn(
                    "text-sm font-semibold transition-colors duration-200",
                    isActive ? "text-blue-700 scale-105 origin-left" : 
                    isCompleted ? "text-gray-700 group-hover:text-blue-600" : "text-gray-400"
                  )}>
                    {section.name}
                  </span>
                  {isActive && (
                    <span className="text-[10px] text-blue-500 font-medium animate-in fade-in">
                      Current Section
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};