'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
} from '@ant-design/icons';
import {
  fetchCompetitionInfo,
  fetchClubsInComp,
  fetchAwardsInComp,
  fetchSubCompetitions,
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
import { EntityType, RecordType } from '../../../types';
import { useApp } from '../../../context/AppContext';

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
  const isVirtualExtinct = rawId.toLowerCase() === 'extinct' || rawId === '[EXTINCT]';
  const isVirtualOther = rawId.toLowerCase() === 'other' || rawId === '[OTHER]';
  const isVirtual = isVirtualExtinct || isVirtualOther;
  const nationIdParam = searchParams.get('nationId') || undefined;
  const compId = isVirtual ? undefined : rawId;

  const [compInfo, setCompInfo] = useState<(CompetitionItem & { clubsCount: number; awardsCount: number; childrenCount?: number }) | null>(null);
  const [activeTab, setActiveTab] = useState<'CLUBS' | 'AWARDS' | 'SUB_COMPS'>('CLUBS');
  const [clubs, setClubs] = useState<ClubItem[]>([]);
  const [awards, setAwards] = useState<AwardItem[]>([]);
  const [subComps, setSubComps] = useState<CompetitionItem[]>([]);
  const [tableFilter, setTableFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Load Competition info and records
  const loadCompData = useCallback(async () => {
    setLoading(true);
    try {
      if (isVirtual) {
        const targetNationId = nationIdParam;
        if (!targetNationId) {
          message.error('Nation ID is required for virtual competition');
          setLoading(false);
          return;
        }

        const [hub, clubsData] = await Promise.all([
          fetchNationHub(targetNationId).catch(() => null),
          fetchIndependentClubs(targetNationId, isVirtualExtinct).catch(() => []),
        ]);

        const nation = hub?.nation;
        const confedId = nation?.confederation_id;
        const confedName = nation?.confederation?.name || 'Confederation';
        const nationName = nation?.long_name || 'Nation';
        const nationCode = nation?.three_letter_name;

        const virtualTitle = isVirtualExtinct ? '[EXTINCT] Extinct Clubs' : '[OTHER] Other Clubs';
        const virtualShort = isVirtualExtinct ? 'Extinct Clubs' : 'Other Clubs';
        const virtualTag = isVirtualExtinct ? '[EXTINCT]' : '[OTHER]';

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
          clubsCount: clubsData.length,
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
          title: nationCode ? `[${nationCode}] ${nationName}` : nationName,
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

        setClubs(clubsData);
        setAwards([]);
        setSubComps([]);
        return;
      }

      if (!compId) return;
      const [info, clubsData, awardsData, subCompsData] = await Promise.all([
        fetchCompetitionInfo(compId).catch(() => null),
        fetchClubsInComp(compId).catch(() => []),
        fetchAwardsInComp(compId).catch(() => []),
        fetchSubCompetitions(compId).catch(() => []),
      ]);

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
            title: nationName || 'Nation',
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
      setClubs(clubsData);
      setAwards(awardsData);
      setSubComps(subCompsData);
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

  useEffect(() => {
    loadCompData();
    return () => {
      setBreadcrumbs([]);
      setBackHref(null);
      setHeaderLogo(null);
      setHeaderId(undefined);
    };
  }, [loadCompData, refreshSignal, setBreadcrumbs, setBackHref, setHeaderLogo, setHeaderId]);

  const handleDeleteClub = async (id: string) => {
    try {
      await deleteRecord(RecordType.CLUB, id);
      message.success('Club deleted');
      setClubs((prev) => prev.filter((c) => c.id !== id));
      loadCompData();
    } catch (err: any) {
      message.error(err.message || 'Delete failed');
    }
  };

  const handleDeleteAward = async (id: string) => {
    try {
      await deleteRecord(RecordType.AWARD, id);
      message.success('Award deleted');
      setAwards((prev) => prev.filter((a) => a.id !== id));
      loadCompData();
    } catch (err: any) {
      message.error(err.message || 'Delete failed');
    }
  };

  const handleDeleteComp = async (id: string) => {
    try {
      await deleteRecord(RecordType.COMPETITION, id);
      message.success('Competition deleted');
      setSubComps((prev) => prev.filter((c) => c.id !== id));
      loadCompData();
    } catch (err: any) {
      message.error(err.message || 'Delete failed');
    }
  };

  // Client search filter
  const filteredClubs = useMemo(() => {
    if (!tableFilter.trim()) return clubs;
    const q = tableFilter.toLowerCase();
    return clubs.filter(
      (c) =>
        c.long_name.toLowerCase().includes(q) ||
        (c.short_name && c.short_name.toLowerCase().includes(q)) ||
        (c.three_letter_name && c.three_letter_name.toLowerCase().includes(q)) ||
        String(c.id).includes(q),
    );
  }, [clubs, tableFilter]);

  const filteredAwards = useMemo(() => {
    if (!tableFilter.trim()) return awards;
    const q = tableFilter.toLowerCase();
    return awards.filter(
      (a) =>
        a.long_name.toLowerCase().includes(q) ||
        (a.short_name && a.short_name.toLowerCase().includes(q)) ||
        String(a.id).includes(q),
    );
  }, [awards, tableFilter]);

  const filteredSubComps = useMemo(() => {
    if (!tableFilter.trim()) return subComps;
    const q = tableFilter.toLowerCase();
    return subComps.filter(
      (c) =>
        c.long_name.toLowerCase().includes(q) ||
        (c.short_name && c.short_name.toLowerCase().includes(q)) ||
        (c.three_letter_name && c.three_letter_name.toLowerCase().includes(q)) ||
        String(c.id).includes(q),
    );
  }, [subComps, tableFilter]);

  const tabItems = useMemo(() => {
    const list: any[] = [
      {
        key: 'CLUBS',
        label: (
          <Space size={4}>
            <SafetyOutlined className="text-blue-500" />
            <span className={activeTab === 'CLUBS' ? 'font-bold' : ''}>Clubs</span>
            <Badge
              count={clubs.length}
              overflowCount={99999}
              style={{ backgroundColor: activeTab === 'CLUBS' ? '#1d70b8' : '#94a3b8' }}
            />
          </Space>
        ),
      },
    ];

    if (!isVirtual) {
      list.push({
        key: 'AWARDS',
        label: (
          <Space size={4}>
            <StarOutlined className="text-yellow-500" />
            <span className={activeTab === 'AWARDS' ? 'font-bold' : ''}>Awards</span>
            <Badge
              count={awards.length}
              overflowCount={99999}
              showZero
              style={{ backgroundColor: activeTab === 'AWARDS' ? '#1d70b8' : '#94a3b8' }}
            />
          </Space>
        ),
      });

      if (subComps.length > 0 || (compInfo?.childrenCount && compInfo.childrenCount > 0)) {
        list.push({
          key: 'SUB_COMPS',
          label: (
            <Space size={4}>
              <TrophyOutlined className="text-amber-500" />
              <span className={activeTab === 'SUB_COMPS' ? 'font-bold' : ''}>Sub-Competitions</span>
              <Badge
                count={subComps.length}
                overflowCount={99999}
                style={{ backgroundColor: activeTab === 'SUB_COMPS' ? '#f59e0b' : '#94a3b8' }}
              />
            </Space>
          ),
        });
      }
    }

    return list;
  }, [clubs.length, awards.length, subComps.length, compInfo?.childrenCount, activeTab, isVirtual]);

  const compTitle = compInfo?.short_name || compInfo?.long_name || (isVirtual ? (isVirtualExtinct ? 'Extinct Clubs' : 'Other Clubs') : `Competition ${compId}`);
  const nationId = compInfo?.nation_id || compInfo?.nation?.id || nationIdParam;
  const nationName = compInfo?.nation_name || compInfo?.nation?.long_name;
  const nationCode = compInfo?.nation_three_letter || compInfo?.nation?.three_letter_name;
  const confedId = compInfo?.confed_id || compInfo?.confederation?.id;

  return (
    <div className="space-y-3">
      {loading ? (
        <div className="py-20 text-center">
          <Spin size="large" tip="Loading competition details..." />
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-2xs">
          {/* Header & Competition Title Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              {nationId ? (
                <img
                  src={getNationLogoUrl(nationId, nationCode)}
                  alt={nationName || 'Nation'}
                  className="w-8 h-5.5 object-cover rounded shadow-2xs border border-slate-300 shrink-0"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : confedId ? (
                <img
                  src={getConfederationLogoUrl(confedId)}
                  alt="Confederation"
                  className="w-8 h-8 object-contain rounded bg-white shadow-2xs border border-slate-200 shrink-0"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : isVirtual ? (
                <SafetyOutlined className={`text-2xl ${isVirtualExtinct ? 'text-red-500' : 'text-blue-500'}`} />
              ) : (
                <TrophyOutlined className="text-2xl text-amber-500" />
              )}
              <div>
                {/* Top: Tag ID (cho phép copy) + tags */}
                <div className="flex items-center gap-1.5 flex-wrap mb-1">
                  <Tooltip title={isVirtual ? undefined : 'Click to copy ID'}>
                    <Tag
                      color={
                        isVirtual
                          ? isVirtualExtinct
                            ? 'volcano'
                            : 'geekblue'
                          : 'cyan'
                      }
                      className={`m-0 font-mono font-bold text-xs inline-flex items-center gap-1.5 ${
                        !isVirtual ? 'cursor-pointer hover:opacity-80' : ''
                      }`}
                      onClick={() => {
                        if (!isVirtual) {
                          navigator.clipboard.writeText(String(compId));
                          message.success(`Copied ID: ${compId}`);
                        }
                      }}
                    >
                      {!isVirtual && <CopyOutlined className="text-[11px]" />}
                      <span>{isVirtual ? (isVirtualExtinct ? '[EXTINCT]' : '[OTHER]') : `ID: ${compId}`}</span>
                    </Tag>
                  </Tooltip>
                  {compInfo?.three_letter_name && (
                    <Tag color="purple" className="m-0 font-mono font-bold text-xs">
                      {compInfo.three_letter_name}
                    </Tag>
                  )}
                  {compInfo?.categories && (
                    <Tag color="blue" className="m-0 text-xs">
                      {compInfo.categories}
                    </Tag>
                  )}
                  {compInfo?.parent_id && (
                    <Tag
                      color="orange"
                      className="m-0 font-bold text-xs cursor-pointer hover:opacity-80"
                      onClick={() => router.push(`/comp/${compInfo.parent_id}${nationId ? `?nationId=${nationId}` : ''}`)}
                    >
                      Parent: {compInfo.parent_name || compInfo.parent_id}
                    </Tag>
                  )}
                  {compInfo?.childrenCount !== undefined && compInfo.childrenCount > 0 && (
                    <Tag color="gold" className="m-0 font-bold text-xs">
                      {compInfo.childrenCount} Sub-Competitions
                    </Tag>
                  )}
                </div>

                {/* Bottom: Tên (thường là short name) */}
                <h2 className="text-base sm:text-lg font-bold text-slate-800 m-0 leading-snug">
                  {compTitle}
                </h2>
                {isVirtual ? (
                  <div className="text-xs text-slate-500 mt-0.5">
                    {isVirtualExtinct
                      ? 'List of extinct clubs in this nation'
                      : 'List of independent clubs (not assigned to a specific competition)'}
                  </div>
                ) : compInfo?.long_name && compInfo.long_name !== compTitle ? (
                  <div className="text-xs text-slate-500 mt-0.5">{compInfo.long_name}</div>
                ) : null}
              </div>
            </div>
          </div>

          {/* AntD Tabs */}
          <Tabs
            activeKey={activeTab}
            onChange={(key) => {
              setActiveTab(key as any);
              setTableFilter('');
            }}
            items={tabItems}
            className="mb-3"
          />

          {/* Sub Toolbar: Count, Filter, Add */}
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2.5 sm:gap-3 mb-4">
            <div className="text-xs text-gray-500">
              Total:{' '}
              <strong className="text-gray-800">
                {activeTab === 'CLUBS'
                  ? filteredClubs.length
                  : activeTab === 'AWARDS'
                  ? filteredAwards.length
                  : filteredSubComps.length}
              </strong>{' '}
              {activeTab === 'CLUBS' ? 'clubs' : activeTab === 'AWARDS' ? 'awards' : 'sub-competitions'}
            </div>
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <Input
                prefix={<SearchOutlined className="text-gray-400" />}
                placeholder={
                  activeTab === 'CLUBS'
                    ? 'Filter clubs...'
                    : activeTab === 'AWARDS'
                    ? 'Filter awards...'
                    : 'Filter sub-competitions...'
                }
                value={tableFilter}
                onChange={(e) => setTableFilter(e.target.value)}
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
                  } else if (activeTab === 'AWARDS') {
                    openRecordModal(RecordType.AWARD, null, nationId, compId);
                  } else {
                    openRecordModal(
                      RecordType.COMPETITION,
                      { parent_id: compId, nation_id: nationId, confed_id: confedId },
                      nationId,
                      compId,
                    );
                  }
                }}
                className="bg-blue-600 shrink-0"
              >
                {activeTab === 'CLUBS'
                  ? 'Add Club'
                  : activeTab === 'AWARDS'
                  ? 'Add Award'
                  : 'Add Sub-Competition'}
              </Button>
            </div>
          </div>

          {/* Main List */}
          {activeTab === 'CLUBS' ? (
            <CardGrid
              items={filteredClubs}
              type={EntityType.CLUB}
              columns={4}
              loading={loading}
              onEdit={(rec) => openRecordModal(RecordType.CLUB, rec, nationId, isVirtual ? undefined : compId)}
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
          ) : activeTab === 'AWARDS' ? (
            <CardGrid
              items={filteredAwards}
              type={EntityType.AWARD}
              columns={4}
              loading={loading}
              onEdit={(rec) => openRecordModal(RecordType.AWARD, rec, nationId, compId)}
              onDelete={(rec) => handleDeleteAward(String(rec.id))}
              emptyText="No awards found in this competition"
              defaultPageSize={20}
            />
          ) : (
            <CardGrid
              items={filteredSubComps}
              type={EntityType.COMPETITION}
              columns={4}
              loading={loading}
              onEdit={(rec) => openRecordModal(RecordType.COMPETITION, rec, nationId)}
              onDelete={(rec) => handleDeleteComp(String(rec.id))}
              emptyText="No sub-competitions found"
              defaultPageSize={20}
            />
          )}
        </div>
      )}
    </div>
  );
}
