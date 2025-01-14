const pngToIco = require('png-to-ico');
const fs = require('fs');
const path = require('path');

async function convertToIco() {
    try {
        // 读取原始图标文件
        const sourceIcon = fs.readFileSync('icon.ico');
        
        // 创建临时 PNG 文件
        fs.writeFileSync('temp.png', sourceIcon);
        
        // 转换为标准 ICO 格式
        const buf = await pngToIco([
            'temp.png'
        ]);
        
        // 保存为新的 ICO 文件
        fs.writeFileSync('build/icon.ico', buf);
        
        // 清理临时文件
        fs.unlinkSync('temp.png');
        
        console.log('图标转换成功！');
    } catch (error) {
        console.error('转换失败:', error);
    }
}

convertToIco(); 