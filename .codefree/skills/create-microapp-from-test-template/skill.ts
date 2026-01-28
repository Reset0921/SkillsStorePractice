/**
 * 基于 child-test-manage 模板创建微应用技能
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// 模板配置常量
const TEMPLATE_CONFIG = {
  templatePath: 'project/child-test-manage',
  oldName: 'test',
  oldPackageName: 'child-test-manage',
  oldPort: '6015',
  oldTitle: '测试微应用',
}

interface CreateMicroAppOptions {
  /** 微应用名称 - 用于路由和 qiankun 注册 */
  name: string
  /** 包名称 - package.json 中的 name */
  packageName: string
  /** 端口号 - 开发服务器端口 */
  port: string
  /** 中文标题 - 页面显示的中文名称 */
  title: string
  /** 主应用配置文件路径 */
  mainConfigPath?: string
  /** 项目根目录 (默认为当前工作目录) */
  projectRoot?: string
}

/**
 * 替换文件内容中的占位符
 */
function replaceInFile(filePath: string, replacements: Record<string, string>): void {
  if (!fs.existsSync(filePath)) return

  let content = fs.readFileSync(filePath, 'utf-8')
  for (const [key, value] of Object.entries(replacements)) {
    content = content.replaceAll(key, value)
  }
  fs.writeFileSync(filePath, content, 'utf-8')
}

/**
 * 递归复制目录，跳过不需要的目录
 */
