const { app, BrowserWindow, BrowserView, ipcMain, Menu, dialog } = require('electron')
const path = require('path')

let mainWindow = null
let views = []
let currentView = null
let tabsView = null

function createWindow() {
    // 创建主窗口
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        icon: path.join(__dirname, 'icon.ico'),
        frame: true,  // 保留窗口框架
        autoHideMenuBar: false,  // 不自动隐藏菜单栏
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webviewTag: true,
            webSecurity: false  // 允许加载本地资源
        }
    })

    // 创建标签页和地址栏视图
    tabsView = new BrowserView({
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false  // 允许加载本地资源
        }
    })

    mainWindow.addBrowserView(tabsView)
    tabsView.setBounds({ x: 0, y: 0, width: mainWindow.getBounds().width, height: 80 })
    tabsView.setAutoResize({ width: true })
    tabsView.webContents.loadFile(path.join(__dirname, 'tabs.html'))

    // 创建第一个标签页
    createNewTab(path.join(__dirname, 'index.html'))

    // 创建菜单
    createChineseMenu()

    // 监听窗口大小变化
    mainWindow.on('resize', () => {
        const bounds = mainWindow.getBounds()
        tabsView.setBounds({ x: 0, y: 0, width: bounds.width, height: 80 })
        if (currentView) {
            currentView.setBounds({ x: 0, y: 80, width: bounds.width, height: bounds.height - 80 })
        }
    })

    // 监听新窗口打开请求
    mainWindow.webContents.on('new-window', (event, url) => {
        event.preventDefault()
        createNewTab(url)
    })

    // 监听窗口关闭
    mainWindow.on('closed', () => {
        mainWindow = null
        views.forEach(view => {
            if (view && view.webContents && !view.webContents.isDestroyed()) {
                view.webContents.destroy()
            }
        })
        views = []
        currentView = null
        tabsView = null
    })
}

function createNewTab(url) {
    const view = new BrowserView({
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: false,
            sandbox: false,
            nativeWindowOpen: true,
            webviewTag: true,
            javascript: true,
            webSecurity: false,  // 允许加载本地资源
            allowRunningInsecureContent: true
        }
    })

    // 先移除当前视图
    if (currentView) {
        mainWindow.removeBrowserView(currentView)
    }

    mainWindow.addBrowserView(view)
    views.push(view)
    const index = views.length - 1

    // 设置视图位置和大小
    const bounds = mainWindow.getBounds()
    view.setBounds({ x: 0, y: 80, width: bounds.width, height: bounds.height - 80 })
    view.setAutoResize({ width: true, height: true })

    // 设置新窗口打开处理
    view.webContents.setWindowOpenHandler(({ url }) => {
        createNewTab(url)
        return { action: 'deny' }
    })

    // 添加全屏支持
    view.webContents.on('enter-html-full-screen', () => {
        view.setBounds({ x: 0, y: 0, width: mainWindow.getBounds().width, height: mainWindow.getBounds().height })
        mainWindow.removeBrowserView(tabsView)
        mainWindow.setMenuBarVisibility(false)  // 隐藏菜单栏
    })

    view.webContents.on('leave-html-full-screen', () => {
        const bounds = mainWindow.getBounds()
        view.setBounds({ x: 0, y: 80, width: bounds.width, height: bounds.height - 80 })
        mainWindow.addBrowserView(tabsView)
        mainWindow.setMenuBarVisibility(true)   // 显示菜单栏
    })

    // 监听标题变化
    view.webContents.on('page-title-updated', (event, title) => {
        const index = views.indexOf(view)
        if (index !== -1 && !view.webContents.isDestroyed()) {
            const finalTitle = title || '新标签页'
            tabsView.webContents.send('update-tab', { index, title: finalTitle })
            // 如果是当前视图，同时更新窗口标题
            if (currentView === view) {
                mainWindow.setTitle(finalTitle)
            }
        }
    })

    // 加载URL
    if (url.startsWith('http://') || url.startsWith('https://')) {
        view.webContents.loadURL(url).catch(err => {
            console.error('加载URL失败:', err)
        })
    } else {
        view.webContents.loadFile(url).catch(err => {
            console.error('加载文件失败:', err)
        })
    }

    currentView = view
    mainWindow.addBrowserView(tabsView) // 确保标签栏始终在最上层
    tabsView.webContents.send('tab-created', { index, title: '新标签页' })

    // 设置导航事件监听
    setupNavigationStateListener(view)

    return view
}

