function download_json(json, filename, mime = "application/json") {
    const str = typeof json === "string" ? json : JSON.stringify(json, null, 2);
    const blob = new Blob([str], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

async function get(api) {
    try {
        const json = await (await fetch(api, {
            method: 'GET',
            credentials: 'include'
        })).json();

        if (json.code !== 0){
            throw json.message;
        }

        return json.data;
    } catch (error) {
        throw new Error(error);
    }
}

async function get_uid() {
    return (await get("https://api.bilibili.com/x/web-interface/nav")).mid;
}
const uid = await get_uid();
console.log(`获取UID：${uid}`);

async function export_favs() {
    async function get_fav_folders(uid) {
        return await get(`https://api.bilibili.com/x/v3/fav/folder/created/list-all?up_mid=${uid}&web_location=333.1387`);
    }

    async function get_folder_data(id, page) {
        return await get(`https://api.bilibili.com/x/v3/fav/resource/list?media_id=${id}&pn=${page}&ps=40&keyword=&order=mtime&type=0&tid=0&platform=web&web_location=333.1387`);
    }

    console.log("开始导出收藏夹");

    const folders = await get_fav_folders(uid);
    console.log(`收藏夹总数：${folders.count}`);

    data = {}
    for (const folder of folders.list) {
        const pages = Math.ceil(folder.media_count / 40);
        console.log(`导出 ${folder.title}：ID ${folder.id} 视频总数 ${folder.media_count} 页数 ${pages}`);

        data[folder.title] = []

        let page = 1;
        for (; page <= pages; page++) {
            console.log(`开始导出第 ${page} 页`);
            for(const media of (await get_folder_data(folder.id, page)).medias){
                if (media.attr !== 0){
                    console.log(`视频 ${media.bvid} 已失效，简介 ${media.intro} 作者 ${media.upper.name}`);
                } else {
                    data[folder.title].push(media.id);
                }
            }
        }

        if ((await get_folder_data(folder.id, page)).medias !== null){
            throw new Error("");
        }
    }
    console.log(data);
    download_json(data, "收藏夹")

    console.log("收藏夹导出完成");
}

async function export_followings() {
    async function get_followings(uid, page) {
        return await get(`https://api.bilibili.com/x/relation/followings?order=desc&order_type=&vmid=${uid}&pn=${page}&ps=24&gaia_source=main_web&web_location=333.1387`);
    }

    console.log("开始导出关注列表");

    const followings = await get_followings(uid, 1);
    const pages = Math.ceil(followings.total / 24);
    console.log(`关注总数 ${followings.total} 页数 ${pages}`);

    data = []
    let page = 1;
    for (; page <= pages; page++) {
        console.log(`开始导出第 ${page} 页`);

        for(const following of (await get_followings(uid, page)).list){
            data.push(following.mid)
        }
    }

    if ((await get_followings(uid, page)).list.length !== 0){
        throw new Error("");
    }
    console.log(data);
    download_json(data, "关注列表")

    console.log("关注列表导出完成");
}

async function export_collections() {
    async function get_collections(uid, page) {
        return await get(`https://api.bilibili.com/x/v3/fav/folder/collected/list?pn=${page}&ps=50&up_mid=${uid}&platform=web&web_location=333.1387`);
    }

    console.log("开始导出合集");

    const collections = await get_collections(uid, 1);
    const pages = Math.ceil(collections.count / 50);
    console.log(`合集总数 ${collections.count} 页数 ${pages}`);

    data = []
    let page = 1;
    for (; page <= pages; page++) {
        console.log(`开始导出第 ${page} 页`);

        for(const collection of (await get_collections(uid, page)).list){
            data.push(collection.id)
        }
    }

    if ((await get_collections(uid, page)).list.length !== 0){
        throw new Error("");
    }

    console.log(data);
    download_json(data, "合集")

    console.log("合集导出完成");
}

await export_favs();
await export_followings();
await export_collections();
