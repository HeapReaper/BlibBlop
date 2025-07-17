import QueryBuilder from "@utils/database.ts";
import fs from "fs";
import {getEnv} from "@utils/env.ts";

const migrationFile: string = fs.readFileSync(`${<string>getEnv('MODULES_BASE_PATH')}migrations/1745697610-create_messages_table.sql`, 'utf-8');
// @ts-ignore
await QueryBuilder
  .raw(migrationFile)
  .execute();
