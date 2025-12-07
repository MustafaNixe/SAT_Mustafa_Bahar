const fs = require('fs');
const path = require('path');

console.log('🚀 Performans Testi Başlatılıyor...\n');

const results = {
  bundleSize: {},
  components: {},
  optimizations: {},
  issues: []
};

function analyzeFile(filePath, relativePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const size = fs.statSync(filePath).size;
    
    const hasUseMemo = content.includes('useMemo');
    const hasUseCallback = content.includes('useCallback');
    const hasReactMemo = content.includes('React.memo');
    const hasFlatList = content.includes('FlatList');
    const hasScrollView = content.includes('ScrollView');
    const hasImage = content.includes('<Image') || content.includes('expo-image');
    const hasUnoptimizedMap = /\.map\([^)]*=>[^)]*\{/.test(content) && !hasFlatList;
    
    return {
      size,
      lines: lines.length,
      hasUseMemo,
      hasUseCallback,
      hasReactMemo,
      hasFlatList,
      hasScrollView,
      hasImage,
      hasUnoptimizedMap,
      path: relativePath
    };
  } catch (error) {
    return null;
  }
}

function walkDir(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.expo') && !file.includes('.git')) {
        walkDir(filePath, fileList);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

const rootDir = path.join(__dirname, '..');
const appDir = path.join(rootDir, 'app');
const componentsDir = path.join(rootDir, 'components');

console.log('📊 Dosya Analizi Yapılıyor...\n');

const appFiles = walkDir(appDir);
const componentFiles = walkDir(componentsDir);

let totalSize = 0;
let totalLines = 0;
let useMemoCount = 0;
let useCallbackCount = 0;
let reactMemoCount = 0;
let flatListCount = 0;
let scrollViewCount = 0;
let unoptimizedMapCount = 0;

const fileAnalysis = [];

[...appFiles, ...componentFiles].forEach(filePath => {
  const relativePath = path.relative(rootDir, filePath);
  const analysis = analyzeFile(filePath, relativePath);
  
  if (analysis) {
    fileAnalysis.push(analysis);
    totalSize += analysis.size;
    totalLines += analysis.lines;
    if (analysis.hasUseMemo) useMemoCount++;
    if (analysis.hasUseCallback) useCallbackCount++;
    if (analysis.hasReactMemo) reactMemoCount++;
    if (analysis.hasFlatList) flatListCount++;
    if (analysis.hasScrollView) scrollViewCount++;
    if (analysis.hasUnoptimizedMap) unoptimizedMapCount++;
  }
});

results.bundleSize = {
  totalFiles: fileAnalysis.length,
  totalSize: (totalSize / 1024).toFixed(2) + ' KB',
  totalLines,
  averageFileSize: (totalSize / fileAnalysis.length / 1024).toFixed(2) + ' KB',
  averageLines: Math.round(totalLines / fileAnalysis.length)
};

results.optimizations = {
  useMemo: useMemoCount,
  useCallback: useCallbackCount,
  reactMemo: reactMemoCount,
  flatList: flatListCount,
  scrollView: scrollViewCount,
  unoptimizedMap: unoptimizedMapCount
};

console.log('📦 Bundle Size Analizi:');
console.log(`   Toplam Dosya: ${results.bundleSize.totalFiles}`);
console.log(`   Toplam Boyut: ${results.bundleSize.totalSize}`);
console.log(`   Toplam Satır: ${results.bundleSize.totalLines}`);
console.log(`   Ortalama Dosya Boyutu: ${results.bundleSize.averageFileSize}`);
console.log(`   Ortalama Satır: ${results.bundleSize.averageLines}\n`);

console.log('⚡ Optimizasyon Analizi:');
console.log(`   useMemo Kullanımı: ${results.optimizations.useMemo} dosya`);
console.log(`   useCallback Kullanımı: ${results.optimizations.useCallback} dosya`);
console.log(`   React.memo Kullanımı: ${results.optimizations.reactMemo} dosya`);
console.log(`   FlatList Kullanımı: ${results.optimizations.flatList} dosya`);
console.log(`   ScrollView Kullanımı: ${results.optimizations.scrollView} dosya`);
console.log(`   ⚠️  Optimize Edilmemiş .map(): ${results.optimizations.unoptimizedMap} dosya\n`);

if (results.optimizations.scrollView > results.optimizations.flatList) {
  results.issues.push({
    type: 'warning',
    message: `${results.optimizations.scrollView} dosyada ScrollView kullanılıyor. FlatList daha performanslı olabilir.`
  });
}

if (results.optimizations.unoptimizedMap > 0) {
  results.issues.push({
    type: 'warning',
    message: `${results.optimizations.unoptimizedMap} dosyada optimize edilmemiş .map() kullanımı tespit edildi.`
  });
}

const largeFiles = fileAnalysis
  .filter(f => f.size > 20 * 1024)
  .sort((a, b) => b.size - a.size)
  .slice(0, 5);

if (largeFiles.length > 0) {
  console.log('📈 En Büyük Dosyalar:');
  largeFiles.forEach((file, index) => {
    console.log(`   ${index + 1}. ${file.path} (${(file.size / 1024).toFixed(2)} KB, ${file.lines} satır)`);
  });
  console.log('');
}

const filesWithoutOptimization = fileAnalysis.filter(f => 
  !f.hasUseMemo && !f.hasUseCallback && !f.hasReactMemo && f.lines > 100
);

if (filesWithoutOptimization.length > 0) {
  console.log('⚠️  Optimizasyon Eksik Dosyalar (>100 satır):');
  filesWithoutOptimization.slice(0, 5).forEach(file => {
    console.log(`   - ${file.path} (${file.lines} satır)`);
  });
  console.log('');
}

console.log('🔍 Performans Sorunları:');
if (results.issues.length === 0) {
  console.log('   ✅ Kritik sorun bulunamadı!\n');
} else {
  results.issues.forEach((issue, index) => {
    console.log(`   ${index + 1}. [${issue.type.toUpperCase()}] ${issue.message}`);
  });
  console.log('');
}

const optimizationScore = Math.round(
  ((useMemoCount + useCallbackCount + reactMemoCount) / fileAnalysis.length) * 100
);

console.log('📊 Performans Skoru:');
console.log(`   Optimizasyon Skoru: ${optimizationScore}%`);
console.log(`   FlatList Kullanım Oranı: ${Math.round((flatListCount / fileAnalysis.length) * 100)}%`);

if (optimizationScore >= 70) {
  console.log('   ✅ Mükemmel optimizasyon seviyesi!\n');
} else if (optimizationScore >= 50) {
  console.log('   ⚠️  Orta seviye optimizasyon. İyileştirme yapılabilir.\n');
} else {
  console.log('   ❌ Düşük optimizasyon seviyesi. İyileştirme gerekli!\n');
}

console.log('✅ Performans testi tamamlandı!');

