'use client';

import React, { useState, useEffect, useCallback, Suspense, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Tabs, Button, message, Tag, Tooltip } from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  CheckOutlined,
  BranchesOutlined,
  InfoCircleOutlined,
  TrophyOutlined,
  GlobalOutlined,
  CaretRightOutlined,
  RightOutlined,
} from '@ant-design/icons';
import {
  fetchClubInfo,
  deleteRecord,
  getNationLogoUrl,
  getClubLogoUrl,
  ClubItem,
} from '../../../services/api';
import CardGrid from '../../../components/CardGrid';
import TabIconBadge from '../../../components/TabIconBadge';
import RecordModal from '../../../components/RecordModal';
import DeleteConfirmModal from '../../../components/DeleteConfirmModal';
import { ClubIcon, DomesticCompIcon } from '../../../components/EntityIcons';
import { EntityType, RecordType } from '../../../types';
import { useApp } from '../../../context/AppContext';

const CONFED_ID_MAP: Record<string, string> = {
  '1': 'AFC',
  '2': 'AFC',
  '3': 'UEFA',
  '4': 'CONCACAF',
  '5': 'OFC',
  '6': 'CONMEBOL',
  '7': 'World',
  '8': 'Extinct',
};

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
  const [affiliates, setAffiliates] = useState<ClubItem[]>([]);
  const [familyTeams, setFamilyTeams] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'AFFILIATES'>('OVERVIEW');
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [logoLoadError, setLogoLoadError] = useState(false);

  const handleCopyId = (e?: React.MouseEvent) => {
    e?.stopPropagation?.();
    if (clubId) {
      navigator.clipboard.writeText(clubId);
      setCopiedId(true);
      message.success(`Copied ID: ${clubId}`);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const loadClubData = useCallback(async () => {
    if (!clubId) return;
    setLoading(true);
    setLogoLoadError(false);
    try {
      const data = await fetchClubInfo(clubId);
      if (data) {
        setClub(data);
        const affs = data.affiliates || [];
        setAffiliates(affs);

        // Build family teams (main team + affiliates)
        const famTeams: any[] = Array.isArray(data.familyTeams) && data.familyTeams.length > 0
          ? data.familyTeams
          : [
              ...(data.affiliate_club ? [data.affiliate_club] : []),
              data,
              ...affs,
            ].filter((v, idx, arr) => arr.findIndex((t) => String(t.id) === String(v.id)) === idx);
        setFamilyTeams(famTeams);

        const title = data.name_sh || data.name_lg || data.name || `Club ${clubId}`;
        setHeaderTitle(title);
        setHeaderId(data.id);

        const nationId = data.nation?.id || data.nation_id;
        const nationName = data.nation?.name_lg || data.nation?.name || data.nation?.name_sh;
        const nationCode = data.nation?.name_3l || data.nation?.name_sh;

        const confedId =
          data.nation?.confed?.id ||
          data.nation?.confed_id ||
          data.confed?.id ||
          data.confed_id ||
          data.comp?.confed?.id ||
          data.comp?.confed_id;
        const confedName =
          (confedId && CONFED_ID_MAP[String(confedId)]) ||
          data.nation?.confed?.name ||
          data.confed?.name ||
          data.comp?.confed?.name ||
          'Confederation';

        // Breadcrumb format: FM > {CONFED} > {NATION_3L} > {CLUB_ID}
        const crumbs: any[] = [
          {
            title: 'FM',
            href: '/',
          },
        ];
        if (confedId) {
          crumbs.push({
            title: confedName,
            href: `/confed/${confedId}`,
          });
        }
        if (nationId) {
          crumbs.push({
            title: nationCode || nationName || 'Nation',
            href: `/nation/${nationId}`,
          });
        }
        crumbs.push({
          title: String(data.id || clubId),
        });

        setBreadcrumbs(crumbs);
        setBackHref(nationId ? `/nation/${nationId}` : confedId ? `/confed/${confedId}` : '/');

        if (nationId) {
          setHeaderLogo({
            url: getNationLogoUrl(nationId, nationCode),
            alt: nationName || 'Nation',
            isFlag: true,
          });
        } else {
          setHeaderLogo(null);
        }
      }
    } catch (err: any) {
      console.error('Failed to load club info:', err);
      message.error(err.message || 'Failed to load club details');
    } finally {
      setLoading(false);
    }
  }, [clubId, setHeaderTitle, setHeaderId, setBreadcrumbs, setBackHref, setHeaderLogo]);

  useEffect(() => {
    loadClubData();
    return () => {
      setBreadcrumbs([]);
      setBackHref(null);
      setHeaderLogo(null);
      setHeaderId(undefined);
    };
  }, [loadClubData, refreshSignal, setBreadcrumbs, setBackHref, setHeaderLogo, setHeaderId]);

  const handleDeleteClub = async () => {
    if (!clubId) return;
    setIsDeleting(true);
    try {
      await deleteRecord(RecordType.CLUB, clubId);
      message.success('Club deleted successfully');
      triggerRefresh();
      const compId = club?.comp?.id || club?.comp_id;
      const nationId = club?.nation?.id || club?.nation_id;
      if (compId) {
        router.push(`/comp/${compId}`);
      } else if (nationId) {
        router.push(`/nation/${nationId}`);
      } else {
        router.push('/');
      }
    } catch (err: any) {
      console.error(err);
      message.error(err.message || 'Failed to delete club');
    } finally {
      setIsDeleting(false);
      setDeleteModalOpen(false);
    }
  };

  const affiliatesCount = affiliates.length || club?.affiliatesCount || 0;

  const nationId = club?.nation?.id || club?.nation_id;
  const nationName = club?.nation?.name_lg || club?.nation?.name || club?.nation?.name_sh;
  const nationCode = club?.nation?.name_3l || club?.nation?.name_sh;

  const confedId =
    club?.nation?.confed?.id ||
    club?.nation?.confed_id ||
    club?.confed?.id ||
    club?.confed_id ||
    club?.comp?.confed?.id ||
    club?.comp?.confed_id;
  const confedName =
    (confedId && CONFED_ID_MAP[String(confedId)]) ||
    club?.nation?.confed?.name ||
    club?.confed?.name ||
    club?.comp?.confed?.name ||
    null;

  const compId = club?.comp?.id || club?.comp_id;
  const compName =
    club?.comp?.name_sh ||
    club?.comp?.name_lg ||
    club?.comp?.name ||
    (compId ? `Competition ${compId}` : null);

  const parentClub = club?.affiliate_club;

  return (
    <div className="space-y-4">
      {/* Top Main Title & Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white border border-slate-200/90 rounded-xl p-3 sm:p-4 shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0 shadow-2xs">
            <ClubIcon size={20} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 m-0 leading-tight tracking-tight uppercase">
                {club?.name_sh || club?.name_lg || club?.name || `Club ${clubId}`}
              </h1>
              {clubId && (
                <Tooltip title="Click to copy UID" placement="top">
                  <button
                    type="button"
                    onClick={handleCopyId}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 font-mono text-xs font-bold transition-all cursor-pointer shadow-2xs select-none"
                  >
                    <span>{clubId}</span>
                    {copiedId ? (
                      <CheckOutlined className="text-emerald-600 text-xs" />
                    ) : (
                      <CopyOutlined className="text-sky-500 text-xs" />
                    )}
                  </button>
                </Tooltip>
              )}
              {club?.is_extinct && (
                <Tag color="error" className="m-0 text-xs font-semibold">
                  Extinct
                </Tag>
              )}
            </div>
            {club?.name_lg && club.name_lg !== club.name_sh && (
              <div className="text-xs text-slate-500 mt-0.5 truncate font-medium">
                {club.name_lg}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          <Button
            icon={<EditOutlined />}
            onClick={() => openRecordModal(RecordType.CLUB, club, club?.nation_id, club?.comp_id)}
            className="text-xs font-semibold"
          >
            Edit Club
          </Button>
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={() => setDeleteModalOpen(true)}
            className="text-xs font-semibold"
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-5 shadow-2xs min-h-[500px]">
        {loading ? (
          <div className="text-center py-20 text-sm text-gray-500 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span>Loading club data...</span>
          </div>
        ) : !club ? (
          <div className="text-center py-20 text-sm text-gray-500">
            <p>Club not found.</p>
            <Button type="primary" onClick={() => router.back()}>
              Go Back
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Liquipedia Sub-team / Squad Selector Buttons */}
            {familyTeams.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap pb-1">
                {familyTeams.map((team: any) => {
                  const isCurrent = String(team.id) === String(clubId);
                  const teamDisplayName = team.name_sh || team.name_lg || team.name || `Club ${team.id}`;
                  return (
                    <button
                      key={team.id}
                      type="button"
                      onClick={() => {
                        if (!isCurrent) {
                          router.push(`/club/${team.id}`);
                        }
                      }}
                      className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-[#18181c] text-white shadow-xs border border-[#3f3f46] ring-1 ring-emerald-500'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                      }`}
                    >
                      <CaretRightOutlined
                        className={`text-xs ${isCurrent ? 'text-emerald-400' : 'text-slate-500'}`}
                      />
                      <span>{teamDisplayName}</span>
                      {team.is_extinct && (
                        <span className="text-[10px] bg-red-800 text-red-200 px-1 py-0.2 rounded font-semibold">
                          EXT
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Liquipedia Sub-tabs Bar */}
            <div className="flex items-center border-b border-slate-200 gap-1 pb-px">
              <button
                type="button"
                onClick={() => setActiveTab('OVERVIEW')}
                className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold transition cursor-pointer border-b-2 ${
                  activeTab === 'OVERVIEW'
                    ? 'border-red-600 text-red-600 bg-red-50/50 rounded-t'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <InfoCircleOutlined />
                <span>Overview</span>
              </button>

              {affiliatesCount > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('AFFILIATES')}
                  className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold transition cursor-pointer border-b-2 ${
                    activeTab === 'AFFILIATES'
                      ? 'border-red-600 text-red-600 bg-red-50/50 rounded-t'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <BranchesOutlined />
                  <span>Affiliates / Teams</span>
                  <span className="inline-flex items-center justify-center bg-red-600 text-white rounded-full text-[10px] font-bold h-4 min-w-[16px] px-1 shadow-2xs">
                    {affiliatesCount}
                  </span>
                </button>
              )}
            </div>

            {/* Tab: Overview (Liquipedia Infobox Layout) */}
            {activeTab === 'OVERVIEW' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2 items-start">
                {/* Liquipedia Infobox Container (Right column on desktop, prominent) */}
                <div className="lg:col-span-5 xl:col-span-4 w-full">
                  <div className="bg-[#18181c] border border-[#2e2e36] rounded-md shadow-lg overflow-hidden text-white font-sans">
                    {/* Header Banner: Red band with Club Name + Quick Action Links */}
                    <div className="bg-[#781818] text-white px-3 py-2 flex items-center justify-between border-b border-[#5e1212]">
                      <span className="font-extrabold uppercase tracking-wider text-sm sm:text-base leading-tight truncate">
                        {club.name_sh || club.name_lg || club.name}
                      </span>
                      <div className="flex items-center gap-1.5 text-xs font-mono font-bold shrink-0 text-red-200">
                        <button
                          type="button"
                          onClick={() => openRecordModal(RecordType.CLUB, club, club?.nation_id, club?.comp_id)}
                          className="hover:text-white px-1 py-0.5 rounded transition cursor-pointer"
                          title="Edit Club"
                        >
                          [e]
                        </button>
                        <button
                          type="button"
                          onClick={handleCopyId}
                          className="hover:text-white px-1 py-0.5 rounded transition cursor-pointer"
                          title="Copy UID"
                        >
                          [id]
                        </button>
                      </div>
                    </div>

                    {/* Logo Section */}
                    <div className="bg-[#101014] p-5 flex items-center justify-center min-h-[170px] border-b border-[#282830]">
                      {!logoLoadError && getClubLogoUrl(club.id) ? (
                        <img
                          src={getClubLogoUrl(club.id)}
                          alt={club.name_sh || club.name_lg || 'Club Logo'}
                          className="max-h-36 sm:max-h-40 max-w-[220px] object-contain drop-shadow-md select-none transition-transform hover:scale-105"
                          onError={() => setLogoLoadError(true)}
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-2xl bg-[#1c1c24] border border-[#333340] flex flex-col items-center justify-center text-slate-400 p-2 shadow-inner">
                          <ClubIcon size={44} className="text-slate-400" />
                          <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tight">
                            {club.name_3l || club.name_sh?.slice(0, 3) || 'FM24'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Section Header: Team Information */}
                    <div className="bg-[#4c0d0d] text-white py-1.5 px-3 text-center text-xs font-bold uppercase tracking-wider border-b border-[#360909]">
                      Team Information
                    </div>

                    {/* Key-Value Information Rows */}
                    <div className="text-xs sm:text-[13px] divide-y divide-[#26262e]">
                      {/* Location (Nation) */}
                      <div className="grid grid-cols-[130px_1fr] bg-[#18181c]">
                        <div className="bg-[#1e1e24] px-3 py-2 font-bold text-slate-300 text-right">
                          Location:
                        </div>
                        <div className="px-3 py-2 text-white flex items-center gap-2 flex-wrap">
                          {nationId && getNationLogoUrl(nationId, nationCode) ? (
                            <img
                              src={getNationLogoUrl(nationId, nationCode)}
                              alt={nationName || 'Nation'}
                              className="w-5 h-3.5 object-cover rounded-xs shadow-2xs border border-slate-600 shrink-0"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : null}
                          {nationId ? (
                            <a
                              onClick={() => router.push(`/nation/${nationId}`)}
                              className="text-blue-400 hover:text-blue-300 hover:underline font-semibold cursor-pointer"
                            >
                              {nationName || `Nation ${nationId}`}
                            </a>
                          ) : (
                            <span className="text-slate-400 italic">None</span>
                          )}
                        </div>
                      </div>

                      {/* Region (Confederation) */}
                      {confedName && (
                        <div className="grid grid-cols-[130px_1fr] bg-[#141418]">
                          <div className="bg-[#1e1e24] px-3 py-2 font-bold text-slate-300 text-right">
                            Region:
                          </div>
                          <div className="px-3 py-2 text-white flex items-center gap-1.5">
                            <GlobalOutlined className="text-sky-400 text-xs" />
                            {confedId ? (
                              <a
                                onClick={() => router.push(`/confed/${confedId}`)}
                                className="text-blue-400 hover:text-blue-300 hover:underline font-semibold cursor-pointer"
                              >
                                {confedName}
                              </a>
                            ) : (
                              <span>{confedName}</span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* League / Competition */}
                      <div className="grid grid-cols-[130px_1fr] bg-[#18181c]">
                        <div className="bg-[#1e1e24] px-3 py-2 font-bold text-slate-300 text-right">
                          League:
                        </div>
                        <div className="px-3 py-2 text-white flex items-center gap-1.5">
                          {compId ? (
                            <div className="flex items-center gap-1.5 min-w-0">
                              <TrophyOutlined className="text-amber-400 text-xs shrink-0" />
                              <a
                                onClick={() => router.push(`/comp/${compId}${nationId ? `?nationId=${nationId}` : ''}`)}
                                className="text-blue-400 hover:text-blue-300 hover:underline font-semibold cursor-pointer truncate"
                              >
                                {compName}
                              </a>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Independent / None</span>
                          )}
                        </div>
                      </div>

                      {/* Full Name */}
                      {club.name_lg && (
                        <div className="grid grid-cols-[130px_1fr] bg-[#141418]">
                          <div className="bg-[#1e1e24] px-3 py-2 font-bold text-slate-300 text-right">
                            Full Name:
                          </div>
                          <div className="px-3 py-2 text-slate-200 font-medium">
                            {club.name_lg}
                          </div>
                        </div>
                      )}

                      {/* Short Name */}
                      {club.name_sh && (
                        <div className="grid grid-cols-[130px_1fr] bg-[#18181c]">
                          <div className="bg-[#1e1e24] px-3 py-2 font-bold text-slate-300 text-right">
                            Short Name:
                          </div>
                          <div className="px-3 py-2 text-slate-200 font-medium">
                            {club.name_sh}
                          </div>
                        </div>
                      )}

                      {/* Six-Letter Name */}
                      {club.name_6l && (
                        <div className="grid grid-cols-[130px_1fr] bg-[#141418]">
                          <div className="bg-[#1e1e24] px-3 py-2 font-bold text-slate-300 text-right">
                            6-Letter:
                          </div>
                          <div className="px-3 py-2 font-mono text-amber-300 font-bold">
                            {club.name_6l}
                          </div>
                        </div>
                      )}

                      {/* Three-Letter Name */}
                      {club.name_3l && (
                        <div className="grid grid-cols-[130px_1fr] bg-[#18181c]">
                          <div className="bg-[#1e1e24] px-3 py-2 font-bold text-slate-300 text-right">
                            3-Letter:
                          </div>
                          <div className="px-3 py-2 font-mono text-emerald-400 font-bold">
                            {club.name_3l}
                          </div>
                        </div>
                      )}

                      {/* Parent Club (if this is an affiliate/reserve team) */}
                      {parentClub && (
                        <div className="grid grid-cols-[130px_1fr] bg-[#141418]">
                          <div className="bg-[#1e1e24] px-3 py-2 font-bold text-slate-300 text-right">
                            Parent Club:
                          </div>
                          <div className="px-3 py-2 text-white">
                            <a
                              onClick={() => router.push(`/club/${parentClub.id}`)}
                              className="text-blue-400 hover:text-blue-300 hover:underline font-semibold cursor-pointer inline-flex items-center gap-1"
                            >
                              <ClubIcon size={14} className="text-blue-400" />
                              <span>{parentClub.name_sh || parentClub.name_lg || `Club ${parentClub.id}`}</span>
                            </a>
                            {parentClub.type && (
                              <span className="text-[11px] text-slate-400 ml-1">
                                ({parentClub.type})
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Affiliate Teams Count */}
                      {affiliatesCount > 0 && (
                        <div className="grid grid-cols-[130px_1fr] bg-[#18181c]">
                          <div className="bg-[#1e1e24] px-3 py-2 font-bold text-slate-300 text-right">
                            Affiliates:
                          </div>
                          <div className="px-3 py-2 text-white">
                            <a
                              onClick={() => setActiveTab('AFFILIATES')}
                              className="text-blue-400 hover:text-blue-300 hover:underline font-semibold cursor-pointer"
                            >
                              {affiliatesCount} affiliate team{affiliatesCount > 1 ? 's' : ''}
                            </a>
                          </div>
                        </div>
                      )}

                      {/* Status */}
                      <div className="grid grid-cols-[130px_1fr] bg-[#141418]">
                        <div className="bg-[#1e1e24] px-3 py-2 font-bold text-slate-300 text-right">
                          Status:
                        </div>
                        <div className="px-3 py-2">
                          {club.is_extinct ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-950 text-red-300 border border-red-800">
                              Extinct
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                              Active
                            </span>
                          )}
                        </div>
                      </div>

                      {/* UID */}
                      <div className="grid grid-cols-[130px_1fr] bg-[#18181c]">
                        <div className="bg-[#1e1e24] px-3 py-2 font-bold text-slate-300 text-right">
                          UID:
                        </div>
                        <div className="px-3 py-2 font-mono font-bold text-sky-300 flex items-center gap-1.5">
                          <span>{club.id}</span>
                          <button
                            type="button"
                            onClick={handleCopyId}
                            className="text-slate-400 hover:text-white transition cursor-pointer"
                            title="Copy UID"
                          >
                            <CopyOutlined className="text-xs" />
                          </button>
                        </div>
                      </div>

                      {/* Note */}
                      {club.note && (
                        <div className="grid grid-cols-[130px_1fr] bg-[#141418]">
                          <div className="bg-[#1e1e24] px-3 py-2 font-bold text-slate-300 text-right">
                            Note:
                          </div>
                          <div className="px-3 py-2 text-slate-300 text-xs italic">
                            {club.note}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Left/Main Column: Overview Details & Context */}
                <div className="lg:col-span-7 xl:col-span-8 space-y-4">
                  {/* League / Competition Card */}
                  {compId && (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 shadow-2xs">
                      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
                        <div className="flex items-center gap-2">
                          <DomesticCompIcon size={18} className="text-amber-500" />
                          <h3 className="font-bold text-slate-800 text-sm m-0">Competition & League</h3>
                        </div>
                        <Button
                          type="link"
                          size="small"
                          onClick={() => router.push(`/comp/${compId}${nationId ? `?nationId=${nationId}` : ''}`)}
                          className="text-xs font-bold p-0 flex items-center gap-1"
                        >
                          <span>View Competition</span>
                          <RightOutlined className="text-[10px]" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-slate-500 block">Competition:</span>
                          <span className="font-bold text-slate-800 text-sm">{compName}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Competition ID:</span>
                          <span className="font-mono font-bold text-slate-700">{compId}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Nation Details Card */}
                  {nationId && (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 shadow-2xs">
                      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
                        <div className="flex items-center gap-2">
                          <GlobalOutlined className="text-blue-500 text-base" />
                          <h3 className="font-bold text-slate-800 text-sm m-0">Country & Confederation</h3>
                        </div>
                        <Button
                          type="link"
                          size="small"
                          onClick={() => router.push(`/nation/${nationId}`)}
                          className="text-xs font-bold p-0 flex items-center gap-1"
                        >
                          <span>View Nation</span>
                          <RightOutlined className="text-[10px]" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div>
                          <span className="text-slate-500 block">Nation:</span>
                          <span className="font-bold text-slate-800 text-sm">{nationName}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Code:</span>
                          <span className="font-mono font-bold text-blue-700">{nationCode || 'N/A'}</span>
                        </div>
                        {confedName && (
                          <div>
                            <span className="text-slate-500 block">Confederation:</span>
                            <span className="font-bold text-slate-800">{confedName}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Affiliates Summary Card if any */}
                  {affiliatesCount > 0 && (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 shadow-2xs">
                      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
                        <div className="flex items-center gap-2">
                          <BranchesOutlined className="text-blue-600 text-base" />
                          <h3 className="font-bold text-slate-800 text-sm m-0">
                            Affiliated Teams ({affiliatesCount})
                          </h3>
                        </div>
                        <Button
                          type="link"
                          size="small"
                          onClick={() => setActiveTab('AFFILIATES')}
                          className="text-xs font-bold p-0 flex items-center gap-1"
                        >
                          <span>Manage All</span>
                          <RightOutlined className="text-[10px]" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {affiliates.slice(0, 6).map((aff: any) => (
                          <div
                            key={aff.id}
                            onClick={() => router.push(`/club/${aff.id}`)}
                            className="p-2.5 bg-white border border-slate-200 hover:border-blue-400 rounded-md cursor-pointer transition flex items-center justify-between shadow-2xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <ClubIcon size={16} className="text-blue-600 shrink-0" />
                              <span className="font-bold text-xs text-slate-800 truncate">
                                {aff.name_sh || aff.name_lg || `Club ${aff.id}`}
                              </span>
                            </div>
                            <span className="font-mono text-[11px] text-slate-400 shrink-0 ml-2">
                              {aff.id}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab: Affiliates Grid View */}
            {activeTab === 'AFFILIATES' && (
              <div className="pt-2">
                <CardGrid
                  items={affiliates}
                  type={EntityType.CLUB}
                  loading={false}
                  onEdit={(rec) => openRecordModal(RecordType.CLUB, rec, club?.nation_id, club?.comp_id)}
                  onDelete={async (rec) => {
                    await deleteRecord(RecordType.CLUB, rec.id);
                    message.success('Affiliate deleted');
                    loadClubData();
                  }}
                  onNavigate={(step) => {
                    if (step.id) {
                      router.push(`/club/${step.id}`);
                    }
                  }}
                  emptyText="No affiliated teams found"
                  defaultPageSize={20}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteClub}
        loading={isDeleting}
        title="Delete Club"
        itemName={club?.name_lg || club?.name_sh || club?.name || `Club ${clubId}`}
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
