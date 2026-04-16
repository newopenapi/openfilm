const models = require('../server/models/index.cjs');

async function main() {
  await models.sequelize.authenticate();
  await models.sequelize.sync({ alter: true });
  console.log('Portrait assets tables synced');
  await models.sequelize.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

