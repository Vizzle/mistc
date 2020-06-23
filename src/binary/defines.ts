
type Version = number

export enum KeyType {
  Any,
  Bool,
  Number,
  String,
  Enum,
  Length,
  Color,
  Action,
}

/**
 * 只能新增 key，不能修改或删除
 */
const OUTER_KEYS: [string, number, KeyType][] = [
  ["class", 0, KeyType.String],
  ["identifier", 1, KeyType.String],
  ["tag", 2, KeyType.Number],
  ["id", 3, KeyType.String],

  ["on-tap", 4, KeyType.Action],
  ["on-tap-once", 5, KeyType.Action],
  ["on-display", 6, KeyType.Action],
  ["on-display-once", 7, KeyType.Action],
  ["on-create", 8, KeyType.Action],
  ["on-create-once", 9, KeyType.Action],
  ["on-long-press", 10, KeyType.Action],
  ["on-long-press-once", 11, KeyType.Action],
]

/**
 * 只能新增 key，不能修改或删除
 */
const KEYS: [string, number, KeyType][] = [
  ["clip", 12, KeyType.Bool],
  ["alpha", 13, KeyType.Number],
  ["user-interaction-enabled", 14, KeyType.Bool],
  ["highlight-background-color", 15, KeyType.Color],
  ["corner-radius", 16, KeyType.Length],
  ["corner-radius-top-left", 17, KeyType.Length],
  ["corner-radius-top-right", 18, KeyType.Length],
  ["corner-radius-bottom-left", 19, KeyType.Length],
  ["corner-radius-bottom-right", 20, KeyType.Length],
  ["fixed", 21, KeyType.Bool],
  ["is-accessibility-element", 22, KeyType.Bool],
  ["accessibility-label", 23, KeyType.String],
  ["background-color", 24, KeyType.Color],
  ["border-width", 25, KeyType.Length],
  ["border-color", 26, KeyType.Color],
  ["width", 27, KeyType.Length],
  ["height", 28, KeyType.Length],
  ["max-width", 29, KeyType.Length],
  ["max-height", 30, KeyType.Length],
  ["min-width", 31, KeyType.Length],
  ["min-height", 32, KeyType.Length],
  ["margin", 33, KeyType.Length],
  ["padding", 34, KeyType.Length],
  ["margin-left", 35, KeyType.Length],
  ["margin-right", 36, KeyType.Length],
  ["margin-top", 37, KeyType.Length],
  ["margin-bottom", 38, KeyType.Length],
  ["padding-left", 39, KeyType.Length],
  ["padding-right", 40, KeyType.Length],
  ["padding-top", 41, KeyType.Length],
  ["padding-bottom", 42, KeyType.Length],
  ["flex-basis", 43, KeyType.Length],
  ["flex-grow", 44, KeyType.Number],
  ["flex-shrink", 45, KeyType.Number],
  ["align-self", 46, KeyType.Enum],
  ["direction", 47, KeyType.Enum],
  ["justify-content", 48, KeyType.Enum],
  ["align-items", 49, KeyType.Enum],
  ["align-content", 50, KeyType.Enum],
  ["spacing", 51, KeyType.Length],
  ["line-spacing", 52, KeyType.Length],
  ["lines", 53, KeyType.Number],
]

/**
 * 只能新增 key，不能修改或删除
 */
const ENUMS: [string, number][] = [
  ["auto", 500],
  ["start", 501],
  ["center", 502],
  ["end", 503],
  ["stretch", 504],
  ["space-between", 505],
  ["space-around", 506],
  ["baseline", 507],
  ["nowrap", 508],
  ["wrap", 509],
  ["wrap-reverse", 510],
  ["horizontal", 511],
  ["vertical", 512],
  ["horizontal-reverse", 513],
  ["vertical-reverse", 514],
  ["none", 515],
  ["both", 516],
  ["scale-to-fill", 517],
  ["scale-aspect-fit", 518],
  ["scale-aspect-fill", 519],
  ["top", 520],
  ["bottom", 521],
  ["left", 522],
  ["right", 523],
  ["top-left", 524],
  ["top-right", 525],
  ["bottom-left", 526],
  ["bottom-right", 527],
  ["justify", 528],
  ["natural", 529],
  ["word", 530],
  ["char", 531],
  ["clip", 532],
  ["truncating-head", 533],
  ["truncating-middle", 534],
  ["truncating-tail", 535],
  ["normal", 536],
  ["highlighted", 537],
  ["disabled", 538],
  ["selected", 539],
  ["ultra-light", 540],
  ["thin", 541],
  ["light", 542],
  ["medium", 543],
  ["bold", 544],
  ["heavy", 545],
  ["black", 546],
  ["italic", 547],
  ["bold-italic", 548],
  ["underline", 549],
  ["line-through", 550],
  ["to-right", 551],
  ["to-left", 552],
  ["to-top", 553],
  ["to-bottom", 554],
  ["to-top-left", 555],
  ["to-bottom-left", 556],
  ["to-top-right", 557],
  ["to-bottom-right", 558],
  ["default", 559],
  ["ascii-capable", 560],
  ["number-punctuation", 561],
  ["url", 562],
  ["number", 563],
  ["phone", 564],
  ["name-phone", 565],
  ["email", 566],
  ["decimal", 567],
  ["twitter", 568],
  ["web", 569],
  ["dark", 570],
  ["go", 571],
  ["google", 572],
  ["join", 573],
  ["next", 574],
  ["route", 575],
  ["search", 576],
  ["send", 577],
  ["yahoo", 578],
  ["done", 579],
  ["emergency-call", 580],
  ["never", 581],
  ["while-editing", 582],
  ["unless-editing", 583],
  ["always", 584],
  ["standard", 585],
  ["satellite", 586],
  ["hybrid", 587],
]

