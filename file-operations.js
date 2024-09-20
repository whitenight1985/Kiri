const API_BASE_URL = 'http://localhost:8080'; // 使用完整的 URL

document.addEventListener('DOMContentLoaded', function() {
    const uploadForm = document.getElementById('upload-form');
    const queryButton = document.getElementById('query-files');
    const fileList = document.getElementById('file-list');
    const fileContentDiv = document.getElementById('file-content');

    console.log('DOM Content Loaded');

    if (uploadForm) {
        console.log('Upload form found');
        uploadForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const statusDiv = document.getElementById('upload-status');
            
            const file = formData.get('file');
            if (!file || file.size === 0) {
                statusDiv.textContent = '请选择一个文件';
                return;
            }

            statusDiv.textContent = '正在上传...';
            
            try {
                console.log('开始上传文件');
                await uploadFile(formData);
                console.log('上传完成');
                statusDiv.textContent = '上传成功';
            } catch (error) {
                console.error('上传过程中出错:', error);
                statusDiv.textContent = '上传失败: ' + error.message;
            }
        });
    } else {
        console.error('Upload form not found');
    }

    queryButton.addEventListener('click', queryFiles);

    function queryFiles() {
        console.log('开始查询文件');
        fetch(`${API_BASE_URL}/api/files`, {
            mode: 'cors',
            credentials: 'omit',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            console.log('收到服务器响应:', response.status, response.statusText);
            console.log('响应头:', Object.fromEntries(response.headers.entries()));
            if (!response.ok) {
                throw new Error(`HTTP 错误! 状态: ${response.status}`);
            }
            return response.text();
        })
        .then(text => {
            console.log('服务器返回的原始文本:', text);
            try {
                const files = JSON.parse(text);
                console.log('成功解析文件列表:', files);
                fileList.innerHTML = '';
                if (files.length === 0) {
                    fileList.innerHTML = '<li>没有找到文件</li>';
                } else {
                    files.forEach(file => {
                        const li = document.createElement('li');
                        li.textContent = `${file.filename} (${file.size} bytes)`;
                        const viewButton = document.createElement('button');
                        viewButton.textContent = '查看内容';
                        viewButton.onclick = () => viewFileContent(file.filename);
                        li.appendChild(viewButton);
                        const deleteButton = document.createElement('button');
                        deleteButton.textContent = '删除';
                        deleteButton.onclick = () => deleteFile(file.filename);
                        li.appendChild(deleteButton);
                        fileList.appendChild(li);
                    });
                }
            } catch (error) {
                console.error('解析 JSON 失败:', error);
                fileList.innerHTML = '<li>解析服务器响应失败</li>';
            }
        })
        .catch(error => {
            console.error('查询文件失败:', error);
            console.error('错误堆栈:', error.stack);
            fileList.innerHTML = `<li>查询文件失败: ${error.message}</li>`;
            if (error instanceof TypeError && error.message === 'Failed to fetch') {
                console.log('可能是跨域问题或服务器未响应');
                // 尝试 ping 服务器
                fetch(`${API_BASE_URL}/ping`, { mode: 'no-cors' })
                    .then(() => console.log('服务器可以访问，但可能存在 CORS 问题'))
                    .catch(() => console.log('无法连接到服务器，可能是网络问题'));
            }
        });
    }

    function viewFileContent(filename) {
        fetch(`${API_BASE_URL}/api/file-content/${encodeURIComponent(filename)}`, {
            mode: 'cors',
            credentials: 'omit'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.blob();
        })
        .then(blob => {
            const url = URL.createObjectURL(blob);
            const contentType = blob.type;
            
            // 为所有文件类型创建下载链接
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.textContent = `下载 ${filename}`;
            fileContentDiv.innerHTML = '';
            fileContentDiv.appendChild(link);

            // 如果是图片或视频，仍然可以显示预览
            if (contentType.startsWith('image/')) {
                const img = document.createElement('img');
                img.src = url;
                fileContentDiv.appendChild(img);
            } else if (contentType.startsWith('video/')) {
                const video = document.createElement('video');
                video.src = url;
                video.controls = true;
                fileContentDiv.appendChild(video);
            }
        })
        .catch(error => {
            console.error('获取文件内容失败:', error);
            fileContentDiv.textContent = '获取文件内容失败: ' + error.message;
        });
    }

    function deleteFile(filename) {
        fetch(`${API_BASE_URL}/api/files/${filename}`, {
            method: 'DELETE',
            mode: 'cors',
            credentials: 'omit',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => {
                    throw new Error(`HTTP error! status: ${response.status}, message: ${err.error}, details: ${err.details}`);
                });
            }
            return response.json();
        })
        .then(data => {
            console.log('文件删除成功:', data);
            alert(data.message);
            queryFiles(); // 重新加载文件列表
        })
        .catch(error => {
            console.error('删除文件失败:', error);
            alert('删除文件失败: ' + error.message);
            queryFiles(); // 即使删除失败也重新加载文件列表
        });
    }

    // 页面加载时自动查询文件
    queryFiles();

    console.log('当前页面 URL:', window.location.href);
    console.log('查询文件按钮:', queryButton);
    if (queryButton) {
        console.log('查询文件按钮已找到');
    } else {
        console.error('查询文件按钮未找到');
    }
});

async function uploadFile(formData) {
    try {
        console.log('开始上传文件...');
        const response = await fetch('http://localhost:8080/api/upload', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const result = await response.json();
        console.log('上传成功:', result);
        return result;
    } catch (error) {
        console.error('上传错误:', error);
        throw error;
    }
}