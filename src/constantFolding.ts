import { ExpressionNode, LiteralNode, IdentifierNode, ArrayExpressionNode, ObjectExpressionNode, ConditionalExpressionNode, UnaryExpressionNode, getUnaryOpText, BinaryExpressionNode, getBinaryOpText, SubscriptExpressionNode, FunctionExpressionNode, LambdaExpressionNode, ParenNode, UnaryOp, BinaryOp, visitNode } from "./exp/parser"
import { relative } from "path"

class Variable {
  /**
   * value !== undefined 表示常量
   */
  value?: any
}

class Context {
  private variableTable: Map<string, Variable[]> = new Map()

  public push(key: string, value?: any) {
    let stack = this.variableTable.get(key)
    if (!stack) {
      stack = []
      this.variableTable.set(key, stack)
    }

    const variable: Variable = {}
    if (value instanceof ExpressionNode) {
      if (value instanceof LiteralNode) {
        variable.value = value.value
      }
    }
    else if (value !== undefined) {
      variable.value = value
    }

    stack.push(variable)
  }

  public pop(key: string) {
    let stack = this.variableTable.get(key)
    if (!stack) {
      throw new Error(`no variable named '${key}' to pop`)
    }
    stack.pop()
  }

  public get(key: string) {
    let stack = this.variableTable.get(key)
    if (stack) {
      return stack[stack.length - 1]
    }
    return undefined
  }
}

/**
 * 折叠 string, number, bool, null 常量，json 中的 null 不认为是常量
 * @param tpl 模板。模板中的表达式需要已解析为 ExpressionNode
 */
export function constantFoldingTemplate(tpl: any, constants?: Record<string, any>) {
  const ctx = new Context()
  
  if (constants) {
    Object.keys(constants).forEach(key => {
      ctx.push(key, constants[key])
    })
  }

  const constantFoldingObject = (obj: any, removeNulls = false) => {
    if (obj instanceof ExpressionNode) {
      const value = constantFolding(obj, ctx)
      // 如果值为表达式中的 null，则移除该 key。"key": "${null}" 移除，"key": null 不移除
      if (removeNulls && isNullExp(value)) {
        return undefined
      }
      return value
    }
    else if (typeof obj === 'object') {
      for (const k in obj) {
        obj[k] = constantFoldingObject(obj[k], removeNulls)
      }
      return obj
    }
    return obj
  }

  const constantFoldingElement = (node: any) => {
    if (node.repeat) {
      node.repeat = constantFoldingObject(node.repeat)
      ctx.push('_index_')
      ctx.push('_item_')
    }

    const pushedVars: string[] = []
    if (node.vars) {
      let varsArr: any[] = node.vars
      if (!(varsArr instanceof Array)) {
        varsArr = [varsArr]
      }

      for (const vars of varsArr) {
        constantFoldingObject(vars)
        for (const key in vars) {
          ctx.push(key, vars[key])
          const v = ctx.get(key)
          if (v && shouldConstantPropagation(v.value)) {
            delete vars[key]
          }
        }
        pushedVars.push(...vars)
      }

      varsArr = varsArr.filter(vars => Object.keys(vars).length > 0)
      node.vars = varsArr.length === 0 ? undefined : varsArr.length === 1 ? varsArr[0] : varsArr
    }

    for (const key in node) {
      if (key !== 'repeat' && key !== 'vars' && key !== 'children') {
        node[key] = constantFoldingObject(node[key], true)
      }
    }

    (node.children || []).forEach(constantFoldingElement)

    for (const key of pushedVars) {
      ctx.pop(key)
    }

    if (node.repeat) {
      ctx.pop('_index_')
      ctx.pop('_item_')
    }
  }

  for (const key in tpl) {
    if (key === 'templates') {
      const templates = tpl[key]
      for (const k in templates) {
        const tpl = templates[k]
        tpl.noRegexExp = true
        constantFoldingTemplate(tpl)
      }
    }
    else if (key !== 'layout') {
      tpl[key] = constantFoldingObject(tpl[key], true)
    }
  }

  constantFoldingElement(tpl.layout)
}

function isNullExp(value: any) {
  return value instanceof LiteralNode && value.value === null
}

function numberValue(value: any) {
  if (typeof value === 'number') {
    return value
  }
  else if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }
  else {
    return 0
  }
}

function boolValue(value: any) {
  if (typeof value === 'boolean') {
    return value
  }
  else if (typeof value === 'number') {
    return value !== 0
  }
  else {
    return !isNull(value)
  }
}

function isNull(v: any) {
  return v === null || v === undefined
}

function equalsValue(v1: any, v2: any): boolean {
  if (isNull(v1) || isNull(v2)) {
    return numberValue(v1) === numberValue(v2)
  }
  return v1 === v2
}

