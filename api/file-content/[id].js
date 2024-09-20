import clientPromise from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
    const { id } = req.query;

    if (req.method === 'GET') {
        try {
            const client = await clientPromise;
            const db = client.db("fileStorage");
            const filesCollection = db.collection("files");

            const file = await filesCollection.findOne({ _id: new ObjectId(id) });

            if (!file) {
                return res.status(404).json({ error: '文件未找到' });
            }

            const buffer = Buffer.from(file.content, 'base64');

            res.setHeader('Content-Type', file.contentType);
            res.setHeader('Content-Length', buffer.length);
            res.send(buffer);
        } catch (error) {
            res.status(500).json({ error: '获取文件内容失败' });
        }
    } else {
        res.setHeader('Allow', ['GET']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}