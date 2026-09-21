import nextVitals from 'eslint-config-next/core-web-vitals';
// Retain the pre-upgrade ruleset; React Compiler adoption is a separate checkpoint.
const compilerRules = Object.fromEntries(nextVitals.flatMap(config => Object.keys(config.rules || {}))
  .filter(name => name.startsWith('react-hooks/') && !['react-hooks/rules-of-hooks', 'react-hooks/exhaustive-deps'].includes(name))
  .map(name => [name, 'off']));
const config = [...nextVitals, { rules: compilerRules }];
export default config;
