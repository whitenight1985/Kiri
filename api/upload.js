import formidable from 'formidable';
import clientPromise from '../../lib/mongodb';

export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req, res) {
    if (req.method === 'POST') {
        const form = new formidable.IncomingForm();
        form.parse(req, async (err, fields, files) => {
            if (err) {
                return res.status(500).json({ error: '文件解析错误' });
            }

            const file = files.file;

            try {
                const client = await clientPromise;
                const db = client.db("fileStorage");
                const filesCollection = db.collection("files");

                const fileContent = await fs.promises.readFile(file.path);
                const base64Content = fileContent.toString('base64');

                const result = await filesCollection.insertOne({
                    filename: file.name,
                    contentType: file.type,
                    size: file.size,
                    content: base64Content,
                    uploadDate: new Date()
                });

                res.status(200).json({ fileId: result.insertedId });
            } catch (error) {
                console.error(error);
                res.status(500).json({ error: '文件上传到数据库失败' });
            }
        });
    } else {
        res.setHeader('Allow', ['POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}