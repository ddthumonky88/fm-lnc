'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { App, Input, Select, Tabs } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import CardGrid from '../../components/CardGrid';
import CompetitionGroupView from '../../components/CompetitionGroupView';
import TabIconBadge from '../../components/TabIconBadge';
import { IntCompIcon, NationIcon } from '../../components/EntityIcons';
import { useApp } from '../../context/AppContext';
import {
  CompetitionItem,
  NationItem,
  fetchIntCompetitions,
  fetchNationsByContinent,
} from '../../services/api';
import { EntityType } from '../../types';
import { buildEntityBreadcrumbs } from '../../utils/breadcrumbs';

type HomeTab = 'NATIONS' | 'INT_COMPETITIONS';

const CONFEDERATIONS = [
  { id: '3', code: 'UEFA' },
  { id: '2', code: 'AFC' },
  { id: '1', code: 'CAF' },
  { id: '4', code: 'CONCACAF' },
  { id: '6', code: 'CONMEBOL' },
  { id: '5', code: 'OFC' },
  { id: '7', code: 'WORLD' },
  { id: '8', code: 'EXTINCT' },
] as const;

const getList = <T,>(response: T[] | { content?: T[] }): T[] =>
  Array.isArray(response) ? response : response.content || [];

const getTotal = (response: unknown, fallback: number): number => {
  const result = response as { totalElements?: number; total?: number };
  return Number(result?.totalElements ?? result?.total ?? fallback);
};

export default function HomePage() {
  const router = useRouter();
  const { message } = App.useApp();
  const { setHeaderTitle, setHeaderId, setBreadcrumbs, setBackHref, setHeaderLogo } = useApp();

  const [selectedConfed, setSelectedConfed] = useState('all');
  const [activeTab, setActiveTab] = useState<HomeTab>('NATIONS');
  const [nations, setNations] = useState<NationItem[]>([]);
  const [competitions, setCompetitions] = useState<CompetitionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [keyword, setKeyword] = useState('');

  useEffect(() => {
    setHeaderTitle('Home');
    setHeaderId(undefined);
    setBreadcrumbs(buildEntityBreadcrumbs({}));
    setBackHref(null);
    setHeaderLogo(null);
    return () => {
      setBreadcrumbs([]);
      setHeaderId(undefined);
    };
  }, [setBackHref, setBreadcrumbs, setHeaderId, setHeaderLogo, setHeaderTitle]);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const query = { page: page - 1, size: pageSize, keyword };
      if (activeTab === 'NATIONS') {
        const response = await fetchNationsByContinent(selectedConfed, query);
        const list = getList(response);
        setNations(list);
        setTotal(getTotal(response, list.length));
      } else {
        const response = await fetchIntCompetitions(selectedConfed, query);
        const list = getList(response);
        setCompetitions(list);
        setTotal(getTotal(response, list.length));
      }
    } catch (error) {
      const apiError = error as Error;
      message.error(apiError.message || 'Failed to load home data');
    } finally {
      setLoading(false);
    }
  }, [activeTab, keyword, message, page, pageSize, selectedConfed]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const confedOptions = useMemo(
    () => [
      {
        value: 'all',
        label: (
          <div className="flex items-center gap-2 font-semibold">
            <GlobalOutlined className="text-blue-600" />
            <span>ALL</span>
          </div>
        ),
      },
      ...CONFEDERATIONS.map((confed) => ({
        value: confed.id,
        label: <span className="font-semibold">{confed.code}</span>,
      })),
    ],
    [],
  );

  const pagination = {
    current: page,
    pageSize,
    total,
    onChange: (nextPage: number, nextPageSize?: number) => {
      setPage(nextPageSize && nextPageSize !== pageSize ? 1 : nextPage);
      if (nextPageSize) setPageSize(nextPageSize);
    },
  };

  const submitSearch = (value: string) => {
    setSearch(value);
    setKeyword(value.trim());
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <div className="home-hub rounded-lg border border-gray-200 bg-white p-3 shadow-2xs sm:p-5">
        <div className="home-hub-toolbar mb-4 flex flex-wrap gap-3">
          <Select
            value={selectedConfed}
            options={confedOptions}
            onChange={(value) => {
              setSelectedConfed(value);
              setPage(1);
            }}
            className="family-team-select min-w-[220px] flex-1"
            popupMatchSelectWidth
          />
          <div className="min-w-[220px] flex-1 self-center">
            <Input.Search
              value={search}
              allowClear
              placeholder={activeTab === 'NATIONS' ? 'Search countries...' : 'Search competitions...'}
              onChange={(event) => {
                setSearch(event.target.value);
                if (!event.target.value && keyword) submitSearch('');
              }}
              onSearch={submitSearch}
              className="w-full"
            />
          </div>
        </div>

        <Tabs
          activeKey={activeTab}
          onChange={(key) => {
            setActiveTab(key as HomeTab);
            setPage(1);
            setSearch('');
            setKeyword('');
          }}
          items={[
            {
              key: 'NATIONS',
              label: (
                <div className="flex items-center gap-2">
                  <TabIconBadge
                    icon={<NationIcon size={16} className={activeTab === 'NATIONS' ? 'text-white' : 'text-cyan-600'} />}
                    isActive={activeTab === 'NATIONS'}
                  />
                  <span className={`home-tab-label ${activeTab === 'NATIONS' ? 'font-semibold' : ''}`}>
                    Countries
                  </span>
                </div>
              ),
            },
            {
              key: 'INT_COMPETITIONS',
              label: (
                <div className="flex items-center gap-2">
                  <TabIconBadge
                    icon={<IntCompIcon size={16} className={activeTab === 'INT_COMPETITIONS' ? 'text-white' : 'text-purple-600'} />}
                    isActive={activeTab === 'INT_COMPETITIONS'}
                  />
                  <span className={`home-tab-label ${activeTab === 'INT_COMPETITIONS' ? 'font-semibold' : ''}`}>
                    <span className="home-tab-full">International Competitions</span>
                    <span className="home-tab-short">Competitions</span>
                  </span>
                </div>
              ),
            },
          ]}
          className="home-hub-tabs"
        />

        {activeTab === 'NATIONS' ? (
          <CardGrid
            items={nations}
            type={EntityType.NATION}
            cardSize="small"
            loading={loading}
            serverPagination={pagination}
            onNavigate={(step) => step.id && router.push(`/nation/${step.id}`)}
            emptyText="No countries found"
            defaultPageSize={20}
          />
        ) : (
          <CompetitionGroupView
            items={competitions}
            loading={loading}
            serverPagination={pagination}
            onNavigate={(step) => step.id && router.push(`/comp/${step.id}`)}
            emptyText="No international competitions found"
          />
        )}
      </div>
    </div>
  );
}
