import { ExpressionNode, LiteralNode, IdentifierNode, ArrayExpressionNode, ObjectExpressionNode, ConditionalExpressionNode, UnaryExpressionNode, getUnaryOpText, BinaryExpressionNode, getBinaryOpText, SubscriptExpressionNode, FunctionExpressionNode, LambdaExpressionNode, ParenNode, Parser, compareBinaryOperatorPriority, BinaryOp } from "./exp/parser"

/**
 * 转换模板中的表达式，将 ${} 形式转换为 $: 形式
 */
export function convertExpressions(tpl: any) {
  tpl.noRegexExp = true
  convert(tpl)
}

function convert(obj: any) {
  for (const key in obj) {
    const value = obj[key]
    if (typeof value === 'object') {
      convert(value)
    }
    else if (typeof value === 'string' && containsExp(value)) {
      obj[key] = convertExp(value)
    }
  }
}

const expRE = /\$\{.*?\}/

function containsExp(str: string) {
  return expRE.test(str)
}

function convertExp(str: string) {
  let startIndex = str.indexOf('${')
  if (startIndex >= 0) {
    let endIndex = str.indexOf('}', startIndex + 2)
    if (endIndex >= 0) {
      // 纯表达式
      if (startIndex === 0 && endIndex === str.length - 1) {
        const exp = parseExpression(str.slice(2, -1))
        return '$:' + printNode(exp)
      }

      // 混合表达式，类似于 JS 的模板字符串
      const list: (string | ExpressionNode)[] = []
      let lastEndIndex = 0
      do {
        if (startIndex > lastEndIndex) {
          list.push(str.slice(lastEndIndex, startIndex))
        }
        const exp = parseExpression(str.slice(startIndex + 2, endIndex))
        list.push(exp)

        lastEndIndex = endIndex + 1
        startIndex = str.indexOf('${', lastEndIndex)
        if (startIndex >= 0) {
          endIndex = str.indexOf('}', startIndex + 2)
        }

        if (startIndex < 0 || endIndex < 0) {
          break
        }
      } while (true)

      if (lastEndIndex < str.length) {
        list.push(str.slice(lastEndIndex))
      }

      if (list.length < 2) {
        // 应该不会走到这里
        throw new Error('something gose wrong')
      }

      // 如果前两个都是表达式，在前面追加一个空字符串，确保结果为字符串
      if (typeof list[0] !== 'string' && typeof list[1] !== 'string') {
        list.unshift('')
      }

      return '$:' + list.map(item => {
        if (typeof item === 'string') {
          return printNode(new LiteralNode(item))
        }
        else {
          // 优先级低的情况加括号，避免改变运算顺序
          if (item instanceof ConditionalExpressionNode) {
            item = new ParenNode(item)
          }
          else if (item instanceof BinaryExpressionNode) {
            if (compareBinaryOperatorPriority(BinaryOp.Add, item.operator) >= 0) {
              item = new ParenNode(item)
            }
          }
          return printNode(item)
        }
      }).join('+')
    }
  }
}

export function parseExpression(str: string) {
  const result = Parser.parse(str)
  if (result.expression) {
    return result.expression
  }
  throw new Error(`failed to parse expression \`${str}\`. Error: ${result.errorMessage}`)
}

export function printNode(node: ExpressionNode | null | undefined, prettyPrint: boolean = false): string {
  if (!node) return ''

  const space = prettyPrint ? ' ' : ''
  const p = (node: ExpressionNode) => printNode(node, prettyPrint)

  if (node instanceof LiteralNode) {
    if (typeof node.value === 'string') {
      // 字符串使用单引号的形式
      return "'" + JSON.stringify(node.value).slice(1, -1).replace(/\\"/g, '"').replace(/'/g, "\\'") + "'"
    }
    return JSON.stringify(node.value)
  }
  else if (node instanceof IdentifierNode) {
    return node.identifier
  }
  else if (node instanceof ArrayExpressionNode) {
    return `[${node.list.map(n => p(n)).join(`,${space}`)}]`
  }
  else if (node instanceof ObjectExpressionNode) {
    return `{${node.list.map(n => p(n[0]) + `:${space}` + p(n[1])).join(`,${space}`)}}`
  }
  else if (node instanceof ConditionalExpressionNode) {
    return `${p(node.condition)}${space}?${node.truePart ? `${space}${p(node.truePart)}${space}` : ''}:${space}${p(node.falsePart)}`
  }
  else if (node instanceof UnaryExpressionNode) {
    return getUnaryOpText(node.operator) + p(node.operand)
  }
  else if (node instanceof BinaryExpressionNode) {
    return p(node.operand1) + space + getBinaryOpText(node.operator) + space + p(node.operand2)
  }
  else if (node instanceof SubscriptExpressionNode) {
    return `${p(node.target)}[${p(node.subscript)}]`
  }
  else if (node instanceof FunctionExpressionNode) {
    if (node.target) {
      if (node.parameters) {
        return `${p(node.target)}.${node.action.identifier}(${node.parameters!.map(n => p(n)).join(`,${space}`)})`
      }
      else {
        return `${p(node.target)}.${node.action.identifier}`
      }
    }
    else {
      return `${node.action.identifier}(${node.parameters!.map(n => p(n)).join(`,${space}`)})`
    }
  }
  else if (node instanceof LambdaExpressionNode) {
    return p(node.parameter) + `${space}->${space}` + p(node.expression)
  }
  else if (node instanceof ParenNode) {
    return '(' + p(node.expression) + ')'
  }

  throw new Error('unknown node')
}
