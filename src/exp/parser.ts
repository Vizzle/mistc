import { Lexer, TokenType, LexerErrorCode, Token } from "./lexer";

export enum ParserErrorCode {
    None,
    LexerError,
    EmptyExpression,
    ExpressionExpected,
    IdentifierExpected,
    ArgumentExpressionExpected,
    ArgumentIdentifierExpected,
    ColonExpected,
    CloseBracketExpected,
    CloseBraceExpected,
    CloseParenExpected,
    UnexpectedComma,
    UnexpectedToken,
    Unknown,
}

let errors = [
    "no error",
    "lexer error",
    "empty expression",
    "expression expected",
    "identifier expected",
    "argument expression expected",
    "argument identifier expected",
    "':' expected",
    "']' expected",
    "'}' expected",
    "')' expected",
    "unexpected ','",
    "unexpected token",
    "unknown error",
]

export enum BinaryOp {
    None,
    Add,
    Sub,
    Mul,
    Div,
    Mod,

    And,
    Or,

    Equal,
    NotEqual,

    EqualTriple,
    NotEqualTriple,

    GreaterThan,
    LessThan,
    GreaterOrEqual,
    LessOrEqual,
}

let BIN_OP_PRIORITY: [number, number][] = [
    [0, 0],
    [6, 6], [6, 6], [7, 7], [7, 7], [7, 7],         // +  -  *  /  %
    [2, 2], [1, 1],                                 // &&  ||
    [3, 3], [3, 3], [3, 3], [3, 3], [3, 3], [3, 3], [3, 3], [3, 3], // ==  !=  ===  !==  >  <  >=  <=
];

export function compareBinaryOperatorPriority(op1: BinaryOp, op2: BinaryOp): number {
    return BIN_OP_PRIORITY[op1][1] - BIN_OP_PRIORITY[op2][0]
}

export enum UnaryOp {
    None,
    Negative,
    Positive,
    Not,
}

export function getUnaryOpText(op: UnaryOp): string {
    switch (op) {
        case UnaryOp.Negative: return '-'
        case UnaryOp.Positive: return '+'
        case UnaryOp.Not: return '!'
    }
    throw new Error('unknown unary operator')
}

export function getBinaryOpText(op: BinaryOp): string {
    switch (op) {
        case BinaryOp.Add: return '+';
        case BinaryOp.Sub: return '-';
        case BinaryOp.Mul: return '*';
        case BinaryOp.Div: return '/';
        case BinaryOp.Mod: return '%';
        case BinaryOp.And: return '&&';
        case BinaryOp.Or: return '||';
        case BinaryOp.Equal: return '==';
        case BinaryOp.NotEqual: return '!=';
        case BinaryOp.EqualTriple: return '===';
        case BinaryOp.NotEqualTriple: return '!==';
        case BinaryOp.GreaterThan: return '>';
        case BinaryOp.LessThan: return '<';
        case BinaryOp.GreaterOrEqual: return '>=';
        case BinaryOp.LessOrEqual: return '<=';
    }
    throw new Error('unknown binary operator')
}

export class ExpressionContext {
    private table: { [key: string]: any[] };

    constructor() {
        this.table = {};
    }

    push(key: string, value: any) {
        let array = this.table[key];
        if (array === null || array === undefined) {
            array = [];
            this.table[key] = array;
        }
        array.push(value);
    }

    pushDict(dict: { [key: string]: any }) {
        if (dict) {
            Object.keys(dict).forEach(k => this.push(k, dict[k]));
        }
    }

    pop(key: string) {
        let array = this.table[key];
        if (array) {
            array.pop();
        }
    }

    popDict(dict: { [key: string]: any }) {
        if (dict && dict instanceof Object) {
            Object.keys(dict).forEach(k => this.pop(k));
        }
    }

    has(key: string) {
        let array = this.table[key];
        return array && array.length > 0;
    }

    get(key: string): any {
        let array = this.table[key];
        if (array && array.length > 0) {
            return array[array.length - 1];
        }
        return null;
    }