function setupNavigationStateListener(view) {
    if (!view || !view.webContents) return

    const updateState = () => {
        const index = views.indexOf(view)
        if (index !== -1 && !view.webContents.isDestroyed()) {
            try {
                const url = view.webContents.getURL()
                const title = view.webContents.getTitle() || '新标签页'
                const state = {
                    canGoBack: view.webContents.canGoBack(),
                    canGoForward: view.webContents.canGoForward(),
                    isLoading: view.webContents.isLoading()
                }
                // 确保 URL 和标题更新发送到正确的标签页
                if (currentView === view) {
                    tabsView.webContents.send('update-nav-state', state)
                    tabsView.webContents.send('update-url', url)
                    tabsView.webContents.send('update-tab', { index, title })
                    mainWindow.setTitle(title)
                }
            } catch (err) {
                console.error('更新导航状态失败:', err)
            }
        }
    }

    // 清理旧的事件监听器
    const cleanupEvents = () => {
        if (view.webContents && !view.webContents.isDestroyed()) {
            view.webContents.removeAllListeners('did-start-loading')
            view.webContents.removeAllListeners('did-stop-loading')
            view.webContents.removeAllListeners('did-finish-load')
            view.webContents.removeAllListeners('did-navigate')
            view.webContents.removeAllListeners('did-navigate-in-page')
            view.webContents.removeAllListeners('page-title-updated')
        }
    }

    cleanupEvents() // 先清理旧的事件监听器

    // 设置新的事件监听器
    view.webContents.on('did-start-loading', updateState)
    view.webContents.on('did-stop-loading', updateState)
    view.webContents.on('did-finish-load', updateState)
    view.webContents.on('did-navigate', updateState)
    view.webContents.on('did-navigate-in-page', updateState)

    // 立即更新一次状态
    updateState()

    // 返回清理函数
    return cleanupEvents
}

// IPC事件处理
ipcMain.on('switch-tab', (event, index) => {
    if (views[index] && views[index].webContents && !views[index].webContents.isDestroyed()) {
        // 移除当前视图
        if (currentView) {
            mainWindow.removeBrowserView(currentView)
        }

        // 添加新视图
        mainWindow.addBrowserView(tabsView)
        mainWindow.addBrowserView(views[index])
        currentView = views[index]

        // 更新视图大小
        const bounds = mainWindow.getBounds()
        currentView.setBounds({ x: 0, y: 80, width: bounds.width, height: bounds.height - 80 })

        // 立即更新状态和标题
        try {
            const url = currentView.webContents.getURL()
            const title = currentView.webContents.getTitle() || '新标签页'
            const state = {
                canGoBack: currentView.webContents.canGoBack(),
                canGoForward: currentView.webContents.canGoForward(),
                isLoading: currentView.webContents.isLoading()
            }
            
            // 更新导航状态、URL和标题
            tabsView.webContents.send('update-nav-state', state)
            tabsView.webContents.send('update-url', url)
            tabsView.webContents.send('update-tab', { index, title })

            // 更新窗口标题
            mainWindow.setTitle(title)
        } catch (err) {
            console.error('切换标签页时更新状态失败:', err)
        }

        // 设置导航事件监听
        setupNavigationStateListener(currentView)

        // 触发一次页面标题更新事件
        currentView.webContents.emit('page-title-updated', null, currentView.webContents.getTitle() || '新标签页')
    }
})

ipcMain.on('close-tab', (event, index) => {
    if (views[index]) {
        const viewToClose = views[index]
        mainWindow.removeBrowserView(viewToClose)
        
        // 确保视图被正确销毁
        if (viewToClose && viewToClose.webContents && !viewToClose.webContents.isDestroyed()) {
            viewToClose.webContents.destroy()
        }
        
        views.splice(index, 1)
        
        if (views.length > 0) {
            const newIndex = Math.min(index, views.length - 1)
            mainWindow.addBrowserView(tabsView)
            mainWindow.addBrowserView(views[newIndex])
            currentView = views[newIndex]
            setupNavigationStateListener(currentView)
            // 通知渲染进程更新标签页
            tabsView.webContents.send('tab-removed', { index, newIndex })
        }
    }
})

