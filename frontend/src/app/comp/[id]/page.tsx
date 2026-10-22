'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Breadcrumb, Tag, Badge, Input, Button, message, Spin, Tabs, Space } from 'antd';
import {
  SafetyOutlined,
  StarOutlined,
  SearchOutlined,
  PlusOutlined,
  ArrowLeftOutlined,
  TrophyOutlined,
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
import { EntityType, RecordType } from '../../../types';
import { useApp } from '../../../context/AppContext';

export default function CompetitionDetailPage() {
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
  const nationIdParam = searchParams.get('nationId') ? Number(searchParams.get('nationId')) : undefined;
  const compId = isVirtual ? undefined : Number(params?.id);

  const [compInfo, setCompInfo] = useState<(CompetitionItem & { clubsCount: number; awardsCount: number }) | null>(null);
  const [activeTab, setActiveTab] = useState<'CLUBS' | 'AWARDS'>('CLUBS');
  const [clubs, setClubs] = useState<ClubItem[]>([]);
  const [awards, setAwards] = useState<AwardItem[]>([]);
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
          id: virtualTag as any,
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
        } as any);

        setHeaderTitle(virtualTitle);
        setHeaderId(virtualTag as any);

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
        return;
      }

      if (!compId) return;
      const [info, clubsData, awardsData] = await Promise.all([
        fetchCompetitionInfo(compId).catch(() => null),
        fetchClubsInComp(compId).catch(() => []),
        fetchAwardsInComp(compId).catch(() => []),
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
        crumbs.push({
          title: compTitle,
        });

        setBreadcrumbs(crumbs);
        setBackHref(
          nationId
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

  const handleDeleteClub = async (id: number) => {
    try {
      await deleteRecord(RecordType.CLUB, id);
      message.success('Club deleted');
      setClubs((prev) => prev.filter((c) => c.id !== id));
      loadCompData();
    } catch (err: any) {
      message.error(err.message || 'Delete failed');
    }
  };

  const handleDeleteAward = async (id: number) => {
    try {
      await deleteRecord(RecordType.AWARD, id);
      message.success('Award deleted');
      setAwards((prev) => prev.filter((a) => a.id !== id));
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

  const tabItems = useMemo(() => {
    const list = [
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
    }

    return list;
  }, [clubs.length, awards.length, activeTab, isVirtual]);

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
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-bold text-slate-800 m-0">
                    {compTitle}
                  </h2>
                  <Tag
                    color={
                      isVirtual
                        ? isVirtualExtinct
                          ? 'volcano'
                          : 'geekblue'
                        : 'cyan'
                    }
                    className="m-0 font-bold text-xs"
                  >
                    {isVirtual ? (isVirtualExtinct ? '[EXTINCT]' : '[OTHER]') : `ID: ${compId}`}
                  </Tag>
                  {compInfo?.three_letter_name && (
                    <Tag color="purple" className="m-0 font-bold text-xs">
                      {compInfo.three_letter_name}
                    </Tag>
                  )}
                  {compInfo?.categories && (
                    <Tag color="blue" className="m-0 text-xs">
                      {compInfo.categories}
                    </Tag>
                  )}
                </div>
                {isVirtual ? (
                  <div className="text-xs text-slate-500 mt-0.5">
                    {isVirtualExtinct
                      ? 'Danh sách các câu lạc bộ đã giải thể thuộc quốc gia này'
                      : 'Danh sách các câu lạc bộ độc lập (chưa xếp vào giải đấu cụ thể)'}
                  </div>
                ) : compInfo?.long_name && compInfo.long_name !== compInfo.short_name && (
                  <div className="text-xs text-slate-500 mt-0.5">{compInfo.long_name}</div>
                )}
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
              Total: <strong className="text-gray-800">
                {activeTab === 'CLUBS' ? filteredClubs.length : filteredAwards.length}
              </strong> {activeTab === 'CLUBS' ? 'clubs' : 'awards'}
            </div>
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <Input
                prefix={<SearchOutlined className="text-gray-400" />}
                placeholder={activeTab === 'CLUBS' ? 'Filter clubs...' : 'Filter awards...'}
                value={tableFilter}
                onChange={(e) => setTableFilter(e.target.value)}
                allowClear
                className="w-48 sm:w-60"
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
              >
                {activeTab === 'CLUBS' ? 'Add Club' : 'Add Award'}
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
              onDelete={(rec) => handleDeleteClub(rec.id)}
              emptyText={
                isVirtual
                  ? isVirtualExtinct
                    ? 'Không có câu lạc bộ giải thể nào trong quốc gia này'
                    : 'Không có câu lạc bộ độc lập nào trong quốc gia này'
                  : 'No clubs found in this competition'
              }
              defaultPageSize={20}
            />
          ) : (
            <CardGrid
              items={filteredAwards}
              type={EntityType.AWARD}
              columns={4}
              loading={loading}
              onEdit={(rec) => openRecordModal(RecordType.AWARD, rec, nationId, compId)}
              onDelete={(rec) => handleDeleteAward(rec.id)}
              emptyText="No awards found in this competition"
              defaultPageSize={20}
            />
          )}
        </div>
      )}
    </div>
  );
}
