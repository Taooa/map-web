import { MemoryPointRepository } from '@/adapters/storage';
import { createPointService } from './point-service';

const pointRepository = new MemoryPointRepository();

export const pointService = createPointService(pointRepository);

export { createPointService } from './point-service';
export type { CreatePointInput, PointService, PointServiceResult } from './point-service';
