'use client';

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button, message, Tooltip, Select, Spin } from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import {
  fetchClubInfo,
  deleteRecord,
  getNationLogoUrl,
  getClubLogoUrl,
} from '../../../services/api';
import DeleteConfirmModal from '../../../components/DeleteConfirmModal';
import RecordDetailView from '../../../components/RecordDetailView';
import TabIconBadge from '../../../components/TabIconBadge';
import { ClubIcon } from '../../../components/EntityIcons';
import { EntityType, RecordType } from '../../../types';
import { useApp } from '../../../context/AppContext';
import { buildEntityBreadcrumbs } from '../../../utils/breadcrumbs';

const CONFED_ID_MAP: Record<string, string> = {
  '1': 'CAF',
  '2': 'AFC',
  '3': 'UEFA',
  '4': 'CONCACAF',
  '5': 'OFC',
  '6': 'CONMEBOL',
  '7': 'WORLD',
  '8': 'EXTINCT',
  CAF: 'CAF',
  AFC: 'AFC',
  UEFA: 'UEFA',
  CONCACAF: 'CONCACAF',
  OFC: 'OFC',
  CONMEBOL: 'CONMEBOL',
  WORLD: 'WORLD',
  World: 'WORLD',
  EXTINCT: 'EXTINCT',
  Extinct: 'EXTINCT',
};

function getTeamTypeCode(team: any, isRoot: boolean): string {
  if (isRoot) return '1T';

  const rawType = String(
    team.affiliate_club_type ||
    team.affiliate_club?.type ||
    ''
  ).toUpperCase().trim();

  if (rawType) return rawType;

  const nameLower = (
    String(team.name_sh || '') + ' ' +
    String(team.name_lg || '') + ' ' +
    String(team.name || '')
  ).toLowerCase();

  // 1. Youth / Academy: U18, U19, U20, U21, U23, BAC, 2AC, 3AC, CAC, AKA
  if (nameLower.includes('u19') || nameLower.includes('u-19')) return 'U19';
  if (nameLower.includes('u21') || nameLower.includes('u-21')) return 'U21';
  if (nameLower.includes('u18') || nameLower.includes('u-18')) return 'U18';
  if (nameLower.includes('u20') || nameLower.includes('u-20')) return 'U20';
  if (nameLower.includes('u23') || nameLower.includes('u-23')) return 'U23';
  if (nameLower.includes('akademie') || nameLower.includes('academy')) return 'AKA';
  if (nameLower.includes('juvenil') || nameLower.includes('junioren')) return 'YTH';

  // 2. B-Team / 2nd Team / Reserves: 2T, BT, RES
  if (
    nameLower.includes('castilla') ||
    nameLower.includes('atlètic') ||
    nameLower.includes(' b ') ||
    nameLower.endsWith(' b') ||
    nameLower.includes(' ii')
  ) {
    return 'BT';
  }

  // 3. C-Team / 3rd Team: 3T, CT
  if (
    nameLower.includes(' c ') ||
    nameLower.endsWith(' c') ||
    nameLower.includes(' iii')
  ) {
    return 'CT';
  }

  if (nameLower.includes('reserves') || nameLower.includes('dự bị')) return 'RES';

  // 4. Fallback for other affiliate
  return 'AFF';
}

