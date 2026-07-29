export type { Coordinate, GeographicCoordinate, ProjectedCoordinate } from './coordinate';
export type { CoordinateError, CoordinateErrorCode } from './coordinate-errors';
export { coordinateSystemDefinitions, coordinateSystemIds } from './coordinate-system';
export type {
  CoordinateSystemDefinition,
  CoordinateSystemDefinitionRegistry,
  CoordinateSystemId,
  CoordinateSystemKind,
  CoordinateSystemStatus,
  CoordinateUnit,
  GeographicCoordinateSystemId,
  ProjectedCoordinateSystemId,
} from './coordinate-system';
export type {
  ConvertedCoordinate,
  ConvertedCoordinateCache,
  TransformationAlgorithmStatus,
  TransformationMetadata,
  TransformationStep,
} from './transformation';
