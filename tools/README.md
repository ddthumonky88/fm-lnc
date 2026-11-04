# FM24 XML analyzer

Phân tích cấu trúc và các record mang ý nghĩa `add/update/delete/remove/change` trong file XML export của Football Manager.

## Chạy

Xuất JSON ra terminal:

```powershell
python .\tools\analyze_fm24_xml.py D:\path\to\fm24.xml
```

Ghi báo cáo Markdown:

```powershell
python .\tools\analyze_fm24_xml.py D:\path\to\fm24.xml `
  --format markdown `
  --output .\fm24-changes.md `
  --samples 50
```

Tool dùng parser streaming của Python standard library nên không cần cài package và có thể xử lý file lớn mà không nạp toàn bộ XML vào RAM.

Với schema FM24, một database change được nhận diện bằng record có đủ:

- `database_table_type`
- `property`
- `new_value`
- `db_unique_id` hoặc `db_random_id` dùng làm định danh object

Kết quả gồm:

- Tổng số element, record và list.
- Các tag và `id` phổ biến.
- Số change candidate theo type/action.
- Mẫu record change kèm path và toàn bộ field đã chuẩn hóa.

Các table/property trong XML dùng ID số nội bộ. Tool giữ nguyên các ID này và nhóm số lượng theo table/property vì file không chứa bảng ánh xạ sang tên hiển thị.
