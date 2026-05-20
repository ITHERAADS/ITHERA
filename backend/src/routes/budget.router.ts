import { Router, Request, Response } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import {
  createExpense,
  deleteExpense,
  getBalances,
  getBudgetDashboard,
  getMinimumSettlements,
  markSettlementPaid,
  reviewSettlementPayment,
  updatePendingSettlementPayment,
  deletePendingSettlementPayment,
  updateBudget,
  updateExpense,
} from '../domain/budget/budget.service';
import { generateCollectionReceiptPdf } from '../domain/checkout/pdf.service';

const router = Router({ mergeParams: true });

const statusCode = (error: unknown): number => {
  const status = (error as { statusCode?: number })?.statusCode;
  return typeof status === 'number' ? status : 500;
};

const handleError = (res: Response, err: unknown, fallback: string) => {
  res.status(statusCode(err)).json({
    ok: false,
    error: err instanceof Error ? err.message : fallback,
  });
};

const requireGroupId = (req: Request, res: Response): string | null => {
  const groupId = req.params.groupId ?? req.params.group_id;
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
    const dashboard = await updateBudget(
      req.user!.id,
      groupId,
      req.body?.totalBudget ?? req.body?.presupuesto_total,
    );
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

const reviewPayment = async (req: Request, res: Response) => {
  try {
    const groupId = requireGroupId(req, res);
    if (!groupId) return;
    const dashboard = await reviewSettlementPayment(req.user!.id, groupId, req.params.paymentId, req.body);
    res.status(200).json(dashboard);
  } catch (err) {
    handleError(res, err, 'Error al revisar pago');
  }
};

const patchPendingPayment = async (req: Request, res: Response) => {
  try {
    const groupId = requireGroupId(req, res);
    if (!groupId) return;
    const dashboard = await updatePendingSettlementPayment(req.user!.id, groupId, req.params.paymentId, req.body);
    res.status(200).json(dashboard);
  } catch (err) {
    handleError(res, err, 'Error al actualizar pago');
  }
};

const removePendingPayment = async (req: Request, res: Response) => {
  try {
    const groupId = requireGroupId(req, res);
    if (!groupId) return;
    const dashboard = await deletePendingSettlementPayment(req.user!.id, groupId, req.params.paymentId);
    res.status(200).json(dashboard);
  } catch (err) {
    handleError(res, err, 'Error al eliminar pago');
  }
};

const getGroupBalances = async (req: Request, res: Response) => {
  try {
    const groupId = requireGroupId(req, res);
    if (!groupId) return;
    await getBudgetDashboard(req.user!.id, groupId);
    const balances = await getBalances(groupId);
    res.status(200).json({ ok: true, data: balances });
  } catch (err) {
    handleError(res, err, 'Error al obtener saldos');
  }
};

const getGroupSettlements = async (req: Request, res: Response) => {
  try {
    const groupId = requireGroupId(req, res);
    if (!groupId) return;
    await getBudgetDashboard(req.user!.id, groupId);
    const settlements = await getMinimumSettlements(groupId);
    res.status(200).json({ ok: true, data: settlements });
  } catch (err) {
    handleError(res, err, 'Error al calcular liquidaciones');
  }
};

const postReceiptPdf = async (req: Request, res: Response) => {
  try {
    const groupId = requireGroupId(req, res);
    if (!groupId) return;
    await getBudgetDashboard(req.user!.id, groupId);

    const folio = String(req.body?.folio ?? '').trim();
    const tripLabel = String(req.body?.tripLabel ?? `Viaje ${groupId}`).trim();
    const issuedAt = String(req.body?.issuedAt ?? new Date().toLocaleString('es-MX')).trim();
    const creditor = String(req.body?.creditor ?? '').trim();
    const debtor = String(req.body?.debtor ?? '').trim();
    const amount = String(req.body?.amount ?? '').trim();
    if (!folio || !creditor || !debtor || !amount) {
      return res.status(400).json({ ok: false, error: 'folio, creditor, debtor y amount son requeridos' });
    }

    const pdf = await generateCollectionReceiptPdf({
      folio,
      tripLabel,
      issuedAt,
      creditor,
      debtor,
      amount,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="recibo_${folio}.pdf"`);
    res.status(200).send(pdf);
  } catch (err) {
    handleError(res, err, 'Error al generar recibo PDF');
  }
};

router.get('/budget', requireAuth, getDashboard);
router.patch('/budget', requireAuth, patchBudget);
router.get('/expenses', requireAuth, getDashboard);
router.post('/expenses', requireAuth, postExpense);
router.put('/expenses/:expenseId', requireAuth, putExpense);
router.delete('/expenses/:expenseId', requireAuth, removeExpense);
router.post('/settlements/payments', requireAuth, postSettlementPayment);
router.patch('/settlements/payments/:paymentId/review', requireAuth, reviewPayment);
router.patch('/settlements/payments/:paymentId', requireAuth, patchPendingPayment);
router.delete('/settlements/payments/:paymentId', requireAuth, removePendingPayment);

router.get('/:groupId', requireAuth, getDashboard);
router.patch('/:groupId', requireAuth, patchBudget);
router.get('/:groupId/dashboard', requireAuth, getDashboard);
router.get('/:groupId/expenses', requireAuth, getDashboard);
router.post('/:groupId/expenses', requireAuth, postExpense);
router.put('/:groupId/expenses/:expenseId', requireAuth, putExpense);
router.delete('/:groupId/expenses/:expenseId', requireAuth, removeExpense);
router.post('/:groupId/settlements/payments', requireAuth, postSettlementPayment);
router.patch('/:groupId/settlements/payments/:paymentId/review', requireAuth, reviewPayment);
router.patch('/:groupId/settlements/payments/:paymentId', requireAuth, patchPendingPayment);
router.delete('/:groupId/settlements/payments/:paymentId', requireAuth, removePendingPayment);
router.get('/:groupId/balances', requireAuth, getGroupBalances);
router.get('/:groupId/settlements', requireAuth, getGroupSettlements);
router.post('/:groupId/settlements/receipt-pdf', requireAuth, postReceiptPdf);

export default router;
