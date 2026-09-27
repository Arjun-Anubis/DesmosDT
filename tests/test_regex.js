function transpileCode(rhs) {
  let code = (rhs || '0')
    .replace(/delta\[([^\]]+)\]/g, 'delta($1)')
    .replace(/u\[([^\]]+)\]/g, 'u($1)')
    .replace(/r\[([^\]]+)\]/g, 'r($1)')
    .replace(/rect\[([^\]]+)\]/g, 'rect($1)')
    .replace(/sinc\[([^\]]+)\]/g, 'sinc($1)')
    .replace(/([a-zA-Z][a-zA-Z0-9_]*)\[([^\]]+)\]/g, '$1($2)')
    .replace(/\^/g, '**');

  // Implicit multiplication:
  // 1. Number before variable or paren: 2x -> 2*x, 3(x+1) -> 3*(x+1)
  // Ensure the number is NOT part of an identifier like s1(n)
  code = code.replace(/(?<![a-zA-Z_])(\d+(?:\.\d+)?)\s*([a-zA-Z(])/g, (match, p1, p2) => {
    return `${p1}*${p2}`;
  });

  // 2. Closing paren before number or variable or opening paren:
  // (x+1)x -> (x+1)*x, (x+1)(x-1) -> (x+1)*(x-1)
  code = code.replace(/(\))\s*([a-zA-Z0-9_(])/g, '$1*$2');

  return code;
}

console.log('s1(n) - s2(n) =>', transpileCode('s1[n] - s2[n]'));
console.log('2x + 3sin(x) =>', transpileCode('2x + 3sin(x)'));
console.log('4(x+1) =>', transpileCode('4(x+1)'));
console.log('s1[n-2] =>', transpileCode('s1[n-2]'));
