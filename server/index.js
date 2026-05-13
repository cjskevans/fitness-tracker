const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const errorHandler = require('./middleware/errorHandler');
const sanitize = require('./middleware/sanitize');

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(sanitize);

app.use('/api/auth',      require('./routes/auth'));
app.use('/api/sessions',  require('./routes/sessions'));
app.use('/api/exercises', require('./routes/exercises'));
app.use('/api/workouts',  require('./routes/workouts'));
app.use('/api/prs',       require('./routes/prs'));
app.use('/api/settings',  require('./routes/settings'));
app.use('/api/templates', require('./routes/templates'));
app.use('/api/export',   require('./routes/export'));
app.use('/api/import',   require('./routes/import'));

app.use(errorHandler);

if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

if (require.main === module) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
