import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contract } from '../../modules/contracts/entities/contract.entity';

@Injectable()
export class ContractAccessGuard implements CanActivate {
  constructor(
    @InjectRepository(Contract)
    private contractRepository: Repository<Contract>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Админ имеет доступ ко всем договорам
    if (user.role === 'admin') {
      return true;
    }

    // Получаем ID договора из параметров
    const contractId = request.params.contractId || request.params.id;
    
    if (!contractId) {
      return true; // Если нет ID договора, пропускаем (другой guard проверит)
    }

    // Куратор имеет доступ только к своим договорам
    if (user.role === 'curator') {
      const contract = await this.contractRepository.findOne({
        where: { id: contractId },
        relations: { curators: true },
      });

      if (!contract) {
        throw new ForbiddenException('Договор не найден');
      }

      const isCuratorAssigned = contract.curators?.some((c) => c.id === user.id);
      
      if (!isCuratorAssigned) {
        throw new ForbiddenException('Нет доступа к этому договору');
      }

      return true;
    }

    // Сотрудники не имеют доступа к админским эндпоинтам
    return false;
  }
}
