'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button, Tag, App, Spin } from 'antd';
import {
  fetchCityInfo,
  deleteRecord,
  getNationLogoUrl,
} from '../../../services/api';
import DetailBodyHeader from '../../../components/DetailBodyHeader';
import ChildEntitiesSection from '../../../components/ChildEntitiesSection';
import RecordDetailView from '../../../components/RecordDetailView';
import DeleteConfirmModal from '../../../components/DeleteConfirmModal';
import {
  CityIcon,
  NationIcon,
  StadiumIcon,
  ClubIcon,
} from '../../../components/EntityIcons';
import { EntityType, RecordType } from '../../../types';
import { useApp } from '../../../context/AppContext';

function CityDetailContent() {
  const params = useParams();
  const router = useRouter();
  const { message } = App.useApp();
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

  const cityId = params?.id ? decodeURIComponent(String(params.id)) : '';

  const [cityInfo, setCityInfo] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = useCallback(async () => {
    if (!cityId) return;
    setLoading(true);
    try {
      const data = await fetchCityInfo(cityId, refreshSignal > 0);
      setCityInfo(data);

      const title = data.name_lg || data.name || `City ${data.id}`;
      setHeaderTitle(title);
      setHeaderId(data.id);
      setBreadcrumbs([
        { title: 'Cities', href: '/list-cities' },
        { title },
      ]);
      setBackHref('/list-cities');

      const nationId = data.nation_id || data.nation?.id;
      if (nationId) {
        const logoUrl = getNationLogoUrl(nationId);
        if (logoUrl) {
          setHeaderLogo({
            url: logoUrl,
            alt: data.nation_name || title,
            isFlag: true,
          });
        }
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to load city info');
    } finally {
      setLoading(false);
    }
  }, [cityId, refreshSignal, setHeaderTitle, setHeaderId, setBreadcrumbs, setBackHref, setHeaderLogo, message]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleEdit = () => {
    if (cityInfo) {
      openRecordModal(RecordType.CITY, cityInfo);
    }
  };

  const handleDelete = async () => {
    if (!cityInfo) return;
    setIsDeleting(true);
    try {
      await deleteRecord(RecordType.CITY, String(cityInfo.id));
      message.success('City deleted successfully');
      setDeleteModalOpen(false);
      triggerRefresh();
      router.push('/list-cities');
    } catch (err: any) {
      message.error(err.message || 'Failed to delete city');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spin size="large" tip="Loading city..." />
      </div>
    );
  }

  if (!cityInfo) {
    return (
      <div className="p-8 text-center text-slate-500">
        <p>City not found.</p>
        <Button onClick={() => router.push('/list-cities')} className="mt-4">
          Back to Cities
        </Button>
      </div>
    );
  }

  const nationId = cityInfo.nation_id || cityInfo.nation?.id;
  const nationName = cityInfo.nation_name || cityInfo.nation?.name_lg || cityInfo.nation?.name;
  const cityName = cityInfo.name_lg || cityInfo.name || `City ${cityInfo.id}`;

  return (
    <div className="w-full p-3 sm:p-5 space-y-4">
      {/* 1. Title của Body: Back + Icon + (Line 1: Thẻ ID, Line 2: Name) + Actions */}
      <DetailBodyHeader
        onBack={() => router.push('/list-cities')}
        id={cityInfo.id}
        name={cityName}
        icon={<CityIcon size={22} className="text-sky-600" />}
        badgeTypeStyles="bg-sky-50/90 border-sky-300 text-sky-600"
        extraTag={
          cityInfo.region_code ? (
            <Tag color="cyan" className="m-0 text-xs">
              [{cityInfo.region_code}] {cityInfo.region_name || ''}
            </Tag>
          ) : undefined
        }
        onEdit={handleEdit}
        onDelete={() => setDeleteModalOpen(true)}
      />

      {/* 2. Vùng thông tin: Card chi tiết thuộc tính */}
      <div className="w-full">
        <RecordDetailView
          data={cityInfo}
          type={EntityType.CITY}
          showHeader={false}
          onEdit={handleEdit}
        />
      </div>

      {/* 3. Vùng các thẻ (kèm theo số lượng) con trực thuộc */}
      <ChildEntitiesSection
        items={[
          ...(nationId
            ? [
                {
                  key: 'nation',
                  label: `Nation (${nationName || nationId})`,
                  count: 1,
                  icon: <NationIcon size={18} className="text-cyan-500" />,
                  badgeStyles: 'bg-cyan-50 border-cyan-200 text-cyan-600',
                  onClick: () => router.push(`/nation/${nationId}`),
                },
              ]
            : []),
          {
            key: 'stadiums',
            label: 'Stadiums',
            count: cityInfo.stadiumsCount ?? (cityInfo.stadiums?.length || 0),
            icon: <StadiumIcon size={18} className="text-emerald-500" />,
            badgeStyles: 'bg-emerald-50 border-emerald-200 text-emerald-600',
            onClick: () =>
              router.push(`/list-stadiums${nationId ? `?nationId=${nationId}` : ''}`),
          },
          {
            key: 'clubs',
            label: 'Clubs',
            count: cityInfo.clubsCount ?? (cityInfo.clubs?.length || 0),
            icon: <ClubIcon size={18} className="text-blue-500" />,
            badgeStyles: 'bg-blue-50 border-blue-200 text-blue-600',
            onClick: () =>
              router.push(`/list-clubs${nationId ? `?nationId=${nationId}` : ''}`),
          },
        ]}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete city"
        itemName={cityName}
        loading={isDeleting}
      />
    </div>
  );
}

export default function CityDetailPage() {
  return (
    <Suspense
      fallback={<div className="p-8 text-center text-slate-400">Loading city...</div>}
    >
      <CityDetailContent />
    </Suspense>
  );
}
