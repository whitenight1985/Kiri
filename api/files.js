import clientPromise from '../../lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
    const { method } = req;
    try {
        const client = await clientPromise;
        console.log('Successfully connected to MongoDB');
        const db = client.db("fileStorage");
        const filesCollection = db.collection("files");

        switch (method) {
            case 'GET':
                try {
                    const files = await filesCollection.find({}, { projection: { content: 0 } }).toArray();
                    console.log(`Found ${files.length} files`);
                    res.status(200).json(files);
                } catch (error) {
                    console.error('Error fetching files:', error);
                    res.status(500).json({ error: '获取文件列表失败' });
                }
                break;
            case 'DELETE':
                const { id } = req.query;
                try {
                    await filesCollection.deleteOne({ _id: new ObjectId(id) });
                    res.status(200).json({ message: '文件删除成功' });
                } catch (error) {
                    res.status(500).json({ error: '删除文件失败' });
                }
                break;
            default:
                res.setHeader('Allow', ['GET', 'DELETE']);
                res.status(405).end(`Method ${method} Not Allowed`);
        }
    } catch (error) {
        console.error('Failed to connect to MongoDB:', error);
        res.status(500).json({ error: '数据库连接失败' });
    }
}