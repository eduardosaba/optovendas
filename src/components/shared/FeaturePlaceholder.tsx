import React from 'react';
import Link from 'next/link';

type Props = {
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  icon?: React.ReactNode;
};

export default function FeaturePlaceholder({ title, description, actionLabel, actionHref, icon }: Props) {
  return (
    <div className="rounded-[28px] border border-slate-100 bg-white p-8 shadow-lg">
      <div className="flex items-start gap-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">{icon}</div>
        <div className="flex-1">
          <h2 className="text-xl font-black text-slate-900">{title}</h2>
          {description && <p className="mt-2 text-sm text-slate-500 leading-snug">{description}</p>}
          {actionHref && (
            <div className="mt-4">
              <Link href={actionHref} className="inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-black text-white shadow-md hover:bg-emerald-700">
                {actionLabel || 'Abrir'}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
