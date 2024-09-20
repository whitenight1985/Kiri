import aws from 'aws-sdk';

aws.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
});

const s3 = new aws.S3();

export default async function handler(req, res) {
    const { filename } = req.query;

    if (req.method === 'GET') {
        try {
            const data = await s3.getObject({
                Bucket: process.env.S3_BUCKET_NAME,
                Key: filename
            }).promise();

            res.setHeader('Content-Type', data.ContentType);
            res.setHeader('Content-Length', data.ContentLength);
            res.send(data.Body);
        } catch (error) {
            res.status(500).json({ error: '获取文件内容失败' });
        }
    } else {
        res.setHeader('Allow', ['GET']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}