    getAll(): { [key: string]: any } {
        return Object.keys(this.table).filter(k => this.table[k].length > 0).reduce((p, c) => {
            let arr = this.table[c];
            p[c] = arr[arr.length - 1];
            return p;
        }, {} as any);
    }

    set(key: string, value: any) {
        let array = this.table[key];
        if (array && array.length > 0) {
            array[array.length - 1] = value;
        }
    }

    clear() {
        this.table = {};
    }

}

export function boolValue(obj: any): boolean {
    if (obj === null || obj === undefined || obj === 0 || obj === '') {
        return false;
    }
    switch (typeof(obj)) {
        case 'number':
            return obj !== 0;
        case 'boolean':
            return obj;
        default:
            return obj !== null && obj !== undefined;
    }
}

export enum ExpressionErrorLevel {
    Error,
    Warning,
    Info,
}

export class ExpressionError {
    description: string;
    offset: number;
    length: number;
    level: ExpressionErrorLevel;

    constructor(node: ExpressionNode, description: string, level: ExpressionErrorLevel = ExpressionErrorLevel.Error) {
        this.offset = node.offset;
        this.length = node.length;
        this.description = description;
        this.level = level
    }
}

export abstract class ExpressionNode {
    offset: number = 0;
    length: number = 0;

    setRange(offset: number, length: number) {
        this.offset = offset;
        this.length = length;
        return this;
    }

    setRangeWithToken(token: Token) {
        this.offset = token.offset;
        this.length = token.length;
        return this;
    }

    childNodes(): ExpressionNode[] {
        return []
    }
}

export class NoneClass {}
export let None = new NoneClass();

export class LiteralNode extends ExpressionNode {
    value: any;

    constructor(value: any) {
        super();
        this.value = value;
    }
}

export class IdentifierNode extends ExpressionNode {
    identifier: string;
    
    constructor(identifier: string) {
        super();
        this.identifier = identifier;
    }
}

export class ParenNode extends ExpressionNode {
    expression: ExpressionNode;

    constructor(expression: ExpressionNode) {
        super();
        this.expression = expression;
    }

    childNodes(): ExpressionNode[] {
        return [this.expression];
    }
}

export class ArrayExpressionNode extends ExpressionNode {
    list: ExpressionNode[];

    constructor(list: ExpressionNode[]) {
        super();
        this.list = list;
    }

    childNodes(): ExpressionNode[] {
        return this.list;
    }
}

export class ObjectExpressionNode extends ExpressionNode {
    list: [ExpressionNode, ExpressionNode][];

    constructor(list: [ExpressionNode, ExpressionNode][]) {
        super();
        this.list = list;
    }

    childNodes(): ExpressionNode[] {
        return this.list.reduce((p, c) => (p.push(c[0], c[1]), p), [] as ExpressionNode[])

        // // currently the key must be an string literal, not considered as an node
        // return this.list.map(pair => pair[1]);
    }
}

export class ConditionalExpressionNode extends ExpressionNode {
    condition: ExpressionNode;
    truePart: ExpressionNode | null;
    falsePart: ExpressionNode;

    constructor(condition: ExpressionNode, truePart: ExpressionNode | null, falsePart: ExpressionNode) {
        super();
        this.condition = condition;
        this.truePart = truePart;
        this.falsePart = falsePart;
    }

    childNodes(): ExpressionNode[] {
        const nodes = [this.condition]
        if (this.truePart) {
            nodes.push(this.truePart)
        }
        nodes.push(this.falsePart)
        return nodes
    }
}

export class UnaryExpressionNode extends ExpressionNode {
    operator: UnaryOp;
    operand: ExpressionNode;

    constructor(operator: UnaryOp, operand: ExpressionNode) {
        super();
        this.operator = operator;
        this.operand = operand;
    }

    childNodes(): ExpressionNode[] {
        return [this.operand]
    }
}

export class BinaryExpressionNode extends ExpressionNode {
    operator: BinaryOp;
    operand1: ExpressionNode;
    operand2: ExpressionNode;

    constructor(operator: BinaryOp, operand1: ExpressionNode, operand2: ExpressionNode) {
        super();
        this.operator = operator;
        this.operand1 = operand1;
        this.operand2 = operand2;
    }

