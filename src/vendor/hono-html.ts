export function html(strings: TemplateStringsArray, ...values: unknown[]): string {
  let result = '';
  for (let i = 0; i < strings.length; i += 1) {
    result += strings[i];
    if (i < values.length) {
      const value = values[i];
      if (Array.isArray(value)) {
        result += value.join('');
      } else {
        result += String(value ?? '');
      }
    }
  }
  return result;
}
