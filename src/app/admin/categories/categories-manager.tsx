"use client";

import * as React from "react";
import {
  createCategoryAction,
  updateCategoryAction,
  deleteCategoryAction,
  reorderCategoriesAction,
  type CategoryActionResult,
} from "@/actions/admin/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, ArrowUp, ArrowDown, FolderPlus, AlertCircle, CheckCircle2, Loader2, Tag } from "lucide-react";

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  _count: {
    products: number;
  };
}

export function CategoriesManager({ initialCategories }: { initialCategories: CategoryItem[] }) {
  const [categories, setCategories] = React.useState<CategoryItem[]>(initialCategories);
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [editingCategory, setEditingCategory] = React.useState<CategoryItem | null>(null);
  const [deleteConfirmCat, setDeleteConfirmCat] = React.useState<CategoryItem | null>(null);

  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // Sync state if initialCategories changes
  React.useEffect(() => {
    setCategories(initialCategories);
  }, [initialCategories]);

  // Create action state
  const [createState, createAction, isCreatePending] = React.useActionState<
    CategoryActionResult | null,
    FormData
  >(async (prev, formData) => {
    const res = await createCategoryAction(prev, formData);
    if (res.success) {
      setIsCreateOpen(false);
      setMessage(res.message || "Categoría creada.");
      setError(null);
    } else {
      setError(res.error || "Error al crear categoría.");
    }
    return res;
  }, null);

  // Update action state
  const [updateState, updateAction, isUpdatePending] = React.useActionState<
    CategoryActionResult | null,
    FormData
  >(async (prev, formData) => {
    const res = await updateCategoryAction(prev, formData);
    if (res.success) {
      setEditingCategory(null);
      setMessage(res.message || "Categoría actualizada.");
      setError(null);
    } else {
      setError(res.error || "Error al actualizar categoría.");
    }
    return res;
  }, null);

  const handleDelete = async (cat: CategoryItem) => {
    if (cat._count.products > 0) {
      setError(`No se puede eliminar "${cat.name}" porque tiene ${cat._count.products} producto(s) asociado(s).`);
      return;
    }
    const res = await deleteCategoryAction(cat.id);
    if (res.success) {
      setDeleteConfirmCat(null);
      setMessage(res.message || "Categoría eliminada.");
      setError(null);
    } else {
      setError(res.error || "Error al eliminar categoría.");
    }
  };

  const handleMove = async (index: number, direction: "up" | "down") => {
    const newIdx = direction === "up" ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= categories.length) return;

    const updated = [...categories];
    const temp = updated[index];
    updated[index] = updated[newIdx];
    updated[newIdx] = temp;

    setCategories(updated);
    const orderedIds = updated.map((c) => c.id);
    await reorderCategoriesAction(orderedIds);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-ink">
            Categorías
          </h1>
          <p className="text-sm text-ink-secondary mt-1">
            Organiza los productos de tu catálogo por tipo y colección
          </p>
        </div>
        <Button
          onClick={() => {
            setError(null);
            setIsCreateOpen(true);
          }}
          className="self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Nueva categoría
        </Button>
      </div>

      {message && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{message}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-emerald-700 font-bold ml-2">
            ×
          </button>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-700 font-bold ml-2">
            ×
          </button>
        </div>
      )}

      {/* Categories List */}
      <Card>
        <CardHeader className="pb-3 border-b border-pink-100">
          <CardTitle className="text-base flex items-center gap-2">
            <Tag className="w-4 h-4 text-strawberry" />
            <span>Listado de categorías ({categories.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 divide-y divide-pink-100">
          {categories.length === 0 ? (
            <div className="p-8 text-center space-y-3">
              <FolderPlus className="w-10 h-10 mx-auto text-strawberry/40" />
              <p className="text-sm text-ink-secondary">
                Aún no has creado ninguna categoría.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCreateOpen(true)}
              >
                Crear primera categoría
              </Button>
            </div>
          ) : (
            categories.map((cat, idx) => (
              <div
                key={cat.id}
                className="flex items-center justify-between p-4 hover:bg-cotton/20 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex flex-col">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMove(idx, "up")}
                      aria-label="Mover arriba"
                      className="text-ink-secondary/60 hover:text-strawberry disabled:opacity-30 disabled:cursor-not-allowed p-0.5"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === categories.length - 1}
                      onClick={() => handleMove(idx, "down")}
                      aria-label="Mover abajo"
                      className="text-ink-secondary/60 hover:text-strawberry disabled:opacity-30 disabled:cursor-not-allowed p-0.5"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div>
                    <h3 className="font-semibold text-sm text-ink">
                      {cat.name}
                    </h3>
                    <p className="text-xs text-ink-secondary font-mono">
                      /{cat.slug}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-xs px-2.5 py-1 rounded-full bg-meringue border border-pink-200/60 text-ink-secondary font-medium">
                    {cat._count.products} producto(s)
                  </span>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setError(null);
                        setEditingCategory(cat);
                      }}
                      className="text-ink-secondary hover:text-ink hover:bg-meringue"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteConfirmCat(cat)}
                      disabled={cat._count.products > 0}
                      className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 disabled:opacity-30"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Create Category Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Categoría</DialogTitle>
          </DialogHeader>

          <form action={createAction} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="cat-name">Nombre de la categoría</Label>
              <Input
                id="cat-name"
                name="name"
                placeholder="Ej. Photocards, Ropa, Álbumes"
                required
                disabled={isCreatePending}
              />
              {createState?.fieldErrors?.name && (
                <p className="text-xs text-rose-600">{createState.fieldErrors.name}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cat-slug">Slug (opcional)</Label>
              <Input
                id="cat-slug"
                name="slug"
                placeholder="se-generara-automaticamente"
                disabled={isCreatePending}
              />
              <span className="text-[11px] text-ink-secondary">
                Si lo dejas vacío, se generará a partir del nombre.
              </span>
              {createState?.fieldErrors?.slug && (
                <p className="text-xs text-rose-600">{createState.fieldErrors.slug}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cat-sort">Orden numérico</Label>
              <Input
                id="cat-sort"
                name="sortOrder"
                type="number"
                defaultValue={categories.length}
                disabled={isCreatePending}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                disabled={isCreatePending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isCreatePending}>
                {isCreatePending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  "Crear categoría"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Category Modal */}
      <Dialog open={!!editingCategory} onOpenChange={(open) => !open && setEditingCategory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Categoría</DialogTitle>
          </DialogHeader>

          {editingCategory && (
            <form action={updateAction} className="space-y-4">
              <input type="hidden" name="id" value={editingCategory.id} />

              <div className="space-y-1.5">
                <Label htmlFor="edit-cat-name">Nombre de la categoría</Label>
                <Input
                  id="edit-cat-name"
                  name="name"
                  defaultValue={editingCategory.name}
                  required
                  disabled={isUpdatePending}
                />
                {updateState?.fieldErrors?.name && (
                  <p className="text-xs text-rose-600">{updateState.fieldErrors.name}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-cat-slug">Slug</Label>
                <Input
                  id="edit-cat-slug"
                  name="slug"
                  defaultValue={editingCategory.slug}
                  required
                  disabled={isUpdatePending}
                />
                {updateState?.fieldErrors?.slug && (
                  <p className="text-xs text-rose-600">{updateState.fieldErrors.slug}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-cat-sort">Orden numérico</Label>
                <Input
                  id="edit-cat-sort"
                  name="sortOrder"
                  type="number"
                  defaultValue={editingCategory.sortOrder}
                  disabled={isUpdatePending}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingCategory(null)}
                  disabled={isUpdatePending}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isUpdatePending}>
                  {isUpdatePending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    "Guardar cambios"
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deleteConfirmCat} onOpenChange={(open) => !open && setDeleteConfirmCat(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar categoría?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-ink-secondary">
            ¿Estás segura/o de que deseas eliminar la categoría{" "}
            <strong>"{deleteConfirmCat?.name}"</strong>? Esta acción no se puede deshacer.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmCat(null)}
            >
              Cancelar
            </Button>
            <Button
              variant="default"
              className="bg-rose-600 hover:bg-rose-700 text-white"
              onClick={() => deleteConfirmCat && handleDelete(deleteConfirmCat)}
            >
              Sí, eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
