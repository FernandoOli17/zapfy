/**
 * Avaliador de expressões boolean seguro pra BRANCH nodes do flow editor.
 *
 * Sintaxe suportada (recursive-descent parser, sem `eval` / `Function`):
 *
 *   <expr>      = <or>
 *   <or>        = <and> ('||' <and>)*
 *   <and>       = <not> ('&&' <not>)*
 *   <not>       = '!' <atom> | <atom>
 *   <atom>      = '(' <expr> ')' | <comparison> | <bool>
 *   <comparison>= <value> <op> <value>
 *   <op>        = '===' | '!==' | '==' | '!=' | '>' | '>=' | '<' | '<=' | 'contains'
 *   <value>     = <path> | <literal>
 *   <path>      = '$' <identifier> ('.' <identifier> | '[' <int> ']')*
 *   <literal>   = '"' ... '"' | <number> | 'true' | 'false' | 'null'
 *
 * Identifiers permitidos no scope: $inboundText, $classification.*, $rag,
 * $rag.length, $agentResult.*, $agentResult.text, etc.
 */

export interface ExpressionScope {
  inboundText: string;
  classification: unknown;
  rag: unknown[];
  agentResult: unknown;
}

export function evalExpression(expr: string, scope: ExpressionScope): boolean {
  const parser = new Parser(expr);
  const result = parser.parseExpr();
  parser.expectEnd();
  return toBool(result.evaluate(scope));
}

// ─────────────────────────────────────────────────────────────────────────────
// AST + Evaluator
// ─────────────────────────────────────────────────────────────────────────────

type Value = string | number | boolean | null | unknown[] | Record<string, unknown> | undefined;

interface Node {
  evaluate: (scope: ExpressionScope) => Value;
}

class LiteralNode implements Node {
  constructor(private readonly value: Value) {}
  evaluate(): Value {
    return this.value;
  }
}

class PathNode implements Node {
  constructor(private readonly segments: Array<string | number>) {}
  evaluate(scope: ExpressionScope): Value {
    if (this.segments.length === 0) return undefined;
    const root = scope as unknown as Record<string, unknown>;
    const firstSeg = this.segments[0];
    if (typeof firstSeg !== 'string') return undefined;
    let cur: unknown = root[firstSeg];
    for (let i = 1; i < this.segments.length; i++) {
      if (cur === null || cur === undefined) return undefined;
      const seg = this.segments[i];
      if (seg === undefined) return undefined;
      if (typeof seg === 'number') {
        if (!Array.isArray(cur)) return undefined;
        cur = cur[seg];
      } else if (seg === 'length' && (Array.isArray(cur) || typeof cur === 'string')) {
        cur = (cur as { length: number }).length;
      } else {
        cur = (cur as Record<string, unknown>)[seg];
      }
    }
    return cur as Value;
  }
}

type BinaryOp =
  | '==='
  | '!=='
  | '=='
  | '!='
  | '>'
  | '>='
  | '<'
  | '<='
  | 'contains'
  | '&&'
  | '||';

class BinaryNode implements Node {
  constructor(private readonly op: BinaryOp, private readonly left: Node, private readonly right: Node) {}
  evaluate(scope: ExpressionScope): Value {
    const l = this.left.evaluate(scope);
    // short-circuit pra && / ||
    if (this.op === '&&') return toBool(l) ? toBool(this.right.evaluate(scope)) : false;
    if (this.op === '||') return toBool(l) ? true : toBool(this.right.evaluate(scope));
    const r = this.right.evaluate(scope);
    switch (this.op) {
      case '===':
        return l === r;
      case '!==':
        return l !== r;
      case '==':
        return looseEq(l, r);
      case '!=':
        return !looseEq(l, r);
      case '>':
        return numericCompare(l, r, (a, b) => a > b);
      case '>=':
        return numericCompare(l, r, (a, b) => a >= b);
      case '<':
        return numericCompare(l, r, (a, b) => a < b);
      case '<=':
        return numericCompare(l, r, (a, b) => a <= b);
      case 'contains': {
        if (typeof l === 'string' && typeof r === 'string') {
          return l.toLowerCase().includes(r.toLowerCase());
        }
        if (Array.isArray(l)) return l.includes(r as never);
        return false;
      }
    }
  }
}

class NotNode implements Node {
  constructor(private readonly inner: Node) {}
  evaluate(scope: ExpressionScope): Value {
    return !toBool(this.inner.evaluate(scope));
  }
}

