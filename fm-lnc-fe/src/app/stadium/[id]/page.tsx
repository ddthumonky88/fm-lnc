'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button, Tag, App, Spin } from 'antd';
import {
  fetchStadiumInfo,
  deleteRecord,
  getNationLogoUrl,
} from '../../../services/api';
import DetailBodyHeader from '../../../components/DetailBodyHeader';
import ChildEntitiesSection from '../../../components/ChildEntitiesSection';
import RecordDetailView from '../../../components/RecordDetailView';
import DeleteConfirmModal from '../../../components/DeleteConfirmModal';
import {
  StadiumIcon,
  NationIcon,
  CityIcon,
  ClubIcon,
} from '../../../components/EntityIcons';
import { EntityType, RecordType } from '../../../types';
import { useApp } from '../../../context/AppContext';

function StadiumDetailContent() {
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

  const stadiumId = params?.id ? decodeURIComponent(String(params.id)) : '';

  const [stadiumInfo, setStadiumInfo] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = useCallback(async () => {
    if (!stadiumId) return;
    setLoading(true);
    try {
      const data = await fetchStadiumInfo(stadiumId, refreshSignal > 0);
      setStadiumInfo(data);

      const title = data.name || `Stadium ${data.id}`;
      setHeaderTitle(title);
      setHeaderId(data.id);
      setBreadcrumbs([
        { title: 'Stadiums', href: '/list-stadiums' },
        { title },
      ]);
      setBackHref('/list-stadiums');

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
      message.error(err.message || 'Failed to load stadium info');
    } finally {
      setLoading(false);
    }
  }, [stadiumId, refreshSignal, setHeaderTitle, setHeaderId, setBreadcrumbs, setBackHref, setHeaderLogo, message]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleEdit = () => {
    if (stadiumInfo) {
      openRecordModal(RecordType.STADIUM, stadiumInfo);
    }
  };

  const handleDelete = async () => {
    if (!stadiumInfo) return;
    setIsDeleting(true);
    try {
      await deleteRecord(RecordType.STADIUM, String(stadiumInfo.id));
      message.success('Stadium deleted successfully');
      setDeleteModalOpen(false);
      triggerRefresh();
      router.push('/list-stadiums');
    } catch (err: any) {
      message.error(err.message || 'Failed to delete stadium');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spin size="large" tip="Loading stadium..." />
      </div>
    );
  }

  if (!stadiumInfo) {
    return (
      <div className="p-8 text-center text-slate-500">
        <p>Stadium not found.</p>
        <Button onClick={() => router.push('/list-stadiums')} className="mt-4">
          Back to Stadiums
        </Button>
      </div>
    );
  }

  const nationId = stadiumInfo.nation_id || stadiumInfo.nation?.id;
  const nationName = stadiumInfo.nation_name || stadiumInfo.nation?.name_lg || stadiumInfo.nation?.name;
  const cityId = stadiumInfo.city_id || stadiumInfo.city?.id;
  const cityName = stadiumInfo.city_name || stadiumInfo.city?.name_lg || stadiumInfo.city?.name;
  const stadiumName = stadiumInfo.name || `Stadium ${stadiumInfo.id}`;

  return (
    <div className="w-full p-3 sm:p-5 space-y-4">
      {/* 1. Title của Body: Back + Icon + (Line 1: Thẻ ID, Line 2: Name) + Actions */}
      <DetailBodyHeader
        onBack={() => router.push('/list-stadiums')}
        id={stadiumInfo.id}
        name={stadiumName}
        icon={<StadiumIcon size={22} className="text-emerald-600" />}
        badgeTypeStyles="bg-emerald-50/90 border-emerald-300 text-emerald-600"
        extraTag={
          stadiumInfo.capacity ? (
            <Tag color="green" className="m-0 text-xs">
              Capacity: {Number(stadiumInfo.capacity).toLocaleString()}
            </Tag>
          ) : undefined
        }
        onEdit={handleEdit}
        onDelete={() => setDeleteModalOpen(true)}
      />

      {/* 2. Vùng thông tin: Card chi tiết thuộc tính */}
      <div className="w-full">
        <RecordDetailView
          data={stadiumInfo}
          type={EntityType.STADIUM}
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
          ...(cityId
            ? [
                {
                  key: 'city',
                  label: `City (${cityName || cityId})`,
                  count: 1,
                  icon: <CityIcon size={18} className="text-sky-500" />,
                  badgeStyles: 'bg-sky-50 border-sky-200 text-sky-600',
                  onClick: () => router.push(`/city/${cityId}`),
                },
              ]
            : []),
          {
            key: 'clubs',
            label: 'Clubs using this stadium',
            count: stadiumInfo.clubsCount ?? (stadiumInfo.clubs?.length || 0),
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
        title="Delete stadium"
        itemName={stadiumName}
        loading={isDeleting}
      />
    </div>
  );
}

export default function StadiumDetailPage() {
  return (
    <Suspense
      fallback={<div className="p-8 text-center text-slate-400">Loading stadium...</div>}
    >
      <StadiumDetailContent />
    </Suspense>
  );
}
