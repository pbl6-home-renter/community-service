import 'reflect-metadata';
import 'tsconfig-paths/register';

import { DataSource } from 'typeorm';
import { createDataSourceOptions } from './data-source-options';

export const AppDataSource = new DataSource(createDataSourceOptions());