function constantFolding(exp: ExpressionNode, ctx: Context): ExpressionNode {
  let folded = false
  const transform = (exp: ExpressionNode) => transformNode(exp, (node, parent, lambdaParameters) => {
    if (node instanceof IdentifierNode) {
      if (lambdaParameters.indexOf(node.identifier) < 0) {
        const variable = ctx.get(node.identifier)
        if (variable && shouldConstantPropagation(variable.value)) {
          folded = true
          return new LiteralNode(variable.value)
        }
      }
    }
    else if (node instanceof UnaryExpressionNode) {
      if (node.operand instanceof LiteralNode) {
        folded = true
        switch (node.operator) {
          case UnaryOp.Positive: return new LiteralNode(+numberValue(node.operand.value))
          case UnaryOp.Negative: return new LiteralNode(-numberValue(node.operand.value))
          case UnaryOp.Not: return new LiteralNode(!boolValue(node.operand.value))
          default: throw new Error('unsupported unary operator')
        }
      }
    }
    else if (node instanceof BinaryExpressionNode) {
      if (node.operand1 instanceof LiteralNode && node.operand2 instanceof LiteralNode) {
        folded = true

        const v1 = node.operand1.value
        const v2 = node.operand2.value

        switch (node.operator) {
          case BinaryOp.Add: {
            if (typeof v1 === 'string' || typeof v2 === 'string') {
              return new LiteralNode(v1 + v2)
            }
            else {
              return new LiteralNode(numberValue(v1) + numberValue(v2))
            }
          }
          case BinaryOp.Sub: return new LiteralNode(numberValue(v1) - numberValue(v2))
          case BinaryOp.Mul: return new LiteralNode(numberValue(v1) * numberValue(v2))
          case BinaryOp.Div: return new LiteralNode(numberValue(v1) / numberValue(v2))
          case BinaryOp.Mod: return new LiteralNode(numberValue(v1) % numberValue(v2))
          case BinaryOp.And: return new LiteralNode(boolValue(v1) && boolValue(v2))
          case BinaryOp.Or: return new LiteralNode(boolValue(v1) || boolValue(v2))
          case BinaryOp.Equal: return new LiteralNode(equalsValue(v1, v2))
          case BinaryOp.NotEqual: return new LiteralNode(!equalsValue(v1, v2))
          case BinaryOp.EqualTriple: return new LiteralNode(equalsValue(v1, v2))
          case BinaryOp.NotEqualTriple: return new LiteralNode(!equalsValue(v1, v2))
          case BinaryOp.GreaterThan: return new LiteralNode(numberValue(v1) > numberValue(v2))
          case BinaryOp.LessThan: return new LiteralNode(numberValue(v1) < numberValue(v2))
          case BinaryOp.GreaterOrEqual: return new LiteralNode(numberValue(v1) >= numberValue(v2))
          case BinaryOp.LessOrEqual: return new LiteralNode(numberValue(v1) <= numberValue(v2))
          default: throw new Error('unsupported unary operator')
        }
      }
      else if (isLogicalExpression(node) && (node.operand1 instanceof LiteralNode || node.operand2 instanceof LiteralNode)) {
        const constant = (node.operand1 instanceof LiteralNode ? node.operand1 : node.operand2) as LiteralNode
        const another = constant === node.operand1 ? node.operand2 : node.operand1

        // 一些情况转换后可能导致返回类型改变，这种情况不进行转换
        // 例如 true && num，如果转换为 num，可能类型就从 boolean 变成 number 了
        const canConvert = () => {
          if (isReturnBool(another)) {
            return true
          }

          if ((parent instanceof ConditionalExpressionNode && node === parent.condition)
            || isLogicalExpression(parent)) {
            return true
          }

          return false
        }

        if (node.operator === BinaryOp.And) {
          if (boolValue(constant.value)) {
            if (canConvert()) {
              folded = true
              return another
            }
          }
          else if (canDeleteExpression(another)) {
            folded = true
            return new LiteralNode(false)
          }
        }
        else if (node.operator === BinaryOp.Or) {
          if (boolValue(constant.value)) {
            if (canDeleteExpression(another)) {
              folded = true
              return new LiteralNode(true)
            }
          }
          else if (canConvert()) {
            folded = true
            return another
          }
        }
      }
    }
    else if (node instanceof ConditionalExpressionNode) {
      if (node.condition instanceof LiteralNode) {
        folded = true
        return boolValue(node.condition.value) ? (node.truePart || node.condition) : node.falsePart
      }
    }
    else if (node instanceof FunctionExpressionNode) {
      if (!node.parameters && node.target instanceof IdentifierNode) {
        if (lambdaParameters.indexOf(node.target.identifier) < 0) {
          const target = ctx.get(node.target.identifier)
          const value = target?.value?.[node.action.identifier]
          if (shouldConstantPropagation(value)) {
            folded = true
            return new LiteralNode(value)
          }
        }
      }
    }
    else if (node instanceof ParenNode) {
      const exp = node.expression
      let unwrapParen = false
      if (!parent) {
        unwrapParen = true
      }
      else if (!(exp instanceof BinaryExpressionNode || exp instanceof UnaryExpressionNode || exp instanceof ConditionalExpressionNode)) {
        unwrapParen = true
      }

      if (unwrapParen) {
        folded = true
        return exp
      }
    }
    
    return node
  })

  do {
    folded = false
    exp = transform(exp)
  } while (folded)

  // add parens for number literals. (eg: `4.intValue`  =>  `(4).intValue`)
  transformNode(exp, (node, parent) => {
    if (node instanceof LiteralNode && typeof node.value === 'number' && parent instanceof FunctionExpressionNode && node === parent.target) {
      return new ParenNode(node)
    }
    return node
  })

  if (exp instanceof LiteralNode) {
    if (exp.value !== null) {
      return exp.value
    }
  }

  return exp
}

