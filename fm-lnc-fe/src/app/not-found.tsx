import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <h2 className="text-2xl font-bold">404 - Không tìm thấy trang</h2>
      <p className="text-gray-500">Trang bạn đang tìm kiếm không tồn tại.</p>
      <Link href="/" className="text-blue-500 hover:underline">
        Về trang chủ
      </Link>
    </div>
  );
}

