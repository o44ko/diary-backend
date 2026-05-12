const express = require('express');
const cors = require('cors');
const schoolsRouter = require('./routes/schools');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use('/api', schoolsRouter);
app.get('/health', (_, res) => res.json({ ok: true }));

app.listen(PORT, () => console.log('Backend running on port ' + PORT));
