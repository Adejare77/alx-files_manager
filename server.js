const express = require('express');
const router = require('./routes/index');

const app = express();

const PORT = parseInt(process.env.PORT, 10) || 5000;
app.use(express.json());
app.use('/', router);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
