// Simple performance test script
import fs from 'node:fs'
import path from 'node:path'

function analyzeCSS() {
  const distPath = './dist'

  if (!fs.existsSync(distPath)) {
    console.log('❌ Build directory not found. Please run "pnpm build" first.')
    return
  }

  // Find CSS files
  const cssFiles = []

  function findCSSFiles(dir) {
    const files = fs.readdirSync(dir)
    files.forEach((file) => {
      const filePath = path.join(dir, file)
      const stat = fs.statSync(filePath)

      if (stat.isDirectory()) {
        findCSSFiles(filePath)
      } else if (file.endsWith('.css')) {
        const size = stat.size
        cssFiles.push({
          path: filePath,
          size: size,
          sizeKB: (size / 1024).toFixed(2),
        })
      }
    })
  }

  findCSSFiles(distPath)

  console.log('📊 CSS File Analysis:')
  console.log('='.repeat(50))

  let totalSize = 0
  cssFiles.forEach((file) => {
    console.log(`📄 ${file.path}`)
    console.log(`   Size: ${file.sizeKB} KB`)
    totalSize += file.size
  })

  console.log('='.repeat(50))
  console.log(`📈 Total CSS Size: ${(totalSize / 1024).toFixed(2)} KB`)
  console.log(`📦 Number of CSS files: ${cssFiles.length}`)

  // Performance recommendations
  console.log('\n🚀 Performance Recommendations:')
  if (totalSize > 50 * 1024) {
    console.log(
      '⚠️  Total CSS size is over 50KB. Consider further optimization.',
    )
  } else {
    console.log('✅ CSS size is optimized (under 50KB).')
  }

  if (cssFiles.length > 5) {
    console.log(
      '⚠️  Many CSS files detected. Consider bundling for fewer HTTP requests.',
    )
  } else {
    console.log('✅ Good number of CSS files for HTTP/2.')
  }
}

analyzeCSS()
