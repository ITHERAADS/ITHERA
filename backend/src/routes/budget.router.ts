import { Router, Request, Response } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import {
  createExpense,
  deleteExpense,
  getBalances,
  getBudgetDashboard,
  getMinimumSettlements,
  updateExpense,
  updateGroupBudget,
} from '../domain/budget/budget.service';

const router = Router();

function statusCode(error: unknown): number {
  const status = (error as { statusCode?: number })?.statusCode;
  return typeof status === 'number' ? status : 500;
}

router.get('/groups/:group_id/dashboard', requireAuth, async (req: Request, res: Response) => {
  try {
    const dashboard = await getBudgetDashboard(req.params.group_id, req.user!.id);
    res.json({ ok: true, data: dashboard });
  } catch (err) {
    res.status(statusCode(err)).json({ ok: false, error: err instanceof Error ? err.message : 'Error al obtener presupuesto' });
  }
});

router.post('/expenses', requireAuth, async (req: Request, res: Response) => {
  try {
    const expense = await createExpense(req.user!.id, req.body);
    res.status(201).json({ ok: true, data: expense });
  } catch (err) {
    res.status(statusCode(err)).json({ ok: false, error: err instanceof Error ? err.message : 'Error al registrar el gasto' });
  }
});

router.put('/expenses/:expense_id', requireAuth, async (req: Request, res: Response) => {
  try {
    const expense = await updateExpense(req.params.expense_id, req.user!.id, req.body);
    res.json({ ok: true, data: expense });
  } catch (err) {
    res.status(statusCode(err)).json({ ok: false, error: err instanceof Error ? err.message : 'Error al actualizar el gasto' });
  }
});

router.delete('/groups/:group_id/expenses/:expense_id', requireAuth, async (req: Request, res: Response) => {
  try {
    await deleteExpense(req.params.expense_id, req.params.group_id, req.user!.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(statusCode(err)).json({ ok: false, error: err instanceof Error ? err.message : 'Error al eliminar el gasto' });
  }
});

router.patch('/groups/:group_id/budget', requireAuth, async (req: Request, res: Response) => {
  try {
    const data = await updateGroupBudget(req.params.group_id, req.user!.id, Number(req.body?.totalBudget ?? req.body?.presupuesto_total ?? 0));
    res.json({ ok: true, data });
  } catch (err) {
    res.status(statusCode(err)).json({ ok: false, error: err instanceof Error ? err.message : 'Error al actualizar presupuesto' });
  }
});

router.get('/balances/:group_id', requireAuth, async (req: Request, res: Response) => {
  try {
    await getBudgetDashboard(req.params.group_id, req.user!.id);
    const balances = await getBalances(req.params.group_id);
    res.json({ ok: true, data: balances });
  } catch (err) {
    res.status(statusCode(err)).json({ ok: false, error: err instanceof Error ? err.message : 'Error al obtener saldos' });
  }
});

router.get('/settlements/:group_id', requireAuth, async (req: Request, res: Response) => {
  try {
    const settlements = await getMinimumSettlements(req.params.group_id, req.user!.id);
    res.json({ ok: true, data: settlements });
  } catch (err) {
    res.status(statusCode(err)).json({ ok: false, error: err instanceof Error ? err.message : 'Error al calcular liquidaciones' });
  }
});

export default router;
