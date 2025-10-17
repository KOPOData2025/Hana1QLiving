const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// 빌드 성능 최적화
config.transformer.minifierConfig = {
  keep_classnames: true,
  keep_fnames: true,
  mangle: {
    keep_classnames: true,
    keep_fnames: true,
  },
};

// 캐시 최적화
config.resolver.enableGlobalPackages = true;

// 번들 분할 비활성화 (개발 모드에서 빠른 빌드)
config.serializer.createModuleIdFactory = () => (path) => {
  return path;
};

module.exports = config;