    childNodes(): ExpressionNode[] {
        return [this.operand1, this.operand2]
    }
}

export class SubscriptExpressionNode extends ExpressionNode {
    target: ExpressionNode
    subscript: ExpressionNode

    constructor(target: ExpressionNode, subscript: ExpressionNode) {
        super()
        this.target = target;
        this.subscript = subscript
    }

    childNodes(): ExpressionNode[] {
        return [this.target, this.subscript]
    }
}

export class FunctionExpressionNode extends ExpressionNode {
    target: ExpressionNode | null;
    action: IdentifierNode;
    parameters: ExpressionNode[] | null;

    constructor(target: ExpressionNode | null, action: IdentifierNode, parameters: ExpressionNode[] | null) {
        super();
        this.target = target;
        this.action = action;
        this.parameters = parameters;
    }
    
    childNodes(): ExpressionNode[] {
        const nodes = []
        if (this.target) {
            nodes.push(this.target)
        }
        if (this.parameters) {
            nodes.push(...this.parameters)
        }
        return nodes
    }
}

export class LambdaExpressionNode extends ExpressionNode {
    parameters: IdentifierNode[];
    expression: ExpressionNode;

    constructor(parameters: IdentifierNode[], expression: ExpressionNode) {
        super();
        this.parameters = parameters;
        this.expression = expression;
    }
    
    childNodes(): ExpressionNode[] {
        return [this.expression]
    }
}

export class CommaExpressionNode extends ExpressionNode {
    expressions: ExpressionNode[];

    constructor(expressions: ExpressionNode[]) {
        super();
        this.expressions = expressions;
    }

    childNodes(): ExpressionNode[] {
        return this.expressions;
    }
}

export type ParseResult = {
    expression?: ExpressionNode | null,
    parserError?: ParserErrorCode,
    lexerError?: LexerErrorCode,
    errorMessage?: string,
    errorOffset?: number,
    errorLength?: number,
};

export class Parser {
    private lexer: Lexer;
    private error: ParserErrorCode;

    private constructor(code: string) {
        this.lexer = new Lexer(code);
        this.lexer.next();
        if (this.lexer.token.type) {
            this.error = ParserErrorCode.None;
        }
        else {
            this.error = ParserErrorCode.EmptyExpression;
        }
    }

    private parse(): ExpressionNode | null {
        if (this.error) {
            return null;
        }
        let exp = this.parseExpression();
        if (this.lexer.error) {
            this.error = ParserErrorCode.LexerError;
            exp = null;
        }
        if (!this.error && this.lexer.token.type) {
            this.error = ParserErrorCode.UnexpectedToken;
            exp = null;
        }
        if (!this.error && !exp) {
            this.error = ParserErrorCode.Unknown;
        }
        return exp;
    }

    private parseExpression(): ExpressionNode | null {
        return this.parseConditionalExpression();
    }

    private parseOperator(op: TokenType) {
        if (this.lexer.token.type === op) {
            let token = this.lexer.token;
            this.lexer.next();
            return token;
        }
        return null;
    }

    private requireOperator(op: TokenType, err: ParserErrorCode) {
        let result = this.parseOperator(op);
        if (!result) {
            this.error = err;
        }
        return result;
    }

    private requireExpression() {
        let expression = this.parseExpression();
        if (!expression) {
            this.error = ParserErrorCode.ExpressionExpected;
        }
        return expression;
    }

    private parseConditionalExpression(): ExpressionNode | null {
        let expression = this.parseSubExpression();
        if (expression) {
            if (this.lexer.token.type === TokenType.Question) {
                this.lexer.next();
                let trueExpression = null;
                if (!this.parseOperator(TokenType.Colon)) {
                    if (!(trueExpression = this.requireExpression())) return null;
                    if (!this.requireOperator(TokenType.Colon, ParserErrorCode.ColonExpected)) return null;
                }
                let falseExpression = this.parseConditionalExpression();
                if (!falseExpression) {
                    if (!this.error) this.error = ParserErrorCode.ExpressionExpected;
                    return null;
                }
                return new ConditionalExpressionNode(expression, trueExpression, falseExpression).setRange(expression.offset, falseExpression.offset + falseExpression.length - expression.offset);
            }
            return expression;
        }
        return null;
    }

