declare module '@assets/*'
declare module '@components/*'
declare module '@data/*'
declare module '@layouts/*'
declare module '@plugins/*'
declare module '@styles/*'
declare module '@utils/*'
declare module '@content/*'

declare module 'remark-pangu' {
  type PanguPlugin = () => (tree: unknown) => void
  const pangu: PanguPlugin
  export default pangu
}
