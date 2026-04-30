import { Router, Request, Response } from 'express';
import { createExpense, getBalances, getMinimumSettlements } from '../domain/budget/budget.service';

const router = Router();

router.post('/expenses', async (req: Request, res: Response) => {
  try {
    const expense = await createExpense(req.body);
    res.status(201).json(expense);
  } catch (err) {
    res.status(500).json({ error: 'Error al registrar el gasto' });
  }
});

router.get('/balances/:group_id', async (req: Request, res: Response) => {
  try {
    const balances = await getBalances(req.params.group_id);
    res.json(balances);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener saldos' });
  }
});

router.get('/settlements/:group_id', async (req: Request, res: Response) => {
  try {
    const settlements = await getMinimumSettlements(req.params.group_id);
    res.json(settlements);
  } catch (err) {
    res.status(500).json({ error: 'Error al calcular liquidaciones' });
  }
});

export default router;