const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

class MNNPrebuilt {
    constructor() {
        this.platform = process.platform;
        this.arch = process.arch;
        this.basePath = __dirname;
    }
    
    // 获取平台标识符 - macOS 统一使用 universal
    getPlatformKey() {
        if (this.platform === 'darwin') {
            return 'darwin-universal';  // macOS 统一使用 universal
        }
        return `${this.platform}-${this.arch}`;
    }
    
    getIncludePath() {
        const platformKey = this.getPlatformKey();
        const includePath = path.join(this.basePath, 'lib', platformKey, 'include');
        
        if (!fs.existsSync(includePath)) {
            throw new Error(`不支持的平台: ${platformKey}`);
        }
        
        return includePath;
    }
    
    getLibPath() {
        const platformKey = this.getPlatformKey();
        const libPath = path.join(this.basePath, 'lib', platformKey, 'lib');
        
        if (!fs.existsSync(libPath)) {
            throw new Error(`不支持的平台: ${platformKey}`);
        }
        
        return libPath;
    }
    
    // 获取库文件信息
    getLibraries() {
        const libPath = this.getLibPath();
        const files = fs.readdirSync(libPath);
        
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
            } else if (this.platform === 'darwin' && ext === '') {
                // macOS 下没有扩展名的文件通常是通用二进制
                libraries.universal.push(fullPath);
            }
        });
        
        return libraries;
    }
    
    // 获取库名称（用于链接）
    getLibraryNames() {
        const libraries = this.getLibraries();
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
    
    // 生成 node-gyp 配置
    getGypConfig() {
        const includePath = this.getIncludePath();
        const libPath = this.getLibPath();
        const libNames = this.getLibraryNames();
        
        const config = {
            include_dirs: [includePath],
            library_dirs: [libPath],
            libraries: []
        };
        
        // 根据平台生成不同的链接参数
        if (this.platform === 'darwin') {
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
    
    // 检查是否为通用二进制文件
    isUniversalBinary(filePath) {
        if (this.platform !== 'darwin') {
            return false;
        }
        
        try {
            const output = execSync(`file "${filePath}"`, { encoding: 'utf8' });
            return output.includes('universal binary') || output.includes('Mach-O universal binary');
        } catch (error) {
            return false;
        }
    }
    
    // 获取通用二进制文件的架构信息
    getUniversalBinaryInfo(filePath) {
        if (!this.isUniversalBinary(filePath)) {
            return null;
        }
        
        try {
            const output = execSync(`lipo -info "${filePath}"`, { encoding: 'utf8' });
            const match = output.match(/Architectures in the fat file: .* are: (.+)/);
            
            if (match) {
                return {
                    architectures: match[1].split(' ').map(arch => arch.trim()),
                    isUniversal: true
                };
            }
        } catch (error) {
            console.warn('无法获取通用二进制架构信息:', error.message);
        }
        
        return null;
    }
    
    // 复制动态库
    copyDynamicLibraries(destDir) {
        const libraries = this.getLibraries();
        const copied = [];
        
        if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
        }
        
        // 复制动态库
        [...libraries.dynamic, ...libraries.universal].forEach(libPath => {
            const fileName = path.basename(libPath);
            const destPath = path.join(destDir, fileName);
            
            try {
                fs.copyFileSync(libPath, destPath);
                copied.push(destPath);
                console.log(`复制库文件: ${fileName}`);
                
                // 如果是 macOS 的通用二进制，显示架构信息
                if (this.platform === 'darwin') {
                    const info = this.getUniversalBinaryInfo(libPath);
                    if (info) {
                        console.log(`  架构: ${info.architectures.join(', ')}`);
                    }
                }
            } catch (error) {
                console.error(`复制 ${fileName} 失败:`, error.message);
            }
        });
        
        return copied;
    }
    
    // 验证安装
    validate() {
        try {
            const includePath = this.getIncludePath();
            const libPath = this.getLibPath();
            const libraries = this.getLibraries();
            
            console.log(`✓ 平台: ${this.getPlatformKey()}`);
            console.log(`✓ 包含目录: ${includePath}`);
            console.log(`✓ 库目录: ${libPath}`);
            
            const totalLibs = libraries.static.length + libraries.dynamic.length + libraries.universal.length;
            console.log(`✓ 找到库文件: ${totalLibs} 个`);
            
            if (this.platform === 'darwin') {
                // 验证通用二进制
                libraries.universal.forEach(lib => {
                    const info = this.getUniversalBinaryInfo(lib);
                    const fileName = path.basename(lib);
                    
                    if (info) {
                        console.log(`✓ ${fileName}: 通用二进制 (${info.architectures.join(', ')})`);
                    } else {
                        console.log(`? ${fileName}: 非通用二进制`);
                    }
                });
            }
            
            return true;
        } catch (error) {
            console.error('验证失败:', error.message);
            return false;
        }
    }
}

module.exports = new MNNPrebuilt();