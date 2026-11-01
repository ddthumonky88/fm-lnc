'use client';

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button, message, Select, Spin } from 'antd';
import {
  fetchClubInfo,
  deleteRecord,
  getNationLogoUrl,
  getClubLogoUrl,
} from '../../../services/api';
import DetailBodyHeader from '../../../components/DetailBodyHeader';
import ChildEntitiesSection from '../../../components/ChildEntitiesSection';
import DeleteConfirmModal from '../../../components/DeleteConfirmModal';
import RecordDetailView from '../../../components/RecordDetailView';
import TabIconBadge from '../../../components/TabIconBadge';
import {
  ClubIcon,
  DomesticCompIcon,
  NationIcon,
  StadiumIcon,
  CityIcon,
} from '../../../components/EntityIcons';
import { EntityType, RecordType } from '../../../types';
import { useApp } from '../../../context/AppContext';
import { buildEntityBreadcrumbs } from '../../../utils/breadcrumbs';

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
  const [activeTab, setActiveTab] = useState<string>(clubId);
  const [loading, setLoading] = useState(true);
  const [logoLoadError, setLogoLoadError] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = useCallback(async () => {
    if (!clubId) return;
    setLoading(true);
    try {
      const data = await fetchClubInfo(clubId, refreshSignal > 0);
      setClub(data);

      const teams =
        data.familyTeams && data.familyTeams.length > 0
          ? data.familyTeams
          : (data as any).family_teams && (data as any).family_teams.length > 0
          ? (data as any).family_teams
          : [data];
      setFamilyTeams(teams);

      const targetId = activeTab || clubId;
      const found = teams.find((t: any) => String(t.id) === String(targetId));
      if (!found && teams.length > 0) {
        setActiveTab(String(teams[0].id));
      }

      const activeRecord = found || data;
      const title =
        activeRecord.name_sh ||
        activeRecord.name_lg ||
        activeRecord.name ||
        `Club ${activeRecord.id}`;
      setHeaderTitle(title);
      setHeaderId(activeRecord.id);
      setBackHref('/list-clubs');

      const nationId = activeRecord.nation?.id || activeRecord.nation_id;
      const bcs = buildEntityBreadcrumbs({
        nationId,
        nationCode: activeRecord.nation?.name_3l || (activeRecord as any).nation_three_letter,
        entityTitle: title,
      });
      setBreadcrumbs(bcs);
      const nationLogo = nationId ? getNationLogoUrl(nationId) : null;
      if (nationLogo) {
        setHeaderLogo({
          url: nationLogo,
          alt: activeRecord.nation?.name_lg || 'Nation Flag',
          isFlag: true,
        });
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to load club info');
    } finally {
      setLoading(false);
    }
  }, [clubId, refreshSignal, activeTab, setHeaderTitle, setHeaderId, setBackHref, setBreadcrumbs, setHeaderLogo]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const currentClub = useMemo(() => {
    if (!familyTeams.length) return club;
    return (
      familyTeams.find((t) => String(t.id) === String(activeTab)) ||
      club ||
      familyTeams[0]
    );
  }, [familyTeams, activeTab, club]);

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    setLogoLoadError(false);
    const selected = familyTeams.find((t) => String(t.id) === String(key));
    if (selected) {
      const title =
        selected.name_sh ||
        selected.name_lg ||
        selected.name ||
        `Club ${selected.id}`;
      setHeaderTitle(title);
      setHeaderId(selected.id);

      const nId = selected.nation?.id || selected.nation_id;
      const bcs = buildEntityBreadcrumbs({
        nationId: nId,
        nationCode: selected.nation?.name_3l || (selected as any).nation_three_letter,
        entityTitle: title,
      });
      setBreadcrumbs(bcs);
    }
  };

  const handleDeleteClub = async () => {
    if (!currentClub) return;
    setIsDeleting(true);
    try {
      await deleteRecord(RecordType.CLUB, String(currentClub.id));
      message.success('Club deleted successfully');
      setDeleteModalOpen(false);
      triggerRefresh();
      router.push('/list-clubs');
    } catch (err: any) {
      message.error(err.message || 'Failed to delete club');
    } finally {
      setIsDeleting(false);
    }
  };

  const hasAffiliates = familyTeams.length > 1;

  const currentClubTitle =
    currentClub?.name_sh ||
    currentClub?.name_lg ||
    currentClub?.name ||
    `Club ${currentClub?.id || clubId}`;

  const currentNationId = currentClub?.nation?.id || currentClub?.nation_id;

  const tabItems = useMemo(() => {
    if (!hasAffiliates) return [];

    const rootId = String(
      (club as any)?.rootClubId ||
        club?.affiliate_club?.id ||
        (club as any)?.affiliate_club_id ||
        familyTeams.find((t: any) => !t.affiliate_club && !t.affiliate_club_id)?.id ||
        club?.id
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spin size="large" tip="Loading club..." />
      </div>
    );
  }

  if (!currentClub) {
    return (
      <div className="p-8 text-center text-slate-500">
        <p>Club not found.</p>
        <Button onClick={() => router.push('/list-clubs')} className="mt-4">
          Back to Clubs
        </Button>
      </div>
    );
  }

  const clubLogoUrl = !logoLoadError ? getClubLogoUrl(currentClub.id) : null;

  return (
    <div className="w-full p-3 sm:p-5 space-y-4">
      {/* 1. Title của Body: Back + Icon + (Line 1: Thẻ ID, Line 2: Name) + Actions */}
      <DetailBodyHeader
        onBack={() => router.push('/list-clubs')}
        id={currentClub.id}
        name={currentClubTitle}
        code3={currentClub.name_3l || currentClub.code}
        logoUrl={clubLogoUrl}
        icon={<ClubIcon size={22} className="text-blue-600" />}
        badgeTypeStyles="bg-blue-50/90 border-blue-300 text-blue-600"
        onEdit={() =>
                openRecordModal(
                  RecordType.CLUB,
                  currentClub,
                  currentClub?.nation_id,
                  currentClub?.comp_id
                )
              }
        onDelete={() => setDeleteModalOpen(true)}
      />

      {/* Selector nếu có nhiều đội trong gia đình */}
      {hasAffiliates && (
        <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="text-xs font-semibold text-slate-500 mb-1.5">
            Select a team in the club family:
          </div>
          <Select
            value={activeTab}
            onChange={handleTabChange}
            options={tabItems}
            optionLabelProp="selectedLabel"
            className="family-team-select w-full"
            popupClassName="family-team-select-dropdown"
            popupMatchSelectWidth
          />
        </div>
      )}

      {/* 2. Vùng thông tin: Card chi tiết thuộc tính */}
      <div className="w-full">
        <RecordDetailView
          data={currentClub}
          type={EntityType.CLUB}
          hideClubAffiliates
          onEdit={() =>
            openRecordModal(
              RecordType.CLUB,
              currentClub,
              currentClub?.nation_id,
              currentClub?.comp_id
            )
          }
          onNavigateConfed={() => router.push('/list-nations')}
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
      </div>

      {/* 3. Vùng các thẻ (kèm theo số lượng) con trực thuộc / liên quan */}
      <ChildEntitiesSection
        items={[
          ...(currentClub.comp || currentClub.comp_id
            ? [
                {
                  key: 'comp',
                  label: `Competition (${currentClub.comp?.name_sh || currentClub.comp?.name_lg || 'Competition'})`,
                  count: 1,
                  icon: <DomesticCompIcon size={18} className="text-amber-500" />,
                  badgeStyles: 'bg-amber-50 border-amber-200 text-amber-600',
                  onClick: () =>
                    router.push(
                      `/comp/${currentClub.comp?.id || currentClub.comp_id}${
                        currentNationId ? `?nationId=${currentNationId}` : ''
                      }`
                    ),
                },
              ]
            : []),
          ...(currentNationId
            ? [
                {
                  key: 'nation',
                  label: `Nation (${currentClub.nation?.name_sh || currentClub.nation?.name_lg || currentNationId})`,
                  count: 1,
                  icon: <NationIcon size={18} className="text-cyan-500" />,
                  badgeStyles: 'bg-cyan-50 border-cyan-200 text-cyan-600',
                  onClick: () => router.push(`/nation/${currentNationId}`),
                },
              ]
            : []),
          ...(currentClub.stadium_id || currentClub.stadium?.id
            ? [
                {
                  key: 'stadium',
                  label: `Stadium (${currentClub.stadium?.name || currentClub.stadium_id})`,
                  count: 1,
                  icon: <StadiumIcon size={18} className="text-emerald-500" />,
                  badgeStyles: 'bg-emerald-50 border-emerald-200 text-emerald-600',
                  onClick: () =>
                    router.push(
                      `/stadium/${currentClub.stadium?.id || currentClub.stadium_id}`
                    ),
                },
              ]
            : []),
          ...(currentClub.city_id || currentClub.city?.id
            ? [
                {
                  key: 'city',
                  label: `City (${currentClub.city?.name || currentClub.city_id})`,
                  count: 1,
                  icon: <CityIcon size={18} className="text-sky-500" />,
                  badgeStyles: 'bg-sky-50 border-sky-200 text-sky-600',
                  onClick: () =>
                    router.push(`/city/${currentClub.city?.id || currentClub.city_id}`),
                },
              ]
            : []),
          ...(hasAffiliates
            ? [
                {
                  key: 'affiliates',
                  label: 'Family teams',
                  count: familyTeams.length,
                  icon: <ClubIcon size={18} className="text-indigo-500" />,
                  badgeStyles: 'bg-indigo-50 border-indigo-200 text-indigo-600',
                  onClick: () => {},
                },
              ]
            : []),
        ]}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteClub}
        loading={isDeleting}
        title="Delete club"
        itemName={currentClubTitle}
      />
    </div>
  );
}

export default function ClubDetailPage() {
  return (
    <Suspense
      fallback={<div className="p-8 text-center text-gray-400">Loading club...</div>}
    >
      <ClubDetailContent />
    </Suspense>
  );
}
