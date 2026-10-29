'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Breadcrumb, Tag, Badge, Input, Button, message, Spin, Tabs, Space, Tooltip } from 'antd';
import {
  SafetyOutlined,
  StarOutlined,
  SearchOutlined,
  PlusOutlined,
  ArrowLeftOutlined,
  TrophyOutlined,
  CopyOutlined,
  CheckOutlined,
  BranchesOutlined,
  InfoCircleOutlined,
  EditOutlined,
} from '@ant-design/icons';
import {
  fetchCompetitionInfo,
  fetchClubsInComp,
  fetchAwardsInComp,
  fetchIndependentClubs,
  fetchNationHub,
  getNationLogoUrl,
  getConfederationLogoUrl,
  deleteRecord,
  CompetitionItem,
  ClubItem,
  AwardItem,
} from '../../../services/api';
import CardGrid from '../../../components/CardGrid';
import SubCompetitionsModal from '../../../components/SubCompetitionsModal';
import RecordDetailView from '../../../components/RecordDetailView';
import { CompIcon, DomesticCompIcon, ClubIcon, AwardIcon } from '../../../components/EntityIcons';
import { EntityType, RecordType } from '../../../types';
import { useApp } from '../../../context/AppContext';
import { formatCategoryCode, getCategoryTagColor } from '../../../components/EntityCard';
import { matchRecordSearch } from '../../../utils/search';

const CONFED_ID_MAP: Record<string, string> = {
  '1': 'Africa',
  '2': 'Asia',
  '3': 'Europe',
  '4': 'North America',
  '5': 'Oceania',
  '6': 'South America',
  '7': 'World',
};

function CompetitionDetailContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const {
    openRecordModal,
    setHeaderTitle,
    setHeaderId,
    setBreadcrumbs,
    setBackHref,
    setHeaderLogo,
    refreshSignal,
  } = useApp();

  const rawId = decodeURIComponent(String(params?.id || ''));
  const isVirtualExtinct =
    rawId.toLowerCase() === 'extinct' || rawId === '[EXTINCT]' || rawId.startsWith('ext-');
  const isVirtualOther =
    rawId.toLowerCase() === 'other' || rawId === '[OTHER]' || rawId.startsWith('oth-');
  const isVirtual = isVirtualExtinct || isVirtualOther;
  const extractedNationId =
    isVirtual && (rawId.startsWith('oth-') || rawId.startsWith('ext-'))
      ? rawId.split('-')[1]
      : undefined;
  const nationIdParam = searchParams.get('nationId') || extractedNationId || undefined;
  const compId = rawId;

  const [compInfo, setCompInfo] = useState<
    (CompetitionItem & { clubsCount: number; awardsCount: number; childrenCount?: number }) | null
  >(null);
  const [activeTab, setActiveTab] = useState<'CLUBS' | 'AWARDS' | 'INFO'>('INFO');
  const [clubs, setClubs] = useState<ClubItem[]>([]);
  const [awards, setAwards] = useState<AwardItem[]>([]);
  const [isSubCompsModalOpen, setIsSubCompsModalOpen] = useState(false);
  const [tableFilter, setTableFilter] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Debounce search filter
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(tableFilter.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [tableFilter]);

  // Reset to page 1 whenever search keyword changes
  const prevKeywordRef = useRef(debouncedKeyword);
  useEffect(() => {
    if (prevKeywordRef.current !== debouncedKeyword) {
      prevKeywordRef.current = debouncedKeyword;
      setCurrentPage(1);
    }
  }, [debouncedKeyword]);

  const handleCopyId = (e?: React.MouseEvent) => {
    e?.stopPropagation?.();
    if (compId) {
      navigator.clipboard.writeText(String(compId));
      setCopiedId(true);
      message.success(`Copied ID: ${compId}`);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  // Load Competition info (headers, breadcrumbs, logos)
  const loadCompInfo = useCallback(async () => {
    setLoading(true);
    try {
      if (isVirtual) {
        const targetNationId = nationIdParam;
        if (!targetNationId) {
          message.error('Nation ID is required for virtual competition');
          setLoading(false);
          return;
        }

        const hub = await fetchNationHub(targetNationId).catch(() => null);

        const nation = hub?.nation;
        const confedId =
          nation?.confed_id ||
          nation?.confed?.id;
        const confedName =
          (confedId && CONFED_ID_MAP[String(confedId)]) ||
          nation?.confed?.name ||
          nation?.confed_name ||
          'Confederation';
        const nationName =
          nation?.name_lg ||
          nation?.name ||
          nation?.name_sh ||
          'Nation';
        const nationCode =
          nation?.name_3l ||
          nation?.code ||
          nation?.name_sh;

        const virtualTag = rawId.startsWith('oth-') || rawId.startsWith('ext-')
          ? rawId
          : isVirtualExtinct
            ? `ext-${targetNationId}`
            : `oth-${targetNationId}`;
        const virtualTitle = isVirtualExtinct ? '[EXTINCT]' : '[OTHER]';
        const virtualShort = isVirtualExtinct ? '[EXTINCT]' : '[OTHER]';

        setCompInfo({
          id: virtualTag,
          name: virtualShort,
          name_lg: virtualTitle,
          name_sh: virtualShort,
          name_3l: virtualShort,
          nation_id: targetNationId,
          nation_name: nationName,
          nation_three_letter: nationCode,
          confed_id: confedId,
          confed: nation?.confed || (confedId ? { id: confedId, name: confedName } : undefined),
          type: isVirtualExtinct ? 'Extinct Competitions' : 'Other Competitions',
          categories: isVirtualExtinct ? 'Extinct Competitions' : 'Other Competitions',
          clubsCount: isVirtualExtinct ? hub?.counts?.extinctClubs || 0 : hub?.counts?.independentClubs || 0,
          awardsCount: 0,
          childrenCount: 0,
          stats: {
            club: isVirtualExtinct ? hub?.counts?.extinctClubs || 0 : hub?.counts?.independentClubs || 0,
            award: 0,
            children: 0,
          },
        } as any);

        setHeaderTitle(virtualTitle);
        setHeaderId(virtualTag);

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
        crumbs.push({
          title: nationCode || nationName,
          href: `/nation/${targetNationId}`,
        });
        crumbs.push({
          title: String(compId),
        });

        setBreadcrumbs(crumbs);
        setBackHref(`/nation/${targetNationId}`);

        setHeaderLogo({
          url: getNationLogoUrl(targetNationId, nationCode),
          alt: nationName,
          isFlag: true,
        });
        return;
      }

      if (!compId) return;
      const info = await fetchCompetitionInfo(compId).catch(() => null);

      if (info) {
        setCompInfo(info);
        const compTitle =
          info.name_sh ||
          info.name_lg ||
          info.name ||
          `Competition ${compId}`;
        setHeaderTitle(compTitle);
        setHeaderId(info.id);

        const nationId = info.nation?.id || info.nation_id;
        const nationName =
          info.nation?.name_lg ||
          info.nation?.name ||
          info.nation?.name_sh;
        const nationCode =
          info.nation?.name_3l;
        const confedId =
          info.confed_id ||
          info.confed?.id ||
          info.nation?.confed_id ||
          info.nation?.confed?.id;
        const confedName =
          (confedId && CONFED_ID_MAP[String(confedId)]) ||
          info.confed?.name ||
          info.confed_name ||
          info.nation?.confed?.name ||
          info.nation?.confed_name ||
          'Confederation';

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
        const parentId = info.parent_comp?.id || info.parent_id || info.parent?.id;
        const parentTitle =
          info.parent_comp?.name_3l
            ? `[${info.parent_comp.name_3l}] ${info.parent_comp.name_sh || info.parent_comp.name_lg || ''}`.trim()
            : info.parent?.name_3l
              ? `[${info.parent.name_3l}] ${info.parent.name_sh || info.parent.name_lg || ''}`.trim()
              : String(parentId);

        if (parentId) {
          crumbs.push({
            title: parentTitle,
            href: `/comp/${parentId}${nationId ? `?nationId=${nationId}` : ''}`,
          });
        }
        crumbs.push({
          title: String(compId),
        });

        setBreadcrumbs(crumbs);
        setBackHref(
          parentId
            ? `/comp/${parentId}${nationId ? `?nationId=${nationId}` : ''}`
            : nationId
              ? `/nation/${nationId}`
              : confedId
                ? `/confed/${confedId}`
                : '/',
        );

        if (nationId) {
          setHeaderLogo({
            url: getNationLogoUrl(nationId, nationCode),
            alt: nationName || 'Nation',
            isFlag: true,
          });
        } else if (confedId) {
          setHeaderLogo({
            url: getConfederationLogoUrl(confedId),
            alt: 'Confederation',
            isFlag: false,
          });
        } else {
          setHeaderLogo(null);
        }
      }
    } catch (err: any) {
      console.error(err);
      message.error(err.message || 'Failed to load competition details');
    } finally {
      setLoading(false);
    }
  }, [
    compId,
    isVirtual,
    isVirtualExtinct,
    nationIdParam,
    setHeaderTitle,
    setHeaderId,
    setBreadcrumbs,
    setBackHref,
    setHeaderLogo,
  ]);

  // Load tab records with BE pagination & keyword search
  const loadTabData = useCallback(
    async (tab: 'CLUBS' | 'AWARDS' | 'INFO', page: number, size: number, keyword: string) => {
      if (tab === 'INFO') return;
      setTabLoading(true);
      try {
        if (tab === 'CLUBS') {
          if (isVirtual) {
            const targetNationId = nationIdParam;
            if (!targetNationId) return;
            const res = await fetchIndependentClubs(targetNationId, {
              page: page - 1,
              size,
              keyword,
              extinct: isVirtualExtinct,
            });
            const list = Array.isArray(res) ? res : (res as any)?.content || [];
            const total = (res as any)?.totalElements ?? (res as any)?.total ?? list.length;
            setClubs(list);
            setTotalRecords(total);
            setCompInfo((prev) => {
              if (!prev) return prev;
              if (!keyword) {
                return { ...prev, clubsCount: total };
              }
              return prev;
            });
          } else if (compId) {
            const res = await fetchClubsInComp(compId, {
              page: page - 1,
              size,
              keyword,
            });
            const list = Array.isArray(res) ? res : (res as any)?.content || [];
            const total = (res as any)?.totalElements ?? (res as any)?.total ?? list.length;
            setClubs(list);
            setTotalRecords(total);
            setCompInfo((prev) => {
              if (!prev) return prev;
              if (!keyword) {
                return { ...prev, clubsCount: total };
              }
              return prev;
            });
          }
        } else if (tab === 'AWARDS' && !isVirtual && compId) {
          const res = await fetchAwardsInComp(compId, {
            page: page - 1,
            size,
            keyword,
          });
          const list = Array.isArray(res) ? res : (res as any)?.content || [];
          const total = (res as any)?.totalElements ?? (res as any)?.total ?? list.length;
          setAwards(list);
          setTotalRecords(total);
          setCompInfo((prev) => {
            if (!prev) return prev;
            if (!keyword) {
              return { ...prev, awardsCount: total };
            }
            return prev;
          });
        }
      } catch (err: any) {
        console.error('Failed to load tab data', err);
        message.error(err.message || 'Failed to load list data');
      } finally {
        setTabLoading(false);
      }
    },
    [compId, isVirtual, isVirtualExtinct, nationIdParam],
  );

  useEffect(() => {
    loadCompInfo();
    return () => {
      setBreadcrumbs([]);
      setBackHref(null);
      setHeaderLogo(null);
      setHeaderId(undefined);
    };
  }, [loadCompInfo, refreshSignal, setBreadcrumbs, setBackHref, setHeaderLogo, setHeaderId]);

  useEffect(() => {
    if (activeTab === 'INFO') return;
    loadTabData(activeTab, currentPage, pageSize, debouncedKeyword);
  }, [loadTabData, activeTab, currentPage, pageSize, debouncedKeyword, refreshSignal]);

  const handlePageChange = (newPage: number, newPageSize?: number) => {
    if (newPageSize && newPageSize !== pageSize) {
      setPageSize(newPageSize);
    }
    setCurrentPage(newPage);
  };

  const handleTabChange = (key: string) => {
    const nextTab = key as 'CLUBS' | 'AWARDS' | 'INFO';
    setActiveTab(nextTab);
    setTableFilter('');
    setDebouncedKeyword('');
    setCurrentPage(1);
  };

  const handleDeleteClub = async (id: string) => {
    try {
      await deleteRecord(RecordType.CLUB, id);
      message.success('Club deleted');
      loadTabData('CLUBS', currentPage, pageSize, debouncedKeyword);
      if (compId) {
        fetchCompetitionInfo(compId, true).then((info) => {
          if (info) setCompInfo(info);
        });
      }
    } catch (err: any) {
      message.error(err.message || 'Delete failed');
    }
  };

  const handleDeleteAward = async (id: string) => {
    try {
      await deleteRecord(RecordType.AWARD, id);
      message.success('Award deleted');
      loadTabData('AWARDS', currentPage, pageSize, debouncedKeyword);
      if (compId) {
        fetchCompetitionInfo(compId, true).then((info) => {
          if (info) setCompInfo(info);
        });
      }
    } catch (err: any) {
      message.error(err.message || 'Delete failed');
    }
  };

  const clubsBadgeCount = debouncedKeyword
    ? (activeTab === 'CLUBS' ? totalRecords : (compInfo?.clubsCount ?? 0))
    : (compInfo?.clubsCount ?? totalRecords);

  const awardsBadgeCount = debouncedKeyword
    ? (activeTab === 'AWARDS' ? totalRecords : (compInfo?.awardsCount ?? 0))
    : (compInfo?.awardsCount ?? totalRecords);

  const tabItems = useMemo(() => {
    const list: any[] = [
      {
        key: 'INFO',
        label: (
          <span className={activeTab === 'INFO' ? 'font-bold' : ''}>
            Info
          </span>
        ),
      },
      {
        key: 'CLUBS',
        label: (
          <Space size={4} title="Clubs">
            <ClubIcon size={18} className="text-blue-500" />
            <span className={`hidden sm:inline ${activeTab === 'CLUBS' ? 'font-bold' : ''}`}>
              Clubs
            </span>
            <Badge
              count={clubsBadgeCount}
              overflowCount={99999}
              style={{ backgroundColor: activeTab === 'CLUBS' ? '#1d70b8' : '#94a3b8' }}
            />
          </Space>
        ),
      },
    ];

    if (!isVirtual) {
      if ((compInfo?.awardsCount ?? 0) > 0 || activeTab === 'AWARDS') {
        list.push({
          key: 'AWARDS',
          label: (
            <Space size={4} title="Awards">
              <AwardIcon size={18} className="text-yellow-500" />
              <span className={`hidden sm:inline ${activeTab === 'AWARDS' ? 'font-bold' : ''}`}>
                Awards
              </span>
              <Badge
                count={awardsBadgeCount}
                overflowCount={99999}
                style={{ backgroundColor: activeTab === 'AWARDS' ? '#1d70b8' : '#94a3b8' }}
              />
            </Space>
          ),
        });
      }
    }

    return list;
  }, [clubsBadgeCount, awardsBadgeCount, activeTab, isVirtual, compInfo?.awardsCount]);

  const compTitle =
    compInfo?.name_sh ||
    compInfo?.name_lg ||
    compInfo?.name ||
    (isVirtual ? (isVirtualExtinct ? 'Extinct Clubs' : 'Other Clubs') : `Competition ${compId}`);
  const nationId = compInfo?.nation?.id || compInfo?.nation_id || nationIdParam;
  const nationName =
    compInfo?.nation?.name_lg ||
    compInfo?.nation?.name ||
    compInfo?.nation?.name_sh;
  const nationCode = compInfo?.nation?.name_3l;
  const confedId = compInfo?.confed_id || compInfo?.confed?.id;

  return (
    <div className="space-y-3">
      {loading ? (
        <div className="py-20 text-center">
          <Spin size="large" description="Loading competition details..." />
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <Tooltip
                title={
                  isVirtual
                    ? isVirtualExtinct
                      ? 'Extinct Clubs'
                      : 'Independent Clubs'
                    : 'Competition'
                }
                placement="bottom"
              >
                <div
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 cursor-default p-0 shadow-2xs border ${
                    isVirtual
                      ? isVirtualExtinct
                        ? 'bg-orange-50/90 border-orange-300 text-orange-600'
                        : 'bg-blue-50/90 border-blue-300 text-blue-600'
                      : 'bg-amber-50/90 border-amber-300 text-amber-600'
                  }`}
                >
                  {isVirtual ? (
                    <ClubIcon
                      size={18}
                      className={isVirtualExtinct ? 'text-orange-500' : 'text-blue-500'}
                    />
                  ) : (
                    <DomesticCompIcon size={18} className="text-amber-600" />
                  )}
                </div>
              </Tooltip>

              <div className="min-w-0 flex-1 flex flex-col justify-center">
                <div className="flex items-center gap-2 flex-wrap">
                  {isVirtual ? (
                    <Tag
                      color={isVirtualExtinct ? 'volcano' : 'geekblue'}
                      className="m-0 font-mono font-bold text-xs"
                    >
                      {isVirtualExtinct ? '[EXTINCT]' : '[OTHER]'}
                    </Tag>
                  ) : compId ? (
                    <Tooltip title="Click to copy ID" placement="bottom">
                      <button
                        type="button"
                        onClick={handleCopyId}
                        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-sky-50 hover:bg-sky-100 text-sky-700 hover:text-sky-800 border border-sky-200 font-mono text-xs font-bold transition-all cursor-pointer shadow-2xs select-none"
                      >
                        <span>{compId}</span>
                        {copiedId ? (
                          <CheckOutlined className="text-emerald-600 text-xs" />
                        ) : (
                          <CopyOutlined className="text-sky-500 text-xs" />
                        )}
                      </button>
                    </Tooltip>
                  ) : null}

                  {compInfo?.childrenCount !== undefined && compInfo.childrenCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setIsSubCompsModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-300 hover:border-slate-400 text-xs font-medium transition-all cursor-pointer shadow-2xs select-none"
                      title="Click to view Sub-Competitions"
                    >
                      <BranchesOutlined className="text-slate-600 text-xs" />
                    </button>
                  )}
                </div>

                <div className="mt-1 min-w-0">
                  <div
                    className="font-bold text-xs sm:text-[13px] text-slate-900 uppercase tracking-wide line-clamp-2 break-words block leading-snug"
                    title={compTitle}
                  >
                    <span>{compTitle}</span>
                  </div>
                  {isVirtual && (
                    <div className="text-xs text-slate-500 mt-0.5 font-normal normal-case">
                      {isVirtualExtinct
                        ? 'List of extinct clubs in this nation'
                        : 'List of independent clubs (not assigned to a specific competition)'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* AntD Tabs */}
          <Tabs
            activeKey={activeTab}
            onChange={(key) => handleTabChange(key)}
            items={tabItems}
            className="mb-3"
          />

          {/* Sub Toolbar: Count, Filter, Add (only for list tabs) */}
          {activeTab !== 'INFO' && (
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2.5 sm:gap-3 mb-4">
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <Input
                  prefix={<SearchOutlined className="text-gray-400" />}
                  placeholder={activeTab === 'CLUBS' ? 'Filter clubs...' : 'Filter awards...'}
                  value={tableFilter}
                  onChange={(e) => setTableFilter(e.target.value)}
                  onPressEnter={() => setDebouncedKeyword(tableFilter.trim())}
                  allowClear
                  className="flex-1 sm:w-60"
                />

                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => {
                    if (activeTab === 'CLUBS') {
                      openRecordModal(
                        RecordType.CLUB,
                        isVirtual ? { is_extinct: isVirtualExtinct, nation_id: nationId } : null,
                        nationId,
                        isVirtual ? undefined : compId,
                      );
                    } else {
                      openRecordModal(RecordType.AWARD, null, nationId, compId);
                    }
                  }}
                  className="bg-blue-600 shrink-0"
                  title={activeTab === 'CLUBS' ? 'Add Club' : 'Add Award'}
                >
                  <span className="hidden sm:inline">
                    {activeTab === 'CLUBS' ? 'Add Club' : 'Add Award'}
                  </span>
                </Button>
              </div>
            </div>
          )}

          {/* Main List */}
          {activeTab === 'CLUBS' && (
            <CardGrid
              key="comp-clubs"
              items={clubs}
              type={EntityType.CLUB}
              columns={4}
              loading={tabLoading}
              serverPagination={{
                current: currentPage,
                pageSize,
                total: totalRecords,
                onChange: handlePageChange,
              }}
              onEdit={(rec) =>
                openRecordModal(RecordType.CLUB, rec, nationId, isVirtual ? undefined : compId)
              }
              onDelete={(rec) => handleDeleteClub(String(rec.id))}
              emptyText={
                isVirtual
                  ? isVirtualExtinct
                    ? 'No extinct clubs found in this nation'
                    : 'No independent clubs found in this nation'
                  : 'No clubs found in this competition'
              }
              defaultPageSize={20}
            />
          )}

          {activeTab === 'AWARDS' && (
            <CardGrid
              key="comp-awards"
              items={awards}
              type={EntityType.AWARD}
              columns={4}
              loading={tabLoading}
              serverPagination={{
                current: currentPage,
                pageSize,
                total: totalRecords,
                onChange: handlePageChange,
              }}
              onEdit={(rec) => openRecordModal(RecordType.AWARD, rec, nationId, compId)}
              onDelete={(rec) => handleDeleteAward(String(rec.id))}
              emptyText="No awards found in this competition"
              defaultPageSize={20}
            />
          )}

          {/* Tab: Competition Information */}
          {activeTab === 'INFO' && compInfo && (
            <RecordDetailView
              data={compInfo}
              type={
                compInfo.is_international
                  ? 'international_competition'
                  : RecordType.COMPETITION
              }
              onEdit={
                !isVirtual
                  ? () =>
                      openRecordModal(
                        RecordType.COMPETITION,
                        compInfo,
                        nationId,
                        compInfo.parent_id,
                      )
                  : undefined
              }
              onNavigateConfed={(cId) => router.push(`/confed/${cId}`)}
              onNavigateNation={(nId) => router.push(`/nation/${nId}`)}
              onNavigateParentComp={(pId) =>
                router.push(`/comp/${pId}${nationId ? `?nationId=${nationId}` : ''}`)
              }
              onOpenSubComps={() => setIsSubCompsModalOpen(true)}
              onSwitchTab={(tab) => handleTabChange(tab as 'INFO' | 'CLUBS' | 'AWARDS')}
            />
          )}
        </div>
      )}

      {/* Sub-Competitions Modal */}
      <SubCompetitionsModal
        isOpen={isSubCompsModalOpen}
        onClose={() => setIsSubCompsModalOpen(false)}
        parentComp={compInfo}
        onEdit={(rec) => openRecordModal(RecordType.COMPETITION, rec, nationId, compId)}
        onDelete={() => {
          loadCompInfo();
          loadTabData(activeTab, currentPage, pageSize, debouncedKeyword);
        }}
        onRefreshParent={() => {
          loadCompInfo();
          loadTabData(activeTab, currentPage, pageSize, debouncedKeyword);
        }}
      />
    </div>
  );
}

export default function CompetitionDetailPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Loading competition...</div>}>
      <CompetitionDetailContent />
    </Suspense>
  );
}