function numericCompare(l: Value, r: Value, cmp: (a: number, b: number) => boolean): boolean {
  if (typeof l !== 'number' || typeof r !== 'number') return false;
  return cmp(l, r);
}

/** == sem coerção implícita: trata null/undefined como iguais entre si, demais pelo === . */
function looseEq(l: Value, r: Value): boolean {
  if (l === r) return true;
  if ((l === null || l === undefined) && (r === null || r === undefined)) return true;
  // Permite comparação number/string só se a string parseia exato pro number
  if (typeof l === 'number' && typeof r === 'string') return l === Number(r) && r.trim() !== '';
  if (typeof l === 'string' && typeof r === 'number') return Number(l) === r && l.trim() !== '';
  return false;
}

function toBool(v: Value): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string') return v.length > 0;
  if (Array.isArray(v)) return v.length > 0;
  if (v === null || v === undefined) return false;
  return Boolean(v);
}

// ─────────────────────────────────────────────────────────────────────────────
// Parser
// ─────────────────────────────────────────────────────────────────────────────

class Parser {
  private pos = 0;
  private depth = 0;
  /** Limite de recursão pra evitar stack overflow em parens muito profundas. */
  private static readonly MAX_DEPTH = 32;
  constructor(private readonly src: string) {}

  parseExpr(): Node {
    this.depth += 1;
    if (this.depth > Parser.MAX_DEPTH) {
      throw new Error(`Expressão profunda demais (max ${Parser.MAX_DEPTH} níveis)`);
    }
    try {
      return this.parseOr();
    } finally {
      this.depth -= 1;
    }
  }

  private parseOr(): Node {
    let left = this.parseAnd();
    while (this.peek('||')) {
      this.consume('||');
      const right = this.parseAnd();
      left = new BinaryNode('||', left, right);
    }
    return left;
  }

  private parseAnd(): Node {
    let left = this.parseNot();
    while (this.peek('&&')) {
      this.consume('&&');
      const right = this.parseNot();
      left = new BinaryNode('&&', left, right);
    }
    return left;
  }

  private parseNot(): Node {
    this.skipSpaces();
    if (this.src[this.pos] === '!' && this.src[this.pos + 1] !== '=') {
      this.pos += 1;
      return new NotNode(this.parseAtom());
    }
    return this.parseAtom();
  }

  private parseAtom(): Node {
    this.skipSpaces();
    if (this.src[this.pos] === '(') {
      this.pos += 1;
      const inner = this.parseExpr();
      this.skipSpaces();
      if (this.src[this.pos] !== ')') throw new Error(`Esperado ')' na posição ${this.pos}`);
      this.pos += 1;
      return inner;
    }
    return this.parseComparison();
  }

  private parseComparison(): Node {
    const left = this.parseValue();
    this.skipSpaces();
    const op = this.tryReadOp();
    if (!op) {
      // valor sozinho — equivale a `value !== false && value !== null`
      return left;
    }
    this.skipSpaces();
    const right = this.parseValue();
    return new BinaryNode(op, left, right);
  }

  private parseValue(): Node {
    this.skipSpaces();
    const ch = this.src[this.pos];
    if (ch === '$') return this.parsePath();
    if (ch === '"' || ch === "'") return this.parseString();
    if (ch === '-' || (ch !== undefined && ch >= '0' && ch <= '9')) return this.parseNumber();
    // booleans / null
    if (this.matchKeyword('true')) return new LiteralNode(true);
    if (this.matchKeyword('false')) return new LiteralNode(false);
    if (this.matchKeyword('null')) return new LiteralNode(null);
    throw new Error(`Valor inesperado em pos ${this.pos}: '${this.src.slice(this.pos, this.pos + 10)}'`);
  }

  private parsePath(): PathNode {
    this.pos += 1; // skip $
    const segments: Array<string | number> = [];
    const first = this.readIdent();
    if (!first) throw new Error('Identifier esperado após $');
    segments.push(first);
    while (true) {
      if (this.src[this.pos] === '.') {
        this.pos += 1;
        const id = this.readIdent();
        if (!id) throw new Error('Identifier esperado após .');
        segments.push(id);
      } else if (this.src[this.pos] === '[') {
        this.pos += 1;
        const numStr = this.readWhile((c) => c >= '0' && c <= '9');
        if (!numStr) throw new Error('Index numérico esperado');
        if (this.src[this.pos] !== ']') throw new Error('] esperado');
        this.pos += 1;
        segments.push(Number.parseInt(numStr, 10));
      } else {
        break;
      }
    }
    return new PathNode(segments);
  }

