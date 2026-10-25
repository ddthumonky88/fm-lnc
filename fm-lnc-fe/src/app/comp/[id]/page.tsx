'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
import { CompIcon, DomesticCompIcon, ClubIcon, AwardIcon } from '../../../components/EntityIcons';
import { EntityType, RecordType } from '../../../types';
import { useApp } from '../../../context/AppContext';
import { formatCategoryCode, getCategoryTagColor } from '../../../components/EntityCard';
import { matchRecordSearch } from '../../../utils/search';

export default function CompetitionDetailPage() {
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
  const [activeTab, setActiveTab] = useState<'CLUBS' | 'AWARDS'>('CLUBS');
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
        const confedId = nation?.confederation_id;
        const confedName = nation?.confederation?.name || 'Confederation';
        const nationName = nation?.long_name || 'Nation';
        const nationCode = nation?.three_letter_name;

        const virtualTag = rawId.startsWith('oth-') || rawId.startsWith('ext-')
          ? rawId
          : isVirtualExtinct
            ? `ext-${targetNationId}`
            : `oth-${targetNationId}`;
        const virtualTitle = isVirtualExtinct ? '[EXTINCT] Extinct Clubs' : '[OTHER] Other Clubs';
        const virtualShort = isVirtualExtinct ? 'Extinct Clubs' : 'Other Clubs';

        setCompInfo({
          id: virtualTag,
          long_name: virtualTitle,
          short_name: virtualShort,
          three_letter_name: isVirtualExtinct ? 'EXT' : 'OTH',
          nation_id: targetNationId,
          nation_name: nationName,
          nation_three_letter: nationCode,
          confed_id: confedId,
          categories: 'Other',
          clubsCount: isVirtualExtinct ? hub?.counts?.extinctClubs || 0 : hub?.counts?.independentClubs || 0,
          awardsCount: 0,
          childrenCount: 0,
        } as any);

        setHeaderTitle(virtualTitle);
        setHeaderId(virtualTag);

        const crumbs: any[] = [
          {
            title: 'HOME',
            href: '/',
          },
        ];
        if (confedId) {
          crumbs.push({
            title: confedName,
            href: `/confederation/${confedId}`,
          });
        }
        crumbs.push({
          title: nationCode || nationName,
          href: `/nation/${targetNationId}`,
        });
        crumbs.push({
          title: virtualTitle,
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
        const compTitle = info.short_name || info.long_name || `Competition ${compId}`;
        setHeaderTitle(compTitle);
        setHeaderId(info.id);

        const nationId = info.nation_id || info.nation?.id;
        const nationName = info.nation_name || info.nation?.long_name;
        const nationCode = info.nation_three_letter || info.nation?.three_letter_name;
        const confedId = info.confed_id || info.confederation?.id;
        const confedName = info.confederation?.name || 'Confederation';

        const crumbs: any[] = [
          {
            title: 'HOME',
            href: '/',
          },
        ];
        if (confedId) {
          crumbs.push({
            title: confedName,
            href: `/confederation/${confedId}`,
          });
        }
        if (nationId) {
          crumbs.push({
            title: nationCode || info.nation?.name_3l || nationName || 'Nation',
            href: `/nation/${nationId}`,
          });
        }
        if (info.parent_id) {
          crumbs.push({
            title: info.parent_name || `Parent (${info.parent_id})`,
            href: `/comp/${info.parent_id}${nationId ? `?nationId=${nationId}` : ''}`,
          });
        }
        crumbs.push({
          title: compTitle,
        });

        setBreadcrumbs(crumbs);
        setBackHref(
          info.parent_id
            ? `/comp/${info.parent_id}${nationId ? `?nationId=${nationId}` : ''}`
            : nationId
              ? `/nation/${nationId}`
              : confedId
                ? `/confederation/${confedId}`
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
    async (tab: 'CLUBS' | 'AWARDS', page: number, size: number, keyword: string) => {
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
    loadTabData(activeTab, currentPage, pageSize, debouncedKeyword);
  }, [loadTabData, activeTab, currentPage, pageSize, debouncedKeyword, refreshSignal]);

  const handlePageChange = (newPage: number, newPageSize?: number) => {
    if (newPageSize && newPageSize !== pageSize) {
      setPageSize(newPageSize);
    }
    setCurrentPage(newPage);
  };

  const handleTabChange = (key: string) => {
    const nextTab = key as 'CLUBS' | 'AWARDS';
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
    compInfo?.short_name ||
    compInfo?.long_name ||
    (isVirtual ? (isVirtualExtinct ? 'Extinct Clubs' : 'Other Clubs') : `Competition ${compId}`);
  const nationId = compInfo?.nation_id || compInfo?.nation?.id || nationIdParam;
  const nationName = compInfo?.nation_name || compInfo?.nation?.long_name;
  const nationCode = compInfo?.nation_three_letter || compInfo?.nation?.three_letter_name;
  const confedId = compInfo?.confed_id || compInfo?.confederation?.id;

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

          {/* Sub Toolbar: Count, Filter, Add */}
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

          {/* Main List */}
          {activeTab === 'CLUBS' ? (
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
          ) : (
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
