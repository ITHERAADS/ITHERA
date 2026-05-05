import { Router, Request, Response } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import {
  createExpense,
  deleteExpense,
  getBalances,
  getBudgetDashboard,
  markSettlementPaid,
  getMinimumSettlements,
  updateBudget,
  updateExpense,
} from '../domain/budget/budget.service';

const router = Router({ mergeParams: true });

const getGroupId = (req: Request): string | null =>
  req.params.groupId ?? req.params.group_id ?? req.body?.group_id ?? null;

const handleError = (res: Response, err: unknown, fallback: string) => {
  const message = err instanceof Error ? err.message : fallback;
  const status = (err as { statusCode?: number })?.statusCode ?? 500;
  res.status(status).json({ ok: false, error: message });
};

const requireGroupId = (req: Request, res: Response): string | null => {
  const groupId = getGroupId(req);
  if (!groupId) {
    res.status(400).json({ ok: false, error: 'groupId es requerido' });
    return null;
  }
  return String(groupId);
};

const getDashboard = async (req: Request, res: Response) => {
  try {
    const groupId = requireGroupId(req, res);
    if (!groupId) return;
    const dashboard = await getBudgetDashboard(req.user!.id, groupId);
    res.status(200).json(dashboard);
  } catch (err) {
    handleError(res, err, 'Error al obtener presupuesto');
  }
};

const patchBudget = async (req: Request, res: Response) => {
  try {
    const groupId = requireGroupId(req, res);
    if (!groupId) return;
    const dashboard = await updateBudget(req.user!.id, groupId, req.body?.totalBudget ?? req.body?.presupuesto_total);
    res.status(200).json(dashboard);
  } catch (err) {
    handleError(res, err, 'Error al actualizar presupuesto');
  }
};

const postExpense = async (req: Request, res: Response) => {
  try {
    const groupId = requireGroupId(req, res);
    if (!groupId) return;
    const dashboard = await createExpense(req.user!.id, groupId, req.body);
    res.status(201).json(dashboard);
  } catch (err) {
    handleError(res, err, 'Error al registrar el gasto');
  }
};

const putExpense = async (req: Request, res: Response) => {
  try {
    const groupId = requireGroupId(req, res);
    if (!groupId) return;
    const dashboard = await updateExpense(req.user!.id, groupId, req.params.expenseId, req.body);
    res.status(200).json(dashboard);
  } catch (err) {
    handleError(res, err, 'Error al modificar el gasto');
  }
};

const removeExpense = async (req: Request, res: Response) => {
  try {
    const groupId = requireGroupId(req, res);
    if (!groupId) return;
    const dashboard = await deleteExpense(req.user!.id, groupId, req.params.expenseId);
    res.status(200).json(dashboard);
  } catch (err) {
    handleError(res, err, 'Error al eliminar el gasto');
  }
};

const postSettlementPayment = async (req: Request, res: Response) => {
  try {
    const groupId = requireGroupId(req, res);
    if (!groupId) return;
    const dashboard = await markSettlementPaid(req.user!.id, groupId, req.body);
    res.status(201).json(dashboard);
  } catch (err) {
    handleError(res, err, 'Error al marcar pago');
  }
};

router.get('/budget', requireAuth, getDashboard);
router.patch('/budget', requireAuth, patchBudget);
router.get('/expenses', requireAuth, getDashboard);
router.post('/expenses', requireAuth, postExpense);
router.put('/expenses/:expenseId', requireAuth, putExpense);
router.delete('/expenses/:expenseId', requireAuth, removeExpense);
router.post('/settlements/payments', requireAuth, postSettlementPayment);

router.get('/:groupId', requireAuth, getDashboard);
router.patch('/:groupId', requireAuth, patchBudget);
router.get('/:groupId/expenses', requireAuth, getDashboard);
router.post('/:groupId/expenses', requireAuth, postExpense);
router.put('/:groupId/expenses/:expenseId', requireAuth, putExpense);
router.delete('/:groupId/expenses/:expenseId', requireAuth, removeExpense);
router.post('/:groupId/settlements/payments', requireAuth, postSettlementPayment);

router.get('/balances/:group_id', requireAuth, async (req: Request, res: Response) => {
  try {
    const balances = await getBalances(req.params.group_id);
    res.json({ ok: true, balances });
  } catch (err) {
    handleError(res, err, 'Error al obtener saldos');
  }
});

router.get('/settlements/:group_id', requireAuth, async (req: Request, res: Response) => {
  try {
    const settlements = await getMinimumSettlements(req.params.group_id);
    res.json({ ok: true, settlements });
  } catch (err) {
    handleError(res, err, 'Error al calcular liquidaciones');
  }
});

export default router;
