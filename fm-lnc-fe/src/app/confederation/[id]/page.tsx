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
import { NationIcon, IntCompIcon } from '../../../components/EntityIcons';
import { EntityType, RecordType } from '../../../types';
import { useApp } from '../../../context/AppContext';
import { matchRecordSearch } from '../../../utils/search';

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

  const confedId = params?.id ? String(params.id) : '';
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
        fetchContinents().catch((err) => {
          console.error('Failed to fetch continents:', err);
          return [];
        }),
        fetchNationsByContinent(confedId).catch((err) => {
          console.error('Failed to fetch nations:', err);
          return [];
        }),
        fetchIntCompetitions(confedId).catch((err) => {
          console.error('Failed to fetch international competitions:', err);
          return [];
        }),
      ]);

      const continentsList: ConfederationItem[] = Array.isArray(continents)
        ? continents
        : Array.isArray((continents as any)?.content)
          ? (continents as any).content
          : [];
      const nationsList: NationItem[] = Array.isArray(nationsData)
        ? nationsData
        : Array.isArray((nationsData as any)?.content)
          ? (nationsData as any).content
          : [];
      const intCompsList: CompetitionItem[] = Array.isArray(intCompsData)
        ? intCompsData
        : Array.isArray((intCompsData as any)?.content)
          ? (intCompsData as any).content
          : [];

      const found = continentsList.find((c) => String(c.id) === String(confedId));
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
      setNations(nationsList);
      setIntComps(intCompsList);
      if (!searchParams.get('tab')) {
        if (nationsList.length === 0 && intCompsList.length > 0) {
          setActiveTab('INT_COMPETITIONS');
        } else if (intCompsList.length === 0 && nationsList.length > 0) {
          setActiveTab('NATIONS');
        }
      }
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
    return nations
      .filter((n) => matchRecordSearch(n, tableFilter))
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
    return intComps.filter((c) => matchRecordSearch(c, tableFilter));
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
              items={(() => {
                const list: any[] = [];
                const nationsCount = nations.length;
                const compsCount = intComps.filter((c) => !c.parent_id).length;

                if (nationsCount > 0) {
                  list.push({
                    key: 'NATIONS',
                    label: (
                      <Space size={4} title="Countries">
                        <NationIcon size={18} className="text-cyan-600" />
                        <span
                          className={`hidden sm:inline ${activeTab === 'NATIONS' ? 'font-semibold' : ''}`}
                        >
                          Countries
                        </span>
                        <Badge
                          count={nationsCount}
                          overflowCount={99999}
                          style={{
                            backgroundColor: activeTab === 'NATIONS' ? '#1d70b8' : '#94a3b8',
                          }}
                        />
                      </Space>
                    ),
                  });
                }

                if (compsCount > 0) {
                  list.push({
                    key: 'INT_COMPETITIONS',
                    label: (
                      <Space size={4} title="International Competitions">
                        <IntCompIcon size={18} className="text-purple-600" />
                        <span
                          className={`hidden sm:inline ${activeTab === 'INT_COMPETITIONS' ? 'font-semibold' : ''}`}
                        >
                          International Competitions
                        </span>
                        <Badge
                          count={compsCount}
                          overflowCount={99999}
                          style={{
                            backgroundColor:
                              activeTab === 'INT_COMPETITIONS' ? '#1d70b8' : '#94a3b8',
                          }}
                        />
                      </Space>
                    ),
                  });
                }

                if (list.length === 0) {
                  list.push({
                    key: 'NATIONS',
                    label: (
                      <Space size={4} title="Countries">
                        <NationIcon size={18} className="text-cyan-600" />
                        <span className="hidden sm:inline font-semibold">Countries</span>
                      </Space>
                    ),
                  });
                }

                return list;
              })()}
              className="mb-4"
            />

            {/* Tab 1: Countries (Nations) */}
            {activeTab === 'NATIONS' && (
              <div>
                <div className="flex justify-end mb-4">
                  <Input
                    prefix={<SearchOutlined className="text-gray-400" />}
                    placeholder="Filter countries..."
                    value={tableFilter}
                    onChange={(e) => setTableFilter(e.target.value)}
                    allowClear
                    className="w-full sm:w-64"
                  />
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
                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
                      <Input
                        prefix={<SearchOutlined className="text-gray-400" />}
                        placeholder="Filter competitions..."
                        value={tableFilter}
                        onChange={(e) => setTableFilter(e.target.value)}
                        allowClear
                        className="flex-1 sm:w-64"
                      />
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => openRecordModal(RecordType.COMPETITION, null)}
                        style={{ backgroundColor: '#059669', borderColor: '#059669' }}
                        className="shrink-0"
                        title="Add International Competition"
                      >
                        <span className="hidden sm:inline">Add International Competition</span>
                      </Button>
                    </div>
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
    <Suspense
      fallback={<div className="p-8 text-center text-gray-400">Loading confederation...</div>}
    >
      <ConfederationDetailContent />
    </Suspense>
  );
}
