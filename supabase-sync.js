// Supabase 配置
const SUPABASE_URL = 'https://epynfecphiphkimvuhyy.supabase.co';
const SUPABASE_KEY = 'sb_publishable_f4hzt9zXgajkM_ECmV-HMA_Was2ijl2';

// 初始化 Supabase 客户端
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 存储的 KEY（和你的原代码一致）
const STORAGE_KEY = 'diary_entries';

// 从 localStorage 读取数据
function getLocalEntries() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
        return [];
    }
}

// 保存到 localStorage
function setLocalEntries(entries) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

// 从 Supabase 拉取数据
async function pullFromCloud() {
    try {
        const { data, error } = await supabaseClient
            .from('entries')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        if (data && data.length > 0) {
            // 转换格式，适配你的原代码
            const entries = data.map(row => ({
                id: row.id,
                content: row.content,
                date: row.date,
                // 保留其他字段的原样结构
                ...row
            }));
            setLocalEntries(entries);
            console.log('[Sync] 从云端拉取了', entries.length, '条数据');
            return entries;
        }
        return [];
    } catch (err) {
        console.error('[Sync] 拉取失败:', err);
        return null;
    }
}

// 保存单条到 Supabase
async function pushToCloud(entry) {
    try {
        const { data, error } = await supabaseClient
            .from('entries')
            .upsert({ 
                content: entry.content, 
                date: entry.date,
                // 如果有 id 就更新，没有就插入
                ...(entry.id ? { id: entry.id } : {})
            });
        
        if (error) throw error;
        console.log('[Sync] 已同步到云端:', entry.date);
        return true;
    } catch (err) {
        console.error('[Sync] 同步失败:', err);
        return false;
    }
}

// 删除云端数据
async function deleteFromCloud(id) {
    try {
        const { error } = await supabaseClient
            .from('entries')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        console.log('[Sync] 已删除云端数据:', id);
        return true;
    } catch (err) {
        console.error('[Sync] 删除失败:', err);
        return false;
    }
}

// 全量同步（合并本地和云端）
async function syncAll() {
    const local = getLocalEntries();
    const cloud = await pullFromCloud();
    
    if (cloud === null) return; // 拉取失败
    
    // 如果本地有数据但云端没有，上传本地
    if (local.length > 0 && cloud.length === 0) {
        console.log('[Sync] 本地有数据，上传到云端...');
        for (const entry of local) {
            await pushToCloud(entry);
        }
    }
    
    // 如果云端有数据，刷新页面显示
    if (cloud.length > 0) {
        window.location.reload();
    }
}

// 监听 localStorage 变化（你的原代码保存时会触发）
let syncTimeout = null;
function watchLocalChanges() {
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = function(key, value) {
        originalSetItem.call(this, key, value);
        
        if (key === STORAGE_KEY) {
            clearTimeout(syncTimeout);
            syncTimeout = setTimeout(async () => {
                const entries = getLocalEntries();
                // 找到最新的一条，同步到云端
                if (entries.length > 0) {
                    const latest = entries[entries.length - 1];
                    await pushToCloud(latest);
                }
            }, 1000); // 防抖 1 秒
        }
    };
}

// 启动时执行
window.addEventListener('load', async () => {
    console.log('[Sync] 启动同步...');
    
    // 先拉取云端数据
    await pullFromCloud();
    
    // 开始监听本地变化
    watchLocalChanges();
    
    // 如果有云端数据，刷新页面显示
    const cloud = await pullFromCloud();
    if (cloud && cloud.length > 0) {
        console.log('[Sync] 发现云端数据，刷新页面...');
        setTimeout(() => window.location.reload(), 500);
    }
});

// 暴露全局方法（可以在控制台手动调用）
window.syncDiary = {
    pull: pullFromCloud,
    push: pushToCloud,
    syncAll: syncAll,
    getLocal: getLocalEntries
};
