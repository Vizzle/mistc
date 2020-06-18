
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
  ["class", 300, KeyType.Action],
  ["identifier", 301, KeyType.Action],
  ["tag", 302, KeyType.Action],
  ["id", 303, KeyType.Action],

  ["on-tap", 400, KeyType.Action],
  ["on-tap-once", 401, KeyType.Action],
  ["on-display", 402, KeyType.Action],
  ["on-display-once", 403, KeyType.Action],
  ["on-create", 404, KeyType.Action],
  ["on-create-once", 405, KeyType.Action],
  ["on-long-press", 406, KeyType.Action],
  ["on-long-press-once", 407, KeyType.Action],
]

/**
 * 只能新增 key，不能修改或删除
 */
const KEYS: [string, number, KeyType][] = [
  ["clip", 0, KeyType.Bool],
  ["alpha", 1, KeyType.Number],
  ["user-interaction-enabled", 2, KeyType.Bool],
  ["highlight-background-color", 3, KeyType.Color],
  ["corner-radius", 4, KeyType.Length],
  ["corner-radius-top-left", 5, KeyType.Length],
  ["corner-radius-top-right", 6, KeyType.Length],
  ["corner-radius-bottom-left", 7, KeyType.Length],
  ["corner-radius-bottom-right", 8, KeyType.Length],
  ["fixed", 9, KeyType.Bool],
  ["is-accessibility-element", 10, KeyType.Bool],
  ["accessibility-label", 11, KeyType.String],
  ["background-color", 13, KeyType.Color],
  ["border-width", 14, KeyType.Length],
  ["border-color", 15, KeyType.Color],
  ["width", 16, KeyType.Length],
  ["height", 17, KeyType.Length],
  ["max-width", 18, KeyType.Length],
  ["max-height", 19, KeyType.Length],
  ["min-width", 20, KeyType.Length],
  ["min-height", 21, KeyType.Length],
  ["margin", 22, KeyType.Length],
  ["padding", 23, KeyType.Length],
  ["margin-left", 24, KeyType.Length],
  ["margin-right", 25, KeyType.Length],
  ["margin-top", 26, KeyType.Length],
  ["margin-bottom", 27, KeyType.Length],
  ["padding-left", 28, KeyType.Length],
  ["padding-right", 29, KeyType.Length],
  ["padding-top", 30, KeyType.Length],
  ["padding-bottom", 31, KeyType.Length],
  ["flex-basis", 32, KeyType.Length],
  ["flex-grow", 33, KeyType.Number],
  ["flex-shrink", 34, KeyType.Number],
  ["align-self", 35, KeyType.Enum],
  ["direction", 36, KeyType.Enum],
  ["justify-content", 37, KeyType.Enum],
  ["align-items", 38, KeyType.Enum],
  ["align-content", 39, KeyType.Enum],
  ["spacing", 40, KeyType.Length],
  ["line-spacing", 41, KeyType.Length],
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
  ["default", 561],
  ["ascii-capable", 562],
  ["number-punctuation", 563],
  ["url", 564],
  ["number", 565],
  ["phone", 566],
  ["name-phone", 567],
  ["email", 568],
  ["decimal", 569],
  ["twitter", 570],
  ["web", 571],
  ["dark", 572],
  ["go", 573],
  ["google", 574],
  ["join", 575],
  ["next", 576],
  ["route", 577],
  ["search", 578],
  ["send", 579],
  ["yahoo", 580],
  ["done", 581],
  ["emergency-call", 582],
  ["never", 583],
  ["while-editing", 584],
  ["unless-editing", 585],
  ["always", 586],
  ["standard", 587],
  ["satellite", 588],
  ["hybrid", 589],
]

/* iOS 枚举定义代码。取消注释以下代码后执行本文件即可输出 */
/*
;(function () {
  const convertKey = (k: string) => k.replace(/-/g, '_')

  const code = `\
typedef NS_ENUM(NSUInteger, MSBNodeKey) {
${[...KEYS, ...OUTER_KEYS].map(k => `    MSBNodeKey_${convertKey(k[0])} = ${k[1]},`).join('\n')}
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
${[...KEYS, ...OUTER_KEYS].map(k => `public static final int NODE_ATTR_${convertKey(k[0])} = ${k[1]};`).join('\n')}

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
