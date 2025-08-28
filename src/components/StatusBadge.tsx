import { Phase } from '@prisma/client';
import React from 'react';

type StatusBadgeProps = {
  phase: Phase;
};

const StatusBadge = ({ phase }: StatusBadgeProps) => {
    return (
      <div className="mb-3">
        <span className="inline-flex items-center rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300">
            Fase: {phase.replaceAll('_', ' ')}
        </span>
    </div>
    );
};

export default StatusBadge;