function transpileCondition(cond) {
  if (!cond) return 'true';
  let c = cond.trim();
  // Chained comparisons: a <= x <= b
  c = c.replace(/([a-zA-Z0-9_.-]+)\s*([<>]=?)\s*([a-zA-Z0-9_]+)\s*([<>]=?)\s*([a-zA-Z0-9_.-]+)/g, '($1 $2 $3 && $3 $4 $5)');
  // Single equals -> ===
  c = c.replace(/(?<![<>!=])=(?!=)/g, '===');
  return c;
}

console.log('-2 <= x <= 2 =>', transpileCondition('-2 <= x <= 2'));
console.log('n >= 0 =>', transpileCondition('n >= 0'));
console.log('x != 0 =>', transpileCondition('x != 0'));
console.log('x = 2 =>', transpileCondition('x = 2'));

const fn = new Function('x', 'n', `return ${transpileCondition('-2 <= x <= 2')};`);
console.log('fn(0):', fn(0));
console.log('fn(2):', fn(2));
console.log('fn(2.1):', fn(2.1));