function shouldConstantPropagation(value: any) {
  return value !== undefined && (value === null || typeof value !== 'object')
}

function canDeleteExpression(node: ExpressionNode) {
  // 由于历史遗留原因，Mist 中的 && 和 || 运算符不会短路，之前有业务利用这个特性来执行多个 Native 方法
  // 所以对于有方法调用的情况，该表达式不能删除
  let hasFunctionCall = false
  visitNode(node, node => {
    if (node instanceof FunctionExpressionNode && node.parameters) {
      hasFunctionCall = true
      return true
    }
  })

  return !hasFunctionCall
}

function isReturnBool(node: ExpressionNode): boolean {
  if (isLogicalExpression(node)) {
    return true
  }
  else if (node instanceof BinaryExpressionNode) {
    return node.operator === BinaryOp.Equal
      || node.operator === BinaryOp.NotEqual
      || node.operator === BinaryOp.EqualTriple
      || node.operator === BinaryOp.NotEqualTriple
      || node.operator === BinaryOp.GreaterThan
      || node.operator === BinaryOp.GreaterOrEqual
      || node.operator === BinaryOp.LessThan
      || node.operator === BinaryOp.LessOrEqual
  }
  else if (node instanceof LiteralNode && typeof node.value === 'boolean') {
    return true
  }
  else if (node instanceof ParenNode) {
    return isReturnBool(node.expression)
  }
  return false
}

function isLogicalExpression(node: ExpressionNode | undefined): node is BinaryExpressionNode | UnaryExpressionNode {
  if (node instanceof BinaryExpressionNode) {
    return node.operator === BinaryOp.And || node.operator === BinaryOp.Or
  }
  else if (node instanceof UnaryExpressionNode) {
    return node.operator === UnaryOp.Not
  }
  return false
}

function transformNode(node: ExpressionNode, visitor: (node: ExpressionNode, parent: ExpressionNode | undefined, lambdaParameters: string[]) => ExpressionNode, parent?: ExpressionNode, lambdaParameters: string[] = []): ExpressionNode {
  if (node instanceof LambdaExpressionNode) {
    node.parameters.forEach(p => lambdaParameters.push(p.identifier))
  }

  node = visitor(node, parent, lambdaParameters)

  const transform = (n: ExpressionNode) => transformNode(n, visitor, node, lambdaParameters)

  if (node instanceof LiteralNode) {
    
  }
  else if (node instanceof IdentifierNode) {
    
  }
  else if (node instanceof ArrayExpressionNode) {
    node.list = node.list.map(transform)
  }
  else if (node instanceof ObjectExpressionNode) {
    node.list = node.list.map(([key, value]) => [key, transform(value)])
  }
  else if (node instanceof ConditionalExpressionNode) {
    node.condition = transform(node.condition)
    if (node.truePart) {
      node.truePart = transform(node.truePart)
    }
    node.falsePart = transform(node.falsePart)
  }
  else if (node instanceof UnaryExpressionNode) {
    node.operand = transform(node.operand)
  }
  else if (node instanceof BinaryExpressionNode) {
    node.operand1 = transform(node.operand1)
    node.operand2 = transform(node.operand2)
  }
  else if (node instanceof SubscriptExpressionNode) {
    node.target = transform(node.target)
    node.subscript = transform(node.subscript)
  }
  else if (node instanceof FunctionExpressionNode) {
    if (node.target) {
      node.target = transform(node.target)
    }
    if (node.parameters) {
      node.parameters = node.parameters.map(transform)
    }
  }
  else if (node instanceof LambdaExpressionNode) {
    node.expression = transform(node.expression)
  }
  else if (node instanceof ParenNode) {
    node.expression = transform(node.expression)
  }

  if (node instanceof LambdaExpressionNode) {
    node.parameters.forEach(() => lambdaParameters.pop())
  }

  return node
}
