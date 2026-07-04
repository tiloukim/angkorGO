module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Resolve @/* and the shared workspace package.
      [
        'module-resolver',
        {
          alias: {
            '@': './',
            '@angkorgo/shared': '../../packages/shared/src/index.ts',
          },
        },
      ],
    ],
  };
};
