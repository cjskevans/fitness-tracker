const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
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

app.use(errorHandler);

if (require.main === module) {
  app.listen(3001, () => console.log('Server running on http://localhost:3001'));
}

module.exports = app;
