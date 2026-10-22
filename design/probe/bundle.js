"use strict";
var WB = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // design/probe/entry.ts
  var entry_exports = {};
  __export(entry_exports, {
    BoilerDefinition: () => BoilerDefinition,
    ConveyorDefinition: () => ConveyorDefinition,
    DisplayDefinition: () => DisplayDefinition,
    MotorDefinition: () => MotorDefinition,
    PumpDefinition: () => PumpDefinition,
    RoadheaderDefinition: () => RoadheaderDefinition,
    SedimentTankDefinition: () => SedimentTankDefinition,
    ShearerDefinition: () => ShearerDefinition,
    TankDefinition: () => TankDefinition,
    TurbineDefinition: () => TurbineDefinition,
    ValveDefinition: () => ValveDefinition,
    computeElementLayout: () => computeElementLayout,
    getIconAspect: () => getIconAspect,
    getIconBounds: () => getIconBounds,
    tightenIconSvg: () => tightenIconSvg
  });

  // src/core/canvas/iconBounds.ts
  var RASTER_LONG_SIDE = 512;
  var boundsCache = /* @__PURE__ */ new Map();
  var tightenCache = /* @__PURE__ */ new Map();
  function maxStrokeWidth(svg) {
    let max = 0;
    const re = /stroke-width="([\d.]+)"/g;
    let m;
    while ((m = re.exec(svg)) !== null) {
      const v = parseFloat(m[1]);
      if (Number.isFinite(v) && v > max) max = v;
    }
    return max;
  }
  function measure(svg) {
    if (typeof document === "undefined" || !svg) return null;
    let host = null;
    try {
      host = document.createElement("div");
      host.setAttribute(
        "style",
        "position:absolute;left:-9999px;top:0;width:0;height:0;overflow:hidden;visibility:hidden;pointer-events:none"
      );
      host.innerHTML = svg;
      const svgEl = host.firstElementChild;
      if (!svgEl || typeof svgEl.getBBox !== "function") return null;
      document.body.appendChild(host);
      const box = svgEl.getBBox();
      if (!box || !box.width && !box.height) return null;
      const pad = maxStrokeWidth(svg) / 2 + 0.5;
      return {
        x: box.x - pad,
        y: box.y - pad,
        width: box.width + pad * 2,
        height: box.height + pad * 2
      };
    } catch {
      return null;
    } finally {
      if (host?.parentNode) host.parentNode.removeChild(host);
    }
  }
  function getIconBounds(svg) {
    const cached = boundsCache.get(svg);
    if (cached !== void 0) return cached;
    const result = measure(svg);
    boundsCache.set(svg, result);
    return result;
  }
  function getIconAspect(svg) {
    const b = getIconBounds(svg);
    if (!b || b.height <= 0) return null;
    return b.width / b.height;
  }
  function round2(v) {
    return Math.round(v * 100) / 100;
  }
  function buildTightSvg(svg) {
    const bounds = getIconBounds(svg);
    if (!bounds) return svg;
    const x = round2(bounds.x);
    const y = round2(bounds.y);
    const w = round2(bounds.width);
    const h = round2(bounds.height);
    if (!(w > 0) || !(h > 0)) return svg;
    const openTagMatch = svg.match(/<svg\b[^>]*>/i);
    if (!openTagMatch) return svg;
    const long = Math.max(w, h);
    const rasterW = Math.round(w / long * RASTER_LONG_SIDE);
    const rasterH = Math.round(h / long * RASTER_LONG_SIDE);
    const openTag = openTagMatch[0].replace(/\s+viewBox="[^"]*"/i, "").replace(/\s+width="[^"]*"/i, "").replace(/\s+height="[^"]*"/i, "").replace(/^<svg/i, `<svg viewBox="${x} ${y} ${w} ${h}" width="${rasterW}" height="${rasterH}"`);
    return svg.replace(openTagMatch[0], openTag);
  }
  function tightenIconSvg(svg) {
    const cached = tightenCache.get(svg);
    if (cached !== void 0) return cached;
    const result = buildTightSvg(svg);
    tightenCache.set(svg, result);
    return result;
  }

  // src/core/canvas/elementLayout.ts
  var PAD = 4;
  var MIN_CONTENT_HEIGHT = 24;
  var NAME_RATIO = 0.18;
  var VALUE_RATIO = 0.2;
  var INFO_MIN_HEIGHT = 12;
  var INFO_MAX_HEIGHT = 20;
  function clamp(v, min, max) {
    return Math.min(Math.max(v, min), max);
  }
  function computeElementLayout(input) {
    const W = Math.max(input.width, 1);
    const H = Math.max(input.height, 1);
    let nameHeight = input.wantName ? clamp(H * NAME_RATIO, INFO_MIN_HEIGHT, INFO_MAX_HEIGHT) : 0;
    let valueHeight = input.wantValue && !input.isDisplay ? clamp(H * VALUE_RATIO, INFO_MIN_HEIGHT, INFO_MAX_HEIGHT) : 0;
    const availableHeight = () => H - PAD * 2 - nameHeight - valueHeight;
    if (availableHeight() < MIN_CONTENT_HEIGHT) valueHeight = 0;
    if (availableHeight() < MIN_CONTENT_HEIGHT) nameHeight = 0;
    const nameFontSize = nameHeight > 0 ? clamp(nameHeight - 5, 9, 12) : 0;
    const valueFontSize = valueHeight > 0 ? clamp(valueHeight - 6, 9, 12) : 0;
    const displayFontSize = clamp(H * 0.24, 12, 26);
    return {
      pad: PAD,
      nameHeight,
      valueHeight,
      showName: nameHeight > 0,
      showValue: input.isDisplay ? input.wantValue : valueHeight > 0,
      contentX: PAD,
      contentY: PAD + valueHeight,
      contentWidth: Math.max(W - PAD * 2, 1),
      contentHeight: Math.max(H - PAD * 2 - valueHeight - nameHeight, 1),
      nameFontSize,
      nameY: H - nameHeight + (nameHeight - nameFontSize) / 2,
      valueFontSize,
      valueY: PAD + (valueHeight - valueFontSize) / 2,
      displayFontSize,
      displayY: (H - nameHeight) / 2 - displayFontSize / 2
    };
  }

  // src/industrial/coal/index.ts
  var ShearerDefinition = {
    type: "shearer",
    name: "\u91C7\u7164\u673A",
    group: "coal",
    icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
      <line x1="6" y1="80" x2="94" y2="80" />
      <rect x="38" y="46" width="24" height="26" />
      <circle cx="20" cy="60" r="13" />
      <circle cx="80" cy="60" r="13" />
      <line x1="33" y1="55" x2="38" y2="55" />
      <line x1="62" y1="55" x2="67" y2="55" />
      <line x1="11" y1="50" x2="7" y2="46" />
      <line x1="29" y1="50" x2="33" y2="46" />
      <line x1="11" y1="70" x2="7" y2="74" />
      <line x1="29" y1="70" x2="33" y2="74" />
      <line x1="71" y1="50" x2="67" y2="46" />
      <line x1="89" y1="50" x2="93" y2="46" />
      <line x1="71" y1="70" x2="67" y2="74" />
      <line x1="89" y1="70" x2="93" y2="74" />
    </g>
  </svg>`,
    defaultWidth: 110,
    defaultHeight: 60,
    defaultConfig: {
      haulSpeed: 0,
      load: 0
    },
    statusRules: [
      {
        id: "overload",
        name: "\u622A\u5272\u8FC7\u8F7D",
        color: "#ffa502",
        severity: "critical",
        condition: { type: "compare", variable: "load", operator: ">", value: 90 },
        priority: 1
      },
      {
        id: "cutting",
        name: "\u5272\u7164\u4E2D",
        color: "#00d4aa",
        condition: { type: "compare", variable: "speed", operator: ">", value: 0.1 },
        priority: 2
      },
      {
        id: "stopped",
        name: "\u505C\u673A",
        color: "#666666",
        condition: { type: "compare", variable: "speed", operator: "=", value: 0 },
        priority: 3
      }
    ],
    dataBindings: [
      { property: "haulSpeed", variable: "speed" },
      { property: "load", variable: "load" }
    ],
    properties: [
      { key: "name", label: "\u540D\u79F0", type: "string", default: "\u91C7\u7164\u673A", group: "\u57FA\u672C" },
      { key: "haulSpeed", label: "\u7275\u5F15\u901F\u5EA6(m/min)", type: "number", default: 0, min: 0, max: 15, group: "\u8FD0\u884C\u53C2\u6570" }
    ]
  };
  var RoadheaderDefinition = {
    type: "roadheader",
    name: "\u6398\u8FDB\u673A",
    group: "coal",
    icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
      <rect x="40" y="64" width="46" height="16" rx="8" />
      <circle cx="53" cy="72" r="4" />
      <circle cx="74" cy="72" r="4" />
      <rect x="44" y="42" width="34" height="22" />
      <line x1="44" y1="52" x2="23" y2="38" />
      <circle cx="16" cy="33" r="11" />
      <line x1="9" y1="25" x2="5" y2="21" />
      <line x1="23" y1="24" x2="27" y2="20" />
      <line x1="6" y1="33" x2="1" y2="33" />
      <line x1="24" y1="41" x2="28" y2="44" />
    </g>
  </svg>`,
    defaultWidth: 100,
    defaultHeight: 60,
    defaultConfig: {
      cutting: 0,
      load: 0
    },
    statusRules: [
      {
        id: "overload",
        name: "\u622A\u5272\u8FC7\u8F7D",
        color: "#ffa502",
        severity: "critical",
        condition: {
          type: "and",
          conditions: [
            { type: "compare", variable: "cutting", operator: "=", value: 1 },
            { type: "compare", variable: "load", operator: ">", value: 90 }
          ]
        },
        priority: 1
      },
      {
        id: "driving",
        name: "\u6398\u8FDB\u4E2D",
        color: "#00d4aa",
        condition: { type: "compare", variable: "cutting", operator: "=", value: 1 },
        priority: 2
      },
      {
        id: "stopped",
        name: "\u505C\u673A",
        color: "#666666",
        condition: { type: "compare", variable: "cutting", operator: "=", value: 0 },
        priority: 3
      }
    ],
    dataBindings: [
      { property: "cutting", variable: "cutting" },
      { property: "load", variable: "load" }
    ],
    properties: [
      { key: "name", label: "\u540D\u79F0", type: "string", default: "\u6398\u8FDB\u673A", group: "\u57FA\u672C" },
      { key: "load", label: "\u622A\u5272\u8F7D\u8377(%)", type: "number", default: 0, min: 0, max: 120, group: "\u8FD0\u884C\u53C2\u6570" }
    ]
  };
  var ConveyorDefinition = {
    type: "conveyor",
    name: "\u76AE\u5E26\u8F93\u9001\u673A",
    group: "coal",
    icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="18" cy="62" r="9" />
      <circle cx="82" cy="62" r="9" />
      <line x1="18" y1="53" x2="82" y2="53" />
      <line x1="18" y1="71" x2="82" y2="71" />
      <line x1="30" y1="71" x2="30" y2="90" />
      <line x1="70" y1="71" x2="70" y2="90" />
      <polygon points="38,53 62,53 55,38 45,38" />
      <line x1="26" y1="46" x2="34" y2="46" />
      <line x1="66" y1="46" x2="74" y2="46" />
    </g>
  </svg>`,
    defaultWidth: 110,
    defaultHeight: 50,
    defaultConfig: {
      beltSpeed: 0,
      length: 100
    },
    statusRules: [
      {
        id: "overload",
        name: "\u8D85\u8F7D",
        color: "#ffa502",
        severity: "critical",
        condition: { type: "compare", variable: "load", operator: ">", value: 90 },
        priority: 1
      },
      {
        id: "running",
        name: "\u8FD0\u884C",
        color: "#00d4aa",
        condition: { type: "compare", variable: "speed", operator: ">", value: 0.1 },
        priority: 2
      },
      {
        id: "stopped",
        name: "\u505C\u6B62",
        color: "#666666",
        condition: { type: "compare", variable: "speed", operator: "=", value: 0 },
        priority: 3
      }
    ],
    dataBindings: [
      { property: "beltSpeed", variable: "speed" },
      { property: "load", variable: "load" }
    ],
    properties: [
      { key: "name", label: "\u540D\u79F0", type: "string", default: "\u76AE\u5E26\u8F93\u9001\u673A", group: "\u57FA\u672C" },
      { key: "beltSpeed", label: "\u5E26\u901F(m/s)", type: "number", default: 0, min: 0, max: 4, group: "\u8FD0\u884C\u53C2\u6570" }
    ]
  };

  // src/industrial/power/index.ts
  var TurbineDefinition = {
    type: "turbine",
    name: "\u6C7D\u8F6E\u673A",
    group: "power",
    icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="20,35 80,35 70,65 30,65" />
      <line x1="30" y1="35" x2="30" y2="65" />
      <line x1="40" y1="35" x2="40" y2="65" />
      <line x1="50" y1="35" x2="50" y2="65" />
      <line x1="60" y1="35" x2="60" y2="65" />
      <line x1="8" y1="50" x2="20" y2="50" />
      <line x1="80" y1="50" x2="92" y2="50" />
    </g>
  </svg>`,
    defaultWidth: 110,
    defaultHeight: 55,
    defaultConfig: {
      speed: 0,
      inletTemp: 25
    },
    statusRules: [
      {
        id: "overspeed",
        name: "\u8D85\u901F",
        color: "#ff4757",
        severity: "critical",
        condition: { type: "compare", variable: "speed", operator: ">", value: 3200 },
        priority: 1
      },
      {
        id: "running",
        name: "\u8FD0\u884C",
        color: "#00d4aa",
        condition: { type: "compare", variable: "speed", operator: ">", value: 0 },
        priority: 2
      },
      {
        id: "stopped",
        name: "\u505C\u673A",
        color: "#666666",
        condition: { type: "compare", variable: "speed", operator: "=", value: 0 },
        priority: 3
      }
    ],
    dataBindings: [
      { property: "speed", variable: "speed" },
      { property: "inletTemp", variable: "temp" }
    ],
    properties: [
      { key: "name", label: "\u540D\u79F0", type: "string", default: "\u6C7D\u8F6E\u673A", group: "\u57FA\u672C" },
      { key: "speed", label: "\u8F6C\u901F(rpm)", type: "number", default: 0, min: 0, max: 3600, group: "\u8FD0\u884C\u53C2\u6570" }
    ]
  };
  var BoilerDefinition = {
    type: "boiler",
    name: "\u9505\u7089",
    group: "power",
    icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
      <path d="M30,25 Q30,14 41,14 L59,14 Q70,14 70,25 L70,74 L30,74 Z" />
      <line x1="30" y1="56" x2="70" y2="56" stroke-dasharray="5,3" opacity="0.6" />
      <line x1="36" y1="14" x2="36" y2="5" />
      <line x1="50" y1="14" x2="50" y2="5" />
      <path d="M40,92 Q50,76 60,92" />
      <path d="M45,92 Q50,84 55,92" />
    </g>
  </svg>`,
    defaultWidth: 70,
    defaultHeight: 95,
    defaultConfig: {
      pressure: 0,
      drumLevel: 50
    },
    statusRules: [
      {
        id: "over-pressure",
        name: "\u8D85\u538B",
        color: "#ff4757",
        severity: "critical",
        condition: { type: "compare", variable: "pressure", operator: ">", value: 12 },
        priority: 1
      },
      {
        id: "normal",
        name: "\u8FD0\u884C",
        color: "#00d4aa",
        condition: { type: "range", variable: "pressure", min: 5, max: 12 },
        priority: 2
      },
      {
        id: "stopped",
        name: "\u505C\u7089",
        color: "#666666",
        condition: { type: "compare", variable: "pressure", operator: "<", value: 1 },
        priority: 3
      }
    ],
    dataBindings: [
      { property: "pressure", variable: "pressure" },
      { property: "drumLevel", variable: "level" }
    ],
    properties: [
      { key: "name", label: "\u540D\u79F0", type: "string", default: "\u9505\u7089", group: "\u57FA\u672C" },
      { key: "pressure", label: "\u6C7D\u5305\u538B\u529B(MPa)", type: "number", default: 0, min: 0, max: 20, group: "\u8FD0\u884C\u53C2\u6570" }
    ]
  };

  // src/industrial/basic/index.ts
  var ValveDefinition = {
    type: "valve",
    name: "\u9600\u95E8",
    group: "basic",
    icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 22 L50 50 L18 78 Z" fill="currentColor" fill-opacity="0.12"/>
      <path d="M82 22 L50 50 L82 78 Z" fill="currentColor" fill-opacity="0.12"/>
      <path d="M50 50 V18"/>
      <circle cx="50" cy="13" r="7.5"/>
      <path d="M42.5 13 H57.5"/>
      <circle cx="50" cy="50" r="3.2" fill="currentColor" stroke="none" opacity="0.85"/>
    </g>
  </svg>`,
    defaultWidth: 60,
    defaultHeight: 90,
    defaultConfig: {
      valveType: "gate",
      openDegree: 0
    },
    statusRules: [
      {
        id: "open",
        name: "\u5F00\u542F",
        color: "#00d4aa",
        condition: { type: "compare", variable: "openDegree", operator: ">", value: 0 },
        priority: 1
      },
      {
        id: "closed",
        name: "\u5173\u95ED",
        color: "#ff4757",
        severity: "normal",
        condition: { type: "compare", variable: "openDegree", operator: "=", value: 0 },
        priority: 2
      }
    ],
    dataBindings: [
      { property: "openDegree", variable: "openDegree" }
    ],
    properties: [
      {
        key: "name",
        label: "\u540D\u79F0",
        type: "string",
        default: "\u9600\u95E8",
        group: "\u57FA\u672C"
      },
      {
        key: "valveType",
        label: "\u9600\u95E8\u7C7B\u578B",
        type: "select",
        default: "gate",
        options: [
          { label: "\u95F8\u9600", value: "gate" },
          { label: "\u7403\u9600", value: "ball" },
          { label: "\u8776\u9600", value: "butterfly" }
        ],
        group: "\u57FA\u672C"
      },
      {
        key: "openDegree",
        label: "\u5F00\u5EA6",
        type: "range",
        default: 0,
        min: 0,
        max: 100,
        step: 1,
        group: "\u8FD0\u884C\u53C2\u6570"
      }
    ]
  };
  var PumpDefinition = {
    type: "pump",
    name: "\u6CF5",
    group: "basic",
    icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="52" cy="52" r="28" fill="currentColor" fill-opacity="0.1"/>
      <path d="M52 52 C42 42 38 36 48 32 C58 30 64 38 52 52 Z" fill="currentColor" fill-opacity="0.35" stroke="currentColor" stroke-width="2"/>
      <path d="M52 52 C62 42 66 36 56 32" stroke="currentColor" stroke-width="2" opacity="0.55"/>
      <path d="M18 52 H42"/>
      <path d="M36 47 L42 52 L36 57"/>
      <path d="M52 22 V40"/>
      <path d="M47 27 L52 21 L57 27"/>
      <circle cx="52" cy="52" r="3" fill="currentColor" stroke="none"/>
    </g>
  </svg>`,
    defaultWidth: 80,
    defaultHeight: 80,
    defaultConfig: {
      speed: 0,
      flow: 0
    },
    statusRules: [
      {
        id: "running",
        name: "\u8FD0\u884C",
        color: "#00d4aa",
        condition: { type: "compare", variable: "speed", operator: ">", value: 0 },
        priority: 1
      },
      {
        id: "stopped",
        name: "\u505C\u6B62",
        color: "#ff4757",
        severity: "normal",
        condition: { type: "compare", variable: "speed", operator: "=", value: 0 },
        priority: 2
      }
    ],
    dataBindings: [
      { property: "speed", variable: "speed" }
    ],
    properties: [
      {
        key: "name",
        label: "\u540D\u79F0",
        type: "string",
        default: "\u6CF5",
        group: "\u57FA\u672C"
      },
      {
        key: "speed",
        label: "\u8F6C\u901F",
        type: "number",
        default: 0,
        min: 0,
        max: 3e3,
        group: "\u8FD0\u884C\u53C2\u6570"
      }
    ]
  };
  var TankDefinition = {
    type: "tank",
    name: "\u50A8\u7F50",
    group: "basic",
    icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="50" cy="24" rx="28" ry="9" fill="currentColor" fill-opacity="0.08"/>
      <path d="M22 24 V72"/>
      <path d="M78 24 V72"/>
      <ellipse cx="50" cy="72" rx="28" ry="9" fill="currentColor" fill-opacity="0.12"/>
      <path d="M24 58 H76" stroke-dasharray="4 3" opacity="0.45"/>
      <path d="M50 81 V92"/>
      <rect x="44" y="92" width="12" height="5" rx="1.5" fill="currentColor" fill-opacity="0.2"/>
    </g>
  </svg>`,
    defaultWidth: 80,
    defaultHeight: 100,
    defaultConfig: {
      level: 0,
      temp: 25
    },
    statusRules: [
      {
        id: "high",
        name: "\u9AD8\u6DB2\u4F4D",
        color: "#ffa502",
        severity: "warning",
        condition: { type: "compare", variable: "level", operator: ">", value: 80 },
        priority: 1
      },
      {
        id: "normal",
        name: "\u6B63\u5E38",
        color: "#00d4aa",
        condition: { type: "range", variable: "level", min: 20, max: 80 },
        priority: 2
      },
      {
        id: "low",
        name: "\u4F4E\u6DB2\u4F4D",
        color: "#ff4757",
        severity: "critical",
        condition: { type: "compare", variable: "level", operator: "<", value: 20 },
        priority: 3
      }
    ],
    dataBindings: [
      { property: "level", variable: "level" }
    ],
    properties: [
      {
        key: "name",
        label: "\u540D\u79F0",
        type: "string",
        default: "\u50A8\u7F50",
        group: "\u57FA\u672C"
      },
      {
        key: "level",
        label: "\u6DB2\u4F4D",
        type: "range",
        default: 0,
        min: 0,
        max: 100,
        step: 1,
        group: "\u8FD0\u884C\u53C2\u6570"
      }
    ]
  };
  var DisplayDefinition = {
    type: "display",
    name: "\u6570\u503C\u663E\u793A",
    group: "basic",
    icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="3">
      <rect x="10" y="30" width="80" height="40" rx="4" />
      <text x="50" y="58" text-anchor="middle" font-size="24" font-family="monospace" fill="currentColor" stroke="none">8.8</text>
    </g>
  </svg>`,
    defaultWidth: 120,
    defaultHeight: 50,
    defaultConfig: {
      decimals: 1,
      unit: "",
      factor: 1,
      offset: 0
    },
    // 只读数值显示：绑定目标由使用者按需指定，无预置绑定
    statusRules: [],
    dataBindings: [],
    properties: [
      {
        key: "name",
        label: "\u540D\u79F0",
        type: "string",
        default: "\u6570\u503C\u663E\u793A",
        group: "\u57FA\u672C"
      },
      {
        key: "unit",
        label: "\u5355\u4F4D",
        type: "string",
        default: "",
        group: "\u663E\u793A"
      },
      {
        key: "decimals",
        label: "\u5C0F\u6570\u4F4D\u6570",
        type: "number",
        default: 1,
        min: 0,
        max: 3,
        group: "\u663E\u793A"
      },
      {
        key: "factor",
        label: "\u500D\u7387(\xD7)",
        type: "number",
        default: 1,
        step: 1e-3,
        group: "\u6362\u7B97"
      },
      {
        key: "offset",
        label: "\u504F\u79FB(+)",
        type: "number",
        default: 0,
        step: 0.1,
        group: "\u6362\u7B97"
      }
    ]
  };

  // src/industrial/electrical/index.ts
  var MotorDefinition = {
    type: "motor",
    name: "\u7535\u673A",
    group: "electrical",
    icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
      <rect x="25" y="30" width="50" height="40" rx="5" />
      <line x1="75" y1="50" x2="90" y2="50" />
      <circle cx="90" cy="50" r="5" />
      <rect x="35" y="20" width="20" height="10" />
      <line x1="40" y1="20" x2="40" y2="15" />
      <line x1="50" y1="20" x2="50" y2="15" />
      <line x1="45" y1="20" x2="45" y2="15" />
      <text x="50" y="55" text-anchor="middle" font-size="14" font-weight="bold" fill="currentColor">M</text>
    </g>
  </svg>`,
    defaultWidth: 80,
    defaultHeight: 70,
    defaultConfig: {
      speed: 0,
      temp: 25,
      vibration: 0
    },
    statusRules: [
      {
        id: "running",
        name: "\u8FD0\u884C",
        color: "#00d4aa",
        condition: { type: "compare", variable: "speed", operator: ">", value: 0 },
        priority: 1
      },
      {
        id: "stopped",
        name: "\u505C\u6B62",
        color: "#ff4757",
        severity: "normal",
        condition: { type: "compare", variable: "speed", operator: "=", value: 0 },
        priority: 2
      },
      {
        id: "high-temp",
        name: "\u9AD8\u6E29",
        color: "#ffa502",
        severity: "critical",
        condition: {
          type: "and",
          conditions: [
            { type: "compare", variable: "temp", operator: ">", value: 80 },
            { type: "compare", variable: "speed", operator: ">", value: 0 }
          ]
        },
        priority: 3
      }
    ],
    dataBindings: [
      { property: "speed", variable: "speed" },
      { property: "temp", variable: "temp" }
    ],
    properties: [
      {
        key: "name",
        label: "\u540D\u79F0",
        type: "string",
        default: "\u7535\u673A",
        group: "\u57FA\u672C"
      },
      {
        key: "speed",
        label: "\u8F6C\u901F",
        type: "number",
        default: 0,
        min: 0,
        max: 3e3,
        group: "\u8FD0\u884C\u53C2\u6570"
      },
      {
        key: "temp",
        label: "\u6E29\u5EA6",
        type: "number",
        default: 25,
        min: -20,
        max: 150,
        group: "\u8FD0\u884C\u53C2\u6570"
      }
    ]
  };

  // src/industrial/water/index.ts
  var SedimentTankDefinition = {
    type: "sediment_tank",
    name: "\u6C89\u6DC0\u6C60",
    group: "water",
    icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20,35 L20,60 Q20,80 50,84 Q80,80 80,60 L80,35" />
      <line x1="14" y1="35" x2="86" y2="35" />
      <line x1="22" y1="50" x2="78" y2="50" stroke-dasharray="5,3" opacity="0.6" />
      <line x1="50" y1="35" x2="50" y2="68" />
      <line x1="34" y1="68" x2="66" y2="68" />
    </g>
  </svg>`,
    defaultWidth: 85,
    defaultHeight: 80,
    defaultConfig: {
      level: 0,
      turbidity: 0
    },
    statusRules: [
      {
        id: "high-level",
        name: "\u9AD8\u6DB2\u4F4D",
        color: "#ffa502",
        severity: "warning",
        condition: { type: "compare", variable: "level", operator: ">", value: 85 },
        priority: 1
      },
      {
        id: "normal",
        name: "\u6B63\u5E38",
        color: "#00d4aa",
        condition: { type: "range", variable: "level", min: 40, max: 85 },
        priority: 2
      },
      {
        id: "low-level",
        name: "\u4F4E\u6DB2\u4F4D",
        color: "#ff4757",
        severity: "critical",
        condition: { type: "compare", variable: "level", operator: "<", value: 40 },
        priority: 3
      }
    ],
    dataBindings: [
      { property: "level", variable: "level" },
      { property: "turbidity", variable: "turbidity" }
    ],
    properties: [
      { key: "name", label: "\u540D\u79F0", type: "string", default: "\u6C89\u6DC0\u6C60", group: "\u57FA\u672C" },
      { key: "turbidity", label: "\u6D4A\u5EA6(NTU)", type: "number", default: 0, min: 0, max: 100, group: "\u8FD0\u884C\u53C2\u6570" }
    ]
  };
  return __toCommonJS(entry_exports);
})();
