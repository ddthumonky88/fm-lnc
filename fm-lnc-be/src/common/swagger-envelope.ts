import type { OpenAPIObject } from '@nestjs/swagger';

type AnyObject = Record<string, any>;

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const;

/** Các route trả dữ liệu thô => không bọc envelope trong tài liệu Swagger. */
const RAW_PATH_PATTERNS = [/\/logos\//, /\/lnc\/export$/, /\/fm\/export$/, /^\/(api\/)?health$/];

function buildErrorSchema(): AnyObject {
  return {
    type: 'object',
    nullable: true,
    properties: {
      code: { type: 'string', example: 'string' },
      message: { type: 'string', example: 'string' },
      validationErrors: { type: 'string', nullable: true, example: 'string' },
    },
  };
}

function buildPageSchema(contentSchema: AnyObject): AnyObject {
  return {
    type: 'object',
    properties: {
      content: contentSchema,
      page: { type: 'integer', example: 0 },
      size: { type: 'integer', example: 10 },
      totalElements: { type: 'integer', example: 0 },
      totalPages: { type: 'integer', example: 0 },
      hasPrevious: { type: 'boolean', example: false },
      hasNext: { type: 'boolean', example: false },
      first: { type: 'boolean', example: true },
      last: { type: 'boolean', example: true },
    },
  };
}

function buildEnvelopeSchema(dataSchema: AnyObject | undefined): AnyObject {
  return {
    type: 'object',
    properties: {
      status: { type: 'integer', example: 200 },
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'OK' },
      data: dataSchema ?? { type: 'object', nullable: true },
      error: buildErrorSchema(),
      timestamp: { type: 'integer', format: 'int64', example: 1792855905224 },
      path: { type: 'string', example: '/api/hierarchy/nations' },
      correlationId: { type: 'string', example: '3f2b8c1e-6a0d-4a57-9d2e-0c1f7b9a4e11' },
    },
  };
}

/**
 * Hậu xử lý tài liệu OpenAPI để khớp hành vi runtime:
 *  - Mọi response thành công là `200 OK` (POST không còn `201 Created`).
 *  - Schema response được bọc trong envelope chuẩn.
 *  - Danh sách (array) của nhóm Hierarchy được mô tả dưới dạng `data = { content: [...], page, size, ... }`.
 */
export function applyEnvelopeToSwagger(document: OpenAPIObject): OpenAPIObject {
  for (const [path, pathItem] of Object.entries(document.paths ?? {})) {
    const isRawPath = RAW_PATH_PATTERNS.some((re) => re.test(path));

    for (const method of HTTP_METHODS) {
      const operation = (pathItem as AnyObject)[method] as AnyObject | undefined;
      if (!operation?.responses) continue;

      // POST mặc định 201 => ép về 200 OK
      if (operation.responses['201'] && !operation.responses['200']) {
        operation.responses['200'] = { ...operation.responses['201'], description: 'OK' };
      }
      delete operation.responses['201'];

      const okResponse = operation.responses['200'] as AnyObject | undefined;
      if (!okResponse || isRawPath) continue;

      const content: AnyObject = okResponse.content ?? { 'application/json': {} };
      for (const mediaType of Object.keys(content)) {
        const original: AnyObject | undefined = content[mediaType]?.schema;

        // Bỏ qua phản hồi file/text thô
        if (original?.type === 'string') continue;

        const isHierarchyList = path.includes('/hierarchy/') && original?.type === 'array';
        const dataSchema = isHierarchyList ? buildPageSchema(original!) : original;

        content[mediaType] = { schema: buildEnvelopeSchema(dataSchema) };
      }
      okResponse.content = content;
      okResponse.description = 'OK';
    }
  }
  return document;
}
