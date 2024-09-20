import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [fileContent, setFileContent] = useState<string | null>(null);

  useEffect(() => {
    fetchUploadedFiles();
  }, []);

  const fetchUploadedFiles = async () => {
    try {
      const response = await axios.get('/api/files');
      setUploadedFiles(response.data.files);
    } catch (error) {
      console.error('获取文件列表失败', error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const uploadFile = async () => {
    if (!file) return;
    
    if (file.size > 10 * 1024 * 1024) {
      alert('文件大小不能超过 10MB');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('/api/upload', formData);
      alert(response.data.message || '文件上传成功');
      setFile(null);
      fetchUploadedFiles();
    } catch (error) {
      console.error('上传错误:', error);
      alert('文件上传失败');
    }
  };

  const handleFileSelect = async (fileName: string) => {
    try {
      const response = await axios.get(`/api/files/${fileName}`);
      setFileContent(response.data.fileContent);
    } catch (error) {
      console.error('获取文件内容失败', error);
      setFileContent(null);
    }
  };

  return (
    <div>
      <h1>文件上传和查看</h1>
      <input type="file" onChange={handleFileChange} accept=".txt,.pdf,.doc,.docx" />
      <button onClick={uploadFile}>上传文件</button>

      <h2>已上传的文件</h2>
      <ul>
        {uploadedFiles.map((fileName) => (
          <li key={fileName} onClick={() => handleFileSelect(fileName)}>
            {fileName}
          </li>
        ))}
      </ul>

      {fileContent && (
        <div>
          <h3>文件内容</h3>
          <pre>{fileContent}</pre>
        </div>
      )}
    </div>
  );
}