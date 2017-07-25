import { DbModel } from './db-model';
import { DbEntity } from './db-entity';
import { DbEntityLayout } from './db-entity-layout';
import { DbEntityRelationLayout } from './db-entity-relation-layout';
import { IScaleInfo, DEFAULT_SCALE } from '../directives/scalable.directive';
import { DbModelLayoutDto } from './dto/db-model-layout-dto';

let entityKeyCounter = 0;

export class DbModelLayout {
    readonly entities: DbEntityLayout[] = [];
    readonly relations: DbEntityRelationLayout[] = [];

    get visibleEntities() { return this._visibleEntities; }
    get visibleRelations() { return this._visibleRelations; }
    private _visibleEntities = this.entities;
    private _visibleRelations = this.relations;

    currentScale: IScaleInfo = { scale: DEFAULT_SCALE };

    constructor(public readonly model: DbModel) {
        for (const entity of model.entities) {
            for (const fk of entity.foreignKeys) {
                this.relations.push(new DbEntityRelationLayout(entity, fk));
            }
        }
    }

    toggleEntityVisibility(entity: DbEntityLayout) {
        if (this.entities.indexOf(entity) === -1) {
            throw new Error('Specified entity belongs to other model');
        }

        entity.visible = !entity.visible;

        this.updateVisibleObjects();
    }

    getEntityLayout(entity: DbEntity): DbEntityLayout {
        let result = this.entities.filter(e => e.entity.equals(entity))[0];
        if (!result) {
            result = new DbEntityLayout(entity, ++entityKeyCounter);
            this.entities.push(result);
        }
        return result;
    }

    toDto(): DbModelLayoutDto {
        const result = new DbModelLayoutDto();
        result.entities = this.entities.map(e => e.toDto());
        result.relations = this.relations.map(e => e.toDto());
        return result;
    }

    applyLayout(dto: DbModelLayoutDto) {
        for (const entity of dto.entities) {
            const match = this.entities
                .filter(e => e.entity.name === entity.name && e.entity.clrType.equals(entity.type))[0];
            if (match) {
                match.applyLayout(entity);
            }
        }
        for (const relation of dto.relations) {
            const match = this.relations
                .filter(e =>
                    e.principalEntity.name === relation.principalEntityName
                    && e.principalEntity.clrType.equals(relation.principalEntityType)
                    && e.dependentEntity.name === relation.dependentEntityName
                    && e.dependentEntity.clrType.equals(relation.dependentEntityType)
                )[0];
            if (match) {
                match.applyLayout(relation);
            }
        }

        this.updateVisibleObjects();
    }

    private updateVisibleObjects() {
        this._visibleEntities = this.entities.filter(e => e.visible);
        this._visibleRelations = this.relations
            .filter(e =>
                this._visibleEntities.some(ee => ee.entity.equals(e.principalEntity))
                && this._visibleEntities.some(ee => ee.entity.equals(e.dependentEntity))
        );
    }
}