function copyDirectory(src: string, dest: string, skipDirs: string[] = ['node_modules', 'dist', '.git', '.vite', '.DS_Store']): void {
  fs.mkdirSync(dest, { recursive: true })
  const entries = fs.readdirSync(src, { withFileTypes: true })

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)

    if (entry.isDirectory()) {
      if (skipDirs.includes(entry.name)) {
        continue
      }
      copyDirectory(srcPath, destPath, skipDirs)
    } else if (!entry.name.startsWith('.eslintcache') && !entry.name.includes('.mjs')) {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

/**
 * 查找配置文件（支持 .ts 和 .js）
 */
function findConfigFile(dir: string, basename: string): string | null {
  const tsPath = path.join(dir, `${basename}.ts`)
  const jsPath = path.join(dir, `${basename}.js`)

  if (fs.existsSync(tsPath)) return tsPath
  if (fs.existsSync(jsPath)) return jsPath
  return null
}

/**
 * 检测主应用配置文件路径
 */
function detectMainConfig(projectRoot: string): string | null {
  const possiblePaths = [
    'project/main-portal/src/config.js',
    'project/main-portal/src/config.ts',
    'src/config.js',
    'src/config.ts',
    'main/src/config.js',
    'main/src/config.ts',
  ]

  for (const p of possiblePaths) {
    const fullPath = path.join(projectRoot, p)
    if (fs.existsSync(fullPath)) return fullPath
  }

  return null
}

/**
 * 在主应用配置中注册微应用
 */
function registerToMainApp(
  configPath: string,
  name: string,
  port: string,
  title: string
): void {
  if (!fs.existsSync(configPath)) {
    console.log(`⚠️  主应用配置文件不存在: ${configPath}`)
    return
  }

  let content = fs.readFileSync(configPath, 'utf-8')

  const newEntry = `  { name: "${name}", port: "${port}" }, // ${title}`

  if (content.includes('export const microSet')) {
    content = content.replace(
      /(\s*)(\{ name: "[^"]+", port: "\d+" }\s*;?\s*)(\])(\s*)(export)/,
      `$1$2$1${newEntry}$1$3$4$5`
    )
  } else if (content.includes('microSet') && content.includes('];')) {
    content = content.replace(
      /(\s*)(\];)/,
      `$1${newEntry}\n$1$2`
    )
  }

  fs.writeFileSync(configPath, content, 'utf-8')
  console.log(`✅ 已注册到主应用: ${configPath}`)
}

/**
 * 更新根 package.json
 */
function updateRootPackage(
  rootPackagePath: string,
  name: string,
  packageName: string,
  projectPath: string
): void {
  if (!fs.existsSync(rootPackagePath)) {
    console.log(`⚠️  根 package.json 不存在: ${rootPackagePath}`)
    return
  }

  const rootPackage = JSON.parse(fs.readFileSync(rootPackagePath, 'utf-8'))

  if (!rootPackage.scripts) rootPackage.scripts = {}
  if (!rootPackage.scripts[name]) {
    rootPackage.scripts[name] = `yarn workspace ${packageName} dev`
  }

  if (!rootPackage.workspaces) {
    rootPackage.workspaces = []
  }
  if (Array.isArray(rootPackage.workspaces) && !rootPackage.workspaces.includes(projectPath)) {
    rootPackage.workspaces.push(projectPath)
  }

  fs.writeFileSync(rootPackagePath, JSON.stringify(rootPackage, null, 2) + '\n', 'utf-8')
  console.log(`✅ 已更新根 package.json`)
}

/**
 * 创建微应用
 */
export async function createMicroApp(options: CreateMicroAppOptions): Promise<void> {
  const {
    name,
    packageName,
    port,
    title,
    mainConfigPath,
    projectRoot = process.cwd(),
  } = options

  const templateDir = path.join(projectRoot, TEMPLATE_CONFIG.templatePath)
  const targetDir = path.join(projectRoot, 'project', packageName)
  const projectPath = `project/${packageName}`

  if (!fs.existsSync(templateDir)) {
    throw new Error(`模板目录不存在: ${templateDir}`)
  }

  if (fs.existsSync(targetDir)) {
    throw new Error(`目标目录已存在: ${targetDir}`)
  }

  console.log(`\n🚀 开始创建微应用: ${name}`)
  console.log(`   包名: ${packageName}`)
  console.log(`   端口: ${port}`)
  console.log(`   标题: ${title}`)
  console.log(`   模板: ${TEMPLATE_CONFIG.templatePath}\n`)

  // 1. 复制模板目录
  console.log('📁 复制模板目录...')
  copyDirectory(templateDir, targetDir)

  // 2. 修改 package.json
  console.log('📝 修改 package.json...')
  replaceInFile(path.join(targetDir, 'package.json'), {
    [`"name": "${TEMPLATE_CONFIG.oldPackageName}"`]: `"name": "${packageName}"`,
  })

  // 3. 修改 vite.config
  const viteConfig = findConfigFile(targetDir, 'vite.config')
  if (viteConfig) {
    console.log('📝 修改 vite.config...')
    replaceInFile(viteConfig, {
      `base: '/${TEMPLATE_CONFIG.oldName}/'`: `base: '/${name}/'`,
      `base: '/${TEMPLATE_CONFIG.oldName}'`: `base: '/${name}'`,
      `origin: 'http://localhost:${TEMPLATE_CONFIG.oldPort}'`: `origin: 'http://localhost:${port}'`,
      `port: ${TEMPLATE_CONFIG.oldPort}`: `port: ${port}`,
    })
  }

  // 4. 修改 presets/index
  const presetsIndex = findConfigFile(path.join(targetDir, 'presets'), 'index')
  if (presetsIndex) {
    console.log('📝 修改 presets/index...')
    replaceInFile(presetsIndex, {
      `qiankun('${TEMPLATE_CONFIG.oldName}'`: `qiankun('${name}'`,
      `qiankun("${TEMPLATE_CONFIG.oldName}"`: `qiankun("${name}"`,
    })
  }

  // 5. 修改 index.html
  const indexPath = path.join(targetDir, 'index.html')
  if (fs.existsSync(indexPath)) {
    console.log('📝 修改 index.html...')
    replaceInFile(indexPath, {
      `<title>${TEMPLATE_CONFIG.oldTitle}</title>`: `<title>${title}</title>`,
      `<div id="${TEMPLATE_CONFIG.oldName}">`: `<div id="${name}">`,
      `#${TEMPLATE_CONFIG.oldName} {`: `#${name} {`,
    })
  }

  // 6. 修改 src/main
  const mainIndex = findConfigFile(path.join(targetDir, 'src'), 'main')
  if (mainIndex) {
    console.log('📝 修改 src/main...')
    replaceInFile(mainIndex, {
      `'#${TEMPLATE_CONFIG.oldName}'`: `'#${name}'`,
      `"#${TEMPLATE_CONFIG.oldName}"`: `"#${name}"`,
    })
  }

  // 7. 修改 src/plugins/router
  const routerPath = path.join(targetDir, 'src/plugins/router.ts')
  const routerPathJs = path.join(targetDir, 'src/plugins/router.js')
  const routerFile = fs.existsSync(routerPath) ? routerPath : (fs.existsSync(routerPathJs) ? routerPathJs : null)

  if (routerFile) {
    console.log('📝 修改 src/plugins/router...')
    replaceInFile(routerFile, {
      `? '/${TEMPLATE_CONFIG.oldName}' : '/${TEMPLATE_CONFIG.oldName}/'`: `? '/${name}' : '/${name}/'`,
      `? '/${TEMPLATE_CONFIG.oldName}/' : '/${TEMPLATE_CONFIG.oldName}'`: `? '/${name}/' : '/${name}'`,
      `base: '/${TEMPLATE_CONFIG.oldName}'`: `base: '/${name}'`,
      `base: '/${TEMPLATE_CONFIG.oldName}/'`: `base: '/${name}/'`,
    })
  }

  // 8. 注册到主应用
  console.log('📝 注册到主应用...')
  let configPath = mainConfigPath

  if (!configPath) {
    configPath = detectMainConfig(projectRoot)
  }

  if (configPath) {
    const fullPath = path.isAbsolute(configPath) ? configPath : path.join(projectRoot, configPath)
    registerToMainApp(fullPath, name, port, title)
  } else {
    console.log('⚠️  未找到主应用配置文件，请手动注册微应用')
  }

  // 9. 更新根 package.json
  console.log('📝 更新根 package.json...')
  const rootPackagePath = path.join(projectRoot, 'package.json')
  updateRootPackage(rootPackagePath, name, packageName, projectPath)

  console.log('\n✅ 微应用创建完成!\n')
  console.log('后续操作:')
  console.log(`  1. cd ${targetDir}`)
  console.log(`  2. yarn install  (在项目根目录执行)`)
  console.log(`  3. yarn ${name}    (启动微应用)`)
  console.log(`  4. 访问 http://localhost:${port} 或主应用的 /${name} 路由\n`)
}

/**
 * 技能入口函数
 */
export default async function runSkill(context: any): Promise<void> {
  const { ask, workspacePath } = context
  const projectRoot = workspacePath || process.cwd()

  const answers = await ask([
    {
      type: 'input',
      name: 'name',
      message: '微应用名称 (用于路由，如: exam, art, micro):',
      validate: (v: string) => /^[a-z][a-z0-9-]*$/.test(v) || '请输入小写字母开头的名称',
    },
    {
      type: 'input',
      name: 'packageName',
      message: '包名称 (如: child-exam-manage):',
      default: (answers: any) => `child-${answers.name}-manage`,
      validate: (v: string) => /^@?[a-z0-9][a-z0-9-]*\/?[a-z0-9-]+$/.test(v) || '请输入有效的包名',
    },
    {
      type: 'input',
      name: 'port',
      message: '端口号:',
      default: '6002',
      validate: (v: string) => /^\d{4,5}$/.test(v) || '请输入4-5位端口号',
    },
    {
      type: 'input',
      name: 'title',
      message: '中文标题:',
      default: '微应用',
    },
  ])

  await createMicroApp({
    ...answers,
    projectRoot,
  })
}