ipcMain.on('new-tab', () => {
    createNewTab('index.html')
})

ipcMain.on('navigate-to-url', (event, url) => {
    if (currentView) {
        if (url.startsWith('http://') || url.startsWith('https://')) {
            currentView.webContents.loadURL(url)
        } else if (!url.includes('://')) {
            currentView.webContents.loadURL('https://' + url)
        }
    }
})

ipcMain.on('refresh-page', (event, index) => {
    if (views[index]) {
        views[index].webContents.reload()
    }
})

ipcMain.on('go-back', (event, index) => {
    if (views[index] && views[index].webContents.canGoBack()) {
        views[index].webContents.goBack()
    }
})

ipcMain.on('go-forward', (event, index) => {
    if (views[index] && views[index].webContents.canGoForward()) {
        views[index].webContents.goForward()
    }
})

function createChineseMenu() {
    const template = [
        {
            label: '文件',
            submenu: [
                {
                    label: '新建标签页',
                    accelerator: 'CmdOrCtrl+T',
                    click: () => {
                        createNewTab(path.join(__dirname, 'index.html'))
                    }
                },
                {
                    label: '关闭标签页',
                    accelerator: 'CmdOrCtrl+W',
                    click: () => {
                        if (currentView) {
                            const index = views.indexOf(currentView)
                            if (index !== -1) {
                                mainWindow.removeBrowserView(currentView)
                                views.splice(index, 1)
                                if (views.length > 0) {
                                    const newIndex = Math.max(0, index - 1)
                                    currentView = views[newIndex]
                                    mainWindow.addBrowserView(currentView)
                                }
                            }
                        }
                    }
                },
                { type: 'separator' },
                {
                    label: '退出',
                    accelerator: 'Alt+F4',
                    click: () => {
                        app.quit()
                    }
                }
            ]
        },
        {
            label: '编辑',
            submenu: [
                { label: '撤销', role: 'undo', accelerator: 'CmdOrCtrl+Z' },
                { label: '重做', role: 'redo', accelerator: 'CmdOrCtrl+Y' },
                { type: 'separator' },
                { label: '剪切', role: 'cut', accelerator: 'CmdOrCtrl+X' },
                { label: '复制', role: 'copy', accelerator: 'CmdOrCtrl+C' },
                { label: '粘贴', role: 'paste', accelerator: 'CmdOrCtrl+V' },
                { label: '全选', role: 'selectAll', accelerator: 'CmdOrCtrl+A' }
            ]
        },
        {
            label: '视图',
            submenu: [
                { label: '放大', role: 'zoomIn', accelerator: 'CmdOrCtrl+Plus' },
                { label: '缩小', role: 'zoomOut', accelerator: 'CmdOrCtrl+-' },
                { label: '重置缩放', role: 'resetZoom', accelerator: 'CmdOrCtrl+0' },
                { type: 'separator' },
                { label: '全屏', role: 'togglefullscreen', accelerator: 'F11' }
            ]
        },
        {
            label: '窗口',
            submenu: [
                { label: '最小化', role: 'minimize', accelerator: 'CmdOrCtrl+M' },
                { label: '最大化', role: 'maximize' },
                { label: '恢复', role: 'restore' },
                { type: 'separator' },
                { label: '重新加载', role: 'reload', accelerator: 'CmdOrCtrl+R' },
                { label: '强制重新加载', role: 'forceReload', accelerator: 'CmdOrCtrl+Shift+R' },
                { label: '开发者工具', role: 'toggleDevTools', accelerator: 'F12' }
            ]
        },
        {
            label: '帮助',
            submenu: [
                {
                    label: '关于',
                    click: () => {
                        dialog.showMessageBox({
                            title: '关于',
                            message: '轻量级浏览器',
                            detail: '版本 1.0.0\n基于 Electron 开发的轻量级浏览器',
                            buttons: ['确定']
                        })
                    }
                }
            ]
        }
    ]

    const menu = Menu.buildFromTemplate(template)
    Menu.setApplicationMenu(menu)
}

app.whenReady().then(() => {
    createWindow()

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow()
        }
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
}) 