    private getUnaryOp(type: TokenType): UnaryOp {
        switch (type) {
            case TokenType.Sub:
                return UnaryOp.Negative;
            case TokenType.Add:
                return UnaryOp.Positive;
            case TokenType.Not:
                return UnaryOp.Not;
            default:
                return UnaryOp.None;
        }
    }

    private getBinaryOp(type: TokenType): BinaryOp {
        switch (type) {
            case TokenType.Add:
                return BinaryOp.Add;
            case TokenType.Sub:
                return BinaryOp.Sub;
            case TokenType.Mul:
                return BinaryOp.Mul;
            case TokenType.Div:
                return BinaryOp.Div;
            case TokenType.Mod:
                return BinaryOp.Mod;
            case TokenType.And:
                return BinaryOp.And;
            case TokenType.Or:
                return BinaryOp.Or;
            case TokenType.Equal:
                return BinaryOp.Equal;
            case TokenType.NotEqual:
                return BinaryOp.NotEqual;
            case TokenType.EqualTriple:
                return BinaryOp.EqualTriple;
            case TokenType.NotEqualTriple:
                return BinaryOp.NotEqualTriple;
            case TokenType.GreaterThan:
                return BinaryOp.GreaterThan;
            case TokenType.LessThan:
                return BinaryOp.LessThan;
            case TokenType.GreaterOrEqual:
                return BinaryOp.GreaterOrEqual;
            case TokenType.LessOrEqual:
                return BinaryOp.LessOrEqual;
            default:
                return BinaryOp.None;
        }
    }
    
    private parseSubExpression(priorityLimit: number = 0): ExpressionNode | null {
        let binOp: BinaryOp;
        let unOp: UnaryOp;
        
        let exp: ExpressionNode | null;
        let type = this.lexer.token.type;
        unOp = this.getUnaryOp(type);
        if (unOp !== UnaryOp.None) {
            let start = this.lexer.token.offset;
            this.lexer.next();
            exp = this.parseSubExpression(8);
            if (!exp) {
                return null;
            }
            exp = new UnaryExpressionNode(unOp, exp).setRange(start, exp.offset + exp.length - start);
        }
        else {
            exp = this.parsePostfixExpression();
        }
        if (!exp) {
            return null;
        }
        
        type = this.lexer.token.type;
        binOp = this.getBinaryOp(type);
        while (binOp && BIN_OP_PRIORITY[binOp][0] > priorityLimit) {
            this.lexer.next();
            let subexp = this.parseSubExpression(BIN_OP_PRIORITY[binOp][1]);
            if (!subexp) {
                if (!this.error) {
                    this.error = ParserErrorCode.ExpressionExpected;
                }
                return null;
            }
            exp = new BinaryExpressionNode(binOp, exp, subexp).setRange(exp.offset, subexp.offset + subexp.length - exp.offset);
            type = this.lexer.token.type;
            binOp = this.getBinaryOp(type);
        }
        return exp;
    }

    private parsePostfixExpression() {
        let expression = this.parsePrimaryExpression();
        if (!expression) return null;
        return this.parsePostfixExpression2(expression);
    }

    private parsePostfixExpression2(operand1: ExpressionNode): ExpressionNode | null {
        if (this.parseOperator(TokenType.OpenBracket)) {
            let operand2;
            if (!(operand2 = this.requireExpression())) return null;
            let op = this.requireOperator(TokenType.CloseBracket, ParserErrorCode.CloseBracketExpected);
            if (!op) return null;
            let subscriptExpression = new SubscriptExpressionNode(operand1, operand2).setRange(operand1.offset, op.offset + op.length - operand1.offset);
            return this.parsePostfixExpression2(subscriptExpression);
        } else if (this.parseOperator(TokenType.Dot)) {
            let action = this.parseIdentifier();
            if (!action) {
                if (!this.error) {
                    this.error = ParserErrorCode.IdentifierExpected;
                }
                return null;
            }
            let parameters = null;
            let closeParen: Token | null = null;
            if (this.parseOperator(TokenType.OpenParen)) {
                parameters = this.parseExpressionList();
                if (!parameters) return null;
                closeParen = this.requireOperator(TokenType.CloseParen, ParserErrorCode.CloseParenExpected);
                if (!closeParen) return null;
            }
            let length = closeParen ? closeParen.offset + closeParen.length - operand1.offset : (action.offset + action.length - operand1.offset);
            let fun = new FunctionExpressionNode(operand1, action, parameters).setRange(operand1.offset, length);
            return this.parsePostfixExpression2(fun);
        }
        return operand1;
    }

