'use client';

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Breadcrumb, Tabs, Tag, Badge, Input, Button, Space, message, Spin, Tooltip } from 'antd';
import {
  GlobalOutlined,
  TrophyOutlined,
  SearchOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import {
  fetchContinents,
  fetchNationsByContinent,
  fetchIntCompetitions,
  ConfederationItem,
  NationItem,
  CompetitionItem,
  getConfederationLogoUrl,
} from '../../../services/api';
import CardGrid from '../../../components/CardGrid';
import CompetitionGroupView from '../../../components/CompetitionGroupView';
import { EntityType, RecordType } from '../../../types';
import { useApp } from '../../../context/AppContext';

function ConfederationDetailContent() {
  const params = useParams();
  const router = useRouter();
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

  const confedId = Number(params?.id);
  const initialTab = searchParams.get('tab') === 'int' ? 'INT_COMPETITIONS' : 'NATIONS';

  const [confederation, setConfederation] = useState<ConfederationItem | null>(null);
  const [nations, setNations] = useState<NationItem[]>([]);
  const [intComps, setIntComps] = useState<CompetitionItem[]>([]);
  const [activeTab, setActiveTab] = useState<'NATIONS' | 'INT_COMPETITIONS'>(initialTab);
  const [tableFilter, setTableFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Load Confederation data
  const loadData = useCallback(async () => {
    if (!confedId) return;
    setLoading(true);
    try {
      const [continents, nationsData, intCompsData] = await Promise.all([
        fetchContinents(),
        fetchNationsByContinent(confedId),
        fetchIntCompetitions(confedId),
      ]);

      const found = continents.find((c) => c.id === confedId);
      if (found) {
        setConfederation(found);
        setHeaderTitle(found.name);
        setHeaderId(found.id);
        setBackHref('/');
        setBreadcrumbs([
          {
            title: 'HOME',
            href: '/',
          },
          {
            title: found.name,
          },
        ]);
        setHeaderLogo({
          url: getConfederationLogoUrl(found.id),
          alt: found.name,
          isFlag: false,
        });
      }
      setNations(nationsData);
      setIntComps(intCompsData);
    } catch (err: any) {
      console.error(err);
      message.error(err.message || 'Failed to load confederation details');
    } finally {
      setLoading(false);
    }
  }, [confedId, setHeaderTitle, setHeaderId, setBreadcrumbs, setBackHref, setHeaderLogo]);

  useEffect(() => {
    loadData();
    return () => {
      setBreadcrumbs([]);
      setBackHref(null);
      setHeaderLogo(null);
      setHeaderId(undefined);
    };
  }, [loadData, refreshSignal, setBreadcrumbs, setBackHref, setHeaderLogo, setHeaderId]);

  // Client-side filter for nations
  const filteredNations = useMemo(() => {
    const q = tableFilter.trim().toLowerCase();
    return nations
      .filter(
        (n) =>
          !q ||
          n.long_name.toLowerCase().includes(q) ||
          (n.short_name && n.short_name.toLowerCase().includes(q)) ||
          (n.three_letter_name && n.three_letter_name.toLowerCase().includes(q)) ||
          String(n.id).includes(q),
      )
      .sort((a, b) =>
        (a.long_name || a.short_name || '').localeCompare(
          b.long_name || b.short_name || '',
          undefined,
          { numeric: true, sensitivity: 'base' },
        ),
      );
  }, [nations, tableFilter]);

  // Client-side filter for international competitions
  const filteredIntComps = useMemo(() => {
    const q = tableFilter.trim().toLowerCase();
    return intComps.filter(
      (c) =>
        !q ||
        c.long_name.toLowerCase().includes(q) ||
        (c.short_name && c.short_name.toLowerCase().includes(q)) ||
        (c.three_letter_name && c.three_letter_name.toLowerCase().includes(q)) ||
        String(c.id).includes(q) ||
        (c.categories && c.categories.toLowerCase().includes(q)),
    );
  }, [intComps, tableFilter]);

  const handleNavigate = (step: any) => {
    if (step.level === 'NATION_HUB' || step.level === 'NATIONS' || step.type === 'nation') {
      router.push(`/nation/${step.id}`);
    } else if (
      step.level === 'CLUBS_IN_COMP' ||
      step.level === 'INT_COMPETITIONS' ||
      step.type === 'competition'
    ) {
      router.push(`/comp/${step.id}`);
    }
  };

  return (
    <div>
      {/* Main Container Body */}
      <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-5 shadow-2xs min-h-[480px]">
        {loading ? (
          <div className="text-center py-16 text-sm text-gray-500 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span>Loading data...</span>
          </div>
        ) : (
          <div>
            {/* Tabs: Countries vs International Competitions */}
            <Tabs
              activeKey={activeTab}
              onChange={(key) => {
                setTableFilter('');
                setActiveTab(key as any);
              }}
              type="line"
              items={[
                {
                  key: 'NATIONS',
                  label: (
                    <Space size={4}>
                      <GlobalOutlined />
                      <span className={activeTab === 'NATIONS' ? 'font-semibold' : ''}>Countries</span>
                      <Badge
                        count={nations.length}
                        overflowCount={99999}
                        style={{
                          backgroundColor: activeTab === 'NATIONS' ? '#1d70b8' : '#94a3b8',
                        }}
                      />
                    </Space>
                  ),
                },
                {
                  key: 'INT_COMPETITIONS',
                  label: (
                    <Space size={4}>
                      <TrophyOutlined />
                      <span className={activeTab === 'INT_COMPETITIONS' ? 'font-semibold' : ''}>
                        International Competitions
                      </span>
                      <Badge
                        count={intComps.length}
                        overflowCount={99999}
                        style={{
                          backgroundColor: activeTab === 'INT_COMPETITIONS' ? '#1d70b8' : '#94a3b8',
                        }}
                      />
                    </Space>
                  ),
                },
              ]}
              className="mb-4"
            />

            {/* Tab 1: Countries (Nations) */}
            {activeTab === 'NATIONS' && (
              <div>
                <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2.5 sm:gap-3 mb-4">
                  <div className="text-xs text-gray-500">
                    Total: <strong className="text-gray-800">{filteredNations.length}</strong> countries
                  </div>

                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    <Input
                      prefix={<SearchOutlined className="text-gray-400" />}
                      placeholder="Filter countries..."
                      value={tableFilter}
                      onChange={(e) => setTableFilter(e.target.value)}
                      allowClear
                      className="flex-1 sm:w-64"
                    />
                  </div>
                </div>

                <CardGrid
                  items={filteredNations}
                  type={EntityType.NATION}
                  columns={5}
                  loading={loading}
                  onNavigate={handleNavigate}
                  emptyText="No countries found"
                  defaultPageSize={20}
                />
              </div>
            )}

            {/* Tab 2: International Competitions */}
            {activeTab === 'INT_COMPETITIONS' && (
              <div>
                <CompetitionGroupView
                  items={filteredIntComps}
                  loading={loading}
                  onNavigate={handleNavigate}
                  onEdit={(rec) => openRecordModal(RecordType.COMPETITION, rec)}
                  emptyText="No international competitions found"
                  extraRight={
                    <>
                      <Input
                        prefix={<SearchOutlined className="text-gray-400" />}
                        placeholder="Filter competitions..."
                        value={tableFilter}
                        onChange={(e) => setTableFilter(e.target.value)}
                        allowClear
                        className="w-48 sm:w-64"
                      />
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => openRecordModal(RecordType.COMPETITION, null)}
                        style={{ backgroundColor: '#059669', borderColor: '#059669' }}
                        className="shrink-0"
                      >
                        Add International Competition
                      </Button>
                    </>
                  }
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ConfederationDetailPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Loading confederation...</div>}>
      <ConfederationDetailContent />
    </Suspense>
  );
}