function ClubDetailContent() {
  const params = useParams();
  const router = useRouter();
  const {
    openRecordModal,
    setHeaderTitle,
    setHeaderId,
    setBreadcrumbs,
    setBackHref,
    setHeaderLogo,
    refreshSignal,
    triggerRefresh,
  } = useApp();

  const clubId = params?.id ? decodeURIComponent(String(params.id)) : '';

  const [club, setClub] = useState<any | null>(null);
  const [familyTeams, setFamilyTeams] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [logoLoadError, setLogoLoadError] = useState(false);

  // Active club being displayed in the current tab
  const currentClub = useMemo(() => {
    if (!familyTeams || familyTeams.length === 0) return club;
    return familyTeams.find((t: any) => String(t.id) === String(activeTab)) || club;
  }, [familyTeams, activeTab, club]);

  const handleCopyId = (e?: React.MouseEvent, idToCopy?: string | number) => {
    e?.stopPropagation?.();
    const id = idToCopy !== undefined ? String(idToCopy) : clubId;
    if (id) {
      navigator.clipboard.writeText(id);
      setCopiedId(true);
      message.success(`Copied ID: ${id}`);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const updateAppHeader = useCallback(
    (clubData: any) => {
      if (!clubData) return;
      const title = clubData.name_sh || clubData.name_lg || clubData.name || `Club ${clubData.id}`;
      setHeaderTitle(title);
      setHeaderId(clubData.id);

      const nationId = clubData.nation?.id || clubData.nation_id;
      const nationName = clubData.nation?.name_lg || clubData.nation?.name || clubData.nation?.name_sh;
      const nationCode = clubData.nation?.name_3l || clubData.nation?.name_sh;

      const rawConfed =
        (typeof clubData.confed === 'string' ? clubData.confed : clubData.confed?.name || clubData.confed?.id) ||
        (typeof clubData.nation?.confed === 'string'
          ? clubData.nation.confed
          : clubData.nation?.confed?.name || clubData.nation?.confed?.id) ||
        (typeof clubData.comp?.confed === 'string'
          ? clubData.comp.confed
          : clubData.comp?.confed?.name || clubData.comp?.confed?.id) ||
        clubData.confed_id ||
        clubData.nation?.confed_id ||
        null;
      const confedName = rawConfed
        ? CONFED_ID_MAP[String(rawConfed)] || String(rawConfed).toUpperCase()
        : null;

      setBreadcrumbs(
        buildEntityBreadcrumbs({
          nationId,
          nationCode: nationCode || nationName,
          entityTitle: clubData.name_sh || clubData.name_lg || clubData.name,
        }),
      );
      setBackHref(nationId ? `/nation/${nationId}` : '/home');

      if (nationId) {
        setHeaderLogo({
          url: getNationLogoUrl(nationId, nationCode),
          alt: nationName || 'Nation',
          isFlag: true,
        });
      } else {
        setHeaderLogo(null);
      }
    },
    [clubId, setHeaderTitle, setHeaderId, setBreadcrumbs, setBackHref, setHeaderLogo],
  );

  const loadClubData = useCallback(async () => {
    if (!clubId) return;
    setLoading(true);
    setLogoLoadError(false);
    try {
      const data = await fetchClubInfo(clubId);
      if (data) {
        setClub(data);
        const affs = data.affiliates || [];

        // Build family teams (main team + affiliates)
        const rawFamTeams: any[] =
          Array.isArray(data.familyTeams) && data.familyTeams.length > 0
            ? data.familyTeams
            : [
                ...(data.affiliate_club ? [data.affiliate_club] : []),
                data,
                ...affs,
              ].filter(
                (v, idx, arr) => arr.findIndex((t) => String(t.id) === String(v.id)) === idx,
              );

        // Identify root club
        const rootId = String(
          (data as any).rootClubId ||
            data.affiliate_club?.id ||
            (data as any).affiliate_club_id ||
            rawFamTeams.find((t: any) => !t.affiliate_club && !t.affiliate_club_id)?.id ||
            data.id,
        );

        // Sort: root club first, then all affiliates
        const sortedFam = [
          ...rawFamTeams.filter((t: any) => String(t.id) === rootId),
          ...rawFamTeams.filter((t: any) => String(t.id) !== rootId),
        ];

        setFamilyTeams(sortedFam);

        // Determine active tab key (target club ID)
        const initialTab = sortedFam.some((t: any) => String(t.id) === String(clubId))
          ? String(clubId)
          : String(data.id || clubId);
        setActiveTab(initialTab);

        // Update header for current data
        const initialClub = sortedFam.find((t: any) => String(t.id) === initialTab) || data;
        updateAppHeader(initialClub);
      }
    } catch (err: any) {
      console.error('Failed to load club info:', err);
      message.error(err.message || 'Failed to load club details');
    } finally {
      setLoading(false);
    }
  }, [clubId, updateAppHeader]);

  useEffect(() => {
    let isMounted = true;
    loadClubData();
    return () => {
      isMounted = false;
    };
  }, [loadClubData, refreshSignal]);

  // Sync header when currentClub changes
  useEffect(() => {
    if (currentClub) {
      updateAppHeader(currentClub);
    }
  }, [currentClub, updateAppHeader]);

  // Unmount effect to clean header/breadcrumbs when leaving page
  useEffect(() => {
    return () => {
      setBreadcrumbs([]);
      setBackHref(null);
      setHeaderLogo(null);
      setHeaderId(undefined);
    };
  }, [setBreadcrumbs, setBackHref, setHeaderLogo, setHeaderId]);

  const handleTabChange = useCallback(
    (targetId: string) => {
      if (String(targetId) !== String(currentClub?.id)) {
        router.push(`/club/${targetId}`);
      }
    },
    [currentClub?.id, router],
  );

  const handleDeleteClub = async () => {
    if (!currentClub?.id) return;
    setIsDeleting(true);
    try {
      await deleteRecord(RecordType.CLUB, currentClub.id);
      message.success('Club deleted successfully');
      triggerRefresh();

      const remaining = familyTeams.filter((t) => String(t.id) !== String(currentClub.id));
      if (remaining.length > 0) {
        const nextClub = remaining[0];
        setActiveTab(String(nextClub.id));
        await loadClubData();
      } else {
        const compId = currentClub?.comp?.id || currentClub?.comp_id;
        const nationId = currentClub?.nation?.id || currentClub?.nation_id;
        if (compId) {
          router.push(`/comp/${compId}`);
        } else if (nationId) {
          router.push(`/nation/${nationId}`);
        } else {
          router.push('/');
        }
      }
    } catch (err: any) {
      console.error(err);
      message.error(err.message || 'Failed to delete club');
    } finally {
      setIsDeleting(false);
      setDeleteModalOpen(false);
    }
  };

  const hasAffiliates = familyTeams.length > 1;

  const currentClubTitle =
    currentClub?.name_sh || currentClub?.name_lg || currentClub?.name || `Club ${currentClub?.id || clubId}`;

  const currentNationId = currentClub?.nation?.id || currentClub?.nation_id;

  const tabItems = useMemo(() => {
    if (!hasAffiliates) return [];

    const rootId = String(
      (club as any)?.rootClubId ||
        club?.affiliate_club?.id ||
        (club as any)?.affiliate_club_id ||
        familyTeams.find((t: any) => !t.affiliate_club && !t.affiliate_club_id)?.id ||
        club?.id,
    );
    return familyTeams.map((team: any) => {
      const tId = String(team.id);
      const isRoot = tId === rootId;
      const isCurrentActive = tId === String(activeTab);
      const teamFullName = team.name_lg || team.name_sh || team.name || `Club ${tId}`;
      const teamDisplayName =
        team.name_sh?.trim() ||
        team.name_lg?.trim() ||
        team.name_6l?.trim() ||
        team.name_3l?.trim() ||
        String(team.id);
      const typeCode = getTeamTypeCode(team, isRoot);

      return {
        value: tId,
        selectedLabel: (
          <div className="flex items-center gap-2 min-w-0">
            <span className="shrink-0 rounded border border-sky-200 bg-sky-50 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase leading-none text-sky-700">
              {typeCode}
            </span>
            <span className="font-semibold truncate">{teamDisplayName}</span>
          </div>
        ),
        label: (
          <div className="flex items-center gap-1.5" title={teamFullName}>
            <TabIconBadge
              icon={
                  <ClubIcon
                    size={14}
                    className={isCurrentActive ? 'text-white' : 'text-blue-600'}
                  />
              }
              isActive={isCurrentActive}
              className="!h-8 !w-8 !min-w-8 !max-w-8 !p-0 shrink-0 rounded-lg"
            />
            <span className={isCurrentActive ? 'font-bold' : ''}>{teamDisplayName}</span>
            {team.is_extinct && (
              <span className="text-[10px] px-1 rounded font-semibold bg-red-100 text-red-700">
                EXT
              </span>
            )}
          </div>
        ),
      };
    });
  }, [hasAffiliates, familyTeams, activeTab, club]);

  return (
    <div className="space-y-3">
      {loading ? (
        <div className="py-20 text-center">
          <Spin size="large" description="Loading club details..." />
        </div>
      ) : !currentClub ? (
        <div className="bg-white border border-gray-200 rounded-lg py-20 text-center text-sm text-gray-500 shadow-2xs">
          <p>Club not found.</p>
          <Button type="primary" onClick={() => router.back()}>
            Go Back
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-2xs">
          {/* Club Header Banner (Icon + 2 lines: ID + name_sh) */}
          <div className="flex items-center gap-2.5 sm:gap-3 mb-4 pb-3 border-b border-gray-100 min-w-0">
            {/* Club Logo / Icon */}
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 p-0 shadow-2xs border bg-blue-50/90 border-blue-300 text-blue-600 overflow-hidden">
              {!logoLoadError && getClubLogoUrl(currentClub.id) ? (
                <img
                  src={getClubLogoUrl(currentClub.id)}
                  alt={currentClubTitle}
                  className="w-full h-full object-contain p-1"
                  onError={() => setLogoLoadError(true)}
                />
              ) : (
                <ClubIcon size={20} className="text-blue-500 shrink-0" />
              )}
            </div>

            <div className="min-w-0 flex-1 flex flex-col justify-center">
              {/* Dòng 1: ID pill with copy */}
              <div className="flex items-center gap-1.5 min-w-0">
                {currentClub.id !== undefined && currentClub.id !== null && (
                  <Tooltip title="Click to copy ID" placement="bottom">
                    <button
                      type="button"
                      onClick={(e) => handleCopyId(e, currentClub.id)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-sky-50 hover:bg-sky-100 text-sky-700 hover:text-sky-800 border border-sky-200 font-mono text-xs font-bold transition-all cursor-pointer shadow-2xs select-none"
                    >
                      <span>{currentClub.id}</span>
                      {copiedId ? (
                        <CheckOutlined className="text-emerald-600 text-xs" />
                      ) : (
                        <CopyOutlined className="text-sky-500 text-xs" />
                      )}
                    </button>
                  </Tooltip>
                )}
              </div>

              {/* Dòng 2: uppercase text club name_sh */}
              <div className="mt-1 min-w-0">
                <h1
                  className="font-bold text-xs sm:text-[13px] text-slate-900 uppercase tracking-wide line-clamp-2 break-words block leading-snug m-0"
                  title={currentClubTitle}
                >
                  {currentClubTitle}
                </h1>
              </div>
            </div>
          </div>

          {/* If club has affiliates: select the team shown in the info panel */}
          {hasAffiliates && (
            <Select
              value={activeTab}
              onChange={handleTabChange}
              options={tabItems}
              optionLabelProp="selectedLabel"
              className="family-team-select w-full mb-3"
              popupClassName="family-team-select-dropdown"
              popupMatchSelectWidth
            />
          )}

          {/* Club Info View (RecordDetailView) */}
          <div className="space-y-4">
            <RecordDetailView
              data={currentClub}
              type={EntityType.CLUB}
              hideClubAffiliates
              onEdit={() =>
                openRecordModal(
                  RecordType.CLUB,
                  currentClub,
                  currentClub?.nation_id,
                  currentClub?.comp_id,
                )
              }
              onNavigateConfed={() => router.push('/home')}
              onNavigateNation={(nId) => router.push(`/nation/${nId}`)}
              onNavigateComp={(cId) =>
                router.push(`/comp/${cId}${currentNationId ? `?nationId=${currentNationId}` : ''}`)
              }
              onNavigateClub={(cId) => {
                const inFamily = familyTeams.some((t) => String(t.id) === String(cId));
                if (inFamily) {
                  handleTabChange(String(cId));
                } else {
                  router.push(`/club/${cId}`);
                }
              }}
            />

            {/* Action buttons: Edit & Delete */}
            <div className="w-full max-w-xl mx-auto flex items-center justify-end gap-2.5 pt-2 pb-1 border-t border-slate-100">
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={() =>
                  openRecordModal(
                    RecordType.CLUB,
                    currentClub,
                    currentClub?.nation_id,
                    currentClub?.comp_id,
                  )
                }
                className="font-medium px-4 h-8 sm:h-9 rounded-lg bg-blue-600 hover:bg-blue-700 shadow-sm flex items-center justify-center gap-1.5"
              >
                <span>Edit</span>
              </Button>
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={() => setDeleteModalOpen(true)}
                className="font-medium px-4 h-8 sm:h-9 rounded-lg shadow-sm flex items-center justify-center gap-1.5"
              >
                <span>Delete</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteClub}
        loading={isDeleting}
        title="Delete Club"
        itemName={currentClubTitle}
      />
    </div>
  );
}

export default function ClubDetailPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Loading club...</div>}>
      <ClubDetailContent />
    </Suspense>
  );
}