    private parseExpressionList(): ExpressionNode[] | null {
        if (this.lexer.token.type === TokenType.Comma) {
            this.error = ParserErrorCode.UnexpectedComma;
            return null;
        }
        
        let list: ExpressionNode[] = [];
        let expression = this.parseExpression();
        if (expression) {
            list.push(expression);
        } else {
            if (this.error) {
                return null;
            }
            return list;
        }
        return this.parseExpressionList2(list);
    }

    private parseExpressionList2(list: ExpressionNode[]): ExpressionNode[] | null {
        if (this.parseOperator(TokenType.Comma)) {
            let expression;
            if (!(expression = this.requireExpression())) return null;
            list.push(expression);
            return this.parseExpressionList2(list);
        }
        return list;
    }

    private parseKeyValueList() {
        if (this.lexer.token.type === TokenType.Comma) {
            this.error = ParserErrorCode.UnexpectedComma;
            return null;
        }
        
        let list: [ExpressionNode, ExpressionNode][] = [];
        let key = this.parseExpression();
        if (!key) return list;
        if (!this.requireOperator(TokenType.Colon, ParserErrorCode.ColonExpected)) return null;
        let value;
        if (!(value = this.requireExpression())) return null;
        list.push([key, value]);
        return this.parseKeyValueList2(list);
    }

    private parseKeyValueList2(list: [ExpressionNode, ExpressionNode][]): [ExpressionNode, ExpressionNode][] | null {
        if (this.parseOperator(TokenType.Comma)) {
            let key;
            if (!(key = this.requireExpression())) return null;
            if (!this.requireOperator(TokenType.Colon, ParserErrorCode.ColonExpected)) return null;
            let value;
            if (!(value = this.requireExpression())) return null;
            list.push([key, value]);
            return this.parseKeyValueList2(list);
        }
        return list;
    }

