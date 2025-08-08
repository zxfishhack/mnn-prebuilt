const path = require('path');
const fs = require('fs');
const os = require('os');

function getPlatformPackage() {
  const platform = os.platform();
  const arch = os.arch();
  
  let packageName;
  
  switch (platform) {
    case 'darwin':
      packageName = '@378q/mnn-darwin-universal';
      break;
    case 'win32':
      if (arch === 'x64') {
        packageName = '@378q/mnn-win32-x64';
      } else {
        throw new Error(`Unsupported Windows architecture: ${arch}`);
      }
      break;
    case 'linux':
      if (arch === 'x64') {
        packageName = '@378q/mnn-linux-x64';
      } else {
        throw new Error(`Unsupported Linux architecture: ${arch}`);
      }
      break;
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
  
  return packageName;
}

function getIncludePath() {
  const pkg = require(getPlatformPackage());

  return pkg.includePath;
}

function getLibPath() {
  const pkg = require(getPlatformPackage());

  return pkg.libPath;
}

function getLibraries() {
  const libPath = getLibPath();
  const files = fs.readdirSync(libPath);
  const platform = os.platform();
  const arch = os.arch();
    
  const libraries = {
      static: [],
      dynamic: [],
      universal: []
  };
  
  files.forEach(file => {
      const fullPath = path.join(libPath, file);
      const ext = path.extname(file);
      
      if (ext === '.lib' || ext === '.a') {
          libraries.static.push(fullPath);
      } else if (ext === '.dll' || ext === '.dylib' || ext === '.so') {
          libraries.dynamic.push(fullPath);
      } else if (platform === 'darwin' && ext === '') {
          // macOS 下没有扩展名的文件通常是通用二进制
          libraries.universal.push(fullPath);
      }
  });
  
  return libraries;
}

function getLibraryNames() {
    const libraries = getLibraries();
    const names = [];
    
    // 处理静态库
    libraries.static.forEach(lib => {
        let libName = path.basename(lib, path.extname(lib));
        // 移除 'lib' 前缀（Unix 系统）
        if (libName.startsWith('lib')) {
            libName = libName.substring(3);
        }
        names.push(libName);
    });
    
    // 处理通用二进制（macOS）
    libraries.universal.forEach(lib => {
        const libName = path.basename(lib);
        names.push(libName);
    });
    
    return names;
}

function getGypConfig() {
    const includePath = getIncludePath();
    const libPath = getLibPath();
    const libNames = getLibraryNames();
    const platform = os.platform();
    
    const config = {
        include_dirs: [includePath],
        library_dirs: [libPath],
        libraries: []
    };
    
    // 根据平台生成不同的链接参数
    if (platform === 'darwin') {
        // macOS: 直接使用文件路径或 -l 参数
        libNames.forEach(name => {
            if (name === 'MNN') {
                // 对于通用二进制，使用完整路径
                config.libraries.push(path.join(libPath, name));
            } else {
                config.libraries.push(`-l${name}`);
            }
        });
    } else {
        // Windows/Linux: 使用 -l 参数
        libNames.forEach(name => {
            config.libraries.push(`-l${name}`);
        });
    }
    
    return config;
}

module.exports = {
  getPlatformPackage,
  getLibraries,
  getLibraryNames,
  getIncludePath,
  getLibPath,
  getGypConfig,
};