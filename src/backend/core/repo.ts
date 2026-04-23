export interface ReadRepo<TEntity, TId> {
  getById(id: TId): Promise<TEntity | null>;
}

export interface ListRepo<TEntity, TQuery = void> {
  list(query?: TQuery): Promise<TEntity[]>;
}

export interface CrudRepo<TEntity, TId, TCreate = TEntity, TUpdate = Partial<TEntity>>
  extends ListRepo<TEntity>,
    ReadRepo<TEntity, TId> {
  create(data: TCreate): Promise<TEntity>;
  update(id: TId, data: TUpdate): Promise<TEntity>;
  delete(id: TId): Promise<void>;
}