    private parsePrimaryExpression() {
        let expression: ExpressionNode | null = null;
        let type = this.lexer.token.type;
        switch (type) {
            case TokenType.String:
            case TokenType.Number:
            case TokenType.Boolean:
            case TokenType.Null:
            {
                let node = new LiteralNode(this.lexer.token.value).setRangeWithToken(this.lexer.token);
                this.lexer.next();
                return node;
            }
            case TokenType.OpenParen:
            {
                let open = this.lexer.token;
                this.lexer.next();
                const expressions: ExpressionNode[] = []
                if (this.lexer.token.type !== TokenType.CloseParen) {
                    if (!(expression = this.requireExpression())) return null;
                    expressions.push(expression)
                    while (this.lexer.token.type === TokenType.Comma) {
                        this.lexer.next();
                        if (!(expression = this.requireExpression())) return null;
                        expressions.push(expression)
                    }
                }

                const close = this.requireOperator(TokenType.CloseParen, ParserErrorCode.CloseParenExpected)
                if (!close) return null;

                if (this.lexer.token.type === TokenType.Arrow && expressions.every(exp => exp instanceof IdentifierNode)) {
                    this.lexer.next();
                    if (!(expression = this.requireExpression())) return null;
                    return new LambdaExpressionNode(expressions as IdentifierNode[], expression).setRange(open.offset, expression.offset + expression.length - open.offset);
                }

                if (expressions.length > 1) {
                    return new CommaExpressionNode(expressions).setRange(open.offset, close.offset + close.length - open.offset)
                }
                else if (expression) {
                    return new ParenNode(expression).setRange(open.offset, close.offset + close.length - open.offset);
                }
                else {
                    if (!this.error) {
                        this.error = ParserErrorCode.ExpressionExpected
                    }
                    return null
                }
            }
            case TokenType.OpenBracket:
            {
                let open = this.lexer.token;
                this.lexer.next();
                let list = this.parseExpressionList();
                if (!list) {
                    if (!this.error) this.error = ParserErrorCode.ExpressionExpected;
                    return null
                }
                let close = this.requireOperator(TokenType.CloseBracket, ParserErrorCode.CloseBracketExpected);
                if (!close) return null;
                return new ArrayExpressionNode(list).setRange(open.offset, close.offset + close.length - open.offset);
            }
            case TokenType.OpenBrace:
            {
                let open = this.lexer.token;
                this.lexer.next();
                let list = this.parseKeyValueList();
                if (!list) {
                    if (!this.error) this.error = ParserErrorCode.ExpressionExpected;
                    return null
                }
                let close = this.requireOperator(TokenType.CloseBrace, ParserErrorCode.CloseBraceExpected);
                if (!close) return null;
                return new ObjectExpressionNode(list).setRange(open.offset, close.offset + close.length - open.offset);
            }
            case TokenType.Id:
            {
                let identifier = this.parseIdentifier();
                if (!identifier) return null;
                if (this.parseOperator(TokenType.OpenParen)) {
                    let list = this.parseExpressionList();
                    if (!list) {
                        if (!this.error) this.error = ParserErrorCode.ExpressionExpected;
                    }
                    if (this.lexer.token.type === TokenType.Comma && !this.error) {
                        this.error = ParserErrorCode.ArgumentExpressionExpected;
                        return null;
                    }
                    let closeParen = this.requireOperator(TokenType.CloseParen, ParserErrorCode.CloseParenExpected);
                    if (!closeParen) return null;
                    return new FunctionExpressionNode(null, identifier, list).setRange(identifier.offset, closeParen.offset + closeParen.length - identifier.offset);
                }
                else if (this.parseOperator(TokenType.Arrow)) {
                    if (!(expression = this.requireExpression())) return null;
                    return new LambdaExpressionNode([identifier], expression).setRange(identifier.offset, expression.offset + expression.length - identifier.offset);
                }
                return identifier;
            }
            case TokenType.Arrow:
            {
                this.error = ParserErrorCode.ArgumentIdentifierExpected;
                return null;
            }
            case TokenType.None:
                return null;
            case TokenType.Add:
            case TokenType.Sub:
            case TokenType.Mul:
            case TokenType.Div:
            case TokenType.Mod:
            case TokenType.LessThan:
            case TokenType.GreaterThan:
            case TokenType.LessOrEqual:
            case TokenType.GreaterOrEqual:
            case TokenType.Equal:
            case TokenType.NotEqual:
            case TokenType.Add:
            case TokenType.Or:
            case TokenType.Comma:
            {
                this.error = ParserErrorCode.ExpressionExpected;
                return null;
            }
        }
        
        return null;
    }

    private parseIdentifier() {
        if (this.lexer.token.type === TokenType.Id) {
            let token = this.lexer.token;
            this.lexer.next();
            return new IdentifierNode(token.value).setRangeWithToken(token);
        }
        return null;
    }

    public static parse(code: string): ParseResult {
        if (code === null || code === undefined) {
            code = '';
        }
        let parser = new Parser(code);
        let expression = parser.parse();
        if (parser.error) {
            let result = { parserError: parser.error, lexerError: parser.lexer.error };
            let message = result.lexerError ? Lexer.errorMessage(result.lexerError) : this.errorMessage(result.parserError);
            return { ...result, errorMessage: message, errorOffset: parser.lexer.token.offset, errorLength: parser.lexer.token.length };
        }
        else {
            return { expression: expression };
        }
    }

    public static errorMessage(errorCode: ParserErrorCode) {
        return errors[errorCode];
    }
}

export function visitNode(node: ExpressionNode, visitor: (node: ExpressionNode) => void | boolean) {
    if (visitor(node)) return
    for (const child of node.childNodes()) {
        visitNode(child, visitor)
    }
}
