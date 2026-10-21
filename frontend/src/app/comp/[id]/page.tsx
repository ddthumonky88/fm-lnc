'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  const {
    openRecordModal,
    setHeaderTitle,
    setHeaderId,
    setBreadcrumbs,
    setBackHref,
    setHeaderLogo,
    refreshSignal,
  } = useApp();

  const compId = Number(params?.id);

  const [compInfo, setCompInfo] = useState<(CompetitionItem & { clubsCount: number; awardsCount: number }) | null>(null);
  const [activeTab, setActiveTab] = useState<'CLUBS' | 'AWARDS'>('CLUBS');
  const [clubs, setClubs] = useState<ClubItem[]>([]);
  const [awards, setAwards] = useState<AwardItem[]>([]);
  const [tableFilter, setTableFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Load Competition info and records
  const loadCompData = useCallback(async () => {
    if (!compId) return;
    setLoading(true);
    try {
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
  }, [compId, setHeaderTitle, setHeaderId, setBreadcrumbs, setBackHref, setHeaderLogo]);

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

  const tabItems = useMemo(() => [
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
    {
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
    },
  ], [clubs.length, awards.length, activeTab]);

  const compTitle = compInfo?.short_name || compInfo?.long_name || `Competition ${compId}`;
  const nationId = compInfo?.nation_id || compInfo?.nation?.id;
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
              ) : (
                <TrophyOutlined className="text-2xl text-amber-500" />
              )}
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-bold text-slate-800 m-0">
                    {compTitle}
                  </h2>
                  <Tag color="cyan" className="m-0 font-bold text-xs">
                    ID: {compId}
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
                {compInfo?.long_name && compInfo.long_name !== compInfo.short_name && (
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
                    openRecordModal(RecordType.CLUB, null, nationId, compId);
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
              onEdit={(rec) => openRecordModal(RecordType.CLUB, rec, nationId, compId)}
              onDelete={(rec) => handleDeleteClub(rec.id)}
              emptyText="No clubs found in this competition"
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
