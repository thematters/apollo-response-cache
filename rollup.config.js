import external from 'rollup-plugin-peer-deps-external'
import typescript from '@rollup/plugin-typescript'
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'

import pkg from './package.json'



export default [{
  input: 'src/index.ts',
  output: [{
    file: pkg.main,
    format: 'cjs',
    name: pkg.name,
  }, ],
  plugins: [
    commonjs({
      include: 'node_modules/**',
    }),
    external(),
    resolve(),
    typescript(),
  ],
}, ]
