const { execSync } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');

function getPlatformPackage() {
  const platform = os.platform();
  const arch = os.arch();
  
  switch (platform) {
    case 'darwin':
      return '@378q/mnn-darwin-universal';
    case 'win32':
      if (arch === 'x64') return '@378q/mnn-win32-x64';
      break;
    case 'linux':
      if (arch === 'x64') return '@378q/mnn-linux-x64';
      break;
  }
  
  throw new Error(`Unsupported platform: ${platform}-${arch}`);
}

async function installPlatformPackage() {
  try {
    const packageName = getPlatformPackage();
    console.log(`Installing ${packageName} for ${os.platform()}-${os.arch()}`);
    
    // 检查是否已经安装
    const packagePath = path.join(__dirname, 'node_modules', packageName);
    if (fs.existsSync(packagePath)) {
      console.log(`${packageName} already installed`);
      return;
    }

    if (fs.existsSync("yarn.lock"))
    
    // 安装对应平台的包
    execSync(`npm install ${packageName}`, { 
      stdio: 'inherit',
      cwd: __dirname
    });
    
    console.log(`Successfully installed ${packageName}`);
    
  } catch (error) {
    console.error(`Failed to install platform package: ${error.message}`);
    process.exit(1);
  }
}

// 如果是通过 npm install 调用的，则自动安装
if (require.main === module) {
  installPlatformPackage();
}

module.exports = { installPlatformPackage, getPlatformPackage };