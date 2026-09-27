/**
 * OmniMath: Lexical Tokenizer & AST Recursive-Descent Parser
 * Parses mathematical expressions into an Abstract Syntax Tree (AST) and generates JS code.
 */
(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.OmniMath = root.OmniMath || {};
    Object.assign(root.OmniMath, factory());
  }
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this), function() {
  'use strict';

  function tokenize(str) {
    const tokens = [];
    let i = 0;
    str = (str || '').replace(/\s+/g, '');

    while (i < str.length) {
      const ch = str[i];
      if (/[0-9]/.test(ch)) {
        let num = '';
        while (i < str.length && /[0-9.]/.test(str[i])) num += str[i++];
        tokens.push({ type: 'NUM', val: parseFloat(num) });
      } else if (/[a-zA-Z]/.test(ch)) {
        let name = '';
        while (i < str.length && /[a-zA-Z0-9_]/.test(str[i])) name += str[i++];
        tokens.push({ type: 'VAR', val: name });
      } else if ('+-*/^()=,[]'.includes(ch)) {
        tokens.push({ type: 'OP', val: ch });
        i++;
      } else {
        i++;
      }
    }
    return tokens;
  }

  function numNode(val) { return { type: 'num', val: Number(val) }; }
  function symNode(name) { return { type: 'sym', name: name }; }
  function opNode(fn, args) { return { type: 'op', fn: fn, args: args }; }

  function parse(exprStr) {
    if (!exprStr) return numNode(0);
    const tokens = tokenize(exprStr);
    let pos = 0;

    function peek() { return tokens[pos]; }
    function consume() { return tokens[pos++]; }

    function parseEquation() {
      let left = parseAddSub();
      if (peek() && peek().val === '=') {
        consume();
        let right = parseAddSub();
        return opNode('-', [left, right]);
      }
      return left;
    }

    function parseAddSub() {
      let node = parseMulDiv();
      while (peek() && (peek().val === '+' || peek().val === '-')) {
        let oper = consume().val;
        let right = parseMulDiv();
        node = opNode(oper, [node, right]);
      }
      return node;
    }

    function parseMulDiv() {
      let node = parseUnary();
      while (peek() && (peek().val === '*' || peek().val === '/' || peek().type === 'NUM' || peek().type === 'VAR' || peek().val === '(')) {
        let oper = '*';
        if (peek().val === '*' || peek().val === '/') {
          oper = consume().val;
        }
        let right = parseUnary();
        node = opNode(oper, [node, right]);
      }
      return node;
    }

    function parseUnary() {
      if (peek() && peek().val === '-') {
        consume();
        return opNode('*', [numNode(-1), parsePower()]);
      }
      if (peek() && peek().val === '+') consume();
      return parsePower();
    }

    function parsePower() {
      let node = parseAtom();
      if (peek() && peek().val === '^') {
        consume();
        return opNode('^', [node, parseUnary()]);
      }
      return node;
    }

    function parseAtom() {
      let t = peek();
      if (!t) return numNode(0);

      if (t.type === 'NUM') {
        consume();
        return numNode(t.val);
      }
      if (t.val === '(') {
        consume();
        let node = parseEquation();
        if (peek() && peek().val === ')') consume();
        return node;
      }
      if (t.type === 'VAR') {
        consume();
        const funcName = t.val.toLowerCase();
        // Function/Signal call: f(args) or s[args]
        if (peek() && (peek().val === '(' || peek().val === '[')) {
          const isBracket = peek().val === '[';
          const closing = isBracket ? ']' : ')';
          consume();
          const args = [];
          if (peek() && peek().val !== closing) {
            args.push(parseEquation());
            while (peek() && peek().val === ',') {
              consume();
              args.push(parseEquation());
            }
          }
          if (peek() && peek().val === closing) consume();
          const res = opNode(funcName, args);
          if (isBracket) res.isBracket = true;
          return res;
        }
        return symNode(t.val);
      }
      return numNode(0);
    }

    return parseEquation();
  }

  // --- AST TO JS CODE CONVERTER (Complex & Multi-Signal Safe) ---
  function astToCode(node) {
    if (!node) return '0';
    if (node.type === 'num') return `${node.val}`;
    if (node.type === 'sym') {
      if (node.name === 'i' || node.name === 'j' || node.name === 'I' || node.name === 'J') {
        return 'i';
      }
      return node.name;
    }
    const fn = node.fn, args = node.args;
    if (fn === '+') return `_add(${astToCode(args[0])}, ${astToCode(args[1])})`;
    if (fn === '-') return args.length === 1 ? `_neg(${astToCode(args[0])})` : `_sub(${astToCode(args[0])}, ${astToCode(args[1])})`;
    if (fn === '*') return `_mul(${astToCode(args[0])}, ${astToCode(args[1])})`;
    if (fn === '/') return `_div(${astToCode(args[0])}, ${astToCode(args[1])})`;
    if (fn === '^' || fn === '**') return `_pow(${astToCode(args[0])}, ${astToCode(args[1])})`;
    return `${fn}(${args.map(astToCode).join(', ')})`;
  }

  return {
    tokenize,
    numNode,
    symNode,
    opNode,
    parse,
    astToCode
  };
});
