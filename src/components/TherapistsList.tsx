import React, { useEffect, useState } from 'react';
import {
  Heart,
  Award,
  Sparkles,
  Calendar,
  Check,
  UserCheck,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import type { Therapist } from '../types.ts';

interface TherapistsListProps {
  onSelectTherapist: (therapistId: number) => void;
}

export const TherapistsList: React.FC<TherapistsListProps> = ({ onSelectTherapist }) => {
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/therapists')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setTherapists(data.therapists);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="py-20 text-center text-stone-500">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs font-semibold">Loading therapist roster...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Community & Mission Banner */}
      <div className="bg-gradient-to-br from-stone-900 via-stone-800 to-emerald-950 text-white rounded-3xl p-6 sm:p-10 shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 rounded-full text-xs font-semibold tracking-wide text-emerald-300 uppercase mb-3 border border-emerald-500/30">
            <Heart className="w-3.5 h-3.5 text-rose-400" />
            Social Mission & Empowerment
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight mb-2">
            Meet Our Licensed Visually Impaired Therapists
          </h1>
          <p className="text-stone-300 text-sm sm:text-base leading-relaxed">
            Vibes Massage at Circle C Mall proudly provides meaningful professional opportunities for visually impaired massage specialists. With heightened sensory precision and years of rigorous training, our therapists deliver exceptional therapeutic muscle relief, tension reduction, and soothing touch therapy.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-emerald-300">
            <span className="flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-400" /> 10 Dedicated Licensed Practitioners
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Department of Health Certified
            </span>
          </div>
        </div>
      </div>

      {/* Grid of 10 Therapists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {therapists.map((t) => (
          <div
            key={t.id}
            className="bg-white rounded-3xl border border-stone-200/90 shadow-md hover:shadow-xl transition-all duration-200 p-6 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <h3 className="text-lg font-serif font-bold text-stone-900">{t.name}</h3>
                  <span className="text-xs font-semibold text-emerald-700 block mt-0.5">
                    {t.title} • {t.years_exp} Years Experience
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-stone-100 text-stone-600 text-[10px] font-bold uppercase tracking-wider">
                  {t.gender}
                </span>
              </div>

              <div className="mt-2.5 inline-block px-3 py-1 bg-emerald-50 text-emerald-900 border border-emerald-200/60 rounded-xl text-xs font-medium">
                🎯 {t.specialization}
              </div>

              <p className="text-xs text-stone-600 mt-3 leading-relaxed">{t.bio}</p>
            </div>

            <div className="mt-5 pt-4 border-t border-stone-100 flex items-center justify-between">
              <span className="text-[11px] text-stone-400 flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-emerald-600" /> Circle C Mall Branch
              </span>
              <button
                type="button"
                onClick={() => onSelectTherapist(t.id)}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
              >
                Book with {t.name.split(' ')[0]} <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
