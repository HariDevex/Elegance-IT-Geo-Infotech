import React from 'react'
import './Skeleton.css'

export const Skeleton = ({ className = "", variant = "text", dataTestId = "skeleton" }) => {
  const variants = {
    text: "h-3.5",
    title: "h-5",
    subtitle: "h-4",
    avatar: "h-10 w-10 rounded-full",
    avatarLg: "h-14 w-14 rounded-full",
    avatarXl: "h-20 w-20 rounded-full",
    card: "rounded-xl",
    button: "h-10 w-24 rounded-lg",
    buttonLg: "h-12 w-full rounded-xl",
    badge: "h-6 w-20 rounded-full",
    icon: "h-10 w-10 rounded-lg",
  };

  return (
    <div
      data-testid={dataTestId ?? undefined}
      className={`skeleton ${variants[variant]} ${className}`}
    />
  );
};

export const SkeletonText = ({ lines = 3, className = "" }) => (
  <div className={`space-y-2 ${className}`}>
    {[...Array(lines)].map((_, i) => (
      <Skeleton key={i} variant="text" className={i === lines - 1 ? "w-3/4" : "w-full"} />
    ))}
  </div>
);

export const SkeletonCard = ({ className = "", children }) => (
  <div className={`skeleton-card ${className}`}>
    <div className="space-y-3">
      <Skeleton dataTestId="skeleton" variant="title" className="w-1/2" />
      <Skeleton dataTestId={null} variant="text" />
      <Skeleton dataTestId={null} variant="text" className="w-3/4" />
    </div>
    {children}
  </div>
);

export const SkeletonTable = ({ rows = 5, cols = 4, className = "" }) => (
  <div className={`skeleton-table ${className}`}>
    <div className="skeleton-table-header">
      <div className="flex gap-4">
        {[...Array(cols)].map((_, i) => (
          <Skeleton key={i} variant="text" className="w-24" />
        ))}
      </div>
    </div>
    <div className="skeleton-table-body">
      {[...Array(rows)].map((_, rowIdx) => (
        <div key={rowIdx} className="skeleton-table-row">
          {[...Array(cols)].map((_, colIdx) => (
            <Skeleton key={colIdx} variant="text" className="w-24" />
          ))}
        </div>
      ))}
    </div>
  </div>
);

export const SkeletonChart = ({ className = "" }) => (
  <div className={`skeleton-card p-6 ${className}`}>
    <Skeleton variant="title" className="w-40 mb-4" />
    <div className="skeleton-chart">
      {[60, 85, 45, 95, 70, 55, 80].map((h, i) => (
        <div key={i} className="skeleton-chart-bar" style={{ height: `${h}%`, animationDelay: `${i * 0.1}s` }} />
      ))}
    </div>
  </div>
);

export const SkeletonList = ({ items = 5, className = "" }) => (
  <div className={`space-y-3 ${className}`}>
    {[...Array(items)].map((_, i) => (
      <div key={i} className="skeleton-list-item">
        <Skeleton variant="avatar" />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" className="w-1/3" />
          <Skeleton variant="text" className="w-1/2" />
        </div>
        <Skeleton variant="badge" />
      </div>
    ))}
  </div>
);

export const SkeletonGrid = ({ items = 6, count, cols = 3, className = "" }) => {
  const total = count ?? items;
  return (
  <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${cols} gap-4 ${className}`}>
    {[...Array(total)].map((_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
  );
};

export const SkeletonStatCard = ({ className = "" }) => (
  <div className={`skeleton-card p-5 ${className}`}>
    <div className="flex justify-between items-start">
      <div className="space-y-2">
        <Skeleton variant="text" className="w-24" />
        <Skeleton variant="title" className="w-16" />
        <Skeleton variant="text" className="w-20" />
      </div>
      <Skeleton variant="icon" />
    </div>
  </div>
);

export const SkeletonProfile = ({ className = "" }) => (
  <div className={`max-w-2xl mx-auto space-y-6 ${className}`}>
    <div className="flex items-center gap-4">
      <Skeleton variant="avatarXl" />
      <div className="space-y-2">
        <Skeleton variant="title" className="w-40" />
        <Skeleton variant="text" className="w-32" />
      </div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton variant="text" className="w-24" />
          <Skeleton variant="text" className="h-11" />
        </div>
      ))}
    </div>
    <div className="flex gap-3">
      <Skeleton variant="button" className="w-32" />
      <Skeleton variant="button" className="w-24" />
    </div>
  </div>
);

export const SkeletonForm = ({ fields = 6, className = "" }) => (
  <div className={`max-w-3xl mx-auto space-y-6 ${className}`}>
    <Skeleton variant="title" className="w-48" />
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(fields)].map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton variant="text" className="w-20" />
          <Skeleton variant="text" className="h-11" />
        </div>
      ))}
    </div>
    <div className="flex gap-3 pt-4">
      <Skeleton variant="buttonLg" className="w-32" />
      <Skeleton variant="button" className="w-24" />
    </div>
  </div>
);

export const SkeletonDashboard = ({ className = "" }) => (
  <div className={`space-y-6 ${className}`}>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <SkeletonStatCard key={i} />
      ))}
    </div>
    <div className="grid gap-6 lg:grid-cols-2">
      <SkeletonChart />
      <SkeletonChart />
    </div>
    <div className="grid gap-4 lg:grid-cols-3">
      {[...Array(3)].map((_, i) => (
        <SkeletonList key={i} items={3} />
      ))}
    </div>
  </div>
);

export const SkeletonCalendar = ({ className = "" }) => (
  <div className={`space-y-4 ${className}`}>
    <div className="flex justify-between items-center">
      <Skeleton variant="title" className="w-32" />
      <div className="flex gap-2">
        <Skeleton variant="button" className="w-20" />
        <Skeleton variant="button" className="w-20" />
      </div>
    </div>
    <div className="skeleton-calendar">
      {[...Array(7)].map((_, i) => (
        <Skeleton key={`header-${i}`} variant="text" className="h-8 w-full" />
      ))}
      {[...Array(35)].map((_, i) => (
        <div key={`day-${i}`} className="skeleton-calendar-day">
          <Skeleton variant="text" className="h-6 w-6" />
        </div>
      ))}
    </div>
  </div>
);

export default Skeleton;
