const mnn = require('../index.js');

function validateInstallation() {
    console.log('验证 MNN 预编译包安装...\n');
    
    const isValid = mnn.validate();
    
    if (isValid) {
        console.log('\n✅ MNN 预编译包安装成功!');
        
        // 显示配置信息
        const config = mnn.getGypConfig();
        console.log('\n📋 node-gyp 配置:');
        console.log('Include 目录:', config.include_dirs);
        console.log('Library 目录:', config.library_dirs);
        console.log('链接库:', config.libraries);
        
    } else {
        console.error('\n❌ 安装验证失败');
        console.log('支持的平台: macOS (Universal), Windows x64, Linux x64');
        process.exit(1);
    }
}

if (require.main === module) {
    validateInstallation();
}