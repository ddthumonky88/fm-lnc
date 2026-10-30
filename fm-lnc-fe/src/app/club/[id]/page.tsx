'use client';

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button, message, Tooltip, Tabs, Spin } from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  CheckOutlined,
  BranchesOutlined,
  InfoCircleOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import {
  fetchClubInfo,
  deleteRecord,
  getNationLogoUrl,
  getClubLogoUrl,
  ClubItem,
} from '../../../services/api';
import CardGrid from '../../../components/CardGrid';
import DeleteConfirmModal from '../../../components/DeleteConfirmModal';
import RecordDetailView from '../../../components/RecordDetailView';
import TabIconBadge from '../../../components/TabIconBadge';
import { ClubIcon } from '../../../components/EntityIcons';
import { EntityType, RecordType } from '../../../types';
import { useApp } from '../../../context/AppContext';

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
  const [activeTab, setActiveTab] = useState<'INFO' | 'AFFILIATES'>('INFO');
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
        const famTeams: any[] =
          Array.isArray(data.familyTeams) && data.familyTeams.length > 0
            ? data.familyTeams
            : [
                ...(data.affiliate_club ? [data.affiliate_club] : []),
                data,
                ...affs,
              ].filter(
                (v, idx, arr) => arr.findIndex((t) => String(t.id) === String(v.id)) === idx,
              );
        setFamilyTeams(famTeams);

        const title = data.name_sh || data.name_lg || data.name || `Club ${clubId}`;
        setHeaderTitle(title);
        setHeaderId(data.id);

        const nationId = data.nation?.id || data.nation_id;
        const nationName = data.nation?.name_lg || data.nation?.name || data.nation?.name_sh;
        const nationCode = data.nation?.name_3l || data.nation?.name_sh;

        const rawConfed =
          (typeof data.confed === 'string' ? data.confed : data.confed?.name || data.confed?.id) ||
          (typeof data.nation?.confed === 'string'
            ? data.nation.confed
            : data.nation?.confed?.name || data.nation?.confed?.id) ||
          (typeof data.comp?.confed === 'string'
            ? data.comp.confed
            : data.comp?.confed?.name || data.comp?.confed?.id) ||
          data.confed_id ||
          data.nation?.confed_id ||
          null;
        const confedName = rawConfed
          ? CONFED_ID_MAP[String(rawConfed)] || String(rawConfed).toUpperCase()
          : null;

        // Unified breadcrumb: FM > {CONFED} > {NATION_3L} > {CLUB_ID}
        const crumbs: any[] = [
          {
            title: 'FM',
            href: '/',
          },
        ];
        if (confedName) {
          crumbs.push({
            title: confedName,
            href: `/confed/${confedName}`,
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
        setBackHref(nationId ? `/nation/${nationId}` : confedName ? `/confed/${confedName}` : '/');

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
    let isMounted = true;
    loadClubData();
    return () => {
      isMounted = false;
    };
  }, [loadClubData, refreshSignal]);

  // Unmount effect to clean header/breadcrumbs when leaving page
  useEffect(() => {
    return () => {
      setBreadcrumbs([]);
      setBackHref(null);
      setHeaderLogo(null);
      setHeaderId(undefined);
    };
  }, [setBreadcrumbs, setBackHref, setHeaderLogo, setHeaderId]);

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

  const compId = club?.comp?.id || club?.comp_id;

  const clubTitle = club?.name_sh || club?.name_lg || club?.name || `Club ${clubId}`;

  const tabItems = useMemo(() => {
    const list: any[] = [
      {
        key: 'INFO',
        label: (
          <div className="flex items-center gap-2">
            <TabIconBadge
              icon={<InfoCircleOutlined className={activeTab === 'INFO' ? 'text-white' : 'text-slate-600'} />}
              isActive={activeTab === 'INFO'}
            />
            <span className={activeTab === 'INFO' ? 'font-bold' : ''}>
              Info
            </span>
          </div>
        ),
      },
    ];

    if (affiliatesCount > 0) {
      list.push({
        key: 'AFFILIATES',
        label: (
          <div className="flex items-center gap-2" title="Affiliates">
            <TabIconBadge
              icon={<BranchesOutlined className={activeTab === 'AFFILIATES' ? 'text-white' : 'text-blue-500'} />}
              count={affiliatesCount}
              showZero={true}
              isActive={activeTab === 'AFFILIATES'}
            />
            <span className={`hidden sm:inline ${activeTab === 'AFFILIATES' ? 'font-bold' : ''}`}>
              Affiliates
            </span>
          </div>
        ),
      });
    }

    return list;
  }, [activeTab, affiliatesCount]);

  return (
    <div className="space-y-3">
      {loading ? (
        <div className="py-20 text-center">
          <Spin size="large" description="Loading club details..." />
        </div>
      ) : !club ? (
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
              {!logoLoadError && getClubLogoUrl(club.id) ? (
                <img
                  src={getClubLogoUrl(club.id)}
                  alt={clubTitle}
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
                {club.id !== undefined && club.id !== null && (
                  <Tooltip title="Click to copy ID" placement="bottom">
                    <button
                      type="button"
                      onClick={handleCopyId}
                      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-sky-50 hover:bg-sky-100 text-sky-700 hover:text-sky-800 border border-sky-200 font-mono text-xs font-bold transition-all cursor-pointer shadow-2xs select-none"
                    >
                      <span>{club.id}</span>
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
                  title={clubTitle}
                >
                  {clubTitle}
                </h1>
              </div>
            </div>
          </div>

          {/* Sub-team / Family Squad Selector (Light styled pills) */}
          {familyTeams.length > 1 && (
            <div className="flex items-center gap-1.5 flex-wrap mb-3 p-2 bg-slate-50 rounded-lg border border-slate-200">
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
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                      isCurrent
                        ? 'bg-blue-600 text-white border border-blue-700 shadow-xs'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    <span>{teamDisplayName}</span>
                    {team.is_extinct && (
                      <span
                        className={`text-[10px] px-1 rounded font-semibold ${
                          isCurrent ? 'bg-blue-800 text-white' : 'bg-red-100 text-red-700'
                        }`}
                      >
                        EXT
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Ant Design Tabs */}
          <Tabs
            activeKey={activeTab}
            onChange={(key) => setActiveTab(key as 'INFO' | 'AFFILIATES')}
            items={tabItems}
            className="mb-3"
          />

          {/* Tab 1: Info (RecordDetailView) */}
          {activeTab === 'INFO' && (
            <div className="space-y-4">
              <RecordDetailView
                data={club}
                type={EntityType.CLUB}
                onEdit={() => openRecordModal(RecordType.CLUB, club, club?.nation_id, club?.comp_id)}
                onNavigateConfed={(cId) => router.push(`/confed/${cId}`)}
                onNavigateNation={(nId) => router.push(`/nation/${nId}`)}
                onNavigateComp={(cId) =>
                  router.push(`/comp/${cId}${nationId ? `?nationId=${nationId}` : ''}`)
                }
                onNavigateClub={(cId) => router.push(`/club/${cId}`)}
                onSwitchTab={(tab) => {
                  if (tab === 'AFFILIATES') setActiveTab('AFFILIATES');
                }}
              />

              {/* Action buttons: Edit & Delete moved down below */}
              <div className="w-full max-w-xl mx-auto flex items-center justify-end gap-2.5 pt-2 pb-1 border-t border-slate-100">
                <Button
                  type="primary"
                  icon={<EditOutlined />}
                  onClick={() => openRecordModal(RecordType.CLUB, club, club?.nation_id, club?.comp_id)}
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
          )}

          {/* Tab 2: Affiliates (CardGrid) */}
          {activeTab === 'AFFILIATES' && (
            <div className="pt-1">
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

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteClub}
        loading={isDeleting}
        title="Delete Club"
        itemName={clubTitle}
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
