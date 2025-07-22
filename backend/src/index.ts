import 'dotenv/config';
import express from 'express';
import fileUpload from 'express-fileupload';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import pkg from 'body-parser';
const { json } = pkg;
import router from './routes.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(json());
app.use(fileUpload({ limits: { fileSize: 2 * 1024 * 1024 * 1024 } })); // 2GB max

// Rate limiting middleware
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
}));

app.use('/api', router);

app.get('/', (req, res) => {
  res.send('VoidBox backend is running.');
});

app.listen(PORT, () => {
  console.log(`VoidBox backend listening on port ${PORT}`);
}); 