'use client';

import React, { useState, useEffect } from 'react';
import { quickSearch, getNationLogoUrl } from '../services/api';

interface QuickSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectItem: (item: any, type: string) => void;
}

export default function QuickSearchModal({ isOpen, onClose, onSelectItem }: QuickSearchModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    clubs: any[];
    competitions: any[];
    nations: any[];
    stadiums: any[];
    cities: any[];
    awards: any[];
    players: any[];
    stages: any[];
  }>({
    clubs: [],
    competitions: [],
    nations: [],
    stadiums: [],
    cities: [],
    awards: [],
    players: [],
    stages: [],
  });

  useEffect(() => {
    if (!searchTerm.trim()) {
      setResults({
        clubs: [],
        competitions: [],
        nations: [],
        stadiums: [],
        cities: [],
        awards: [],
        players: [],
        stages: [],
      });
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await quickSearch(searchTerm);
        // Sort each result group by ID ASC
        setResults({
          clubs: (res.clubs || []).sort((a: any, b: any) => Number(a.id) - Number(b.id)),
          competitions: (res.competitions || []).sort(
            (a: any, b: any) => Number(a.id) - Number(b.id),
          ),
          nations: (res.nations || []).sort((a: any, b: any) => Number(a.id) - Number(b.id)),
          stadiums: (res.stadiums || []).sort((a: any, b: any) => Number(a.id) - Number(b.id)),
          cities: (res.cities || []).sort((a: any, b: any) => Number(a.id) - Number(b.id)),
          awards: (res.awards || []).sort((a: any, b: any) => Number(a.id) - Number(b.id)),
          players: (res.players || []).sort((a: any, b: any) => Number(a.id) - Number(b.id)),
          stages: (res.stages || []).sort((a: any, b: any) => Number(a.id) - Number(b.id)),
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  if (!isOpen) return null;

  const totalResults =
    results.clubs.length +
    results.competitions.length +
    results.nations.length +
    results.stadiums.length +
    results.cities.length +
    results.awards.length +
    results.players.length +
    results.stages.length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-0 sm:p-4 sm:pt-16">
      <div className="bg-white rounded-none sm:rounded-lg shadow-2xl max-w-2xl w-full h-full sm:h-auto max-h-[96vh] sm:max-h-[88vh] flex flex-col overflow-hidden border-0 sm:border border-gray-200">
        <div className="p-3 sm:p-4 border-b border-gray-200 shrink-0 flex items-center gap-2 sm:gap-3">
          <input
            type="text"
            autoFocus
            placeholder="Search by club, competition, country, stadium, city, award, player, stage, or FM ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs sm:text-sm border-none focus:outline-none placeholder-gray-400"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="text-xs text-gray-400 hover:text-gray-600 font-bold px-1"
            >
              Clear
            </button>
          )}
          <button
            onClick={onClose}
            className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2.5 py-1 rounded font-medium shrink-0"
          >
            Esc
          </button>
        </div>

        <div className="max-h-[72vh] overflow-y-auto p-3 sm:p-4 space-y-4 flex-1">
          {loading && <div className="text-center text-xs text-gray-500 py-6">Searching...</div>}

          {!loading && searchTerm && totalResults === 0 && (
            <div className="text-center text-xs text-gray-400 py-6">
              No results found for &quot;{searchTerm}&quot;
            </div>
          )}

          {/* Clubs */}
          {results.clubs.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Clubs ({results.clubs.length})
              </div>
              <div className="divide-y divide-gray-100">
                {results.clubs.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => {
                      onSelectItem(c, 'club');
                      onClose();
                    }}
                    className="py-2 px-2 hover:bg-blue-50 rounded cursor-pointer flex items-center justify-between transition"
                  >
                    <div>
                      <div className="text-xs font-semibold text-gray-800">{c.long_name}</div>
                      <div className="text-[11px] text-gray-500">
                        {c.short_name} {c.three_letter_name ? `(${c.three_letter_name})` : ''}{' '}
                        &bull; {c.nation?.short_name || 'Free Club'}
                      </div>
                    </div>
                    <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                      ID: {c.id}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Competitions */}
          {results.competitions.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Competitions ({results.competitions.length})
              </div>
              <div className="divide-y divide-gray-100">
                {results.competitions.map((comp) => (
                  <div
                    key={comp.id}
                    onClick={() => {
                      onSelectItem(comp, 'competition');
                      onClose();
                    }}
                    className="py-2 px-2 hover:bg-emerald-50 rounded cursor-pointer flex items-center justify-between transition"
                  >
                    <div>
                      <div className="text-xs font-semibold text-emerald-900">{comp.long_name}</div>
                      <div className="text-[11px] text-gray-500">
                        {comp.short_name} &bull;{' '}
                        {comp.is_international ? 'International' : comp.nation?.short_name}
                      </div>
                    </div>
                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                      ID: {comp.id}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Nations */}
          {results.nations.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Countries ({results.nations.length})
              </div>
              <div className="divide-y divide-gray-100">
                {results.nations.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => {
                      onSelectItem(n, 'nation');
                      onClose();
                    }}
                    className="py-2 px-2 hover:bg-amber-50 rounded cursor-pointer flex items-center justify-between transition"
                  >
                    <div className="flex items-center gap-2.5">
                      {getNationLogoUrl(n.id, n.three_letter_name) ? (
                        <img
                          src={getNationLogoUrl(n.id, n.three_letter_name)}
                          alt={n.short_name || n.long_name}
                          className="w-5 h-3.5 object-cover rounded-xs border border-slate-200 shrink-0"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : null}
                      <div>
                        <div className="text-xs font-semibold text-gray-800">{n.long_name}</div>
                        <div className="text-[11px] text-gray-500">
                          Code: {n.three_letter_name} &bull; {n.confederation?.name}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                      ID: {n.id}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stadiums */}
          {results.stadiums.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Stadiums ({results.stadiums.length})
              </div>
              <div className="divide-y divide-gray-100">
                {results.stadiums.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => {
                      onSelectItem(s, 'stadium');
                      onClose();
                    }}
                    className="py-2 px-2 hover:bg-gray-50 rounded cursor-pointer flex items-center justify-between transition"
                  >
                    <div>
                      <div className="text-xs font-semibold text-gray-800">{s.name}</div>
                      <div className="text-[11px] text-gray-500">
                        {s.nation?.short_name || 'Standard'}
                      </div>
                    </div>
                    <span className="text-[10px] font-bold bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                      ID: {s.id}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cities */}
          {results.cities.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Cities ({results.cities.length})
              </div>
              <div className="divide-y divide-gray-100">
                {results.cities.map((ci) => (
                  <div
                    key={ci.id}
                    onClick={() => {
                      onSelectItem(ci, 'city');
                      onClose();
                    }}
                    className="py-2 px-2 hover:bg-gray-50 rounded cursor-pointer flex items-center justify-between transition"
                  >
                    <div>
                      <div className="text-xs font-semibold text-gray-800">{ci.name}</div>
                      <div className="text-[11px] text-gray-500">
                        {ci.nation?.short_name} &bull; {ci.categories || 'Default'}
                      </div>
                    </div>
                    <span className="text-[10px] font-bold bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                      ID: {ci.id}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Awards */}
          {results.awards.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-yellow-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <span>Awards ({results.awards.length})</span>
              </div>
              <div className="divide-y divide-gray-100">
                {results.awards.map((a) => (
                  <div
                    key={a.id}
                    onClick={() => {
                      onSelectItem(a, 'award');
                      onClose();
                    }}
                    className="py-2 px-2 hover:bg-yellow-50 rounded cursor-pointer flex items-center justify-between transition"
                  >
                    <div>
                      <div className="text-xs font-semibold text-yellow-950">{a.long_name}</div>
                      <div className="text-[11px] text-gray-500">
                        {a.short_name} &bull;{' '}
                        {a.competition?.short_name ||
                          a.competition?.long_name ||
                          a.nation?.short_name ||
                          'Global Award'}
                      </div>
                    </div>
                    <span className="text-[10px] font-bold bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                      ID: {a.id}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Persons */}
          {results.players.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-purple-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <span>Person ({results.players.length})</span>
              </div>
              <div className="divide-y divide-gray-100">
                {results.players.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      onSelectItem(p, 'player');
                      onClose();
                    }}
                    className="py-2 px-2 hover:bg-purple-50 rounded cursor-pointer flex items-center justify-between transition"
                  >
                    <div>
                      <div className="text-xs font-semibold text-purple-950">
                        {p.first_name} {p.second_name} {p.common_name ? `("${p.common_name}")` : ''}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        Person &bull; First: {p.first_name} | Last: {p.second_name}
                      </div>
                    </div>
                    <span className="text-[10px] font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                      ID: {p.id}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stages */}
          {results.stages.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-rose-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <span>Stages ({results.stages.length})</span>
              </div>
              <div className="divide-y divide-gray-100">
                {results.stages.map((st) => (
                  <div
                    key={st.id}
                    onClick={() => {
                      onSelectItem(st, 'stage');
                      onClose();
                    }}
                    className="py-2 px-2 hover:bg-rose-50 rounded cursor-pointer flex items-center justify-between transition"
                  >
                    <div>
                      <div className="text-xs font-semibold text-rose-950">{st.name}</div>
                      <div className="text-[11px] text-gray-500">Tournament Stage Name</div>
                    </div>
                    <span className="text-[10px] font-bold bg-rose-100 text-rose-700 px-2 py-0.5 rounded">
                      ID: {st.id}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
