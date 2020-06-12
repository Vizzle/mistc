import { Length, Unit } from "./compiler";

export function parseLength(value: string | number): Length {
  if (typeof value === 'number') {
    return { unit: Unit.none, value }
  }
  else {
    const num = value.match(/[\d.]+/)?.[0]
    if (num) {
      const suffix = value.substr(num.length)
      let unit = Unit.none
      switch (suffix) {
        case '%': unit = Unit.percent; break
        case 'px': unit = Unit.px; break
        case 'rpx': unit = Unit.rpx; break
        case 'vw': unit = Unit.vw; break
        case 'vh': unit = Unit.vh; break
        case 'vmin': unit = Unit.vmin; break
        case 'vmax': unit = Unit.vmax; break
        case 'cm': unit = Unit.cm; break
        case 'mm': unit = Unit.mm; break
        case 'q': unit = Unit.q; break
        case 'in': unit = Unit.in; break
        case 'pc': unit = Unit.pc; break
        case 'pt': unit = Unit.pt; break
      }
      return { unit, value: parseFloat(num) }
    }
    return { unit: Unit.none, value: 0 }
  }
}

export function parseColor(value: string) {
  if (value in COLOR_NAMES) {
    return COLOR_NAMES[value]
  }
  else if (value[0] === '#') {
    let a = 255, r = 0, g = 0, b = 0
    switch (value.length) {
      case 4: {
        r = parseInt(value.substr(1, 1), 16) * 17
        g = parseInt(value.substr(2, 1), 16) * 17
        b = parseInt(value.substr(3, 1), 16) * 17
        break
      }
      case 5: {
        a = parseInt(value.substr(1, 1), 16) * 17
        r = parseInt(value.substr(2, 1), 16) * 17
        g = parseInt(value.substr(3, 1), 16) * 17
        b = parseInt(value.substr(4, 1), 16) * 17
        break
      }
      case 7: {
        r = parseInt(value.substr(1, 2), 16)
        g = parseInt(value.substr(3, 2), 16)
        b = parseInt(value.substr(5, 2), 16)
        break
      }
      case 9: {
        a = parseInt(value.substr(1, 2), 16)
        r = parseInt(value.substr(3, 2), 16)
        g = parseInt(value.substr(5, 2), 16)
        b = parseInt(value.substr(7, 2), 16)
        break
      }
      default: {
        throw new Error(`'${value}' 颜色格式不正确`)
      }
    }

    return (a << 24) | (r << 16) | (g << 8) | b
  }
  throw new Error(`'${value}' 颜色格式不正确`)
}

const COLOR_NAMES: Record<string, number> = {
  black: 0xff000000,
  darkgray: 0xffa9a9a9,
  lightgray: 0xffd3d3d3,
  white: 0xffffffff,
  gray: 0xff808080,
  red: 0xffff0000,
  green: 0xff008000,
  blue: 0xff0000ff,
  cyan: 0xff00ffff,
  yellow: 0xffffff00,
  magenta: 0xffff00ff,
  orange: 0xffffa500,
  purple: 0xff800080,
  brown: 0xffa52a2a,
  clear: 0x00000000,
  transparent: 0x00000000,
}
