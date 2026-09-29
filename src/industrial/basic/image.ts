import type { ComponentDefinition } from '@/types/scada'

/**
 * 图片组件：在组态画布上展示 Logo、设备照片、背景图等。
 * 图片源支持 http(s) 相对/绝对 URL，或 data:URL（上传后内嵌）。
 */
export const ImageDefinition: ComponentDefinition = {
  type: 'image',
  name: '图片',
  group: 'basic',
  icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="2.8" stroke-linejoin="round">
      <rect x="12" y="18" width="76" height="64" rx="8" fill="currentColor" fill-opacity="0.08"/>
      <circle cx="34" cy="40" r="7" fill="currentColor" fill-opacity="0.25"/>
      <path d="M18 72 L40 50 L55 64 L68 52 L82 72" />
    </g>
  </svg>`,
  defaultWidth: 160,
  defaultHeight: 120,
  defaultConfig: {
    imageUrl: '',
    fit: 'contain',
    opacity: 1,
  },
  statusRules: [],
  dataBindings: [],
  properties: [
    {
      key: 'name',
      label: '名称',
      type: 'string',
      default: '图片',
      group: '基本',
    },
    {
      key: 'imageUrl',
      label: '图片地址',
      type: 'string',
      default: '',
      group: '图片',
    },
    {
      key: 'fit',
      label: '适配方式',
      type: 'select',
      default: 'contain',
      options: [
        { label: '完整显示', value: 'contain' },
        { label: '填满裁剪', value: 'cover' },
        { label: '拉伸', value: 'fill' },
      ],
      group: '图片',
    },
    {
      key: 'opacity',
      label: '不透明度',
      type: 'range',
      default: 1,
      min: 0.1,
      max: 1,
      step: 0.1,
      group: '图片',
    },
  ],
}
