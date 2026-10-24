import { SetMetadata } from '@nestjs/common';

export const RAW_RESPONSE_KEY = 'raw_response';

/**
 * Đánh dấu controller/handler trả dữ liệu thô (file ảnh, file .lnc, health check...)
 * => bỏ qua việc bọc envelope JSON.
 */
export const RawResponse = () => SetMetadata(RAW_RESPONSE_KEY, true);