/* iOS 枚举定义代码。取消注释以下代码后执行本文件即可输出 */
/*
;(function () {
  const convertKey = (k: string) => k.replace(/-/g, '_')

  const code = `\
typedef NS_ENUM(NSUInteger, MSBNodeKey) {
${[...OUTER_KEYS, ...KEYS].map(k => `    MSBNodeKey_${convertKey(k[0])} = ${k[1]},`).join('\n')}
};

typedef NS_ENUM(NSUInteger, MSBNodeEnum) {
${ENUMS.map(k => `    MSBNodeEnum_${convertKey(k[0])} = ${k[1]},`).join('\n')}
};
`
  console.log(code)
})()
*/

/* Android 枚举定义代码。取消注释以下代码后执行本文件即可输出 */
/*
;(function () {
  const convertKey = (k: string) => k.replace(/-/g, '_')

  const code = `\
${[...OUTER_KEYS, ...KEYS].map(k => `public static final int NODE_ATTR_${convertKey(k[0])} = ${k[1]};`).join('\n')}

${ENUMS.map(k => `public static final int NODE_ENUM_${convertKey(k[0])} = ${k[1]};`).join('\n')}
`
  console.log(code)
})()
*/

function check() {
  const allKeys = [...OUTER_KEYS, ...KEYS]
  allKeys.forEach((a, i) => allKeys.forEach((b, j) => {
    if (i !== j) {
      if (a[0] === b[0]) {
        throw new Error(`Key 定义名称重复 ${a[0]}`)
      }
      else if (a[1] === b[1]) {
        throw new Error(`Key 定义索引重复 ${a[1]}`)
      }
    }
  }))

  ENUMS.forEach((a, i) => ENUMS.forEach((b, j) => {
    if (i !== j) {
      if (a[0] === b[0]) {
        throw new Error(`Enum 定义名称重复 ${a[0]}`)
      }
      else if (a[1] === b[1]) {
        throw new Error(`Enum 定义索引重复 ${a[1]}`)
      }
    }
  }))
}

check()

export class BinaryEnv {
  private static supportedElements: {
    type: string
    version: Version
  }[] = [
    { type: 'text', version: 0 }
  ]
  private static keyMap = KEYS.reduce((p, c) => (p[c[0]] = c, p), {} as Record<string, typeof KEYS[0]>)
  private static outerKeyMap = OUTER_KEYS.reduce((p, c) => (p[c[0]] = c, p), {} as Record<string, typeof OUTER_KEYS[0]>)
  private static enumMap = ENUMS.reduce((p, c) => (p[c[0]] = c, p), {} as Record<string, typeof ENUMS[0]>)

  private supportedElements: string[]

  public constructor(private version: Version) {
    this.supportedElements = BinaryEnv.supportedElements.filter(x => x.version <= version).map(x => x.type)
  }

  public supportsType(type: string) {
    return this.supportedElements.includes(type)
  }

  public getKeyInfo(key: string) {
    return this.getStyleKeyInfo(key) || this.getOuterKeyInfo(key)
  }

  public getOuterKeyInfo(key: string) {
    const info = BinaryEnv.outerKeyMap[key]
    return info && { type: info[2], index: info[1] }
  }

  public getStyleKeyInfo(key: string) {
    const info = BinaryEnv.keyMap[key]
    return info && { type: info[2], index: info[1] }
  }

  public getEnumIndex(str: string) {
    const info = BinaryEnv.enumMap[str]
    return info && info[1]
  }
}
