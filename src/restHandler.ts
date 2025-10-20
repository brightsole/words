import serverlessExpress from '@vendia/serverless-express';
import express from 'express';
import { startController } from './controller';
import { DATAMUSE_CHECK_URL } from './consts';
import { dedupeLinks } from './dedupeLinks';

export const createRestApp = () => {
  const app = express();
  const itemController = startController();

  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Headers', 'Content-Type, id');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');

    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }

    next();
  });

  app.use(express.json());

  app.get('/words/:name', async (req, res) => {
    const { associations, ...rest } = await itemController.getByName(
      req.params.name,
    );
    res.json({
      ...rest,
      links: dedupeLinks(associations),
    });
  });

  app.get('/health', async (_req, res) => {
    const response = await fetch(DATAMUSE_CHECK_URL);
    res.json({ ok: response.ok });
  });

  return app;
};

export const handler = serverlessExpress({ app: createRestApp() });
