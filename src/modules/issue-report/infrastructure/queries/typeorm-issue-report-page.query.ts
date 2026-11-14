import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PaginatedResult } from 'shared/application/pagination/paginated-result';
import { In, Repository } from 'typeorm';
import {
  IssueReportPageParams,
  IssueReportPageQueryPort,
} from '../../application/ports/issue-report-page-query.port';
import { IssueReportEntity } from '../../domain/entities/issue-report.entity';
import { IssueReportTypeormEntity } from '../persistence/issue-report.typeorm-entity';
import { IssueReportMapper } from '../persistence/mappers/issue-report.mapper';

@Injectable()
export class TypeOrmIssueReportPageQuery implements IssueReportPageQueryPort {
  constructor(
    @InjectRepository(IssueReportTypeormEntity)
    private readonly reports: Repository<IssueReportTypeormEntity>,
  ) {}

  async findPage(
    params: IssueReportPageParams,
  ): Promise<PaginatedResult<IssueReportEntity>> {
    const [rows, totalItems]: [IssueReportTypeormEntity[], number] =
      params.contractIds.length === 0
        ? [[], 0]
        : await this.reports.findAndCount({
            where: {
              contractId: In(params.contractIds),
              isDeleted: false,
              ...(params.roomId ? { roomId: params.roomId } : {}),
              ...(params.buildingId ? { buildingId: params.buildingId } : {}),
              ...(params.status ? { status: params.status } : {}),
            },
            order: {
              createdAt: params.order === 'asc' ? 'ASC' : 'DESC',
              id: params.order === 'asc' ? 'ASC' : 'DESC',
            },
            skip: (params.pageNo - 1) * params.pageSize,
            take: params.pageSize,
          });
    const totalPages = Math.ceil(totalItems / params.pageSize);
    return {
      data: rows.map(IssueReportMapper.toDomain),
      pagination: {
        type: 'offset',
        pageNo: params.pageNo,
        pageSize: params.pageSize,
        totalItems,
        totalPages,
        hasNextPage: params.pageNo < totalPages,
        hasPreviousPage: params.pageNo > 1,
      },
    };
  }
}