  private parseString(): LiteralNode {
    const quote = this.src[this.pos]!;
    this.pos += 1;
    let str = '';
    while (this.pos < this.src.length && this.src[this.pos] !== quote) {
      if (this.src[this.pos] === '\\' && this.pos + 1 < this.src.length) {
        // Suporte aos escapes comuns. Qualquer outro \X mantém X literal
        // (não-conformante com JS strings, mas pragmático pra DSL pequena).
        const next = this.src[this.pos + 1] ?? '';
        const mapped: string =
          next === 'n' ? '\n'
            : next === 't' ? '\t'
            : next === 'r' ? '\r'
            : next === '\\' ? '\\'
            : next === '"' ? '"'
            : next === "'" ? "'"
            : next;
        str += mapped;
        this.pos += 2;
      } else {
        str += this.src[this.pos];
        this.pos += 1;
      }
    }
    if (this.src[this.pos] !== quote) throw new Error('String não fechada');
    this.pos += 1;
    return new LiteralNode(str);
  }

  private parseNumber(): LiteralNode {
    const start = this.pos;
    if (this.src[this.pos] === '-') this.pos += 1;
    // Aceita só 1 ponto decimal — `1.2.3` deve falhar explícito em vez de
    // virar 1.2 silenciosamente via parseFloat.
    let sawDot = false;
    while (this.pos < this.src.length) {
      const c = this.src[this.pos];
      if (c === undefined) break;
      if (c >= '0' && c <= '9') {
        this.pos += 1;
      } else if (c === '.' && !sawDot) {
        sawDot = true;
        this.pos += 1;
      } else if (c === '.') {
        throw new Error(`Número com múltiplos pontos em pos ${this.pos}`);
      } else {
        break;
      }
    }
    const numStr = this.src.slice(start, this.pos);
    const n = Number.parseFloat(numStr);
    if (!Number.isFinite(n)) throw new Error(`Número inválido: ${numStr}`);
    return new LiteralNode(n);
  }

  private tryReadOp(): BinaryOp | null {
    const slice = this.src.slice(this.pos, this.pos + 3);
    if (slice === '===') {
      this.pos += 3;
      return '===';
    }
    if (slice === '!==') {
      this.pos += 3;
      return '!==';
    }
    const two = this.src.slice(this.pos, this.pos + 2);
    if (two === '==') {
      this.pos += 2;
      return '==';
    }
    if (two === '!=') {
      this.pos += 2;
      return '!=';
    }
    if (two === '>=') {
      this.pos += 2;
      return '>=';
    }
    if (two === '<=') {
      this.pos += 2;
      return '<=';
    }
    const one = this.src[this.pos];
    if (one === '>') {
      this.pos += 1;
      return '>';
    }
    if (one === '<') {
      this.pos += 1;
      return '<';
    }
    if (this.matchKeyword('contains')) return 'contains';
    return null;
  }

  private matchKeyword(kw: string): boolean {
    this.skipSpaces();
    const slice = this.src.slice(this.pos, this.pos + kw.length);
    const after = this.src[this.pos + kw.length];
    if (slice === kw && (after === undefined || !/[a-zA-Z0-9_]/.test(after))) {
      this.pos += kw.length;
      return true;
    }
    return false;
  }

  private peek(kw: string): boolean {
    this.skipSpaces();
    return this.src.slice(this.pos, this.pos + kw.length) === kw;
  }

  private consume(kw: string): void {
    if (!this.peek(kw)) throw new Error(`Esperado '${kw}'`);
    this.pos += kw.length;
  }

  private skipSpaces(): void {
    while (this.pos < this.src.length && /\s/.test(this.src[this.pos] ?? '')) this.pos += 1;
  }

  private readIdent(): string {
    return this.readWhile((c) => /[a-zA-Z0-9_]/.test(c));
  }

  private readWhile(pred: (c: string) => boolean): string {
    const start = this.pos;
    while (this.pos < this.src.length && pred(this.src[this.pos] ?? '')) this.pos += 1;
    return this.src.slice(start, this.pos);
  }

  expectEnd(): void {
    this.skipSpaces();
    if (this.pos < this.src.length) {
      throw new Error(`Tokens extras após expressão na pos ${this.pos}: '${this.src.slice(this.pos)}'`);
    }
  }
}
